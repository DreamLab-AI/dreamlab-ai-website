# ADR-029: JSON-LD Processing Strategy — json-ld 0.21.4 with NoLoader

## Status: Proposed — not yet implemented in the deployed overlay

> **Adjudication (2026-06-11):** This ADR adds `json-ld`, `iref`, `rdf-types`,
> and `oxigraph` to `pod-worker/Cargo.toml` and the workspace root, and replaces
> hand-crafted JSON-LD string templates with typed builders — all against the
> deleted in-tree `community-forum-rs` port. None of those crates appear in
> `forum-config/Cargo.toml` (the overlay pins only `nostr-bbs-{core,config,mesh,rate-limit}`,
> `serde`, `serde_json`, `toml`, `thiserror`, `worker`). The pod surface's WebID
> emission and ACL-container resolution are now governed by the upstream kit
> (see `nostr-rust-forum` ADR-096, referenced in `docs/forum-onboarding.md`).
> Whether the kit adopts a typed JSON-LD processor is a kit decision, not
> overlay-observable here. **Blocked on:** upstream adoption (or an explicit
> overlay-level decision to vendor the RDF stack). Kept Proposed.

## Date: 2026-05-06

## Context

All JSON-LD documents in the DreamLab pod-worker are produced by hand-crafted Rust string templates. The `profile.rs`, `acl.rs`, and `type_index.rs` modules in pod-worker each contain `format!()` calls that interpolate pubkey hex strings and display names directly into JSON-LD serialisation strings. This approach works for the current narrow set of document shapes but has structural weaknesses that will become blocking issues as the Solid pod feature set expands.

