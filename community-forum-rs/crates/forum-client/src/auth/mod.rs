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

// -- Constants ----------------------------------------------------------------

const STORAGE_KEY: &str = "nostr_bbs_keys";

// -- Auth state ---------------------------------------------------------------

/// Reactive auth state mirroring the SvelteKit `AuthState` interface.
#[derive(Clone, Debug, PartialEq)]
pub struct AuthState {
    pub state: AuthPhase,
    pub pubkey: Option<String>,
    pub is_authenticated: bool,
    pub public_key: Option<String>,
    /// Hex-encoded private key. In-memory only -- never persisted.
    pub private_key: Option<String>,
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
            private_key: None,
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

    /// Get the raw privkey bytes (for NIP-98 signing). Returns None if not
    /// authenticated via passkey/local-key.
    pub fn get_privkey_bytes(&self) -> Option<[u8; 32]> {
        self.privkey.with_value(|opt| {
            opt.as_ref().and_then(|v| {
                if v.len() == 32 {
                    let mut arr = [0u8; 32];
                    arr.copy_from_slice(v);
                    Some(arr)
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
        self.state.update(|s| s.account_status = AccountStatus::Complete);
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
                self.apply_passkey_result(&result, Some(display_name));
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
        let privkey_hex_owned = hex::encode(key_bytes);

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
            private_key: Some(privkey_hex_owned),
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
                if location != "/" {
                    let _ = window.location().set_href("/");
                }
            }
        }
    }

    // -- Internal helpers (passkey result application) -------------------------

    fn apply_passkey_result(&self, result: &PasskeyRegistrationResult, display_name: Option<&str>) {
        self.privkey.set_value(Some(result.privkey_bytes.to_vec()));

        let (existing_nickname, existing_avatar, _existing_status, _existing_nsec) =
            self.read_existing_metadata();

        let nickname = display_name
            .map(|s| s.to_string())
            .or(existing_nickname);
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

        let privkey_hex = hex::encode(result.privkey_bytes);

        self.state.set(AuthState {
            state: AuthPhase::Authenticated,
            pubkey: Some(result.pubkey.clone()),
            is_authenticated: true,
            public_key: Some(result.pubkey.clone()),
            private_key: Some(privkey_hex),
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

        let privkey_hex = hex::encode(result.privkey_bytes);

        self.state.set(AuthState {
            state: AuthPhase::Authenticated,
            pubkey: Some(result.pubkey.clone()),
            is_authenticated: true,
            public_key: Some(result.pubkey.clone()),
            private_key: Some(privkey_hex),
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
