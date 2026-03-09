//! JSON-LD WAC (Web Access Control) evaluator.
//!
//! Evaluates ACL documents stored as JSON-LD against incoming requests.
//! Zero external dependencies beyond `serde_json` -- uses direct JSON
//! parsing instead of a full RDF library.
//!
//! Port of `workers/pod-api/acl.ts`.
//!
//! @see <https://solid.github.io/web-access-control-spec/>

use serde::Deserialize;

/// Access mode required for an operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AccessMode {
    Read,
    Write,
    Append,
    Control,
}

/// A JSON-LD ACL document with an `@graph` array of authorizations.
#[derive(Debug, Deserialize)]
pub struct AclDocument {
    #[serde(rename = "@context")]
    #[allow(dead_code)]
    pub context: Option<serde_json::Value>,

    #[serde(rename = "@graph")]
    pub graph: Option<Vec<AclAuthorization>>,
}

/// A single authorization entry within the `@graph` array.
#[derive(Debug, Deserialize)]
pub struct AclAuthorization {
    #[serde(rename = "@id")]
    #[allow(dead_code)]
    pub id: Option<String>,

    #[serde(rename = "@type")]
    #[allow(dead_code)]
    pub r#type: Option<String>,

    #[serde(rename = "acl:agent")]
    pub agent: Option<IdOrIds>,

    #[serde(rename = "acl:agentClass")]
    pub agent_class: Option<IdOrIds>,

    #[serde(rename = "acl:accessTo")]
    pub access_to: Option<IdOrIds>,

    #[serde(rename = "acl:default")]
    pub default: Option<IdOrIds>,

    #[serde(rename = "acl:mode")]
    pub mode: Option<IdOrIds>,
}

/// A JSON-LD `@id` reference -- may be a single object or an array.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum IdOrIds {
    Single(IdRef),
    Multiple(Vec<IdRef>),
}

/// A JSON-LD `@id` reference object.
#[derive(Debug, Deserialize)]
pub struct IdRef {
    #[serde(rename = "@id")]
    pub id: String,
}

// ---------------------------------------------------------------------------
// Mode mapping
// ---------------------------------------------------------------------------