The core problems with string-template JSON-LD are: (1) ACL documents are semantically valid Turtle/JSON-LD for the specific templates in use, but any structural extension (adding a new agent class, adding a conditional rule) requires editing the format string rather than a typed builder call — bugs in the template produce invalid documents that fail WAC evaluation silently; (2) WebID profiles cannot be verified by external Linked Data processors such as Comunica, rdflib.js, or Solid OS, because the `@context` IRIs in the template reference remote context documents that are never fetched or validated — a profile that references `https://www.w3.org/ns/solid/terms` in its context but has no way to verify IRI expansion will fail context-sensitive SPARQL queries; (3) cross-pod RDF operations (reading another user's pod) will silently fail to parse their `@context` if the context IRI is not one of DreamLab's own templates — the reader code has no JSON-LD expansion capability; (4) the TypeIndex documents use IRI strings that are locally correct but will fail to resolve in the presence of any context mismatch.

The crate `json-ld = "0.21.4"` by Timothée Haudebourg is the best-maintained JSON-LD 1.1 implementation in the Rust ecosystem. It provides expansion, compaction, flattening, and framing, and critically it accepts a `Loader` trait parameter — including a `NoLoader` implementation that returns errors if any remote context fetch is attempted. This makes it safe for `wasm32-unknown-unknown` environments where outbound HTTP is restricted to the `fetch` API. All context documents can be bundled at compile time as `&'static str` and injected via a `StaticLoader`.

The `iref = "4.0.0"` crate provides `IriBuf` and `Iri` types used throughout json-ld's API. The `rdf-types = "0.22.5"` crate provides `Quad`, `Triple`, `Literal`, `BlankNodeId`, and `Term` types for RDF graph manipulation. `oxigraph = { version = "0.5.8", default-features = false }` provides an in-memory SPARQL 1.1 engine that compiles to wasm32 (with `default-features = false` to exclude the RocksDB backend). These four crates form a coherent RDF stack for the pod-worker.

A workspace-wide `iref` version pin is necessary because `json-ld 0.21.4` depends on `iref 4.0.0` and other crates in the workspace (particularly `nostr = "0.44.2"`) have transitive dependencies that may pull in `iref 3.x` — the two versions are not compatible and Cargo will refuse to unify them, producing a build error.

## Decision

Add `json-ld`, `iref`, `rdf-types`, and `oxigraph` to the pod-worker and forum-client Cargo.toml. Replace all hand-crafted JSON-LD string templates with typed builder patterns. Bundle all required contexts as compile-time static strings.

### 1. Cargo.toml Changes

**`pod-worker/Cargo.toml` additions:**

```toml
[dependencies]
json-ld = { version = "0.21.4", default-features = false, features = ["serde"] }
iref = "4.0.0"
rdf-types = "0.22.5"
oxigraph = { version = "0.5.8", default-features = false }

[patch.crates-io]
# Pin iref workspace-wide to resolve version conflict with any transitive 3.x dependency
iref = { version = "4.0.0" }
```

**Workspace root `Cargo.toml` addition:**

```toml
[workspace.dependencies]
iref = "4.0.0"
json-ld = { version = "0.21.4", default-features = false, features = ["serde"] }
rdf-types = "0.22.5"
oxigraph = { version = "0.5.8", default-features = false }
```

If `nostr = "0.44.2"` transitively requires `iref 3.x`, the `[patch.crates-io]` approach may fail. In that case, investigate the nostr dependency graph via `cargo tree -p nostr -i iref` and, if confirmed, fork the offending crate's `Cargo.toml` in a `[patch]` section to relax the constraint. The alternative is to use `iref`'s compatibility shim (`iref-compat`) if one exists for 3.x → 4.x.

### 2. Context Caching Strategy — `contexts.rs`

Create `pod-worker/src/contexts.rs` with all required JSON-LD contexts bundled at compile time:

```rust
//! Bundled JSON-LD contexts for offline processing.
//!
//! All contexts are embedded at compile time. No network fetches occur.
//! Sources: fetched once from authoritative URLs, reviewed, and pinned.
//! Re-pin when context versions change (check Context-Type: ETag header).

/// W3C DID Core context 1.0
/// Source: https://www.w3.org/ns/did/v1
pub static DID_CONTEXT: &str = include_str!("../contexts/did-v1.jsonld");

/// W3C FOAF ontology context
/// Source: http://xmlns.com/foaf/0.1/
pub static FOAF_CONTEXT: &str = include_str!("../contexts/foaf.jsonld");

/// Solid Terms context
/// Source: https://www.w3.org/ns/solid/terms
pub static SOLID_CONTEXT: &str = include_str!("../contexts/solid-terms.jsonld");

/// W3C Web Access Control context
/// Source: http://www.w3.org/ns/auth/acl
pub static ACL_CONTEXT: &str = include_str!("../contexts/acl.jsonld");

/// Schema.org context (subset — name, identifier only)
/// Source: https://schema.org/
pub static SCHEMA_CONTEXT: &str = include_str!("../contexts/schema-subset.jsonld");

/// Nostr ontology context (community-defined)
/// Source: https://nostr.com/ontology
pub static NOSTR_CONTEXT: &str = include_str!("../contexts/nostr-ontology.jsonld");

/// Build a StaticLoader pre-loaded with all bundled contexts.
pub fn bundled_loader() -> json_ld::loader::StaticLoader {
    let mut loader = json_ld::loader::StaticLoader::new();
    loader.insert(
        iref::IriBuf::new("https://www.w3.org/ns/did/v1").unwrap(),
        json_ld::RemoteDocument::new(
            None, None,
            serde_json::from_str(DID_CONTEXT).expect("bundled DID context is valid JSON-LD"),
        ),
    );
    loader.insert(
        iref::IriBuf::new("http://xmlns.com/foaf/0.1/").unwrap(),
        json_ld::RemoteDocument::new(None, None, serde_json::from_str(FOAF_CONTEXT).unwrap()),
    );
    loader.insert(
        iref::IriBuf::new("https://www.w3.org/ns/solid/terms").unwrap(),
        json_ld::RemoteDocument::new(None, None, serde_json::from_str(SOLID_CONTEXT).unwrap()),
    );
    loader.insert(
        iref::IriBuf::new("http://www.w3.org/ns/auth/acl").unwrap(),
        json_ld::RemoteDocument::new(None, None, serde_json::from_str(ACL_CONTEXT).unwrap()),
    );
    loader.insert(
        iref::IriBuf::new("https://schema.org/").unwrap(),
        json_ld::RemoteDocument::new(None, None, serde_json::from_str(SCHEMA_CONTEXT).unwrap()),
    );
    loader.insert(
        iref::IriBuf::new("https://nostr.com/ontology").unwrap(),
        json_ld::RemoteDocument::new(None, None, serde_json::from_str(NOSTR_CONTEXT).unwrap()),
    );
    loader
}
```

The context JSON-LD files are added to `pod-worker/contexts/` directory. Each is fetched once from its authoritative URL during development and pinned as a file. The `contexts/` directory is committed to the repository. A README in that directory documents when each context was fetched and how to update it.

### 3. Typed ACL Document Builder

Replace the current ACL string template in `pod-worker/src/acl.rs`. The current implementation is:

```rust
// BEFORE: brittle string template
pub fn build_acl_document(resource_uri: &str, owner_webid: &str) -> String {
    format!(r#"{{
        "@context": {{ "acl": "http://www.w3.org/ns/auth/acl#", ... }},
        "@graph": [{{
            "@id": "#owner",
            "@type": "acl:Authorization",
            "acl:agent": {{ "@id": "{}" }},
            "acl:accessTo": {{ "@id": "{}" }},
            "acl:mode": [{{ "@id": "acl:Read" }}, {{ "@id": "acl:Write" }}, {{ "@id": "acl:Control" }}]
        }}]
    }}"#, owner_webid, resource_uri)
}
```

The new typed builder:

```rust
// AFTER: typed builder using json-ld
use serde_json::{json, Value};
use crate::contexts::bundled_loader;

pub struct AclDocumentBuilder {
    resource_uri: String,
    authorizations: Vec<AclAuthorization>,
}

pub struct AclAuthorization {
    pub id: String,
    pub agents: Vec<AclAgent>,
    pub modes: Vec<AclMode>,
    pub default_for: Option<String>,
}

pub enum AclAgent {
    WebId(String),
    AgentClass(WellKnownAgentClass),
    WebIdGroup(String),
}

pub enum WellKnownAgentClass {
    AuthenticatedAgent,
    Agent,  // public
}

#[derive(Clone, Copy)]
pub enum AclMode { Read, Write, Append, Control }

impl AclDocumentBuilder {
    pub fn new(resource_uri: impl Into<String>) -> Self {
        Self { resource_uri: resource_uri.into(), authorizations: vec![] }
    }

    pub fn add_authorization(mut self, auth: AclAuthorization) -> Self {
        self.authorizations.push(auth);
        self
    }

    /// Convenience: owner-only ACL (most common case)
    pub fn owner_only(resource_uri: impl Into<String>, owner_webid: impl Into<String>) -> Self {
        let uri = resource_uri.into();
        Self::new(uri.clone()).add_authorization(AclAuthorization {
            id: "owner".to_string(),
            agents: vec![AclAgent::WebId(owner_webid.into())],
            modes: vec![AclMode::Read, AclMode::Write, AclMode::Control],
            default_for: Some(uri),
        })
    }

    pub fn build(self) -> Value {
        let graph: Vec<Value> = self.authorizations.iter().map(|auth| {
            let modes: Vec<Value> = auth.modes.iter().map(|m| json!({
                "@id": match m {
                    AclMode::Read => "acl:Read",
                    AclMode::Write => "acl:Write",
                    AclMode::Append => "acl:Append",
                    AclMode::Control => "acl:Control",
                }
            })).collect();

            let agents: Vec<Value> = auth.agents.iter().map(|a| match a {
                AclAgent::WebId(uri) => json!({"@id": uri}),
                AclAgent::AgentClass(WellKnownAgentClass::AuthenticatedAgent) =>
                    json!({"@id": "acl:AuthenticatedAgent"}),
                AclAgent::AgentClass(WellKnownAgentClass::Agent) =>
                    json!({"@id": "acl:Agent"}),
                AclAgent::WebIdGroup(uri) => json!({"@id": uri}),
            }).collect();

            let mut obj = json!({
                "@id": format!("#{}", auth.id),
                "@type": "acl:Authorization",
                "acl:agent": agents,
                "acl:accessTo": {"@id": &self.resource_uri},
                "acl:mode": modes
            });
            if let Some(ref default_for) = auth.default_for {
                obj["acl:default"] = json!({"@id": default_for});
            }
            obj
        }).collect();

        json!({
            "@context": {
                "acl": "http://www.w3.org/ns/auth/acl#",
                "foaf": "http://xmlns.com/foaf/0.1/"
            },
            "@graph": graph
        })
    }

    /// Expand the document using the bundled JSON-LD processor.
    /// Returns an expanded JSON-LD array suitable for RDF triple extraction.
    pub async fn expand(self) -> Result<Value, JsonLdError> {
        let doc = self.build();
        let loader = bundled_loader();
        let expanded = json_ld::expand(
            &doc,
            None,
            &loader,
            json_ld::Options::default(),
        ).await.map_err(JsonLdError::Expansion)?;
        Ok(serde_json::to_value(expanded).map_err(JsonLdError::Serialization)?)
    }
}
```

Usage at call site:

```rust
// pod-worker/src/handlers/acl_handler.rs
let acl_doc = AclDocumentBuilder::owner_only(
    &resource_uri,
    &format!("https://pods.dreamlab-ai.com/{}/profile/card#me", pubkey)
).build();
let acl_json = serde_json::to_string(&acl_doc)?;
storage.put(&acl_path, acl_json.into_bytes(), "application/ld+json").await?;
```

### 4. In-Memory SPARQL with oxigraph

For cross-pod operations (reading another user's ACL, resolving group membership), use oxigraph's in-memory store:

```rust
// pod-worker/src/rdf.rs
use oxigraph::store::Store;
use oxigraph::io::RdfFormat;
use oxigraph::sparql::QueryResults;

pub fn evaluate_wac_sparql(
    acl_jsonld: &str,
    webid_profile_jsonld: &str,
    agent_webid: &str,
    resource_uri: &str,
    access_mode: &str,
) -> Result<bool, RdfError> {
    let store = Store::new().map_err(RdfError::Store)?;

    // Load ACL document
    store.load_from_reader(
        RdfFormat::JsonLd,
        acl_jsonld.as_bytes(),
        None,
    ).map_err(RdfError::Load)?;

    // Load agent's WebID profile (for group membership)
    store.load_from_reader(
        RdfFormat::JsonLd,
        webid_profile_jsonld.as_bytes(),
        None,
    ).map_err(RdfError::Load)?;

    // SPARQL ASK query implementing WAC 2.0 §4
    let query = format!(r#"
        PREFIX acl: <http://www.w3.org/ns/auth/acl#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        ASK {{
            ?auth a acl:Authorization ;
                  acl:accessTo <{resource}> ;
                  acl:mode <{mode}> ;
                  (acl:agent|acl:agentClass) <{agent}> .
        }}
    "#, resource = resource_uri, mode = access_mode, agent = agent_webid);

    match store.query(&query).map_err(RdfError::Query)? {
        QueryResults::Boolean(b) => Ok(b),
        _ => Err(RdfError::UnexpectedQueryResult),
    }
}
```

### 5. iref Version Conflict Resolution

Run `cargo tree --workspace -i iref` before merging. If multiple versions appear:

1. Identify which crates require `iref 3.x`.
2. If the requirement is via `nostr = "0.44.2"`, check if a newer nostr patch release has updated to `iref 4.x`.
3. If not, add a workspace-level patch: `[patch.crates-io] iref = { git = "...", branch = "..." }` pointing to a fork where the version constraint is relaxed.
4. As a last resort, use cargo's `[patch]` mechanism to replace the offending transitive dependency with a compatible version.

Document the resolution in `DEPENDENCIES.md` at the workspace root.

## Consequences

### Positive

- ACL documents are now type-checked at build time. Invalid mode combinations (e.g., `Control` without `Write`) can be caught in unit tests via the builder API.
- WebID profiles can be verified by external Linked Data processors — enables Solid app interoperability.
- Cross-pod RDF operations can correctly parse and evaluate ACL documents from other Solid servers, not just DreamLab's own templates.
- oxigraph SPARQL in-memory evaluation allows arbitrarily complex WAC queries (group membership, default ACL inheritance) without custom recursive logic.
- Bundled contexts eliminate the TOCTOU risk of remote context changes breaking deployed workers.

### Negative / Trade-offs

- Bundling 6 context files adds approximately 50-120KB to the wasm binary. CF Workers has a 10MB compressed wasm limit; this is not a concern at current binary sizes (~800KB).
- `json-ld 0.21.4` is an async API — expansion requires `await`. This adds async plumbing to previously synchronous document builders. In the CF Workers runtime this is a no-op (everything is async), but it changes function signatures.
- `iref = "4.0.0"` pin is a workspace-wide constraint. If a dependency requires `iref 3.x`, the resolution is a manual intervention step, not automatic.
- oxigraph with `default-features = false` compiles to wasm32 but has not been benchmarked in the CF Workers memory model. Complex SPARQL queries on large ACL graphs could exceed the 128MB Workers memory limit. Mitigation: limit graph loading to the specific ACL document and the requesting agent's WebID profile only (two documents, bounded size).
- Context files committed to the repository will become stale as W3C context documents evolve. A dependency management process (documented in `DEPENDENCIES.md`) is required to detect and update stale contexts.

### Neutral

- The `build()` method returns `serde_json::Value` for direct serialisation. The `expand()` method returns expanded JSON-LD for RDF processing. Callers choose which form they need.
- Existing JSON-LD string templates can be replaced incrementally — the old and new code can coexist during migration. No flag day required.

## Options Considered

### Option 1: Continue with string templates — add validation layer
- **Pros**: Zero new dependencies; no wasm32 risk.
- **Cons**: Structural bugs remain; cross-pod RDF operations remain broken; external Solid clients cannot verify profiles. This defers the problem until it becomes user-visible.

### Option 2: Use `sophia_api` + `sophia_jsonld` crates
- **Pros**: More modular RDF stack; sophia has strong Turtle/N-Quads support.
- **Cons**: `sophia_jsonld` is experimental; lacks JSON-LD 1.1 framing support; `json-ld 0.21.4` is more actively maintained and better tested.

### Option 3: Process JSON-LD on the client (forum-client WASM) and send pre-processed triples to pod-worker
- **Pros**: Removes JSON-LD processing from the server hot path.
- **Cons**: ACL evaluation must happen server-side (the server cannot trust client-provided access decisions); this only pushes the processing one hop, not eliminating it.

### Option 4: Use JavaScript JSON-LD libraries via wasm-bindgen interop
- **Pros**: `jsonld.js` is battle-tested and feature-complete.
- **Cons**: Introducing a JS dependency into a Rust Worker creates a brittle wasm-bindgen binding layer; the CF Workers JS runtime is sandboxed and may not expose all Node.js-style APIs that jsonld.js depends on.

## Related Decisions

- ADR-027: Canonical identity stack — WebID profile JSON-LD additions use the typed builder from this ADR.
- ADR-028: AGPL boundary — `solid-core` WAC evaluator uses oxigraph SPARQL defined here.
- ADR-025: Solid pod infrastructure — the storage layer that the JSON-LD documents are written to.

## References

- [json-ld 0.21.4 crate](https://crates.io/crates/json-ld)
- [oxigraph 0.5.8 crate](https://crates.io/crates/oxigraph)
- [iref 4.0.0 crate](https://crates.io/crates/iref)
- [JSON-LD 1.1 W3C Recommendation](https://www.w3.org/TR/json-ld11/)
- [W3C WAC Specification](https://solidproject.org/TR/wac)
- [W3C SPARQL 1.1](https://www.w3.org/TR/sparql11-query/)
