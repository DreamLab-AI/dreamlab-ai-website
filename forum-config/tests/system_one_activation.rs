//! Deployment must enable the readers, schedule triage, and preserve locality.
use std::path::Path;

fn manifest(worker: &str) -> toml::Value {
    std::fs::read_to_string(
        Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("deploy/{worker}-worker.wrangler.toml")),
    )
    .unwrap()
    .parse()
    .unwrap()
}

#[test]
fn public_consumers_use_authenticated_cloud_judge() {
    for (worker, flag) in [("search", "JEV_SEARCH_RERANK"), ("relay", "JEV_TRIAGE")] {
        let m = manifest(worker);
        let vars = m["vars"].as_table().unwrap();
        assert_eq!(vars[flag].as_str(), Some("1"));
        assert_eq!(
            vars["JEV_ENDPOINT"].as_str(),
            Some("https://api.subq.ai/v1/systemone")
        );
        assert_eq!(vars["JEV_API_KEY_NAME"].as_str(), Some("SUBQ_API_KEY"));
        assert!(
            !vars.contains_key("SUBQ_API_KEY"),
            "secret values must not be committed"
        );
        assert!(
            !vars.contains_key("JEV_LOCAL"),
            "cloud endpoint must never be declared local"
        );
    }
}

#[test]
fn moderation_has_a_scheduled_caller() {
    assert_eq!(
        manifest("relay")["triggers"]["crons"][0].as_str(),
        Some("*/5 * * * *")
    );
}

#[test]
fn rationale_route_is_enabled_without_false_sovereign_endpoint() {
    let m = manifest("auth");
    let vars = m["vars"].as_table().unwrap();
    assert_eq!(vars["JEV_RATIONALE_CHECK"].as_str(), Some("1"));
    assert!(!vars.contains_key("JEV_ENDPOINT"));
    assert!(!vars.contains_key("JEV_LOCAL"));
}
