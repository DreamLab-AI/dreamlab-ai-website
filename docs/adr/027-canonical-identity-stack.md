# ADR-027: Canonical Identity Stack — did:nostr + WebID + NIP-05

## Status: Proposed — DID-document shape superseded by ADR-125

> **DID-doc shape superseded (2026-06-15) by ADR-125.** The DID-document
> examples below have been updated to the converged did:nostr CG / `create-agent`
> canonical single form: `@context` `["https://www.w3.org/ns/cid/v1","https://w3id.org/nostr/context"]`,
> top-level `"type": "DIDNostr"`, verification method `"type": "Multikey"` with
> `publicKeyMultibase` = `fe70102` + x-only hex, fragment `#key1`, and
> `authentication`/`assertionMethod` `["#key1"]`. The first context IRI is
> **W3C Controlled Identifiers v1.0 (CID)**, which defines the `Multikey` type
> and `publicKeyMultibase` property used by the converged form (previously this
> was `https://w3id.org/did`, the DID Core 1.0 context). The old 2019 suite
> (`SchnorrSecp256k1VerificationKey2019` + `publicKeyHex` + `#key-0`) and the
> Tier-1/Tier-3 document split are **dropped** (no dual-publish). This is a
> document-shape change only — the `did:nostr:<hex>` identifier string, the
> hex pubkey identity, and the NIP-98 auth path are **unchanged** (ADR-074 §D1
> stays). See `docs/adr/ADR-125-did-nostr-multikey-convergence.md` in the
> backend repo for the binding spec.

## Status: Proposed — not yet implemented in the deployed overlay

> **Adjudication (2026-06-11):** This ADR targets `pod-worker/src/lib.rs`,
> `pod-worker/src/profile.rs`, and `relay-worker/src/auth.rs` — modules of the
> in-tree `community-forum-rs` port that was deleted on 2026-03-12 in favour of
> the upstream `nostr-rust-forum` kit (`nostr-bbs-*`, pinned `25ca8a1`). The
> deployed overlay (`forum-config/deploy/*.wrangler.toml`, `dreamlab.toml`,
> `001_init.sql`) shows **no** `/.well-known/did/nostr/{pubkey}.json` endpoint,
> no `webid` NIP-98 tag wiring, and no `owl:sameAs`/`alsoKnownAs` profile
> additions. `did:nostr:<hex>` is used as a peer/identity identifier in the
> mesh config (`allowed_remote_dids`) but the three-layer resolvable identity
> web this ADR specifies is **not built**. **Blocked on:** a kit-side
> implementation of the DID document endpoint and the WebID `nostr:pubkey`
> link, or a decision to carry it in the overlay's pod surface. Kept Proposed.

## Date: 2026-05-06

## Context

The DreamLab forum currently manages three overlapping identity representations that are not formally linked or resolvable as a unified system. Every registered user has a hex pubkey (the root Nostr identity), an optional WebID URI at `https://pods.dreamlab-ai.com/{pubkey}/profile/card#me` (the Solid pod profile), and an optional NIP-05 handle of the form `{localname}@dreamlab-ai.com`. These three representations are stored and used independently — there is no bidirectional cryptographic link between them, and no external agent can discover all three representations starting from any single one.

The W3C Nostr Community Group published a draft `did:nostr` DID method specification in late 2025. This defines `did:nostr:{hex_pubkey}` as a stable, location-independent, offline-derivable decentralised identifier. The specification defines two document tiers: Tier 1 (offline-derivable, constructed directly from the pubkey without network access) and Tier 3 (relay-enriched, fetching kind-0, kind-10002, and other metadata from known relays). The DreamLab forum does not currently serve a `/.well-known/did/nostr/{pubkey}.json` endpoint, meaning external DID resolvers cannot discover DreamLab users.

The HTTP Schnorr Auth W3C CG specification (draft, 2025) extends NIP-98 with a `webid` tag. When a client includes a `webid` tag in a NIP-98 auth event, the server can dereference the WebID profile, find the `nostr:pubkey` property, and verify that it matches the event signing key. This bidirectional link — from WebID to Nostr pubkey — is the foundation of cross-standard authentication that the DreamLab architecture depends on. The forum's NIP-98 verification path in `relay-worker/src/auth.rs` does not currently parse or validate the `webid` tag.

