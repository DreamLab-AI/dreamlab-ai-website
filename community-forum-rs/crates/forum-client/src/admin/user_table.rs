//! Whitelist user table component for the admin panel.
//!
//! Displays whitelisted users in a table with truncated pubkeys and cohort badges.
//! Supports inline editing of cohorts per user.

use leptos::prelude::*;
use send_wrapper::SendWrapper;
use std::rc::Rc;

use super::WhitelistUser;

/// Available zone flags for cohort editing.
const AVAILABLE_COHORTS: &[(&str, &str)] = &[
    ("home", "Home"),
    ("dreamlab", "DreamLab"),
    ("minimoonoir", "Minimoonoir"),
];

/// Callback type for cohort updates: (pubkey, new_cohorts).
type UpdateCallback = Rc<dyn Fn(String, Vec<String>)>;

/// Callback type for admin toggle: (pubkey, is_admin).
type AdminToggleCallback = Rc<dyn Fn(String, bool)>;

/// Whitelist user table. Shows username, cohorts, and an edit button for each user.
/// Calls `on_update_cohorts` when cohorts are changed for a user.
/// Calls `on_toggle_admin` when admin status is toggled for a user.
#[component]
pub fn UserTable(
    users: Signal<Vec<WhitelistUser>>,
    #[prop(into)] on_update_cohorts: UpdateCohortsCb,
    #[prop(into)] on_toggle_admin: AdminToggleCb,
) -> impl IntoView {
    let editing_pubkey = RwSignal::new(Option::<String>::None);
    let editing_cohorts = RwSignal::new(Vec::<String>::new());
    let callback = on_update_cohorts.0;
    let admin_callback = on_toggle_admin.0;

    view! {
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            // Table header
            <div class="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-750 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div class="col-span-5">"User"</div>
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
                        let acb = admin_callback.clone();
                        user_list.into_iter().map(move |user| {
                            let cb_for_row = cb.clone();
                            let acb_for_row = acb.clone();
                            view! {
                                <UserRow
                                    user=user
                                    editing_pubkey=editing_pubkey
                                    editing_cohorts=editing_cohorts
                                    on_save=UpdateCohortsCb(cb_for_row)
                                    on_toggle_admin=AdminToggleCb(acb_for_row)
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

#[cfg(target_arch = "wasm32")]
unsafe impl Send for UpdateCohortsCb {}
#[cfg(target_arch = "wasm32")]
unsafe impl Sync for UpdateCohortsCb {}

impl<F: Fn(String, Vec<String>) + 'static> From<F> for UpdateCohortsCb {
    fn from(f: F) -> Self {
        Self::new(f)
    }
}

/// A wrapper to make the admin toggle callback Send+Sync for Leptos context.
#[derive(Clone)]
pub struct AdminToggleCb(SendWrapper<AdminToggleCallback>);

impl AdminToggleCb {
    pub fn new(f: impl Fn(String, bool) + 'static) -> Self {
        Self(SendWrapper::new(Rc::new(f)))
    }
}

#[cfg(target_arch = "wasm32")]
unsafe impl Send for AdminToggleCb {}
#[cfg(target_arch = "wasm32")]
unsafe impl Sync for AdminToggleCb {}

impl<F: Fn(String, bool) + 'static> From<F> for AdminToggleCb {
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
    on_toggle_admin: AdminToggleCb,
) -> impl IntoView {
    let pk = user.pubkey.clone();
    let pk_display = truncate_pubkey(&pk);
    let display_name = user.display_name.clone();
    let cohorts = user.cohorts.clone();
    let is_admin_user = user.is_admin;

    let pk_for_edit = pk.clone();
    let cohorts_for_edit = cohorts.clone();
    let pk_for_check = pk.clone();
    let pk_for_check2 = pk.clone();
    let pk_for_save = pk.clone();
    let pk_for_admin = pk.clone();

    let is_editing = move || editing_pubkey.get().as_deref() == Some(&*pk_for_check);
    let is_editing2 = move || editing_pubkey.get().as_deref() == Some(&*pk_for_check2);

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

    let admin_cb = on_toggle_admin.0;
    let on_admin_toggle = move |_| {
        admin_cb(pk_for_admin.clone(), !is_admin_user);
    };

    let cohorts_for_display = cohorts.clone();

    view! {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-gray-750 hover:border-l-2 hover:border-l-amber-500/50 border-l-2 border-l-transparent transition-all">
            // User column — display name + truncated pubkey
            <div class="col-span-5">
                <div class="flex flex-col gap-0.5">
                    {display_name.as_ref().map(|name| view! {
                        <span class="text-white font-medium text-sm">{name.clone()}</span>
                    })}
                    <span
                        class="font-mono text-gray-500 bg-gray-900 rounded px-2 py-0.5 text-xs w-fit"
                        title=pk.clone()
                    >
                        {pk_display}
                    </span>
                </div>
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
                                    {is_admin_user.then(|| view! {
                                        <span class="inline-block text-xs rounded px-1.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30">
                                            "Admin"
                                        </span>
                                    })}
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
                            on:click=on_admin_toggle.clone()
                            class=if is_admin_user {
                                "text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400 rounded px-2 py-1 transition-colors"
                            } else {
                                "text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 rounded px-2 py-1 transition-colors"
                            }
                        >
                            {if is_admin_user { "Revoke Admin" } else { "Make Admin" }}
                        </button>
                        <button
                            on:click=on_edit_click.clone()
                            class="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded px-2 py-1 transition-colors flex items-center gap-1"
                        >
                            {pencil_icon()}
                            "Edit"
                        </button>
                    }
                >
                    <button
                        on:click=on_save_click.clone()
                        class="text-xs text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-400 rounded px-2 py-1 transition-colors flex items-center gap-1"
                    >
                        {check_icon()}
                        "Save"
                    </button>
                    <button
                        on:click=on_cancel_click
                        class="text-xs text-gray-400 hover:text-gray-300 border border-gray-600 hover:border-gray-500 rounded px-2 py-1 transition-colors flex items-center gap-1"
                    >
                        {x_icon()}
                        "Cancel"
                    </button>
                </Show>
            </div>
        </div>
    }
}

/// Inline cohort editor with checkboxes for each available zone flag.
#[component]
fn CohortEditor(editing_cohorts: RwSignal<Vec<String>>) -> impl IntoView {
    view! {
        <div class="flex flex-wrap gap-2">
            {AVAILABLE_COHORTS.iter().map(|&(cohort_id, label)| {
                let cohort_str = cohort_id.to_string();
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
        "home" => "inline-block text-xs rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:shadow-[0_0_6px_rgba(245,158,11,0.3)] transition-shadow",
        "dreamlab" => "inline-block text-xs rounded px-1.5 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:shadow-[0_0_6px_rgba(236,72,153,0.3)] transition-shadow",
        "minimoonoir" => "inline-block text-xs rounded px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:shadow-[0_0_6px_rgba(168,85,247,0.3)] transition-shadow",
        _ => "inline-block text-xs rounded px-1.5 py-0.5 bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:shadow-[0_0_6px_rgba(107,114,128,0.3)] transition-shadow",
    }
}

// -- SVG icon helpers ---------------------------------------------------------

fn pencil_icon() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
    }
}

fn check_icon() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    }
}

fn x_icon() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    }
}
