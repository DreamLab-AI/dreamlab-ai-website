# ADR-032: Agent Job Marketplace — NIP-90 DVMs + NIP-26 Delegation

## Status: Proposed

## Date: 2026-05-06

## Context

DreamLab's stated vision includes AI agent-to-agent task delegation within the forum ecosystem. The core challenge in agent delegation is identity and authorisation: when an AI agent signs and publishes events on behalf of a user, how does the relay and other clients know the agent is authorised, what actions it is permitted to take, and for how long? Without a well-defined delegation mechanism, agents either require access to the user's root nsec (catastrophically insecure) or must operate as entirely separate identities with no user-visible authorisation link.

The Nostr ecosystem has two relevant specifications. NIP-90 (Data Vending Machines) defines a job-request/job-result protocol: kind-5000 through kind-5999 for job requests (parameterised per domain: text generation, image generation, translation, etc.), kind-7000 for job feedback (processing/payment-required/error/success), kind-6000 through kind-6999 for job results, and kind-31990 for provider capability advertisements (a parameterised replaceable event announcing what job types a provider can handle, their pricing, and their relay). NIP-90 is implemented in production by Wavlake, Satlantis, and other services. NIP-26 provides client-side event delegation: a user signs a delegation token scoping a delegatee pubkey to specific event kinds and a time window. Events published by the delegatee include a `delegation` tag, and verifiers can confirm the delegatee acted within the user's authorisation.

The forum source code contains references that suggest DVM UI was planned: the admin UI constants include `5000` and `6000` (referencing DVM job kinds), and the relay-worker's `event_treatment()` function assigns `Regular` storage to kinds 5000-7000 (they are stored and relayed without special handling). However, no NIP-90 type definitions exist in nostr-core, no delegation token implementation exists, and no marketplace UI page exists. The relay does not handle kind-31990 as a replaceable event (it is treated as `Regular` instead of `Replaceable`).

TENEX (github.com/tenex-chat/tenex) is a reference implementation that the DreamLab team has evaluated. TENEX uses per-project ephemeral nsec keys with NIP-26 delegation from the user's root key, phase-based agent workflows, and Nostr-native agent coordination patterns. The DreamLab implementation follows similar principles but targets Cloudflare Workers and the Leptos WASM frontend rather than TENEX's Node.js/Electron stack.

## Decision

Add NIP-90 type definitions to nostr-core, implement NIP-26 delegation token generation in nostr-core, fix the kind-31990 relay treatment, add an agent marketplace page to the forum client, and add a delegation token creation API endpoint to auth-worker.

### 1. NIP-90 Types in nostr-core

Add `nostr-core/src/nip90.rs`:

```rust
//! NIP-90: Data Vending Machine types.
//! Job requests, feedback, results, and capability advertisements.

use serde::{Deserialize, Serialize};

/// Kind range for DVM job requests: 5000-5999.
pub const KIND_DVM_REQUEST_MIN: u16 = 5000;
pub const KIND_DVM_REQUEST_MAX: u16 = 5999;

/// Kind range for DVM job results: 6000-6999 (matches request kind + 1000).
pub const KIND_DVM_RESULT_MIN: u16 = 6000;
pub const KIND_DVM_RESULT_MAX: u16 = 6999;

/// Kind for DVM job feedback.
pub const KIND_DVM_FEEDBACK: u16 = 7000;

/// Kind for DVM provider capability advertisement (NIP-89 parameterised replaceable).
pub const KIND_DVM_CAPABILITY_AD: u16 = 31990;

/// Well-known NIP-90 job kind subtypes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u16)]
pub enum DvmJobKind {
    TextExtraction = 5000,
    TextSummarisation = 5001,
    TextTranslation = 5002,
    TextClassification = 5008,
    ImageGeneration = 5100,
    VideoConversion = 5200,
    EventListFiltering = 5300,
    EventListClassification = 5301,
    // Custom range: 5400-5999
}

impl DvmJobKind {
    pub fn result_kind(self) -> u16 {
        self as u16 + 1000
    }
}

/// A DVM job request event (kind 5000-5999).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmJobRequest {
    pub kind: u16,             // 5000-5999
    pub inputs: Vec<DvmInput>,
    pub params: Vec<DvmParam>,
    pub output_mime: Option<String>,
    pub relays: Vec<String>,
    pub bid_msats: Option<u64>,
    pub expires_at: Option<u64>,
    /// If Some, this job request is encrypted (NIP-44) to the provider.
    pub encrypted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmInput {
    pub input_type: DvmInputType,
    pub value: String,
    pub relay: Option<String>,
    pub marker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DvmInputType { Url, Event, Job, Text }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmParam {
    pub name: String,
    pub value: String,
}

/// Status values for kind-7000 DVM job feedback.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum DvmFeedbackStatus {
    PaymentRequired,
    Processing,
    Error,
    Success,
    Partial,
}

/// A DVM job feedback event (kind 7000).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmJobFeedback {
    pub status: DvmFeedbackStatus,
    pub extra_info: Option<String>,
    pub amount_msats: Option<u64>,
    pub bolt11: Option<String>,
    pub job_request_id: String,
}

/// A DVM job result event (kind 6000-6999).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmJobResult {
    pub request_kind: u16,   // 5000-5999
    pub result: String,      // output content
    pub request_event_id: String,
    pub requester_pubkey: String,
    pub amount_msats: Option<u64>,
    pub bolt11: Option<String>,
}

/// A DVM provider capability advertisement (kind 31990).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmCapabilityAd {
    pub d_tag: String,          // unique identifier (e.g., pubkey-hexed)
    pub provider_name: String,
    pub about: String,
    pub picture: Option<String>,
    pub supported_kinds: Vec<u16>,
    pub nip90_params: Vec<DvmCapabilityParam>,
    pub relay: Option<String>,
    pub lud16: Option<String>,  // Lightning address for payment
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DvmCapabilityParam {
    pub name: String,
    pub required: bool,
    pub values: Vec<String>,
}

impl DvmJobRequest {
    /// Build the Nostr event tags for a job request.
    pub fn to_tags(&self) -> Vec<Vec<String>> {
        let mut tags = Vec::new();
        for input in &self.inputs {
            let mut tag = vec![
                "i".to_string(),
                input.value.clone(),
                format!("{:?}", input.input_type).to_lowercase(),
            ];
            if let Some(ref relay) = input.relay { tag.push(relay.clone()); }
            if let Some(ref marker) = input.marker { tag.push(marker.clone()); }
            tags.push(tag);
        }
        for param in &self.params {
            tags.push(vec!["param".to_string(), param.name.clone(), param.value.clone()]);
        }
        if let Some(ref mime) = self.output_mime {
            tags.push(vec!["output".to_string(), mime.clone()]);
        }
        for relay in &self.relays {
            tags.push(vec!["relays".to_string(), relay.clone()]);
        }
        if let Some(msats) = self.bid_msats {
            tags.push(vec!["bid".to_string(), msats.to_string()]);
        }
        if let Some(exp) = self.expires_at {
            tags.push(vec!["expiration".to_string(), exp.to_string()]);
        }
        tags
    }
}
```

### 2. NIP-26 Delegation Token in nostr-core

Add `nostr-core/src/nip26.rs`:

```rust
//! NIP-26: Event delegation.
//! Allows a user (delegator) to authorise a delegate key to sign events
//! within scoped conditions (kind, time window).

use crate::{PublicKey, signer::{Signer, SignerError}};
use secp256k1::{Secp256k1, Message};
use sha2::{Sha256, Digest};

/// A NIP-26 delegation token.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DelegationToken {
    /// The pubkey that is being authorised to sign on behalf of the delegator.
    pub delegatee: PublicKey,
    /// Conditions string: e.g. "kind=1&created_at>1700000000&created_at<1800000000"
    pub conditions: String,
    /// Schnorr signature over SHA-256(delegatee_pubkey + conditions).
    pub token: String,
    /// The delegator's pubkey (for verification).
    pub delegator: PublicKey,
}

impl DelegationToken {
    /// Create a delegation token signed by the delegator's signer.
    ///
    /// conditions format: "kind=N" | "created_at>T" | "created_at<T" joined by "&"
    /// Example: "kind=1&created_at>1700000000&created_at<1800000000"
    pub async fn create(
        delegatee: &PublicKey,
        conditions: &str,
        delegator_signer: &dyn Signer,
    ) -> Result<Self, SignerError> {
        // NIP-26: token = schnorr_sign(sha256("nostr:delegation:" + delegatee_hex + ":" + conditions))
        let message_str = format!(
            "nostr:delegation:{}:{}",
            delegatee.to_hex(),
            conditions
        );
        let hash = Sha256::digest(message_str.as_bytes());
        let msg = Message::from_slice(&hash)
            .map_err(|e| SignerError::SigningFailed(e.to_string()))?;

        // Sign the raw hash using the signer's underlying key
        // Note: Signer::sign_event() signs a full event. For delegation we need
        // to sign a raw hash. Add sign_hash() as an optional Signer method,
        // or use PrfSigner's secp context directly for the CLI case.
        let token_sig = delegator_signer.sign_hash(&hash).await?;

        Ok(Self {
            delegatee: delegatee.clone(),
            conditions: conditions.to_string(),
            token: hex::encode(token_sig.serialize()),
            delegator: delegator_signer.public_key().clone(),
        })
    }

    /// Verify that this token is valid for a given event kind and timestamp.
    pub fn verify_for(&self, kind: u16, created_at: u64) -> Result<(), DelegationError> {
        // Parse conditions
        for condition in self.conditions.split('&') {
            if let Some(kind_str) = condition.strip_prefix("kind=") {
                let required_kind: u16 = kind_str.parse()
                    .map_err(|_| DelegationError::InvalidCondition(condition.to_string()))?;
                if kind != required_kind {
                    return Err(DelegationError::KindNotAllowed { got: kind, required: required_kind });
                }
            } else if let Some(ts_str) = condition.strip_prefix("created_at>") {
                let min_ts: u64 = ts_str.parse()
                    .map_err(|_| DelegationError::InvalidCondition(condition.to_string()))?;
                if created_at <= min_ts {
                    return Err(DelegationError::TimestampTooEarly { ts: created_at, min: min_ts });
                }
            } else if let Some(ts_str) = condition.strip_prefix("created_at<") {
                let max_ts: u64 = ts_str.parse()
                    .map_err(|_| DelegationError::InvalidCondition(condition.to_string()))?;
                if created_at >= max_ts {
                    return Err(DelegationError::TimestampExpired { ts: created_at, max: max_ts });
                }
            }
        }
        // Verify Schnorr signature
        let message_str = format!(
            "nostr:delegation:{}:{}",
            self.delegatee.to_hex(),
            self.conditions
        );
        let hash = Sha256::digest(message_str.as_bytes());
        let msg = Message::from_slice(&hash)
            .map_err(|e| DelegationError::CryptoError(e.to_string()))?;
        let sig_bytes = hex::decode(&self.token)
            .map_err(|e| DelegationError::CryptoError(e.to_string()))?;
        let sig = secp256k1::schnorr::Signature::from_slice(&sig_bytes)
            .map_err(|e| DelegationError::CryptoError(e.to_string()))?;
        let secp = Secp256k1::new();
        secp.verify_schnorr(&sig, &msg, &self.delegator.to_xonly())
            .map_err(|e| DelegationError::InvalidSignature(e.to_string()))
    }

    /// Return the NIP-26 delegation tag array for inclusion in a Nostr event.
    pub fn to_tag(&self) -> Vec<String> {
        vec![
            "delegation".to_string(),
            self.delegator.to_hex(),
            self.conditions.clone(),
            self.token.clone(),
        ]
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DelegationError {
    #[error("kind {got} not allowed by delegation (required: {required})")]
    KindNotAllowed { got: u16, required: u16 },
    #[error("timestamp {ts} earlier than delegation minimum {min}")]
    TimestampTooEarly { ts: u64, min: u64 },
    #[error("timestamp {ts} after delegation expiry {max}")]
    TimestampExpired { ts: u64, max: u64 },
    #[error("invalid condition: {0}")]
    InvalidCondition(String),
    #[error("invalid signature: {0}")]
    InvalidSignature(String),
    #[error("crypto error: {0}")]
    CryptoError(String),
}
```

### 3. Relay Kind Treatment Fix — kind-31990

In `relay-worker/src/relay_do/nip_handlers.rs`, update `event_treatment()`:

```rust
pub fn event_treatment(kind: u16) -> EventTreatment {
    match kind {
        // Metadata — replaceable
        0 | 3 | 10000..=19999 | 31990 => EventTreatment::Replaceable,
        // ^--- Add 31990 here. It was previously falling through to Regular.
        // ...
        // DVM job requests/results/feedback — regular (ephemeral-ish, but store them)
        5000..=5999 | 6000..=6999 | 7000 => EventTreatment::Regular,
        // ...
        _ => EventTreatment::Regular,
    }
}
```

