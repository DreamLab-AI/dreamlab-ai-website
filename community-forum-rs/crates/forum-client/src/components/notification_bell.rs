//! Notification bell icon with dropdown panel.
//!
//! Displays an SVG bell with an unread-count badge (`.notification-badge` +
//! `.neon-pulse` CSS), and toggles a glass dropdown listing recent notifications.
//! Click-outside detection uses `gloo::events::EventListener` on the document.

use gloo::events::EventListener;
use leptos::prelude::*;
use wasm_bindgen::JsCast;

/// A single notification entry.
#[derive(Clone, Debug)]
pub struct Notification {
    #[allow(dead_code)]
    pub id: String,
    pub message: String,
    /// UNIX timestamp.
    pub timestamp: u64,
    pub read: bool,
}

/// Reactive notification store, provided via context.
#[derive(Clone, Copy)]
pub struct NotificationStore {
    pub items: RwSignal<Vec<Notification>>,
}

impl NotificationStore {
    fn new() -> Self {
        Self {
            items: RwSignal::new(Vec::new()),
        }
    }

    /// Number of unread notifications.
    pub fn unread_count(&self) -> Memo<usize> {
        let items = self.items;
        Memo::new(move |_| items.get().iter().filter(|n| !n.read).count())
    }

    /// Mark all notifications as read.
    pub fn mark_all_read(&self) {
        self.items.update(|list| {
            for n in list.iter_mut() {
                n.read = true;
            }
        });
    }

    /// Clear all notifications.
    pub fn clear_all(&self) {
        self.items.set(Vec::new());
    }

    /// Push a new notification.
    #[allow(dead_code)]
    pub fn push(&self, notification: Notification) {
        self.items.update(|list| list.insert(0, notification));
    }
}

/// Provide the notification store context. Call once near the app root.
pub fn provide_notifications() -> NotificationStore {
    let store = NotificationStore::new();
    provide_context(store);
    store
}

/// Read the notification store from context.
pub fn use_notifications() -> NotificationStore {
    use_context::<NotificationStore>().unwrap_or_else(|| {
        let store = NotificationStore::new();
        provide_context(store);
        store
    })
}

/// Bell icon button with badge and dropdown.
#[component]
pub(crate) fn NotificationBell() -> impl IntoView {
    let store = use_notifications();
    let unread = store.unread_count();
    let dropdown_open = RwSignal::new(false);

    // Click-outside listener: attaches/detaches reactively with dropdown state.
    let dropdown_open_lis = dropdown_open;
    Effect::new(move |prev: Option<Option<EventListener>>| {
        if dropdown_open_lis.get() {
            let listener = EventListener::new(&gloo::utils::document(), "click", move |e| {
                let target = match e.target() {
                    Some(t) => t,
                    None => return,
                };
                let el: &web_sys::Element = match target.dyn_ref() {
                    Some(el) => el,
                    None => return,
                };
                // If click is inside [data-notification-bell], ignore.
                if el
                    .closest("[data-notification-bell]")
                    .ok()
                    .flatten()
                    .is_some()
                {
                    return;
                }
                dropdown_open_lis.set(false);
            });
            Some(listener)
        } else {
            drop(prev);
            None
        }
    });

    let toggle = move |_| dropdown_open.update(|v| *v = !*v);

    let on_mark_all = move |_| {
        store.mark_all_read();
    };

    let on_clear_all = move |_| {
        store.clear_all();
        dropdown_open.set(false);
    };

    view! {
        <div class="relative" data-notification-bell="">
            // Bell button
            <button
                class="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                on:click=toggle
                aria-label="Notifications"
            >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
                        stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"
                        stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {move || {
                    let count = unread.get();
                    (count > 0).then(|| {
                        let label = if count > 99 { "99+".to_string() } else { count.to_string() };
                        view! {
                            <span class="notification-badge neon-pulse">{label}</span>
                        }
                    })
                }}
            </button>

            // Dropdown panel
            <Show when=move || dropdown_open.get()>
                <div class="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto glass-card rounded-xl border border-gray-700/50 shadow-2xl z-50 animate-slide-in-down">
                    // Header
                    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <span class="text-sm font-semibold text-white">"Notifications"</span>
                        <div class="flex items-center gap-2">
                            <button
                                class="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                                on:click=on_mark_all
                            >
                                "Mark all read"
                            </button>
                            <button
                                class="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                on:click=on_clear_all
                            >
                                "Clear"
                            </button>
                        </div>
                    </div>

                    // Notification list
                    {move || {
                        let items = store.items.get();
                        if items.is_empty() {
                            view! {
                                <div class="px-4 py-8 text-center">
                                    <svg class="w-8 h-8 mx-auto text-gray-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
                                            stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M13.73 21a2 2 0 01-3.46 0"
                                            stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <p class="text-sm text-gray-500">"No notifications"</p>
                                </div>
                            }.into_any()
                        } else {
                            let entries: Vec<_> = items.iter().map(|n| {
                                let bg = if n.read { "" } else { "bg-amber-500/5" };
                                let dot_class = if n.read {
                                    "w-2 h-2 rounded-full bg-transparent flex-shrink-0"
                                } else {
                                    "w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                                };
                                let message = n.message.clone();
                                let time = crate::utils::format_relative_time(n.timestamp);
                                view! {
                                    <div class=format!("px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors {}", bg)>
                                        <div class="flex items-start gap-2">
                                            <span class=dot_class></span>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm text-gray-200 leading-snug">{message}</p>
                                                <p class="text-xs text-gray-500 mt-0.5">{time}</p>
                                            </div>
                                        </div>
                                    </div>
                                }
                            }).collect();
                            view! { <div>{entries}</div> }.into_any()
                        }
                    }}
                </div>
            </Show>
        </div>
    }
}
