//! The site's gift-wrap recipients are declared once, in `dreamlab.toml`
//! `[[ingress]]` (kit ADR-2022, website ADR-2011), and mirrored by hand into the
//! relay's `INGRESS_RECIPIENTS` binding and the build env (ADR-2005). The relay
//! binding is rendered here with the kit's own `ingress_relay_var`, so a drift
//! between the TOML and the deployed binding is a test failure, not an outage.
use std::path::{Path, PathBuf};

use nostr_bbs_config::ingress::{ingress_relay_var, parse_ingress_relay_var, IngressRole};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf()
}

fn config() -> nostr_bbs_config::ForumConfig {
    nostr_bbs_config::load_from_path(root().join("dreamlab.toml"))
        .expect("dreamlab.toml loads and validates")
}

const ADMIN: &str = "11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c";
const JARVIS: &str = "2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9";
const MONITOR: &str = "4ed429aa7f30d6e63c41be50685cffeb03cd7b07e37d37a0c4ae5321e642aad7";

#[test]
fn toml_declares_the_three_site_recipients() {
    let cfg = config();
    let by = |pk: &str| cfg.ingress.iter().find(|e| e.pubkey == pk);
    assert_eq!(
        by(ADMIN).map(|e| e.role),
        Some(IngressRole::Primary),
        "contact and signup inbox"
    );
    assert_eq!(
        by(JARVIS).map(|e| e.role),
        Some(IngressRole::Agent),
        "Talk-to-AI agent"
    );
    assert_eq!(
        by(MONITOR).map(|e| e.role),
        Some(IngressRole::Copy),
        "website-info copy"
    );
    assert_eq!(cfg.ingress.len(), 3, "no undeclared recipient");
}

#[test]
fn relay_binding_mirrors_the_toml() {
    let manifest: toml::Value =
        std::fs::read_to_string(root().join("deploy/relay-worker.wrangler.toml"))
            .expect("relay wrangler manifest")
            .parse()
            .expect("wrangler manifest is TOML");
    let bound = manifest["vars"]["INGRESS_RECIPIENTS"]
        .as_str()
        .expect("INGRESS_RECIPIENTS var is set on the relay worker");
    let expected = parse_ingress_relay_var(&ingress_relay_var(&config().ingress));
    assert_eq!(parse_ingress_relay_var(bound), expected);
    assert!(!expected.is_empty(), "the binding is not silently empty");
}

#[test]
fn build_env_names_the_same_keys() {
    let deploy = std::fs::read_to_string(root().join("../.github/workflows/deploy.yml"))
        .expect("deploy.yml");
    for (var, pk) in [
        ("VITE_ADMIN_PUBKEY", ADMIN),
        ("VITE_JARVIS_PUBKEY", JARVIS),
        ("VITE_MONITOR_PUBKEY", MONITOR),
    ] {
        assert!(
            deploy.contains(&format!("{var}: '{pk}'")),
            "{var} in deploy.yml must be the declared recipient"
        );
    }
}

/// Declaring a recipient must never be how a key gains access: the monitor is
/// whitelisted with no cohorts and must not be rostered into `agent`, which
/// receives the key of every zone with `agent_keys = true`.
#[test]
fn counter_example_monitor_holds_no_agent_cohort() {
    let toml_text = std::fs::read_to_string(root().join("dreamlab.toml")).unwrap();
    let doc: toml::Value = toml_text.parse().unwrap();
    for agent in doc["agents"].as_array().unwrap() {
        if agent["pubkey"].as_str() == Some(MONITOR) {
            let cohorts = agent["cohorts"].as_array().unwrap();
            assert!(
                cohorts.is_empty(),
                "monitor carries no cohorts: {cohorts:?}"
            );
        }
    }
}
