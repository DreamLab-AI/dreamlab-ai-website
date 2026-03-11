//! Auth state management for the DreamLab community forum.
//!
//! Ports the SvelteKit auth store (`stores/auth.ts`) to Leptos reactive signals.
//! Private key bytes are held in memory only and zeroized on drop/pagehide.

mod http;
pub mod nip98;
pub mod passkey;
mod session;
mod webauthn;

use gloo::storage::{LocalStorage, Storage};
use leptos::prelude::*;
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use self::passkey::{PasskeyAuthResult, PasskeyRegistrationResult};
use self::session::StoredSession;
use crate::app::base_href;
use nostr_core::{NostrEvent, UnsignedEvent};

// -- Constants ----------------------------------------------------------------

const STORAGE_KEY: &str = "nostr_bbs_keys";

// -- Auth state ---------------------------------------------------------------

/// Reactive auth state mirroring the SvelteKit `AuthState` interface.
///
/// **Security**: Private key bytes are stored separately in `AuthStore::privkey`
/// (a non-reactive `StoredValue`). They never enter the reactive signal graph,
/// preventing accidental leaks through Memo clones or debug output.
#[derive(Clone, Debug, PartialEq)]
pub struct AuthState {
    pub state: AuthPhase,
    pub pubkey: Option<String>,
    pub is_authenticated: bool,
    pub public_key: Option<String>,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    pub is_pending: bool,
    pub error: Option<String>,
    pub account_status: AccountStatus,
    pub nsec_backed_up: bool,
    pub is_ready: bool,
    pub is_nip07: bool,
    pub is_passkey: bool,
    pub is_local_key: bool,
    pub extension_name: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AuthPhase {
    Unauthenticated,
    Authenticating,
    Authenticated,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountStatus {
    Incomplete,
    Complete,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            state: AuthPhase::Unauthenticated,
            pubkey: None,
            is_authenticated: false,
            public_key: None,
            nickname: None,
            avatar: None,
            is_pending: false,
            error: None,
            account_status: AccountStatus::Incomplete,
            nsec_backed_up: false,
            is_ready: false,
            is_nip07: false,
            is_passkey: false,
            is_local_key: false,
            extension_name: None,
        }
    }
}

// -- AuthStore ----------------------------------------------------------------

/// Reactive auth store providing the auth context for the entire app.
///
/// Holds an `RwSignal<AuthState>` for the reactive UI state and a
/// `StoredValue<Option<Vec<u8>>>` for the in-memory private key.
#[derive(Clone, Copy)]
pub struct AuthStore {
    pub(crate) state: RwSignal<AuthState>,
    /// Private key bytes held in a StoredValue so they stay on the WASM thread.
    /// Never serialized or persisted.
    pub(crate) privkey: StoredValue<Option<Vec<u8>>>,
}

impl AuthStore {
    fn new() -> Self {
        Self {
            state: RwSignal::new(AuthState::default()),
            privkey: StoredValue::new(None),
        }
    }

    // -- Getters --------------------------------------------------------------

    /// Read the current auth state (reactive).
    #[allow(dead_code)]
    pub fn get(&self) -> AuthState {
        self.state.get()
    }

    /// Derived signal: is the user authenticated?
    pub fn is_authenticated(&self) -> Memo<bool> {
        let state = self.state;
        Memo::new(move |_| state.get().is_authenticated)
    }

    /// Derived signal: is the auth store ready (initial restore complete)?
    pub fn is_ready(&self) -> Memo<bool> {
        let state = self.state;
        Memo::new(move |_| state.get().is_ready)
    }

    /// Derived signal: current error message.
    pub fn error(&self) -> Memo<Option<String>> {
        let state = self.state;
        Memo::new(move |_| state.get().error)
    }

    /// Derived signal: hex pubkey.
    pub fn pubkey(&self) -> Memo<Option<String>> {
        let state = self.state;
        Memo::new(move |_| state.get().pubkey)
    }

