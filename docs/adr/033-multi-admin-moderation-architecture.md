# ADR-033: Multi-Admin Moderation Architecture

## Status: Proposed

## Date: 2026-05-06

## Context

The DreamLab forum's moderation system was designed for a single administrator. Every moderation validation in `nostr-core/src/moderation.rs` compares the event signing pubkey against a single `ADMIN_PUBKEY` environment variable read from the relay-worker's wrangler.toml secrets. The D1 `whitelist` table has an `is_admin` boolean column (added in the initial schema), but the moderation validation code never reads it — it is dead schema that serves no functional purpose.

Three structural defects compound this single-admin limitation. First, the custom DreamLab moderation event kinds (30910 through 30914) use a d-tag scheme of `{target_pubkey}` — the pubkey of the user being banned or muted. Because kind-30910 through kind-30914 are parameterised replaceable events (keyed by `(pubkey, kind, d_tag)`), if two administrators each ban the same user, the second admin's ban event replaces the first's — the first admin's moderation record is lost. There is no way to see who took which moderation action or when. This makes multi-admin deployment architecturally broken even if the validation code were fixed.

Second, there is no explicit unban or unmute event kind. The current revocation mechanism is NIP-09 event deletion (kind-5), which sends a delete request for the ban event. NIP-09 deletion is advisory — relays are not required to honour it, and the original ban event may persist in other relays. An explicit revocation event kind (with its own replaceable event storage) is more reliable: the ban is active when the latest replaceable event in the ban/unban pair has kind 30910, and inactive when it has kind 30915.

Third, kind-30913 is used as a user-submitted report event where NIP-56 (kind-1984) is the established Nostr standard for reporting. Kind-30913 is entirely custom to DreamLab, meaning report events from DreamLab users are unreadable by any external Nostr moderation tool (CiviqModeration, mostr, etc.). External tools that aggregate reports across the Nostr ecosystem cannot include DreamLab reports because the kind is non-standard. This reduces DreamLab's ability to participate in federated trust-and-safety efforts.

The ADR-026 report queue implementation uses kind-1984 for the user-submitted report flow, but the existing kind-30913 constant in nostr-core creates ambiguity. This ADR resolves the kind assignment and repurposes kind-30913 as an admin-only escalation record, separate from user-submitted reports.

## Decision

Remove the `ADMIN_PUBKEY` single-admin dependency. Fix the d-tag collision. Add unban/unmute event kinds. Reassign kind-30913. Add an admin management API.

### 1. Remove `ADMIN_PUBKEY` — Multi-Admin D1 Lookup

Remove `ADMIN_PUBKEY` from `wrangler.toml` and `relay-worker/src/lib.rs`. Replace with D1 lookup.

Update `nostr-core/src/moderation.rs` `validate_moderation_event()`:

```rust
/// Validate that a moderation event is signed by an authorised admin.
///
/// Admin list is provided by the caller (fetched from D1, cached in relay DO).
/// This function is pure — no I/O.
pub fn validate_moderation_event(
    event: &NostrEvent,
    admin_pubkeys: &[String],
) -> Result<(), ModerationError> {
    if !admin_pubkeys.contains(&event.pubkey) {
        return Err(ModerationError::NotAdmin {
            pubkey: event.pubkey.clone(),
        });
    }
    // Existing checks: kind range, d-tag format, etc.
    validate_moderation_kind(event.kind)?;
    validate_moderation_dtag(event)?;
    Ok(())
}
```

In `relay-worker/src/relay_do/mod.rs`, cache the admin list with a 60-second TTL:

```rust
pub struct RelayDurableObject {
    // ... existing fields ...
    admin_cache: Option<AdminCache>,
}

struct AdminCache {
    pubkeys: Vec<String>,
    cached_at: u64,  // unix seconds
}

impl RelayDurableObject {
    async fn get_admin_pubkeys(&mut self, db: &D1Database) -> Vec<String> {
        let now = current_unix_timestamp();
        if let Some(ref cache) = self.admin_cache {
            if now - cache.cached_at < 60 {
                return cache.pubkeys.clone();
            }
        }
        let rows = db
            .prepare("SELECT pubkey FROM whitelist WHERE is_admin = 1")
            .all().await
            .map(|r| r.results::<WhitelistRow>().unwrap_or_default())
            .unwrap_or_default();
        let pubkeys: Vec<String> = rows.into_iter().map(|r| r.pubkey).collect();
        self.admin_cache = Some(AdminCache { pubkeys: pubkeys.clone(), cached_at: now });
        pubkeys
    }
}
```

