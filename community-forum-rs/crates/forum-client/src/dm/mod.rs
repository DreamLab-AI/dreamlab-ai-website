//! Direct Message state store with NIP-44 encryption.
//!
//! Manages DM conversations, encrypts outgoing messages with NIP-44, decrypts
//! incoming kind-4 events, and subscribes to real-time DM delivery via the relay.

use std::collections::HashMap;
use std::rc::Rc;

use leptos::prelude::*;
use nostr_core::{nip44_decrypt, nip44_encrypt, sign_event, NostrEvent, UnsignedEvent};

use wasm_bindgen::JsCast;

use crate::relay::{Filter, RelayConnection};
use crate::utils::shorten_pubkey;

/// A single decrypted direct message.
#[derive(Clone, Debug, PartialEq)]
pub struct DMMessage {
    pub id: String,
    pub sender_pubkey: String,
    pub recipient_pubkey: String,
    pub content: String,
    pub timestamp: u64,
    pub is_sent: bool,
    pub is_read: bool,
}

/// Summary of a DM conversation with a single counterparty.
#[derive(Clone, Debug, PartialEq)]
pub struct DMConversation {
    pub pubkey: String,
    pub name: String,
    pub last_message: String,
    pub last_timestamp: u64,
    pub unread_count: u32,
}

/// Internal reactive state for the DM system.
#[derive(Clone, Debug, Default)]
struct DMStateInner {
    conversations: HashMap<String, DMConversation>,
    current_conversation: Option<String>,
    messages: Vec<DMMessage>,
    is_loading: bool,
    error: Option<String>,
}

/// Reactive DM store provided as Leptos context.
#[derive(Clone, Copy)]
pub struct DMStore {
    state: RwSignal<DMStateInner>,
    sub_ids: RwSignal<Vec<String>>,
}

unsafe impl Send for DMStore {}
unsafe impl Sync for DMStore {}

impl DMStore {
    fn new() -> Self {
        Self {
            state: RwSignal::new(DMStateInner::default()),
            sub_ids: RwSignal::new(Vec::new()),
        }
    }

    /// Sorted conversation list (most recent first).
    pub fn conversations(&self) -> Memo<Vec<DMConversation>> {
        let state = self.state;
        Memo::new(move |_| {
            let inner = state.get();
            let mut convos: Vec<DMConversation> = inner.conversations.values().cloned().collect();
            convos.sort_by(|a, b| b.last_timestamp.cmp(&a.last_timestamp));
            convos
        })
    }

    /// Messages for the currently selected conversation (chronological).
    pub fn messages(&self) -> Memo<Vec<DMMessage>> {
        let state = self.state;
        Memo::new(move |_| {
            let mut msgs = state.get().messages.clone();
            msgs.sort_by_key(|m| m.timestamp);
            msgs
        })
    }

    #[allow(dead_code)]
    pub fn current_conversation(&self) -> Memo<Option<String>> {
        let state = self.state;
        Memo::new(move |_| state.get().current_conversation)
    }

    pub fn is_loading(&self) -> Memo<bool> {
        let state = self.state;
        Memo::new(move |_| state.get().is_loading)
    }

    pub fn error(&self) -> Memo<Option<String>> {
        let state = self.state;
        Memo::new(move |_| state.get().error.clone())
    }

    #[allow(dead_code)]
    pub fn total_unread(&self) -> Memo<u32> {
        let state = self.state;
        Memo::new(move |_| state.get().conversations.values().map(|c| c.unread_count).sum())
    }

    pub fn clear_error(&self) {
        self.state.update(|s| s.error = None);
    }

    /// Fetch existing DM conversations by subscribing to kind 4 events where
    /// the user is either sender (author) or recipient (#p tag).
    pub fn fetch_conversations(
        &self,
        relay: &RelayConnection,
        privkey_bytes: &[u8; 32],
        my_pubkey: &str,
    ) {
        self.state.update(|s| { s.is_loading = true; s.error = None; });

        let sk = *privkey_bytes;
        let my_pk = my_pubkey.to_string();
        let state = self.state;

        let sent_filter = Filter {
            kinds: Some(vec![4]),
            authors: Some(vec![my_pk.clone()]),
            ..Default::default()
        };
        let recv_filter = Filter {
            kinds: Some(vec![4]),
            p_tags: Some(vec![my_pk.clone()]),
            ..Default::default()
        };

        let my_pk_cb = my_pk.clone();
        let on_event = Rc::new(move |event: NostrEvent| {
            if event.kind == 4 { process_dm_event(&event, &sk, &my_pk_cb, state); }
        });
        let on_eose = Rc::new(move || { state.update(|s| s.is_loading = false); });

        let id = relay.subscribe(vec![sent_filter, recv_filter], on_event, Some(on_eose));
        self.sub_ids.update(|ids| ids.push(id));

        // Timeout guard so the UI never gets stuck
        let cb = wasm_bindgen::closure::Closure::once(move || {
            if state.get_untracked().is_loading { state.update(|s| s.is_loading = false); }
        });
        if let Some(w) = web_sys::window() {
            let _ = w.set_timeout_with_callback_and_timeout_and_arguments_0(
                cb.as_ref().unchecked_ref(), 8000,
            );
        }
        cb.forget();
    }