    /// Derived signal: display nickname.
    pub fn nickname(&self) -> Memo<Option<String>> {
        let state = self.state;
        Memo::new(move |_| state.get().nickname)
    }

    /// Sign an unsigned event using the in-memory private key.
    ///
    /// The raw key bytes never leave this module — the `SigningKey` is
    /// constructed inside the closure and dropped (+ zeroized) before
    /// returning. This prevents the 32-byte secret from being copied
    /// onto arbitrary WASM stack frames in calling code.
    pub fn sign_event(&self, event: UnsignedEvent) -> Result<NostrEvent, String> {
        self.privkey.with_value(|opt| {
            let v = opt.as_ref().ok_or("No signing key available")?;
            if v.len() != 32 {
                return Err("Invalid key length".to_string());
            }
            let mut key_bytes = [0u8; 32];
            key_bytes.copy_from_slice(v);
            let signing_key = k256::schnorr::SigningKey::from_bytes(&key_bytes)
                .map_err(|e| format!("Invalid signing key: {e}"))?;
            key_bytes.zeroize();
            nostr_core::sign_event(event, &signing_key).map_err(|e| format!("Signing failed: {e}"))
        })
    }

    /// Get the raw privkey bytes for NIP-44 encryption/decryption.
    ///
    /// **WARNING**: Prefer `sign_event()` for signing. This method exists
    /// only for NIP-44 symmetric key derivation where the raw bytes are
    /// required by the encryption API. The returned `Zeroizing<[u8; 32]>`
    /// auto-zeroizes on drop — callers do not need to manually clear it.
    pub fn get_privkey_bytes(&self) -> Option<zeroize::Zeroizing<[u8; 32]>> {
        self.privkey.with_value(|opt| {
            opt.as_ref().and_then(|v| {
                if v.len() == 32 {
                    let mut arr = [0u8; 32];
                    arr.copy_from_slice(v);
                    Some(zeroize::Zeroizing::new(arr))
                } else {
                    None
                }
            })
        })
    }

    // -- Setters --------------------------------------------------------------

    pub fn clear_error(&self) {
        self.state.update(|s| s.error = None);
    }

    pub fn set_error(&self, msg: &str) {
        self.state.update(|s| s.error = Some(msg.to_string()));
    }

    #[allow(dead_code)]
    pub fn set_pending(&self, pending: bool) {
        self.state.update(|s| s.is_pending = pending);
    }

    #[allow(dead_code)]
    pub fn set_profile(&self, nickname: Option<String>, avatar: Option<String>) {
        self.state.update(|s| {
            s.nickname = nickname.clone();
            s.avatar = avatar.clone();
        });
        if let Ok(json_str) = LocalStorage::get::<String>(STORAGE_KEY) {
            if let Ok(mut stored) = serde_json::from_str::<StoredSession>(&json_str) {
                stored.nickname = nickname;
                stored.avatar = avatar;
                if let Ok(new_json) = serde_json::to_string(&stored) {
                    let _ = LocalStorage::set(STORAGE_KEY, new_json);
                }
            }
        }
    }

    #[allow(dead_code)]
    pub fn complete_signup(&self) {
        self.state
            .update(|s| s.account_status = AccountStatus::Complete);
        self.update_storage_field(|stored| {
            stored.account_status = AccountStatus::Complete;
        });
    }

    #[allow(dead_code)]
    pub fn confirm_nsec_backup(&self) {
        self.state.update(|s| s.nsec_backed_up = true);
        self.update_storage_field(|stored| {
            stored.nsec_backed_up = true;
        });
    }

    // -- Auth flows -----------------------------------------------------------