Kind-31990 is a `d`-tag parameterised replaceable event. The relay must treat it as replaceable keyed by `(pubkey, kind, d_tag_value)`. The existing `handle_replaceable_event()` path handles this correctly once `31990` is included in the replaceable range.

### 4. Agent Marketplace Page

New route `/community/marketplace` in `forum-client/src/router.rs`:

```rust
// forum-client/src/pages/marketplace.rs
#[component]
pub fn AgentMarketplace() -> impl IntoView {
    let capability_ads = create_resource(
        || (),
        |_| async move {
            // Fetch kind-31990 events from relay
            relay_query(NostrFilter {
                kinds: Some(vec![31990]),
                limit: Some(50),
                ..Default::default()
            }).await
        },
    );

    view! {
        <div class="marketplace">
            <h1>"Agent Marketplace"</h1>
            <p>"AI agents available to process tasks on your behalf."</p>

            <Suspense fallback=|| view! { <p>"Loading agents..."</p> }>
                {move || capability_ads.get().map(|ads| {
                    ads.iter().map(|ad| view! {
                        <AgentCard ad=ad.clone() />
                    }).collect_view()
                })}
            </Suspense>
        </div>
    }
}

#[component]
fn AgentCard(ad: DvmCapabilityAd) -> impl IntoView {
    let (show_compose, set_show_compose) = create_signal(false);

    view! {
        <div class="agent-card">
            <div class="agent-header">
                {ad.picture.as_ref().map(|p| view! { <img src=p alt="agent avatar" /> })}
                <h3>{&ad.provider_name}</h3>
            </div>
            <p>{&ad.about}</p>
            <div class="supported-kinds">
                {ad.supported_kinds.iter().map(|k| view! {
                    <span class="kind-badge">{format!("kind-{}", k)}</span>
                }).collect_view()}
            </div>
            <button on:click=move |_| set_show_compose(true)>
                "Request Task"
            </button>
            <Show when=move || show_compose()>
                <JobRequestComposer ad=ad.clone() on_close=move || set_show_compose(false) />
            </Show>
        </div>
    }
}
```

The `JobRequestComposer` component allows the user to:
1. Select a job kind from the provider's supported kinds list.
2. Enter inputs (URL, text, or Nostr event ID).
3. Set optional parameters.
4. Choose delegation: the job request can be signed with the user's own key, or they can create a NIP-26 delegation token authorising an agent key to respond.
5. Submit — publishes the kind-5xxx event to the relay.

### 5. auth-worker Delegation API

New endpoint `POST /api/delegation/create` in `auth-worker/src/lib.rs`:

```rust
// auth-worker/src/lib.rs
// POST /api/delegation/create
// Body: { "delegatee_pubkey": "hex", "conditions": "kind=5001&created_at>T&created_at<T" }
// Auth: NIP-98 required
// Returns: { "delegation_tag": ["delegation", delegator_hex, conditions, token_hex] }
async fn create_delegation(req: Request, env: Env) -> Result<Response> {
    let auth = verify_nip98(&req, &env).await?;

    #[derive(Deserialize)]
    struct CreateDelegationBody {
        delegatee_pubkey: String,
        conditions: String,
    }

    let body: CreateDelegationBody = req.json().await
        .map_err(|_| AuthWorkerError::InvalidBody)?;

    // Validate conditions string format
    validate_delegation_conditions(&body.conditions)?;

    // Validate delegatee pubkey
    let delegatee = PublicKey::from_hex(&body.delegatee_pubkey)
        .map_err(|_| AuthWorkerError::InvalidPubkey)?;

    // Get signing key for the authenticated user from KV session
    // (This requires the auth-worker to have access to the session's signing capability.
    // For the NIP-98 path, we reconstruct the signing context from the session key.)
    let session_signer = get_session_signer(&auth.pubkey, &env).await?;

    let token = DelegationToken::create(&delegatee, &body.conditions, &*session_signer).await
        .map_err(AuthWorkerError::Signer)?;

    Response::from_json(&serde_json::json!({
        "delegation_tag": token.to_tag()
    }))
}

fn validate_delegation_conditions(conditions: &str) -> Result<(), AuthWorkerError> {
    // Validate: all parts must be kind=N, created_at>T, or created_at<T
    for condition in conditions.split('&') {
        let valid = condition.starts_with("kind=")
            || condition.starts_with("created_at>")
            || condition.starts_with("created_at<");
        if !valid {
            return Err(AuthWorkerError::InvalidDelegationConditions(condition.to_string()));
        }
    }
    Ok(())
}
```

