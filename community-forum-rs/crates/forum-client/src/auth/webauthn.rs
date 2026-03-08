//! WebAuthn ceremony helpers: JS object builders, PRF extraction, codec, and
//! JS interop utilities.
//!
//! Extracted from `passkey.rs` to keep each module under 500 lines. Response
//! encoders and HTTP fetch live in `super::http`.

use js_sys::{ArrayBuffer, Object, Reflect, Uint8Array};
use wasm_bindgen::prelude::*;

use super::passkey::PasskeyError;

// -- JS object builders -------------------------------------------------------

/// Build `PublicKeyCredentialCreationOptions` from server JSON with PRF extension.
pub(super) fn build_creation_options(
    json: &serde_json::Value,
    prf_salt_b64: &str,
) -> Result<JsValue, PasskeyError> {
    let options = Object::new();

    // challenge
    if let Some(challenge) = json.get("challenge").and_then(|v| v.as_str()) {
        let buf = base64url_to_uint8array(challenge)?;
        Reflect::set(&options, &"challenge".into(), &buf)?;
    }

    // rp
    if let Some(rp) = json.get("rp") {
        let rp_obj = json_to_js(rp)?;
        Reflect::set(&options, &"rp".into(), &rp_obj)?;
    }

    // user
    if let Some(user) = json.get("user") {
        let user_obj = Object::new();
        if let Some(id) = user.get("id").and_then(|v| v.as_str()) {
            let buf = base64url_to_uint8array(id)?;
            Reflect::set(&user_obj, &"id".into(), &buf)?;
        }
        if let Some(name) = user.get("name").and_then(|v| v.as_str()) {
            Reflect::set(&user_obj, &"name".into(), &JsValue::from_str(name))?;
        }
        if let Some(dn) = user.get("displayName").and_then(|v| v.as_str()) {
            Reflect::set(&user_obj, &"displayName".into(), &JsValue::from_str(dn))?;
        }
        Reflect::set(&options, &"user".into(), &user_obj)?;
    }

    // pubKeyCredParams
    if let Some(params) = json.get("pubKeyCredParams") {
        let params_js = json_to_js(params)?;
        Reflect::set(&options, &"pubKeyCredParams".into(), &params_js)?;
    }

    // timeout
    if let Some(timeout) = json.get("timeout") {
        let timeout_js = json_to_js(timeout)?;
        Reflect::set(&options, &"timeout".into(), &timeout_js)?;
    }

    // authenticatorSelection
    if let Some(auth_sel) = json.get("authenticatorSelection") {
        let sel_js = json_to_js(auth_sel)?;
        Reflect::set(&options, &"authenticatorSelection".into(), &sel_js)?;
    }

    // attestation
    if let Some(att) = json.get("attestation").and_then(|v| v.as_str()) {
        Reflect::set(&options, &"attestation".into(), &JsValue::from_str(att))?;
    }

    // excludeCredentials
    if let Some(exclude) = json.get("excludeCredentials").and_then(|v| v.as_array()) {
        let arr = js_sys::Array::new();
        for cred in exclude {
            let cred_obj = Object::new();
            if let Some(id) = cred.get("id").and_then(|v| v.as_str()) {
                let buf = base64url_to_uint8array(id)?;
                Reflect::set(&cred_obj, &"id".into(), &buf)?;
            }
            if let Some(t) = cred.get("type").and_then(|v| v.as_str()) {
                Reflect::set(&cred_obj, &"type".into(), &JsValue::from_str(t))?;
            }
            if let Some(transports) = cred.get("transports") {
                let t_js = json_to_js(transports)?;
                Reflect::set(&cred_obj, &"transports".into(), &t_js)?;
            }
            arr.push(&cred_obj);
        }
        Reflect::set(&options, &"excludeCredentials".into(), &arr)?;
    }

    // extensions with PRF
    let extensions = Object::new();
    let prf = Object::new();
    let eval_obj = Object::new();
    let salt_buf = base64url_to_uint8array(prf_salt_b64)?;
    Reflect::set(&eval_obj, &"first".into(), &salt_buf)?;
    Reflect::set(&prf, &"eval".into(), &eval_obj)?;
    Reflect::set(&extensions, &"prf".into(), &prf)?;
    Reflect::set(&options, &"extensions".into(), &extensions)?;

    Ok(options.into())
}