The `pod-worker` Cloudflare Worker currently serves Solid pod profiles under the `pods.dreamlab-ai.com` subdomain. The WebID JSON-LD profile at `{pubkey}/profile/card` includes a `schema:identifier` field pointing to a `did:nostr:` URI, but this field is not formally resolvable (no DID document is served), and the foaf:account linking from WebID back to the Nostr pubkey uses an ad-hoc string concatenation rather than the W3C-standard `alsoKnownAs` property. External Solid apps and Linked Data processors that dereference the WebID find an incomplete profile that fails to satisfy `did:nostr` resolution requirements.

## Decision

Adopt a three-layer canonical identity model and implement the infrastructure required to make all three layers formally linked and resolvable.

### Layer Definitions

| Layer | Identifier | Properties |
|-------|-----------|-----------|
| Tier 1 | `did:nostr:{hex_pubkey}` | Stable, offline-derivable, no HTTP required |
| Tier 2 | `https://pods.dreamlab-ai.com/{pubkey}/profile/card#me` | Dereferenceable Solid WebID |
| Tier 3 | `{localname}@dreamlab-ai.com` | Human-readable NIP-05 discovery |

### 1. DID Document Endpoint

Add `/.well-known/did/nostr/{pubkey}.json` to pod-worker. The route handler produces a Tier 1 document when called without relay access, and a Tier 3 enriched document when kind-0, kind-10002, and kind-3 events are available from the relay.

**Canonical document** (offline-derivable from the pubkey, always served — single converged form per ADR-125):

```json
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://w3id.org/nostr/context"
  ],
  "id": "did:nostr:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
  "type": "DIDNostr",
  "verificationMethod": [
    {
      "id": "did:nostr:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798#key1",
      "type": "Multikey",
      "controller": "did:nostr:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "publicKeyMultibase": "fe7010279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
    }
  ],
  "authentication": ["#key1"],
  "assertionMethod": ["#key1"],
  "service": []
}
```

`publicKeyMultibase` = `f` (base16-lower multibase) ‖ `e701` (varint of multicodec `0xe7` = secp256k1-pub) ‖ `02` (SEC1 compressed even-y prefix; BIP-340 `lift_x` always selects even-y, so this is invariantly `02`) ‖ the same 64-char x-only hex as the `did:nostr:<hex>` body. Fixed 71-char string. It round-trips to the identical key — no key bytes change.

**agentbox extensions** (optional, NOT part of the canonical create-agent form — the canonical reference output is `service: []`). Populating `service[]` with these entries remains spec-conformant (the spec marks `service` optional):

```json
{
  "service": [
    {
      "id": "did:nostr:{pubkey}#relay",
      "type": "Relay",
      "serviceEndpoint": "wss://relay.dreamlab-ai.com"
    },
    {
      "id": "did:nostr:{pubkey}#nip05",
      "type": "NIP05Verification",
      "serviceEndpoint": "https://dreamlab-ai.com/.well-known/nostr.json?name={localname}"
    },
    {
      "id": "did:nostr:{pubkey}#webid",
      "type": "SolidWebID",
      "serviceEndpoint": "https://pods.dreamlab-ai.com/{pubkey}/profile/card#me"
    }
  ]
}
```

**pod-worker route change** in `pod-worker/src/lib.rs`:

```rust
// New route: /.well-known/did/nostr/:pubkey
router.get("/.well-known/did/nostr/:pubkey", |req, ctx| async move {
    let pubkey = ctx.param("pubkey").unwrap_or_default();
    // Validate hex pubkey: 64 hex chars
    if pubkey.len() != 64 || !pubkey.chars().all(|c| c.is_ascii_hexdigit()) {
        return Response::error("Invalid pubkey", 400);
    }
    let doc = build_did_document(&pubkey, &ctx).await?;
    let mut headers = Headers::new();
    headers.set("Content-Type", "application/did+ld+json")?;
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Cache-Control", "public, max-age=3600")?;
    Response::from_json(&doc)?.with_headers(headers)
});
```

The `build_did_document()` function constructs the Tier 1 document unconditionally and attempts a Tier 3 enrichment via internal fetch to the relay-worker service binding. If the relay fetch fails or times out (100ms timeout), the Tier 1 document is returned without error.

### 2. WebID Profile JSON-LD Additions

The existing WebID profile template in pod-worker must be updated to add:

- `nostr:pubkey` RDF property (IRI: `https://nostr.com/ontology#pubkey`) pointing to the hex pubkey
- `owl:sameAs` link to the `did:nostr:` URI
- `solid:oidcIssuer` pointing to the DreamLab auth endpoint (for Solid OIDC compatibility)
- `alsoKnownAs` linking back to `did:nostr:`

