# ADR-023: Forum Relay Layer Hardening

## Status
Accepted

## Date
2026-03-10

## Context

Systematic QA of the Rust/WASM community forum on 2026-03-10 revealed 18 snags
(3 CRITICAL, 6 HIGH, 6 MEDIUM, 3 LOW). GPT-5.4 code review identified that 13 of
18 snags trace to three architectural defects in the relay communication layer:

1. **Fire-and-forget publish** — `RelayConnection::publish()` sends JSON and returns
   `()`. No OK/NOTICE tracking. All callers (chat, admin, RSVP, profile) assume
   success immediately, causing "silent failure" across the entire write path.

2. **Session restore without signing capability** — `auth/session.rs` restores
   local-key users as `AuthPhase::Authenticated` without private key bytes in memory.
   All subsequent signing operations fail silently.

3. **Rigid subscription filters** — Kind-42 message subscriptions assume `#e` tags
   contain the kind-40 event ID. Legacy relay data uses different tag structures
   (slugs, section names), causing zero message matches.

4. **Subscription loss on reconnect** — `disconnect()` clears all subscriptions.
   Subscriptions are not stored with their filters, so they cannot replay on
   reconnect. Mobile/flaky network users lose all real-time data.

## Decision

### D1: Publish Acknowledgement Protocol

Add `publish_with_ack(event, callback)` to `RelayConnection`. Track pending
publishes in `HashMap<String, PendingPublish>`. Route NIP-01 `["OK", event_id,
accepted, message]` responses to callbacks. Callers MUST NOT mutate UI until ack.

**Trade-off**: Adds ~100 LOC and `Rc<dyn Fn>` callback overhead. Justified because
every write feature is broken without it.

### D2: Session Restore Downgrade

Local-key sessions restore as `AuthPhase::Unauthenticated` with pubkey preserved.
Users must re-enter their hex/nsec key to sign. Passkey and NIP-07 paths unchanged.

**Trade-off**: Slightly worse UX for local-key users (must re-login after refresh).
Correct behavior — a signing-dependent app MUST NOT claim authenticated without a
signing key.

### D3: Flexible Channel Identity Resolution

Replace strict `#e == kind40_id` filter with broad kind-42 subscription + client-side
resolution. Match root tag value against channel ID, name, and section slug.

**Trade-off**: More bandwidth (all kind-42 events fetched). Acceptable for current
scale (~78 messages). Long-term fix: normalize all channel identifiers in relay data.

### D4: Subscription Replay on Reconnect

Store `Vec<Filter>` in `Subscription` struct. On WebSocket reconnect, replay all
active REQ messages. Do not clear subscriptions on disconnect.

**Trade-off**: Subscriptions persist longer in memory. Acceptable for CSR SPA with
~20 concurrent subscriptions.

## Consequences

### Positive
- All 13 relay-related snags resolved (SNAGs 2, 4, 5, 8, 9, 10, 12, 13, 18 + associated)
- Error feedback visible to users for the first time
- Reconnect resilience for mobile users
- Foundation for future optimistic UI with rollback

### Negative
- Broad kind-42 scan increases relay traffic (~2x for message list)
- Callback `Rc<dyn Fn>` adds runtime overhead per publish
- Local-key users must re-authenticate after page refresh

### Neutral
- No changes to passkey, NIP-07, or NIP-98 auth paths
- No relay-side changes required
- No changes to nostr-core library

## Files Affected

| File | Change Type | Scope |
|------|------------|-------|
| `src/relay.rs` | Major | publish_with_ack, PendingPublish, Subscription filters, reconnect replay |
| `src/auth/session.rs` | Moderate | Local-key restore downgrade |
| `src/stores/channels.rs` | Moderate | Broad kind-42 sync, client-side resolution |
| `src/pages/channel.rs` | Moderate | Variant tag matching, ack-aware send |
| `src/admin/mod.rs` | Moderate | Ack-aware channel creation |
| `src/admin/channel_form.rs` | Minor | Remove premature form reset |
| `src/components/rsvp_buttons.rs` | Minor | Ack-aware RSVP |
| `src/pages/settings.rs` | Minor | Ack-aware profile save |
| `src/admin/section_requests.rs` | Minor | Loading timeout |
| `src/admin/calendar.rs` | Minor | Loading timeout, RSVP subscription |

## Alternatives Considered

1. **NDK-based relay wrapper** — Too heavy. NDK adds 200KB+ to WASM bundle.
   Current custom relay.rs is 400 LOC and well-suited to CSR.

2. **Optimistic UI with rollback** — More complex. Requires reversible state
   mutations. Deferred to future sprint after ack infrastructure is proven.

3. **Server-side message normalization** — Ideal long-term but requires relay
   worker changes and data migration. This sprint fixes client-side first.

## References

- [NIP-01: Basic protocol](https://github.com/nostr-protocol/nips/blob/master/01.md) — OK message format
- [NIP-42: Authentication](https://github.com/nostr-protocol/nips/blob/master/42.md) — AUTH flow
- `docs/forum-snag-list.md` — 18 QA findings
- `docs/gpt5-forum-review-response.md` — GPT-5.4 root cause analysis
- `docs/prd-forum-hardening-v5.0.md` — Sprint plan