/// Build `PublicKeyCredentialRequestOptions` from server JSON, optionally with PRF.
pub(super) fn build_request_options(
    json: &serde_json::Value,
    prf_salt_b64: Option<&str>,
) -> Result<JsValue, PasskeyError> {
    let options = Object::new();

    // challenge
    if let Some(challenge) = json.get("challenge").and_then(|v| v.as_str()) {
        let buf = base64url_to_uint8array(challenge)?;
        Reflect::set(&options, &"challenge".into(), &buf)?;
    }

    // timeout
    if let Some(timeout) = json.get("timeout") {
        let timeout_js = json_to_js(timeout)?;
        Reflect::set(&options, &"timeout".into(), &timeout_js)?;
    }

    // rpId
    if let Some(rp_id) = json.get("rpId").and_then(|v| v.as_str()) {
        Reflect::set(&options, &"rpId".into(), &JsValue::from_str(rp_id))?;
    }

    // allowCredentials
    if let Some(allow) = json.get("allowCredentials").and_then(|v| v.as_array()) {
        let arr = js_sys::Array::new();
        for cred in allow {
            let cred_obj = Object::new();
            if let Some(id) = cred.get("id").and_then(|v| v.as_str()) {
                let buf = base64url_to_uint8array(id)?;
                Reflect::set(&cred_obj, &"id".into(), &buf)?;
            }
            if let Some(t) = cred.get("type").and_then(|v| v.as_str()) {
                Reflect::set(&cred_obj, &"type".into(), &JsValue::from_str(t))?;
            }
            if let Some(transports) = cred.get("transports") {
                let t_js = json_to_js(transports)?;
                Reflect::set(&cred_obj, &"transports".into(), &t_js)?;
            }
            arr.push(&cred_obj);
        }
        Reflect::set(&options, &"allowCredentials".into(), &arr)?;
    }

    // userVerification
    if let Some(uv) = json.get("userVerification").and_then(|v| v.as_str()) {
        Reflect::set(
            &options,
            &"userVerification".into(),
            &JsValue::from_str(uv),
        )?;
    }

    // extensions with PRF (if salt provided)
    if let Some(salt_b64) = prf_salt_b64 {
        let extensions = Object::new();
        let prf = Object::new();
        let eval_obj = Object::new();
        let salt_buf = base64url_to_uint8array(salt_b64)?;
        Reflect::set(&eval_obj, &"first".into(), &salt_buf)?;
        Reflect::set(&prf, &"eval".into(), &eval_obj)?;
        Reflect::set(&extensions, &"prf".into(), &prf)?;
        Reflect::set(&options, &"extensions".into(), &extensions)?;
    }

    Ok(options.into())
}

// -- PRF output extraction ----------------------------------------------------

/// Extract PRF output from a creation (registration) ceremony result.
pub(super) fn extract_prf_output_from_creation(
    credential: &JsValue,
) -> Result<Vec<u8>, PasskeyError> {
    let ext_results = call_method(credential, "getClientExtensionResults", &[])?;

    let prf = Reflect::get(&ext_results, &"prf".into())
        .map_err(|_| PasskeyError::PrfNotSupported("No PRF in extension results".into()))?;

    if prf.is_undefined() || prf.is_null() {
        return Err(PasskeyError::PrfNotSupported(
            "PRF extension not supported by this authenticator".into(),
        ));
    }

    // Check prf.enabled for creation
    let enabled = Reflect::get(&prf, &"enabled".into()).ok();
    if let Some(ref e) = enabled {
        if e.is_falsy() && !e.is_undefined() {
            return Err(PasskeyError::PrfNotSupported(
                "PRF extension not supported by this authenticator. Use a FIDO2 authenticator \
                 with PRF support (not Windows Hello or cross-device QR)."
                    .into(),
            ));
        }
    }

    let results = Reflect::get(&prf, &"results".into())
        .map_err(|_| PasskeyError::PrfNotSupported("No PRF results".into()))?;
    if results.is_undefined() || results.is_null() {
        return Err(PasskeyError::PrfNotSupported(
            "PRF extension not supported. Please use Chrome 116+, Safari 17.4+.".into(),
        ));
    }

    let first = Reflect::get(&results, &"first".into())
        .map_err(|_| PasskeyError::PrfNotSupported("No PRF first result".into()))?;
    if first.is_undefined() || first.is_null() {
        return Err(PasskeyError::PrfNotSupported(
            "PRF extension not supported. Please use Chrome 116+, Safari 17.4+.".into(),
        ));
    }

    arraybuffer_to_vec(&first)
}