/// Map a mode URI to the set of `AccessMode`s it grants.
///
/// `acl:Write` grants both `Write` and `Append` per the WAC spec.
fn map_mode(mode_ref: &str) -> &'static [AccessMode] {
    match mode_ref {
        "acl:Read" | "http://www.w3.org/ns/auth/acl#Read" => &[AccessMode::Read],
        "acl:Write" | "http://www.w3.org/ns/auth/acl#Write" => {
            &[AccessMode::Write, AccessMode::Append]
        }
        "acl:Append" | "http://www.w3.org/ns/auth/acl#Append" => &[AccessMode::Append],
        "acl:Control" | "http://www.w3.org/ns/auth/acl#Control" => &[AccessMode::Control],
        _ => &[],
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Extract all `@id` strings from an `IdOrIds` value.
fn get_ids(val: &Option<IdOrIds>) -> Vec<&str> {
    match val {
        None => Vec::new(),
        Some(IdOrIds::Single(r)) => vec![r.id.as_str()],
        Some(IdOrIds::Multiple(refs)) => refs.iter().map(|r| r.id.as_str()).collect(),
    }
}

/// Normalize a path: convert relative (`./`) to absolute, strip trailing slashes.
/// Allocates only when the input contains a `./` prefix that needs rewriting.
fn normalize_path_owned(path: &str) -> String {
    let stripped = path.strip_prefix("./").or_else(|| path.strip_prefix('.'));

    let base = match stripped {
        Some("") => "/".to_string(),
        Some(s) if !s.starts_with('/') => format!("/{s}"),
        Some(s) => s.to_string(),
        None => path.to_string(),
    };

    let trimmed = base.trim_end_matches('/');
    if trimmed.is_empty() {
        "/".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Check whether a rule path matches a resource path.
///
/// - `accessTo` (is_default=false): exact match or the resource is a child.
/// - `default`: applies to the container and all its children (prefix match).
fn path_matches(rule_path: &str, resource_path: &str, is_default: bool) -> bool {
    let rule = normalize_path_owned(rule_path);
    let resource = normalize_path_owned(resource_path);

    if !is_default {
        // accessTo: exact match or resource is under the specified container
        resource == rule || resource.starts_with(&format!("{rule}/"))
    } else {
        // default: applies to children of the container
        resource.starts_with(&format!("{rule}/")) || resource == rule
    }
}

/// Collect the granted `AccessMode`s from an authorization entry.
fn get_modes(auth: &AclAuthorization) -> Vec<AccessMode> {
    let mut modes = Vec::new();
    for mode_ref in get_ids(&auth.mode) {
        modes.extend_from_slice(map_mode(mode_ref));
    }
    modes
}

/// Check whether the agent matches the authorization entry.
fn agent_matches(auth: &AclAuthorization, agent_uri: Option<&str>) -> bool {
    // Specific agent match
    let agents = get_ids(&auth.agent);
    if let Some(uri) = agent_uri {
        if agents.contains(&uri) {
            return true;
        }
    }

    // Agent class match
    let classes = get_ids(&auth.agent_class);
    for cls in &classes {
        // foaf:Agent matches everyone (public access)
        if *cls == "foaf:Agent" || *cls == "http://xmlns.com/foaf/0.1/Agent" {
            return true;
        }
        // acl:AuthenticatedAgent matches any authenticated user
        if agent_uri.is_some()
            && (*cls == "acl:AuthenticatedAgent"
                || *cls == "http://www.w3.org/ns/auth/acl#AuthenticatedAgent")
        {
            return true;
        }
    }

    false
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Evaluate whether access should be granted based on an ACL document.
///
/// # Arguments
/// * `acl_doc` - Parsed JSON-LD ACL document (or `None` for no ACL)
/// * `agent_uri` - The requesting agent's URI (e.g. `"did:nostr:{pubkey}"`) or `None` for anonymous
/// * `resource_path` - The resource path being accessed (e.g. `"/profile/card"`)
/// * `required_mode` - The access mode required for the operation
///
/// # Returns
/// `true` if access is granted, `false` otherwise.
/// No ACL document = deny all (secure by default).
pub fn evaluate_access(
    acl_doc: Option<&AclDocument>,
    agent_uri: Option<&str>,
    resource_path: &str,
    required_mode: AccessMode,
) -> bool {
    let graph = match acl_doc.and_then(|d| d.graph.as_ref()) {
        Some(g) => g,
        None => return false, // No ACL = deny all
    };

    for auth in graph {
        // Check if this authorization grants the required mode
        let granted = get_modes(auth);
        if !granted.contains(&required_mode) {
            continue;
        }

        // Check if the agent matches
        if !agent_matches(auth, agent_uri) {
            continue;
        }

        // Check accessTo paths (exact / child match)
        let access_to = get_ids(&auth.access_to);
        for target in &access_to {
            if path_matches(target, resource_path, false) {
                return true;
            }
        }

        // Check default paths (prefix match)
        let defaults = get_ids(&auth.default);
        for target in &defaults {
            if path_matches(target, resource_path, true) {
                return true;
            }
        }
    }

    false
}

/// Map an HTTP method to the required ACL `AccessMode`.
pub fn method_to_mode(method: &str) -> AccessMode {
    match method.to_uppercase().as_str() {
        "GET" | "HEAD" => AccessMode::Read,
        "PUT" | "DELETE" => AccessMode::Write,
        "POST" => AccessMode::Append,
        _ => AccessMode::Read,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_doc(graph: Vec<AclAuthorization>) -> AclDocument {
        AclDocument {
            context: None,
            graph: Some(graph),
        }
    }

    fn auth_read_public(path: &str) -> AclAuthorization {
        AclAuthorization {
            id: None,
            r#type: None,
            agent: None,
            agent_class: Some(IdOrIds::Single(IdRef {
                id: "foaf:Agent".to_string(),
            })),
            access_to: Some(IdOrIds::Single(IdRef {
                id: path.to_string(),
            })),
            default: None,
            mode: Some(IdOrIds::Single(IdRef {
                id: "acl:Read".to_string(),
            })),
        }
    }

    fn auth_write_agent(path: &str, agent: &str) -> AclAuthorization {
        AclAuthorization {
            id: None,
            r#type: None,
            agent: Some(IdOrIds::Single(IdRef {
                id: agent.to_string(),
            })),
            agent_class: None,
            access_to: Some(IdOrIds::Single(IdRef {
                id: path.to_string(),
            })),
            default: None,
            mode: Some(IdOrIds::Single(IdRef {
                id: "acl:Write".to_string(),
            })),
        }
    }

    #[test]
    fn no_acl_denies_all() {
        assert!(!evaluate_access(None, None, "/foo", AccessMode::Read));
    }

    #[test]
    fn empty_graph_denies_all() {
        let doc = AclDocument {
            context: None,
            graph: None,
        };
        assert!(!evaluate_access(Some(&doc), None, "/foo", AccessMode::Read));
    }

    #[test]
    fn public_read_grants_anonymous() {
        let doc = make_doc(vec![auth_read_public("/")]);
        assert!(evaluate_access(Some(&doc), None, "/", AccessMode::Read));
    }

    #[test]
    fn public_read_denies_write() {
        let doc = make_doc(vec![auth_read_public("/")]);
        assert!(!evaluate_access(Some(&doc), None, "/", AccessMode::Write));
    }

    #[test]
    fn agent_write_grants_matching_agent() {
        let agent = "did:nostr:abc123";
        let doc = make_doc(vec![auth_write_agent("/data", agent)]);
        assert!(evaluate_access(
            Some(&doc),
            Some(agent),
            "/data",
            AccessMode::Write
        ));
    }

    #[test]
    fn agent_write_denies_different_agent() {
        let doc = make_doc(vec![auth_write_agent("/data", "did:nostr:abc123")]);
        assert!(!evaluate_access(
            Some(&doc),
            Some("did:nostr:other"),
            "/data",
            AccessMode::Write
        ));
    }

    #[test]
    fn acl_write_grants_append() {
        let agent = "did:nostr:abc123";
        let doc = make_doc(vec![auth_write_agent("/data", agent)]);
        assert!(evaluate_access(
            Some(&doc),
            Some(agent),
            "/data",
            AccessMode::Append
        ));
    }

    #[test]
    fn access_to_matches_children() {
        let doc = make_doc(vec![auth_read_public("/media")]);
        assert!(evaluate_access(
            Some(&doc),
            None,
            "/media/photo.jpg",
            AccessMode::Read
        ));
    }

    #[test]
    fn default_applies_to_children() {
        let auth = AclAuthorization {
            id: None,
            r#type: None,
            agent: None,
            agent_class: Some(IdOrIds::Single(IdRef {
                id: "foaf:Agent".to_string(),
            })),
            access_to: None,
            default: Some(IdOrIds::Single(IdRef {
                id: "/public".to_string(),
            })),
            mode: Some(IdOrIds::Single(IdRef {
                id: "acl:Read".to_string(),
            })),
        };
        let doc = make_doc(vec![auth]);
        assert!(evaluate_access(
            Some(&doc),
            None,
            "/public/file.txt",
            AccessMode::Read
        ));
    }

    #[test]
    fn authenticated_agent_requires_auth() {
        let auth = AclAuthorization {
            id: None,
            r#type: None,
            agent: None,
            agent_class: Some(IdOrIds::Single(IdRef {
                id: "acl:AuthenticatedAgent".to_string(),
            })),
            access_to: Some(IdOrIds::Single(IdRef {
                id: "/members".to_string(),
            })),
            default: None,
            mode: Some(IdOrIds::Single(IdRef {
                id: "acl:Read".to_string(),
            })),
        };
        let doc = make_doc(vec![auth]);

        // Anonymous denied
        assert!(!evaluate_access(
            Some(&doc),
            None,
            "/members",
            AccessMode::Read
        ));
        // Authenticated granted
        assert!(evaluate_access(
            Some(&doc),
            Some("did:nostr:abc"),
            "/members",
            AccessMode::Read
        ));
    }

    #[test]
    fn normalize_relative_path() {
        assert_eq!(normalize_path_owned("./profile/"), "/profile");
        assert_eq!(normalize_path_owned("./"), "/");
        assert_eq!(normalize_path_owned("."), "/");
        assert_eq!(normalize_path_owned("/foo/bar/"), "/foo/bar");
        assert_eq!(normalize_path_owned("/"), "/");
    }

    #[test]
    fn method_to_mode_mapping() {
        assert_eq!(method_to_mode("GET"), AccessMode::Read);
        assert_eq!(method_to_mode("HEAD"), AccessMode::Read);
        assert_eq!(method_to_mode("PUT"), AccessMode::Write);
        assert_eq!(method_to_mode("DELETE"), AccessMode::Write);
        assert_eq!(method_to_mode("POST"), AccessMode::Append);
        assert_eq!(method_to_mode("PATCH"), AccessMode::Read); // default
    }

    #[test]
    fn full_uri_mode_recognized() {
        let auth = AclAuthorization {
            id: None,
            r#type: None,
            agent: None,
            agent_class: Some(IdOrIds::Single(IdRef {
                id: "http://xmlns.com/foaf/0.1/Agent".to_string(),
            })),
            access_to: Some(IdOrIds::Single(IdRef {
                id: "/".to_string(),
            })),
            default: None,
            mode: Some(IdOrIds::Single(IdRef {
                id: "http://www.w3.org/ns/auth/acl#Read".to_string(),
            })),
        };
        let doc = make_doc(vec![auth]);
        assert!(evaluate_access(Some(&doc), None, "/", AccessMode::Read));
    }

    #[test]
    fn multiple_modes_on_single_auth() {
        let auth = AclAuthorization {
            id: None,
            r#type: None,
            agent: Some(IdOrIds::Single(IdRef {
                id: "did:nostr:owner".to_string(),
            })),
            agent_class: None,
            access_to: Some(IdOrIds::Single(IdRef {
                id: "/".to_string(),
            })),
            default: None,
            mode: Some(IdOrIds::Multiple(vec![
                IdRef {
                    id: "acl:Read".to_string(),
                },
                IdRef {
                    id: "acl:Write".to_string(),
                },
                IdRef {
                    id: "acl:Control".to_string(),
                },
            ])),
        };
        let doc = make_doc(vec![auth]);
        let agent = Some("did:nostr:owner");
        assert!(evaluate_access(Some(&doc), agent, "/", AccessMode::Read));
        assert!(evaluate_access(Some(&doc), agent, "/", AccessMode::Write));
        assert!(evaluate_access(Some(&doc), agent, "/", AccessMode::Append));
        assert!(evaluate_access(Some(&doc), agent, "/", AccessMode::Control));
    }

    #[test]
    fn deserialize_acl_document() {
        let json = concat!(
            r##"{"@context":{"acl":"http://www.w3.org/ns/auth/acl#"},"##,
            r##""@graph":[{"@id":"#public","##,
            r##""acl:agentClass":{"@id":"foaf:Agent"},"##,
            r##""acl:accessTo":{"@id":"/"},"##,
            r##""acl:mode":{"@id":"acl:Read"}}]}"##,
        );
        let doc: AclDocument = serde_json::from_str(json).unwrap();
        assert!(evaluate_access(Some(&doc), None, "/", AccessMode::Read));
    }
}