In `handle_event()`, replace the env var check:

```rust
// BEFORE:
let admin_pubkey = ctx.env.secret("ADMIN_PUBKEY")?.to_string();
if event.pubkey != admin_pubkey { ... }

// AFTER:
let admins = self.get_admin_pubkeys(&db).await;
validate_moderation_event(&event, &admins)?;
```

### 2. Fix d-tag Collision — New d-tag Scheme

Change all moderation event d-tags from `{target_pubkey}` to `{admin_pubkey}:{target_pubkey}`.

**Constants update in `nostr-core/src/kinds.rs`:**

```rust
pub const KIND_BAN: u16 = 30910;
pub const KIND_MUTE: u16 = 30911;
pub const KIND_MODERATION_ACTION: u16 = 30912;
pub const KIND_REPORT_ESCALATED: u16 = 30913;  // renamed from KIND_REPORT; admin-only escalation
pub const KIND_RESTRICT: u16 = 30914;
pub const KIND_UNBAN: u16 = 30915;             // NEW: explicit ban revocation
pub const KIND_UNMUTE: u16 = 30916;            // NEW: explicit mute revocation
```

**d-tag format change** in `nostr-core/src/moderation.rs`:

```rust
/// Build the d-tag value for a moderation event.
/// Format: "{admin_pubkey}:{target_pubkey}"
///
/// This ensures that two admins can independently ban the same user
/// without their ban events replacing each other (different d-tag → different replaceable slot).
pub fn moderation_dtag(admin_pubkey: &str, target_pubkey: &str) -> String {
    format!("{}:{}", admin_pubkey, target_pubkey)
}

/// Parse the d-tag to extract admin and target pubkeys.
pub fn parse_moderation_dtag(dtag: &str) -> Option<(&str, &str)> {
    let mut parts = dtag.splitn(2, ':');
    let admin = parts.next()?;
    let target = parts.next()?;
    if admin.len() == 64 && target.len() == 64 { Some((admin, target)) } else { None }
}
```

**ModCache update logic** in `relay-worker/src/mod_cache.rs`:

The moderation cache (in-memory or D1-backed, depending on existing implementation) must now track active bans per `(admin_pubkey, target_pubkey)` pair and provide a compound query `is_banned(target_pubkey)` that returns `true` if **any** admin has an active ban for the target:

```rust
pub struct ModCache {
    // Map from target_pubkey to set of admin_pubkeys who have active bans
    bans: HashMap<String, HashSet<String>>,
    mutes: HashMap<String, HashSet<String>>,
}

impl ModCache {
    /// Process a moderation event and update internal state.
    pub fn process_event(&mut self, event: &NostrEvent) {
        let Some(dtag) = event.d_tag() else { return };
        let Some((admin_pk, target_pk)) = parse_moderation_dtag(&dtag) else { return };

        match event.kind {
            KIND_BAN => {
                self.bans.entry(target_pk.to_string())
                    .or_default()
                    .insert(admin_pk.to_string());
            },
            KIND_UNBAN => {
                if let Some(set) = self.bans.get_mut(target_pk) {
                    set.remove(admin_pk);
                    if set.is_empty() {
                        self.bans.remove(target_pk);
                    }
                }
            },
            KIND_MUTE => {
                self.mutes.entry(target_pk.to_string())
                    .or_default()
                    .insert(admin_pk.to_string());
            },
            KIND_UNMUTE => {
                if let Some(set) = self.mutes.get_mut(target_pk) {
                    set.remove(admin_pk);
                    if set.is_empty() {
                        self.mutes.remove(target_pk);
                    }
                }
            },
            _ => {}
        }
    }

    /// Returns true if any admin has an active ban for this pubkey.
    pub fn is_banned(&self, pubkey: &str) -> bool {
        self.bans.get(pubkey).map(|s| !s.is_empty()).unwrap_or(false)
    }

    /// Returns true if any admin has an active mute for this pubkey.
    pub fn is_muted(&self, pubkey: &str) -> bool {
        self.mutes.get(pubkey).map(|s| !s.is_empty()).unwrap_or(false)
    }
}
```