/// Extract PRF output from an assertion (authentication) ceremony result.
pub(super) fn extract_prf_output_from_assertion(
    assertion: &JsValue,
) -> Result<Vec<u8>, PasskeyError> {
    let ext_results = call_method(assertion, "getClientExtensionResults", &[])?;

    let prf = Reflect::get(&ext_results, &"prf".into())
        .map_err(|_| PasskeyError::PrfNotSupported("No PRF in extension results".into()))?;

    if prf.is_undefined() || prf.is_null() {
        return Err(PasskeyError::PrfNotSupported(
            "PRF extension not available on this credential".into(),
        ));
    }

    let results = Reflect::get(&prf, &"results".into())
        .map_err(|_| PasskeyError::PrfNotSupported("No PRF results".into()))?;
    if results.is_undefined() || results.is_null() {
        return Err(PasskeyError::PrfNotSupported(
            "PRF extension not available on this credential".into(),
        ));
    }

    let first = Reflect::get(&results, &"first".into())
        .map_err(|_| PasskeyError::PrfNotSupported("No PRF first result".into()))?;
    if first.is_undefined() || first.is_null() {
        return Err(PasskeyError::PrfNotSupported(
            "PRF extension not available on this credential".into(),
        ));
    }

    arraybuffer_to_vec(&first)
}

// -- Hybrid transport check ---------------------------------------------------

/// Block cross-device QR (hybrid) transport which produces different PRF outputs.
pub(super) fn check_hybrid_transport(assertion: &JsValue) -> Result<(), PasskeyError> {
    let attachment = Reflect::get(assertion, &"authenticatorAttachment".into()).ok();
    let is_cross_platform = attachment
        .as_ref()
        .and_then(|v| v.as_string())
        .map(|s| s == "cross-platform")
        .unwrap_or(false);

    if !is_cross_platform {
        return Ok(());
    }

    let response = Reflect::get(assertion, &"response".into()).ok();
    if let Some(ref resp) = response {
        if let Ok(transports) = call_method(resp, "getTransports", &[]) {
            let arr = js_sys::Array::from(&transports);
            for i in 0..arr.length() {
                if let Some(t) = arr.get(i).as_string() {
                    if t == "hybrid" {
                        return Err(PasskeyError::HybridBlocked);
                    }
                }
            }
        }
    }

    Ok(())
}

// -- Base64url codec ----------------------------------------------------------

/// Decode a base64url-encoded string to raw bytes.
pub(super) fn base64url_to_bytes(input: &str) -> Result<Vec<u8>, PasskeyError> {
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;
    let cleaned = input.trim_end_matches('=');
    URL_SAFE_NO_PAD
        .decode(cleaned)
        .map_err(|e| PasskeyError::Protocol(format!("base64url decode: {e}")))
}

/// Decode base64url to an ArrayBuffer suitable for WebAuthn APIs.
pub(super) fn base64url_to_uint8array(input: &str) -> Result<JsValue, PasskeyError> {
    let bytes = base64url_to_bytes(input)?;
    let arr = Uint8Array::new_with_length(bytes.len() as u32);
    arr.copy_from(&bytes);
    Ok(arr.buffer().into())
}

/// Encode an ArrayBuffer/Uint8Array to base64url (no padding).
pub(super) fn buffer_to_base64url(js_val: &JsValue) -> Result<String, PasskeyError> {
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;

    let bytes = arraybuffer_to_vec(js_val)?;
    Ok(URL_SAFE_NO_PAD.encode(&bytes))
}

/// Convert a JsValue (ArrayBuffer or Uint8Array) to a Vec<u8>.
pub(super) fn arraybuffer_to_vec(js_val: &JsValue) -> Result<Vec<u8>, PasskeyError> {
    if let Ok(arr) = js_val.clone().dyn_into::<Uint8Array>() {
        return Ok(arr.to_vec());
    }
    if let Ok(buf) = js_val.clone().dyn_into::<ArrayBuffer>() {
        let arr = Uint8Array::new(&buf);
        return Ok(arr.to_vec());
    }
    Err(PasskeyError::JsError(
        "Expected ArrayBuffer or Uint8Array".into(),
    ))
}

// -- JSON to JS helpers -------------------------------------------------------

/// Convert a serde_json::Value to a JsValue via serde_wasm_bindgen.
pub(super) fn json_to_js(value: &serde_json::Value) -> Result<JsValue, PasskeyError> {
    serde_wasm_bindgen::to_value(value)
        .map_err(|e| PasskeyError::Protocol(format!("JSON to JS: {e}")))
}

/// Call a method on a JS object by name, with arguments.
pub(super) fn call_method(
    obj: &JsValue,
    method: &str,
    args: &[JsValue],
) -> Result<JsValue, PasskeyError> {
    let func = Reflect::get(obj, &JsValue::from_str(method))
        .map_err(|_| PasskeyError::JsError(format!("Missing method: {method}")))?;
    if func.is_undefined() {
        return Err(PasskeyError::JsError(format!("Method {method} not found")));
    }
    let func: js_sys::Function = func
        .dyn_into()
        .map_err(|_| PasskeyError::JsError(format!("{method} is not a function")))?;
    let args_arr = js_sys::Array::new();
    for a in args {
        args_arr.push(a);
    }
    func.apply(obj, &args_arr)
        .map_err(|e| PasskeyError::JsError(format!("{method} call failed: {e:?}")))
}
