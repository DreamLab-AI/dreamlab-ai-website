//! Whitelist user table component for the admin panel.
//!
//! Displays whitelisted users in a table with truncated pubkeys and cohort badges.
//! Supports inline editing of cohorts per user.

use leptos::prelude::*;
use send_wrapper::SendWrapper;
use std::rc::Rc;

use super::WhitelistUser;

/// Available cohorts for the cohort editor.
const AVAILABLE_COHORTS: &[&str] = &[
    "general",
    "music",
    "events",
    "tech",
    "moderator",
    "vip",
];

/// Callback type for cohort updates: (pubkey, new_cohorts).
type UpdateCallback = Rc<dyn Fn(String, Vec<String>)>;

/// Whitelist user table. Shows pubkey, cohorts, and an edit button for each user.
/// Calls `on_update_cohorts` when cohorts are changed for a user.
#[component]
pub fn UserTable(
    users: Signal<Vec<WhitelistUser>>,
    #[prop(into)] on_update_cohorts: UpdateCohortsCb,
) -> impl IntoView {
    let editing_pubkey = RwSignal::new(Option::<String>::None);
    let editing_cohorts = RwSignal::new(Vec::<String>::new());
    let callback = on_update_cohorts.0;

    view! {
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            // Table header
            <div class="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-750 border-b border-gray-700 text-sm font-medium text-gray-400">
                <div class="col-span-5">"Pubkey"</div>
                <div class="col-span-5">"Cohorts"</div>
                <div class="col-span-2 text-right">"Actions"</div>
            </div>

            // User rows
            <div class="divide-y divide-gray-700">
                {move || {
                    let user_list = users.get();
                    if user_list.is_empty() {
                        view! {
                            <div class="px-4 py-8 text-center text-gray-500">
                                "No whitelisted users found."
                            </div>
                        }.into_any()
                    } else {
                        let cb = callback.clone();
                        user_list.into_iter().map(move |user| {
                            let cb_for_row = cb.clone();
                            view! {
                                <UserRow
                                    user=user
                                    editing_pubkey=editing_pubkey
                                    editing_cohorts=editing_cohorts
                                    on_save=UpdateCohortsCb(cb_for_row)
                                />
                            }
                        }).collect_view().into_any()
                    }
                }}
            </div>
        </div>
    }
}

/// A wrapper to make the callback Send+Sync for Leptos context.
/// SAFETY: WASM is single-threaded, so Send+Sync is safe. We use
/// SendWrapper internally to satisfy Leptos bounds.
#[derive(Clone)]
pub struct UpdateCohortsCb(SendWrapper<UpdateCallback>);

impl UpdateCohortsCb {
    pub fn new(f: impl Fn(String, Vec<String>) + 'static) -> Self {
        Self(SendWrapper::new(Rc::new(f)))
    }
}

unsafe impl Send for UpdateCohortsCb {}
unsafe impl Sync for UpdateCohortsCb {}

impl<F: Fn(String, Vec<String>) + 'static> From<F> for UpdateCohortsCb {
    fn from(f: F) -> Self {
        Self::new(f)
    }
}