    /// Register a new passkey and derive Nostr keypair from PRF.
    pub async fn register_with_passkey(&self, display_name: &str) -> Result<(), String> {
        self.state.update(|s| {
            s.is_pending = true;
            s.error = None;
            s.state = AuthPhase::Authenticating;
        });

        match passkey::register_passkey(display_name).await {
            Ok(result) => {
                web_sys::console::log_1(&"[register_with_passkey] success".into());
                self.apply_passkey_result(&result, Some(display_name));
                Ok(())
            }
            Err(e) => {
                let msg = e.to_string();
                // Log both Display and Debug formats to trace error origin
                web_sys::console::error_1(&format!("[register_with_passkey] Display: {msg}").into());
                web_sys::console::error_1(&format!("[register_with_passkey] Debug: {e:?}").into());
                self.state.update(|s| {
                    s.is_pending = false;
                    s.error = Some(msg.clone());
                    s.state = AuthPhase::Unauthenticated;
                });
                Err(msg)
            }
        }
    }

    /// Authenticate with an existing passkey, re-deriving the Nostr privkey.
    pub async fn login_with_passkey(&self, pubkey: Option<&str>) -> Result<(), String> {
        self.state.update(|s| {
            s.is_pending = true;
            s.error = None;
            s.state = AuthPhase::Authenticating;
        });

        match passkey::authenticate_passkey(pubkey).await {
            Ok(result) => {
                self.apply_passkey_auth_result(&result);
                Ok(())
            }
            Err(e) => {
                let msg = e.to_string();
                self.state.update(|s| {
                    s.is_pending = false;
                    s.error = Some(msg.clone());
                    s.state = AuthPhase::Unauthenticated;
                });
                Err(msg)
            }
        }
    }

    /// Generate a new random keypair and register as a local-key user.
    ///
    /// Returns the hex-encoded private key so the signup UI can show it for
    /// backup. The privkey is held in memory and never persisted to storage.
    pub fn register_with_generated_key(&self, display_name: &str) -> Result<String, String> {
        let keypair = nostr_core::generate_keypair()
            .map_err(|e| format!("Key generation failed: {e}"))?;

        let pubkey = keypair.public.to_hex();
        let privkey_hex = hex::encode(keypair.secret.as_bytes());
        self.privkey.set_value(Some(keypair.secret.as_bytes().to_vec()));

        let nickname = Some(display_name.to_string());

        let stored = StoredSession {
            version: 2,
            public_key: Some(pubkey.clone()),
            is_passkey: false,
            is_nip07: false,
            is_local_key: true,
            extension_name: None,
            nickname: nickname.clone(),
            avatar: None,
            account_status: AccountStatus::Incomplete,
            nsec_backed_up: false,
        };
        self.save_session(&stored);

        self.state.set(AuthState {
            state: AuthPhase::Authenticated,
            pubkey: Some(pubkey.clone()),
            is_authenticated: true,
            public_key: Some(pubkey),
            nickname,
            avatar: None,
            is_pending: false,
            error: None,
            account_status: AccountStatus::Incomplete,
            nsec_backed_up: false,
            is_ready: true,
            is_nip07: false,
            is_passkey: false,
            is_local_key: true,
            extension_name: None,
        });

        Ok(privkey_hex)
    }

    /// Login with a local nsec/hex private key.
    pub fn login_with_local_key(&self, privkey_hex: &str) -> Result<(), String> {
        let bytes = hex::decode(privkey_hex).map_err(|_| "Invalid hex key".to_string())?;
        if bytes.len() != 32 {
            return Err("Key must be 32 bytes (64 hex characters)".to_string());
        }
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(&bytes);

        let sk = nostr_core::SecretKey::from_bytes(key_bytes)
            .map_err(|e| format!("Invalid secp256k1 key: {e}"))?;
        let pubkey = sk.public_key().to_hex();
        self.privkey.set_value(Some(key_bytes.to_vec()));

        let (nickname, avatar, account_status, _nsec_backed_up) = self.read_existing_metadata();

        let stored = StoredSession {
            version: 2,
            public_key: Some(pubkey.clone()),
            is_passkey: false,
            is_nip07: false,
            is_local_key: true,
            extension_name: None,
            nickname: nickname.clone(),
            avatar: avatar.clone(),
            account_status: account_status.clone(),
            nsec_backed_up: true,
        };
        self.save_session(&stored);

        self.state.set(AuthState {
            state: AuthPhase::Authenticated,
            pubkey: Some(pubkey.clone()),
            is_authenticated: true,
            public_key: Some(pubkey),
            nickname,
            avatar,
            is_pending: false,
            error: None,
            account_status,
            nsec_backed_up: true,
            is_ready: true,
            is_nip07: false,
            is_passkey: false,
            is_local_key: true,
            extension_name: None,
        });

        key_bytes.zeroize();
        Ok(())
    }

