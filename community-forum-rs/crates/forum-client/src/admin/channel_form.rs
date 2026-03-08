//! Channel creation form component for the admin panel.
//!
//! Provides a form with name, description, and section dropdown. Validates that
//! the name is at least 3 characters before enabling submission.

use leptos::prelude::*;

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
            <h3 class="text-lg font-semibold text-white">"Create Channel"</h3>

            // Name input
            <div class="space-y-1">
                <label for="channel-name" class="block text-sm font-medium text-gray-300">
                    "Channel Name"
                </label>
                <input
                    id="channel-name"
                    type="text"
                    prop:value=move || name.get()
                    on:input=on_name_input
                    placeholder="e.g. music-production"
                    class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                {move || {
                    validation_error.get().map(|msg| view! {
                        <p class="text-red-400 text-sm">{msg}</p>
                    })
                }}
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
            </div>

            // Submit button
            <button
                type="submit"
                disabled=move || !is_valid.get() || is_submitting.get()
                class="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
                {move || {
                    if is_submitting.get() { "Creating..." } else { "Create Channel" }
                }}
            </button>
        </form>
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