/// A single row in the user table with inline edit capability.
#[component]
fn UserRow(
    user: WhitelistUser,
    editing_pubkey: RwSignal<Option<String>>,
    editing_cohorts: RwSignal<Vec<String>>,
    on_save: UpdateCohortsCb,
) -> impl IntoView {
    let pk = user.pubkey.clone();
    let pk_display = truncate_pubkey(&pk);
    let cohorts = user.cohorts.clone();

    let pk_for_edit = pk.clone();
    let cohorts_for_edit = cohorts.clone();
    let pk_for_check = pk.clone();
    let pk_for_check2 = pk.clone();
    let pk_for_save = pk.clone();

    let is_editing = move || {
        editing_pubkey.get().as_deref() == Some(&*pk_for_check)
    };
    let is_editing2 = move || {
        editing_pubkey.get().as_deref() == Some(&*pk_for_check2)
    };

    let on_edit_click = move |_| {
        editing_pubkey.set(Some(pk_for_edit.clone()));
        editing_cohorts.set(cohorts_for_edit.clone());
    };

    let save_cb = on_save.0;
    let pk_save = pk_for_save.clone();
    let on_save_click = move |_| {
        let updated = editing_cohorts.get_untracked();
        save_cb(pk_save.clone(), updated);
        editing_pubkey.set(None);
    };

    let on_cancel_click = move |_| {
        editing_pubkey.set(None);
    };

    let cohorts_for_display = cohorts.clone();

    view! {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-750 transition-colors">
            // Pubkey column
            <div class="col-span-5">
                <span
                    class="font-mono text-gray-300 bg-gray-900 rounded px-2 py-0.5 text-xs"
                    title=pk.clone()
                >
                    {pk_display}
                </span>
            </div>

            // Cohorts column
            <div class="col-span-5">
                <Show
                    when=is_editing
                    fallback={
                        let cohorts_disp = cohorts_for_display.clone();
                        move || {
                            view! {
                                <div class="flex flex-wrap gap-1">
                                    {cohorts_disp.iter().map(|c| {
                                        let badge_class = cohort_badge_class(c);
                                        let label = c.clone();
                                        view! {
                                            <span class=badge_class>
                                                {label}
                                            </span>
                                        }
                                    }).collect_view()}
                                </div>
                            }
                        }
                    }
                >
                    <CohortEditor editing_cohorts=editing_cohorts />
                </Show>
            </div>

            // Actions column
            <div class="col-span-2 flex justify-end gap-1">
                <Show
                    when=is_editing2
                    fallback=move || view! {
                        <button
                            on:click=on_edit_click.clone()
                            class="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded px-2 py-1 transition-colors"
                        >
                            "Edit"
                        </button>
                    }
                >
                    <button
                        on:click=on_save_click.clone()
                        class="text-xs text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-400 rounded px-2 py-1 transition-colors"
                    >
                        "Save"
                    </button>
                    <button
                        on:click=on_cancel_click.clone()
                        class="text-xs text-gray-400 hover:text-gray-300 border border-gray-600 hover:border-gray-500 rounded px-2 py-1 transition-colors"
                    >
                        "Cancel"
                    </button>
                </Show>
            </div>
        </div>
    }
}

/// Inline cohort editor with checkboxes for each available cohort.
#[component]
fn CohortEditor(editing_cohorts: RwSignal<Vec<String>>) -> impl IntoView {
    view! {
        <div class="flex flex-wrap gap-2">
            {AVAILABLE_COHORTS.iter().map(|cohort| {
                let cohort_str = cohort.to_string();
                let cohort_for_check = cohort_str.clone();
                let cohort_for_toggle = cohort_str.clone();

                let is_checked = move || {
                    editing_cohorts.get().contains(&cohort_for_check)
                };

                let on_toggle = move |_| {
                    editing_cohorts.update(|list| {
                        if list.contains(&cohort_for_toggle) {
                            list.retain(|c| c != &cohort_for_toggle);
                        } else {
                            list.push(cohort_for_toggle.clone());
                        }
                    });
                };

                let label = capitalize(cohort);

                view! {
                    <label class="flex items-center gap-1 cursor-pointer text-xs">
                        <input
                            type="checkbox"
                            prop:checked=is_checked
                            on:change=on_toggle
                            class="rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-500"
                        />
                        <span class="text-gray-300">{label}</span>
                    </label>
                }
            }).collect_view()}
        </div>
    }
}

/// Truncate a hex pubkey to show first 8 and last 4 characters.
fn truncate_pubkey(pk: &str) -> String {
    if pk.len() <= 16 {
        return pk.to_string();
    }
    format!("{}...{}", &pk[..8], &pk[pk.len() - 4..])
}

/// Return a Tailwind CSS class string for a cohort badge based on the cohort name.
fn cohort_badge_class(cohort: &str) -> &'static str {
    match cohort {
        "moderator" => "inline-block text-xs rounded px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30",
        "vip" => "inline-block text-xs rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30",
        "tech" => "inline-block text-xs rounded px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30",
        "music" => "inline-block text-xs rounded px-1.5 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30",
        "events" => "inline-block text-xs rounded px-1.5 py-0.5 bg-green-500/20 text-green-300 border border-green-500/30",
        _ => "inline-block text-xs rounded px-1.5 py-0.5 bg-gray-500/20 text-gray-300 border border-gray-500/30",
    }
}

/// Capitalize the first letter of a string.
fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}