    /// Log out: zero privkey, clear state and storage.
    pub fn logout(&self) {
        self.privkey.update_value(|opt| {
            if let Some(ref mut v) = opt {
                v.iter_mut().for_each(|b| *b = 0);
            }
            *opt = None;
        });

        self.state.set(AuthState::default());
        LocalStorage::delete(STORAGE_KEY);

        if let Some(window) = web_sys::window() {
            if let Ok(location) = window.location().pathname() {
                let home = base_href("/");
                if location != home {
                    let _ = window.location().set_href(&home);
                }
            }
        }
    }

    // -- Internal helpers (passkey result application) -------------------------

    fn apply_passkey_result(&self, result: &PasskeyRegistrationResult, display_name: Option<&str>) {
        self.privkey.set_value(Some(result.privkey_bytes.to_vec()));

        let (existing_nickname, existing_avatar, _existing_status, _existing_nsec) =
            self.read_existing_metadata();

        let nickname = display_name.map(|s| s.to_string()).or(existing_nickname);
        let avatar = existing_avatar;

        let stored = StoredSession {
            version: 2,
            public_key: Some(result.pubkey.clone()),
            is_passkey: true,
            is_nip07: false,
            is_local_key: false,
            extension_name: None,
            nickname: nickname.clone(),
            avatar: avatar.clone(),
            account_status: AccountStatus::Incomplete,
            nsec_backed_up: false,
        };
        self.save_session(&stored);

        self.state.set(AuthState {
            state: AuthPhase::Authenticated,
            pubkey: Some(result.pubkey.clone()),
            is_authenticated: true,
            public_key: Some(result.pubkey.clone()),
            nickname,
            avatar,
            is_pending: false,
            error: None,
            account_status: AccountStatus::Incomplete,
            nsec_backed_up: false,
            is_ready: true,
            is_nip07: false,
            is_passkey: true,
            is_local_key: false,
            extension_name: None,
        });
    }

    fn apply_passkey_auth_result(&self, result: &PasskeyAuthResult) {
        self.privkey.set_value(Some(result.privkey_bytes.to_vec()));

        let (nickname, avatar, account_status, nsec_backed_up) = self.read_existing_metadata();

        let stored = StoredSession {
            version: 2,
            public_key: Some(result.pubkey.clone()),
            is_passkey: true,
            is_nip07: false,
            is_local_key: false,
            extension_name: None,
            nickname: nickname.clone(),
            avatar: avatar.clone(),
            account_status: account_status.clone(),
            nsec_backed_up,
        };
        self.save_session(&stored);

        self.state.set(AuthState {
            state: AuthPhase::Authenticated,
            pubkey: Some(result.pubkey.clone()),
            is_authenticated: true,
            public_key: Some(result.pubkey.clone()),
            nickname,
            avatar,
            is_pending: false,
            error: None,
            account_status,
            nsec_backed_up,
            is_ready: true,
            is_nip07: false,
            is_passkey: true,
            is_local_key: false,
            extension_name: None,
        });
    }
}

// -- Context providers --------------------------------------------------------

/// Create and provide the auth context. Call once at the app root.
pub fn provide_auth() {
    let store = AuthStore::new();
    store.restore_session();
    session::register_pagehide_listener(store);
    provide_context(store);
}

/// Get the auth store from context. Panics if `provide_auth()` was not called.
pub fn use_auth() -> AuthStore {
    expect_context::<AuthStore>()
}
