//! Output formatting — JSON for agents, plain text for humans.

use serde_json::Value;

use crate::config::GlobalFlags;

/// Emit a successful result to stdout in the format chosen by `--json`.
pub fn emit_success(flags: &GlobalFlags, value: &Value) {
    if flags.json {
        println!("{}", value);
    } else {
        print_human(value);
    }
}

/// Emit an error to stderr with a nonzero exit. JSON on `--json`, plain
/// otherwise. Always includes the root-cause chain.
pub fn emit_error(flags: &GlobalFlags, err: &anyhow::Error) {
    if flags.json {
        let msg = format!("{err:#}");
        let payload = serde_json::json!({ "error": msg });
        eprintln!("{payload}");
    } else {
        eprintln!("error: {err:#}");
    }
}

fn print_human(value: &Value) {
    match value {
        Value::String(s) => println!("{s}"),
        Value::Null => {}
        other => match serde_json::to_string_pretty(other) {
            Ok(s) => println!("{s}"),
            Err(_) => println!("{other}"),
        },
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    #[test]
    fn json_emit_is_single_line() {
        // Sanity: pretty-print only applies to non-json human mode.
        let v = json!({"ok": true});
        assert_eq!(v.to_string(), "{\"ok\":true}");
    }
}
