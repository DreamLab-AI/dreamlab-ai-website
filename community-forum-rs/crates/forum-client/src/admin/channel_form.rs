//! Channel creation form component for the admin panel.
//!
//! Provides a form with name, description, and section dropdown. Validates that
//! the name is at least 3 characters before enabling submission.

use leptos::prelude::*;

use crate::utils::capitalize;

/// Predefined channel sections matching the forum's zone/section model.
const SECTIONS: &[&str] = &[
    "general",
    "announcements",
    "introductions",
    "music",
    "events",
    "tech",
    "random",
    "support",
];

/// Data submitted from the channel creation form.
#[derive(Clone, Debug)]
pub struct ChannelFormData {
    pub name: String,
    pub description: String,
    pub section: String,
}

/// Channel creation form. Calls `on_submit` with the validated form data.
#[component]
pub fn ChannelForm<F>(on_submit: F) -> impl IntoView
where
    F: Fn(ChannelFormData) + 'static,
{
    let name = RwSignal::new(String::new());
    let description = RwSignal::new(String::new());
    let section = RwSignal::new(SECTIONS[0].to_string());
    let validation_error = RwSignal::new(Option::<String>::None);
    let is_submitting = RwSignal::new(false);

    let is_valid = Memo::new(move |_| {
        let n = name.get();
        n.trim().len() >= 3
    });

    let on_name_input = move |ev: leptos::ev::Event| {
        let target = event_target_value(&ev);
        name.set(target);
        validation_error.set(None);
    };

    let on_desc_input = move |ev: leptos::ev::Event| {
        let target = event_target_value(&ev);
        description.set(target);
    };

    let on_section_change = move |ev: leptos::ev::Event| {
        let target = event_target_value(&ev);
        section.set(target);
    };

    let on_form_submit = move |ev: leptos::ev::SubmitEvent| {
        ev.prevent_default();

        let n = name.get_untracked();
        if n.trim().len() < 3 {
            validation_error.set(Some("Channel name must be at least 3 characters".into()));
            return;
        }

        is_submitting.set(true);
        on_submit(ChannelFormData {
            name: n.trim().to_string(),
            description: description.get_untracked().trim().to_string(),
            section: section.get_untracked(),
        });
        is_submitting.set(false);

        // Reset form
        name.set(String::new());
        description.set(String::new());
        section.set(SECTIONS[0].to_string());
    };

    view! {
        <form
            on:submit=on_form_submit
            class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4"
        >
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                {plus_circle_icon()}
                "Create Channel"
            </h3>

            // Name input
            <div class="space-y-1">
                <label for="channel-name" class="block text-sm font-medium text-gray-300">
                    "Channel Name"
                </label>
                <input
                    id="channel-name"
                    type="text"
                    maxlength="64"
                    prop:value=move || name.get()
                    on:input=on_name_input
                    placeholder="e.g. music-production"
                    class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <div class="flex items-center justify-between">
                    {move || {
                        validation_error.get().map(|msg| view! {
                            <p class="text-red-400 text-sm">{msg}</p>
                        })
                    }}
                    <span class="text-xs text-gray-600 ml-auto">
                        {move || format!("{}/64", name.get().len())}
                    </span>
                </div>
            </div>

            // Description input
            <div class="space-y-1">
                <label for="channel-desc" class="block text-sm font-medium text-gray-300">
                    "Description"
                </label>
                <textarea
                    id="channel-desc"
                    prop:value=move || description.get()
                    on:input=on_desc_input
                    placeholder="What is this channel about?"
                    rows="3"
                    class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
                />
            </div>

            // Section dropdown
            <div class="space-y-1">
                <label for="channel-section" class="block text-sm font-medium text-gray-300">
                    "Section"
                </label>
                <select
                    id="channel-section"
                    on:change=on_section_change
                    class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                >
                    {SECTIONS.iter().map(|s| {
                        let value = s.to_string();
                        let label = capitalize(s);
                        view! {
                            <option value=value.clone() selected=move || section.get() == value>
                                {label}
                            </option>
                        }
                    }).collect_view()}
                </select>
                // Color indicator for selected section
                <div class="flex items-center gap-1.5 mt-1">
                    <span class=move || section_color_dot_class(&section.get())></span>
                    <span class="text-xs text-gray-500">
                        {move || format!("Section: {}", capitalize(&section.get()))}
                    </span>
                </div>
            </div>

            // Submit button
            <button
                type="submit"
                disabled=move || !is_valid.get() || is_submitting.get()
                class="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
                {move || {
                    if is_submitting.get() { "Creating..." } else { "Create Channel" }
                }}
            </button>
        </form>
    }
}

/// Return a Tailwind class for a small colored dot representing the section.
fn section_color_dot_class(section: &str) -> &'static str {
    match section {
        "general" => "w-2 h-2 rounded-full bg-gray-400 inline-block",
        "announcements" => "w-2 h-2 rounded-full bg-amber-400 inline-block",
        "introductions" => "w-2 h-2 rounded-full bg-cyan-400 inline-block",
        "music" => "w-2 h-2 rounded-full bg-pink-400 inline-block",
        "events" => "w-2 h-2 rounded-full bg-green-400 inline-block",
        "tech" => "w-2 h-2 rounded-full bg-blue-400 inline-block",
        "random" => "w-2 h-2 rounded-full bg-purple-400 inline-block",
        "support" => "w-2 h-2 rounded-full bg-red-400 inline-block",
        _ => "w-2 h-2 rounded-full bg-gray-500 inline-block",
    }
}

// -- SVG icon helpers ---------------------------------------------------------

fn plus_circle_icon() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
    }
}