### 3. kind-1984 Standard Reporting

Add kind-1984 to the relay's stored kinds. Update `event_treatment()` in `relay_do/nip_handlers.rs`:

```rust
// kind-1984 is a regular event — store it like any other
1984 => EventTreatment::Regular,
```

The report queue in ADR-026 already uses kind-1984. This change ensures the relay stores and broadcasts kind-1984 events from any client (not just DreamLab's own).

**Kind-30913 repurposed as admin escalation record:**

Kind-30913 is renamed `KIND_REPORT_ESCALATED`. It is published by admins only (validated as such in `handle_event()`). Its d-tag is `{admin_pubkey}:{reported_event_id}`. It records the admin's decision on a kind-1984 report: the content is a JSON summary of the escalated report with action taken. This is the admin-only counterpart to the user-submitted kind-1984.

### 4. D1 Schema Migration

Add to `relay-worker/src/lib.rs` `ensure_schema()`:

```rust
// Multi-admin migration
let _ = db.prepare(
    "ALTER TABLE whitelist ADD COLUMN is_admin INTEGER DEFAULT 0"
).run().await;
// Note: is_admin column may already exist from prior migration. The error is swallowed.

// No new tables needed for multi-admin. Existing moderation events table
// handles the new d-tag scheme naturally (d-tag is just a longer string).
```

**D1 migration for admin management:**

No schema change required beyond ensuring `is_admin` exists. The `whitelist` table's existing `is_admin` column is now actively used.

**Backfill for existing ban/mute events (one-time):**

Existing ban/mute events have d-tag `{target_pubkey}` (64 hex chars). After this ADR is deployed, the relay must re-process existing moderation events and rewrite their d-tags. Since Nostr events are immutable, the relay cannot edit stored events. Instead:

1. On deploy, run a D1 query to identify all existing kind-30910/30911 events.
2. For each, read the signing pubkey (the admin at the time) and the current d-tag (target pubkey).
3. Publish replacement events with d-tag `{admin_pubkey}:{target_pubkey}` signed by the admin key. This requires the admin to re-sign — present this as a one-time migration step in the admin UI with a "Migrate moderation records" button.
4. After migration, the old d-tag events are replaced (same pubkey+kind+old-d-tag slot).

### 5. Admin Management API

New NIP-98 authenticated endpoints in `relay-worker/src/lib.rs`:

```
GET  /api/admins
     Auth: any admin (is_admin = 1)
     Returns: { "admins": [{ "pubkey": "hex", "added_at": 1234567890 }] }

POST /api/admins/add
     Auth: existing admin only
     Body: { "pubkey": "hex" }
     Effect: SET whitelist.is_admin = 1 WHERE pubkey = ?
             INSERT INTO whitelist (pubkey, is_admin) ON CONFLICT DO UPDATE
             Logs to admin_log (action: admin_grant)
     Returns: { "success": true }

POST /api/admins/remove
     Auth: existing admin only (cannot remove self)
     Body: { "pubkey": "hex" }
     Effect: SET whitelist.is_admin = 0 WHERE pubkey = ?
             Logs to admin_log (action: admin_revoke)
     Returns: { "success": true }
     Error: 400 if trying to remove last admin (MIN COUNT CHECK)
```

The "cannot remove last admin" check:

```rust
let admin_count: i64 = db
    .prepare("SELECT COUNT(*) FROM whitelist WHERE is_admin = 1")
    .first::<i64>(None).await?.unwrap_or(0);
if admin_count <= 1 {
    return Response::error("cannot remove last admin", 400);
}
```

The admin list change invalidates the relay DO's `admin_cache` immediately (set `cached_at = 0`).

### 6. Forum Client Admin UI Updates

In `forum-client/src/pages/admin.rs` (Admin Moderation tab):

- Add "Admins" sub-section showing current admin list with add/remove controls.
- Ban/mute action forms now submit with new d-tag format (transparent to UI — handled in nostr-core builder).
- Add "Unban" and "Unmute" buttons to banned/muted user rows (publishes kind-30915/30916).
- Reports tab shows kind-1984 events (standard) and kind-30913 events (escalated) in separate tabs.

## Consequences

### Positive

- Multiple admins can independently moderate without overwriting each other's records. A ban by admin A and a ban by admin B for the same user are both active simultaneously and independently revocable.
- Explicit unban/unmute event kinds provide reliable revocation without relying on advisory NIP-09 deletion.
- Kind-1984 standard reporting makes DreamLab reports portable to external Nostr moderation tools. The Nostr ecosystem benefits from DreamLab users' reports being visible to cross-platform moderation systems.
- Removing `ADMIN_PUBKEY` environment variable eliminates a security footgun — the admin key no longer needs to be in wrangler.toml secrets.
- The admin management API enables delegation of admin roles without redeploying the worker.

### Negative / Trade-offs

- The d-tag scheme change is a breaking migration. Existing ban/mute events in the relay's D1 database use the old d-tag format. The ModCache will not pick up old events correctly until they are re-signed. The migration UI step is a manual action that requires admin involvement.
- The 60-second admin cache TTL means there is up to a 60-second window where a newly removed admin can still publish moderation events that pass validation. This is acceptable for a small admin team. Reduce to 10 seconds if tighter control is required (higher D1 query frequency).
- Kind-30913 repurposing is a breaking change for any clients that currently consume kind-30913 as user-submitted reports. Audit the forum client for all kind-30913 references and update them to kind-1984 for user reports.
- The `ModCache` now uses `HashMap<String, HashSet<String>>` with compound keys. Memory footprint grows linearly with the product of admin count and banned user count. At small community scale (< 100 admins, < 10K bans) this is not a concern.

### Neutral

- Kind-30915/30916 unban/unmute events are new but follow the same replaceable event pattern as existing moderation kinds. No relay changes beyond adding them to the replaceable kind range (already handled by the `30000..=39999` range in `event_treatment()`).
- The is_admin column lookup replaces a string comparison against an env var. The performance characteristics are equivalent (both are O(1) operations; the D1 lookup is cached).

## Options Considered

### Option 1: Keep single-admin, add a delegated-admin layer via NIP-26
- **Pros**: No d-tag migration; NIP-26 delegation scopes the delegate to moderation kinds.
- **Cons**: NIP-26 delegation is revocable only via expiry. A delegated admin whose delegation expires (or whose token is not renewed) loses access mid-moderation action. The is_admin column is a more robust authority source.

### Option 2: Use a multi-sig scheme for moderation events (M-of-N admin approval)
- **Pros**: Higher integrity for sensitive actions (banning verified contributors).
- **Cons**: Significant protocol complexity; no Nostr standard for multi-sig event approval; latency for quorum-dependent moderation responses is unacceptable for spam/abuse scenarios requiring immediate action.

### Option 3: Store admin list in a Nostr event (kind-30000 or kind-10000) instead of D1
- **Pros**: Admin list is portable; other clients can discover it.
- **Cons**: Relay-private authority should not be in portable Nostr events — any relay subscribing to DreamLab could discover the admin list. D1 is the right store for relay-internal policy data.

### Option 4: Replace all custom moderation kinds (30910-30916) with standard NIP alternatives
- **Pros**: Maximum interoperability.
- **Cons**: No standard Nostr kind for relay-specific bans (kind-1984 is for reporting, not for relay admin banning). The custom kinds serve a distinct purpose (relay-enforced access control, not cross-platform reputation). Keeping them as relay-internal events is architecturally correct.

## Related Decisions

- ADR-026: Forum professionalisation — report queue uses kind-1984 established here as the standard.
- ADR-023: Forum relay hardening — relay-side enforcement of ban/mute checks that ModCache drives.
- ADR-010: Claims-based authorisation — admin role claim mapped to D1 is_admin column.

## References

- [NIP-56: Reporting](https://github.com/nostr-protocol/nostr/blob/master/56.md)
- [NIP-09: Event Deletion Request](https://github.com/nostr-protocol/nostr/blob/master/09.md)
- [NIP-26: Delegated Event Signing](https://github.com/nostr-protocol/nostr/blob/master/26.md)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