Updated profile JSON-LD template in `pod-worker/src/profile.rs`:

```json
{
  "@context": {
    "@base": "https://pods.dreamlab-ai.com/{pubkey}/profile/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "solid": "http://www.w3.org/ns/solid/terms#",
    "schema": "https://schema.org/",
    "nostr": "https://nostr.com/ontology#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "acl": "http://www.w3.org/ns/auth/acl#"
  },
  "@id": "card#me",
  "@type": ["foaf:Person"],
  "foaf:name": "{display_name}",
  "foaf:nick": "{nip05_localname}",
  "nostr:pubkey": "{hex_pubkey}",
  "schema:identifier": "did:nostr:{hex_pubkey}",
  "owl:sameAs": "did:nostr:{hex_pubkey}",
  "solid:oidcIssuer": "https://auth.dreamlab-ai.com",
  "solid:privateTypeIndex": "privateTypeIndex",
  "solid:publicTypeIndex": "publicTypeIndex",
  "acl:trustedApp": []
}
```

The `nostr:pubkey` property is the machine-readable link that HTTP Schnorr Auth uses for `webid` tag verification. External agents dereferencing the WebID can extract the pubkey and verify Nostr signatures without relying on string parsing heuristics.

### 3. NIP-98 `webid` Tag Verification

Update `relay-worker/src/auth.rs` `verify_nip98()` function to handle the optional `webid` tag:

```rust
pub async fn verify_nip98(
    event: &NostrEvent,
    expected_url: &str,
    env: &Env,
) -> Result<VerifiedAuth, AuthError> {
    // Existing: verify signature, timestamp, u tag, method tag
    // ... existing checks ...

    // New: if webid tag present, resolve and cross-verify
    if let Some(webid_tag) = event.tags.iter().find(|t| t.get(0) == Some(&"webid".to_string())) {
        let webid_uri = webid_tag.get(1).ok_or(AuthError::MalformedWebId)?;
        verify_webid_pubkey_match(webid_uri, &event.pubkey, env).await?;
    }

    Ok(VerifiedAuth {
        pubkey: event.pubkey.clone(),
        webid: event.tags.iter()
            .find(|t| t.get(0) == Some(&"webid".to_string()))
            .and_then(|t| t.get(1))
            .cloned(),
    })
}

async fn verify_webid_pubkey_match(
    webid_uri: &str,
    signing_pubkey: &str,
    env: &Env,
) -> Result<(), AuthError> {
    // Fetch WebID profile with 2s timeout
    let profile = fetch_webid_profile(webid_uri, env).await?;
    // Extract nostr:pubkey from JSON-LD
    let declared_pubkey = profile
        .get("nostr:pubkey")
        .or_else(|| profile.pointer("/https:~1~1nostr.com~1ontology#pubkey/0/@value"))
        .and_then(|v| v.as_str())
        .ok_or(AuthError::WebIdNoPubkey)?;
    if declared_pubkey != signing_pubkey {
        return Err(AuthError::WebIdPubkeyMismatch);
    }
    Ok(())
}
```

The `VerifiedAuth` struct gains an optional `webid` field. Routes that require WebID-verified identity (e.g., Solid pod access) can check this field in addition to Nostr pubkey presence.

### 4. NIP-05 `/.well-known/nostr.json` Linkage

The existing NIP-05 endpoint at `https://dreamlab-ai.com/.well-known/nostr.json` maps localnames to pubkeys. No change to the format. However, the DID document's Tier 3 `service` array should reference the NIP-05 endpoint for discovery — this is already handled in the Tier 3 enrichment above.

When a NIP-05 handle is registered, pod-worker should also update the WebID profile's `foaf:nick` field to the localname. This keeps the three layers consistent on change.

### 5. Bidirectional `alsoKnownAs` Linking

The complete bidirectional link graph for a user with pubkey `{P}` and NIP-05 `{N}`:

- `did:nostr:{P}` → `alsoKnownAs` → `https://pods.dreamlab-ai.com/{P}/profile/card#me`
- `https://pods.dreamlab-ai.com/{P}/profile/card#me` → `owl:sameAs` → `did:nostr:{P}`
- `did:nostr:{P}` → service → `https://dreamlab-ai.com/.well-known/nostr.json?name={N}`
- `https://dreamlab-ai.com/.well-known/nostr.json` → `{N}` → `{P}` (existing)

This forms a resolvable identity web: starting from any of the three representations, an agent can discover all others.

## Consequences