    /// Subscribe to incoming DMs in real-time (new events only, since=now).
    pub fn subscribe_incoming(
        &self,
        relay: &RelayConnection,
        privkey_bytes: &[u8; 32],
        my_pubkey: &str,
    ) {
        let sk = *privkey_bytes;
        let my_pk = my_pubkey.to_string();
        let state = self.state;
        let now = (js_sys::Date::now() / 1000.0) as u64;

        let filter = Filter {
            kinds: Some(vec![4]),
            p_tags: Some(vec![my_pk.clone()]),
            since: Some(now),
            ..Default::default()
        };
        let on_event = Rc::new(move |event: NostrEvent| {
            if event.kind == 4 { process_dm_event(&event, &sk, &my_pk, state); }
        });

        let id = relay.subscribe(vec![filter], on_event, None);
        self.sub_ids.update(|ids| ids.push(id));
    }

    /// Select a conversation and mark it as read.
    pub fn select_conversation(&self, pubkey: &str) {
        let pk = pubkey.to_string();
        self.state.update(|s| {
            s.current_conversation = Some(pk.clone());
            if let Some(convo) = s.conversations.get_mut(&pk) { convo.unread_count = 0; }
            for msg in &mut s.messages {
                let cp = if msg.is_sent { &msg.recipient_pubkey } else { &msg.sender_pubkey };
                if cp == &pk { msg.is_read = true; }
            }
        });
    }

    /// Subscribe to historical + live messages for a specific conversation partner.
    pub fn load_conversation_messages(
        &self,
        relay: &RelayConnection,
        privkey_bytes: &[u8; 32],
        my_pubkey: &str,
        partner_pubkey: &str,
    ) {
        let sk = *privkey_bytes;
        let my_pk = my_pubkey.to_string();
        let partner_pk = partner_pubkey.to_string();
        let state = self.state;

        state.update(|s| {
            s.messages.retain(|m| {
                let cp = if m.is_sent { &m.recipient_pubkey } else { &m.sender_pubkey };
                cp != &partner_pk
            });
            s.is_loading = true;
        });

        let sent_filter = Filter {
            kinds: Some(vec![4]),
            authors: Some(vec![my_pk.clone()]),
            p_tags: Some(vec![partner_pk.clone()]),
            ..Default::default()
        };
        let recv_filter = Filter {
            kinds: Some(vec![4]),
            authors: Some(vec![partner_pk]),
            p_tags: Some(vec![my_pk.clone()]),
            ..Default::default()
        };

        let my_pk_cb = my_pk.clone();
        let on_event = Rc::new(move |event: NostrEvent| {
            if event.kind == 4 { process_dm_event(&event, &sk, &my_pk_cb, state); }
        });
        let on_eose = Rc::new(move || { state.update(|s| s.is_loading = false); });

        let id = relay.subscribe(vec![sent_filter, recv_filter], on_event, Some(on_eose));
        self.sub_ids.update(|ids| ids.push(id));
    }