### 6. Updated Kind Treatment Table

| Kind Range | Treatment | Notes |
|-----------|-----------|-------|
| 0, 3 | Replaceable | User metadata, contact list |
| 5000-5999 | Regular | DVM job requests |
| 6000-6999 | Regular | DVM job results |
| 7000 | Regular | DVM job feedback |
| 10000-19999 | Replaceable | NIP-65 relay lists, pref DM relays, etc. |
| 31990 | Replaceable (param.) | DVM capability ads — FIXED (was Regular) |

## Consequences

### Positive

- DreamLab users can browse, commission, and receive results from AI agent services directly in the forum, without leaving the Nostr ecosystem.
- NIP-26 delegation allows agents to act on behalf of users without accessing the user's root nsec.
- Kind-31990 replaceable treatment fix means provider capability ads are correctly deduplicated — no phantom stale ads from providers who have updated their capabilities.
- The `DvmJobRequest.to_tags()` builder reduces errors in job request construction. All NIP-90 event construction goes through typed APIs.
- The auth-worker delegation endpoint means the forum client never has to expose the user's private key outside the `Signer` abstraction for delegation purposes.

### Negative / Trade-offs

- NIP-90 is still evolving. Kind numbers (5000-5999) and parameter names are subject to change in the spec. The `DvmJobKind` enum may need to be updated as the spec stabilises.
- NIP-26 delegation has a known weakness: the delegation token is irrevocable within its time window. If a delegated agent key is compromised, the delegation cannot be revoked until the `created_at<T` expiry. Mitigation: use short-lived tokens (24-hour maximum). Add a revocation list endpoint to auth-worker in Phase 2.
- The marketplace page requires real-time subscription to kind-31990 events on the relay. If no providers have published kind-31990 ads, the page is empty. Chicken-and-egg problem: the marketplace only becomes useful once providers are registered. Mitigation: DreamLab can register its own internal AI agents as providers on launch.
- `sign_hash()` is added to the `Signer` trait to support NIP-26 raw hash signing. This extends the trait interface defined in ADR-030. The `Nip07Signer` implementation must call `window.nostr.signSchnorr()` if available, or fall back to signing a minimal kind-27235 event and extracting the sig (per NIP-07 extension limitations).

### Neutral

- NIP-90 DVM events (5000-7000) are already stored as `Regular` at the relay — no relay changes needed for basic DVM routing beyond the kind-31990 fix.
- The marketplace page is additive — no existing pages are modified.
- Delegation tokens are client-side constructs. The relay validates them on incoming events using the existing NIP-26 verification path in `relay_do/nip_handlers.rs` (if not already implemented, add it as part of this ADR).

## Options Considered

### Option 1: Build a custom agent RPC protocol instead of NIP-90
- **Pros**: Full control over protocol design; no dependency on evolving NIP.
- **Cons**: Loses ecosystem interoperability. NIP-90 providers (Wavlake, Satlantis, etc.) cannot participate. DreamLab becomes a silo.

### Option 2: Use NIP-59 gift wrap for all DVM job requests (private marketplace)
- **Pros**: Job requests are private — providers cannot see who is requesting what.
- **Cons**: Kind-31990 capability ads must still be public for discovery. Full gift-wrapping adds complexity. Public marketplaces benefit from transparent job history.

### Option 3: Implement delegation via a centrally managed OAuth-like token (auth-worker issues JWTs)
- **Pros**: Revocable, centrally controlled.
- **Cons**: Breaks the self-sovereign model. Agents need a DreamLab account to operate. Not portable to other relays. Contradicts the Nostr-native design goal.

## Related Decisions

- ADR-030: Authentication signer abstraction — `DelegationToken.create()` uses the `Signer` trait.
- ADR-026: Forum professionalisation — trust levels for marketplace access (TL2+ required to submit job requests).
- ADR-034: NIP conformance — kind-31990 in `supported_nips` array.

## References

- [NIP-90: Data Vending Machines](https://github.com/nostr-protocol/nostr/blob/master/90.md)
- [NIP-26: Delegated Event Signing](https://github.com/nostr-protocol/nostr/blob/master/26.md)
- [TENEX reference implementation](https://github.com/tenex-chat/tenex)
- [NIP-89: Recommended Application Handlers](https://github.com/nostr-protocol/nostr/blob/master/89.md)