### Positive

- External DID resolvers (Universal Resolver, did.actor, etc.) can now resolve `did:nostr:{pubkey}` for all DreamLab users without requiring a custom resolver plugin.
- HTTP Schnorr Auth / NIP-98 `webid` tag verification enables cross-standard authentication, allowing Solid apps to authenticate DreamLab users via their Nostr keys.
- The bidirectional `alsoKnownAs` graph makes identity portable — if a user moves to another Nostr relay, their DID document still points to their Solid pod.
- NIP-05 discovery is formally linked, improving social discoverability. External Nostr clients that support NIP-05 can display `name@dreamlab-ai.com` handles.
- Compliance with draft W3C specs positions DreamLab ahead of the adoption curve for decentralised identity standards.

### Negative / Trade-offs

- Tier 3 enrichment requires a sub-100ms internal fetch to the relay-worker on every DID document request. Under load, this can increase pod-worker latency. The 100ms timeout and Tier 1 fallback mitigate this but do not eliminate it.
- The `verify_webid_pubkey_match()` function adds an external HTTP fetch to the NIP-98 hot path. This is only triggered when the `webid` tag is present, but malicious clients could send invalid WebID URIs to an arbitrary host, causing SSRF-adjacent requests from the relay-worker. Mitigation: allowlist WebID URIs to `pods.dreamlab-ai.com` domain only.
- The `nostr:pubkey` property uses the `https://nostr.com/ontology` namespace, which is community-defined and not yet a W3C standard. If the namespace changes, profiles must be updated.
- WebID profile updates (e.g., name changes) do not automatically propagate to the DID document cache. A 1-hour `Cache-Control` TTL means stale data persists briefly.

### Neutral

- The `did:nostr` spec is still a draft. Implementation changes may be required when the spec is finalised.
- Existing NIP-98 authentications without a `webid` tag continue to work without modification — the `webid` tag is optional and additive.
- The DID document endpoint can serve double duty as a discovery mechanism for the relay service endpoint, useful for Nostr clients that implement DID-based relay discovery.

## Options Considered

### Option 1: Serve only Tier 1 DID documents (no relay enrichment)
- **Pros**: Zero relay dependency, zero latency impact, simplest implementation.
- **Cons**: No service endpoint discovery, no NIP-05 link, DID documents look sparse compared to other implementations.

### Option 2: Full Tier 1 + Tier 3 with synchronous relay fetch (chosen approach)
- **Pros**: Complete DID documents, all three layers linked, external resolvers get full context.
- **Cons**: Relay fetch adds latency; mitigated by 100ms timeout and Tier 1 fallback.

### Option 3: Pre-compute DID documents and store in R2
- **Pros**: Zero per-request latency, no relay dependency at serve time.
- **Cons**: DID documents become stale when relay data changes (e.g., new relay in kind-10002). Requires a cache invalidation pipeline triggered by relay events. Over-engineered for current scale.

### Option 4: Delegate DID resolution to a third-party universal resolver
- **Pros**: No implementation work for DID endpoint.
- **Cons**: Users cannot discover DreamLab-specific service endpoints. Third-party dependency for identity resolution is architecturally fragile. Contradicts data sovereignty goals.

## Related Decisions

- ADR-025: Solid pod infrastructure — defines the pod-worker architecture this ADR extends.
- ADR-017: Passkey-rs WebAuthn PRF — defines the passkey auth flow whose NIP-98 verification path gains `webid` tag support.
- ADR-028: AGPL boundary — governs how solid-pod-rs algorithms are used without triggering copyleft.
- ADR-125: did:nostr Multikey convergence — supersedes the DID-document shape in this ADR (drops the 2019 suite / `publicKeyHex` / Tier-1/Tier-3 split for the single `DIDNostr` / `Multikey` / `fe70102` form). Identifier string and identity unchanged.

## References

- [W3C DID Core 1.0](https://www.w3.org/TR/did-core/)
- [did:nostr CG Draft](https://github.com/w3c-cg/nostr/blob/main/did-nostr.md)
- [did:nostr CG spec (converged target)](https://nostrcg.github.io/did-nostr/)
- [HTTP Schnorr Auth CG Draft](https://github.com/w3c-cg/nostr/blob/main/schnorr-auth.md)
- [NIP-05: Mapping Nostr Keys to DNS](https://github.com/nostr-protocol/nostr/blob/master/05.md)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nostr/blob/master/98.md)
- [Solid WebID Profile](https://solid.github.io/webid-profile/)