    /// Encrypt and send a DM to the given recipient.
    pub fn send_message(
        &self,
        relay: &RelayConnection,
        recipient_pk_hex: &str,
        content: &str,
        privkey_bytes: &[u8; 32],
        my_pubkey: &str,
    ) -> Result<(), String> {
        if content.trim().is_empty() { return Err("Message cannot be empty".into()); }

        let rpk_bytes: [u8; 32] = hex::decode(recipient_pk_hex)
            .map_err(|_| "Invalid recipient pubkey hex".to_string())?
            .try_into()
            .map_err(|_| "Recipient pubkey must be 32 bytes".to_string())?;

        let encrypted = nip44_encrypt(privkey_bytes, &rpk_bytes, content)
            .map_err(|e| format!("Encryption failed: {e}"))?;

        let now = (js_sys::Date::now() / 1000.0) as u64;
        let unsigned = UnsignedEvent {
            pubkey: my_pubkey.to_string(),
            created_at: now,
            kind: 4,
            tags: vec![vec!["p".to_string(), recipient_pk_hex.to_string()]],
            content: encrypted,
        };

        let signing_key = k256::schnorr::SigningKey::from_bytes(privkey_bytes)
            .map_err(|e| format!("Invalid signing key: {e}"))?;
        let signed = sign_event(unsigned, &signing_key)
            .map_err(|e| format!("Signing failed: {e}"))?;

        // Optimistic local update
        let msg = DMMessage {
            id: signed.id.clone(),
            sender_pubkey: my_pubkey.to_string(),
            recipient_pubkey: recipient_pk_hex.to_string(),
            content: content.to_string(),
            timestamp: now,
            is_sent: true,
            is_read: true,
        };

        self.state.update(|s| {
            if s.current_conversation.as_deref() == Some(recipient_pk_hex) {
                if !s.messages.iter().any(|m| m.id == msg.id) { s.messages.push(msg.clone()); }
            }
            let convo = s.conversations.entry(recipient_pk_hex.to_string())
                .or_insert_with(|| DMConversation {
                    pubkey: recipient_pk_hex.to_string(),
                    name: shorten_pubkey(recipient_pk_hex),
                    last_message: String::new(), last_timestamp: 0, unread_count: 0,
                });
            convo.last_message = truncate_message(content, 80);
            convo.last_timestamp = now;
        });

        relay.publish(&signed);
        Ok(())
    }

    /// Unsubscribe from all active DM subscriptions.
    pub fn cleanup(&self, relay: &RelayConnection) {
        for id in &self.sub_ids.get_untracked() { relay.unsubscribe(id); }
        self.sub_ids.set(Vec::new());
    }
}

// -- Event processing ---------------------------------------------------------

/// Decrypt a kind 4 DM event, deduplicate, and update reactive state.
fn process_dm_event(
    event: &NostrEvent,
    my_sk: &[u8; 32],
    my_pubkey: &str,
    state: RwSignal<DMStateInner>,
) {
    let is_sent = event.pubkey == my_pubkey;
    let counterparty_pk = if is_sent {
        event.tags.iter().find(|t| t.len() >= 2 && t[0] == "p").map(|t| t[1].clone())
    } else {
        Some(event.pubkey.clone())
    };

    let counterparty_pk = match counterparty_pk {
        Some(pk) if pk.len() == 64 => pk,
        _ => return,
    };
    let cp_bytes: [u8; 32] = match hex::decode(&counterparty_pk) {
        Ok(b) if b.len() == 32 => b.try_into().unwrap(),
        _ => return,
    };

    // NIP-44 conversation key is symmetric: decrypt with my SK + counterparty PK
    let plaintext = match nip44_decrypt(my_sk, &cp_bytes, &event.content) {
        Ok(pt) => pt,
        Err(e) => {
            web_sys::console::warn_1(
                &format!("[DM] Decrypt failed for {}: {}", &event.id, e).into(),
            );
            return;
        }
    };

    let msg = DMMessage {
        id: event.id.clone(),
        sender_pubkey: event.pubkey.clone(),
        recipient_pubkey: if is_sent { counterparty_pk.clone() } else { my_pubkey.to_string() },
        content: plaintext.clone(),
        timestamp: event.created_at,
        is_sent,
        is_read: is_sent,
    };

    state.update(|s| {
        if !s.messages.iter().any(|m| m.id == msg.id) { s.messages.push(msg.clone()); }

        let convo = s.conversations.entry(counterparty_pk.clone()).or_insert_with(|| {
            DMConversation {
                pubkey: counterparty_pk.clone(),
                name: shorten_pubkey(&counterparty_pk),
                last_message: String::new(), last_timestamp: 0, unread_count: 0,
            }
        });
        if event.created_at >= convo.last_timestamp {
            convo.last_message = truncate_message(&plaintext, 80);
            convo.last_timestamp = event.created_at;
        }
        if !is_sent && s.current_conversation.as_deref() != Some(&counterparty_pk) {
            convo.unread_count += 1;
        }
    });
}

// -- Helpers ------------------------------------------------------------------

fn truncate_message(content: &str, max_len: usize) -> String {
    let t = content.trim();
    if t.len() <= max_len { t.to_string() } else { format!("{}...", &t[..max_len]) }
}

// -- Context providers --------------------------------------------------------

/// Create and provide the DM store context.
pub fn provide_dm_store() { provide_context(DMStore::new()); }

/// Get the DM store from context. Panics if `provide_dm_store()` was not called.
pub fn use_dm_store() -> DMStore { expect_context::<DMStore>() }
