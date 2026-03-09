//! Rich message compose box with markdown preview, emoji picker, and character counter.

use leptos::prelude::*;
use wasm_bindgen::JsCast;

/// Maximum message length in characters.
const MAX_CHARS: usize = 4096;

/// Common emojis for the quick picker.
const EMOJIS: &[&str] = &[
    "\u{1F44D}",
    "\u{2764}\u{FE0F}",
    "\u{1F602}",
    "\u{1F525}",
    "\u{1F389}",
    "\u{1F440}",
    "\u{1F4AF}",
    "\u{1F64C}",
    "\u{1F60D}",
    "\u{1F914}",
    "\u{1F44F}",
    "\u{1F680}",
    "\u{2728}",
    "\u{1F60E}",
    "\u{1F64F}",
    "\u{1F631}",
    "\u{1F60A}",
    "\u{1F4A1}",
    "\u{1F3AF}",
    "\u{1F48E}",
    "\u{1F30E}",
    "\u{1F4AC}",
    "\u{1F4AA}",
    "\u{1F308}",
];

/// Rich message input with markdown preview, emoji picker, and character counter.
///
/// - Textarea auto-grows as content is typed
/// - Shift+Enter inserts a newline; Enter sends
/// - Character counter (max 4096)
/// - Markdown preview toggle (rendered via comrak)
/// - Emoji picker popup
/// - Send button with amber glow, disabled when empty
#[component]
pub(crate) fn MessageInput(
    /// Callback fired with the message text when the user sends.
    on_send: Callback<String>,
    /// Placeholder text shown in the empty textarea.
    #[prop(default = "Type a message...")]
    placeholder: &'static str,
    /// Optional callback fired on every keystroke (for typing indicators).
    #[prop(optional)]
    on_typing: Option<Callback<()>>,
) -> impl IntoView {
    let content = RwSignal::new(String::new());
    let show_preview = RwSignal::new(false);
    let show_emoji = RwSignal::new(false);
    let textarea_ref = NodeRef::<leptos::html::Textarea>::new();

    let char_count = move || content.get().len();
    let is_empty = move || content.get().trim().is_empty();
    let is_over_limit = move || char_count() > MAX_CHARS;

    // Auto-resize textarea to fit content
    let resize_textarea = move || {
        if let Some(el) = textarea_ref.get() {
            let el: web_sys::HtmlElement = el.into();
            el.style().set_property("height", "auto").ok();
            let scroll_h = el.scroll_height();
            let clamped = scroll_h.clamp(44, 200);
            el.style()
                .set_property("height", &format!("{}px", clamped))
                .ok();
        }
    };

    let on_input = move |ev: leptos::ev::Event| {
        let target = ev.target().unwrap();
        let textarea: web_sys::HtmlTextAreaElement = target.unchecked_into();
        content.set(textarea.value());
        resize_textarea();
        if let Some(cb) = on_typing {
            cb.run(());
        }
    };

    let do_send = move || {
        let text = content.get_untracked();
        let text = text.trim().to_string();
        if text.is_empty() || text.len() > MAX_CHARS {
            return;
        }
        on_send.run(text);
        content.set(String::new());
        show_preview.set(false);
        // Reset textarea height
        if let Some(el) = textarea_ref.get() {
            let el: web_sys::HtmlElement = el.into();
            el.style().set_property("height", "auto").ok();
        }
    };

    let on_keydown = move |ev: leptos::ev::KeyboardEvent| {
        if ev.key() == "Enter" && !ev.shift_key() {
            ev.prevent_default();
            do_send();
        }
    };

    let insert_emoji = move |emoji: &'static str| {
        content.update(|c| c.push_str(emoji));
        show_emoji.set(false);
        // Re-focus textarea
        if let Some(el) = textarea_ref.get() {
            let el: web_sys::HtmlElement = el.into();
            let _ = el.focus();
        }
    };

    // Render markdown preview via comrak
    let preview_html = move || {
        let raw = content.get();
        if raw.trim().is_empty() {
            return "<p class=\"text-gray-500 italic\">Nothing to preview</p>".to_string();
        }
        let opts = comrak::Options::default();
        comrak::markdown_to_html(&raw, &opts)
    };

    let counter_class = move || {
        let count = char_count();
        if count > MAX_CHARS {
            "text-xs text-red-400 font-medium"
        } else if count > MAX_CHARS - 200 {
            "text-xs text-amber-400"
        } else {
            "text-xs text-gray-500"
        }
    };

    view! {
        <div class="glass-card p-3 rounded-2xl relative">
            // Preview area
            <Show when=move || show_preview.get()>
                <div class="mb-2 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50 max-h-48 overflow-y-auto">
                    <div
                        class="prose prose-invert prose-sm max-w-none text-gray-200"
                        inner_html=preview_html
                    />
                </div>
            </Show>

            // Textarea
            <Show when=move || !show_preview.get()>
                <textarea
                    node_ref=textarea_ref
                    class="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 rounded-xl p-3 text-sm leading-relaxed min-h-[44px] max-h-[200px]"
                    placeholder=placeholder
                    prop:value=move || content.get()
                    on:input=on_input
                    on:keydown=on_keydown
                    rows="1"
                />
            </Show>

            // Bottom toolbar
            <div class="flex items-center justify-between mt-1.5 px-1">
                <div class="flex items-center gap-1">
                    // Markdown preview toggle
                    <button
                        class=move || {
                            if show_preview.get() {
                                "p-1.5 rounded-lg text-amber-400 bg-amber-400/10 transition-colors"
                            } else {
                                "p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
                            }
                        }
                        on:click=move |_| show_preview.update(|v| *v = !*v)
                        title="Toggle markdown preview"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 4h20v16H2z" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6 12l2-2v4m4-6l2 3 2-3m2 0v3l2 3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>

                    // Emoji picker toggle
                    <div class="relative">
                        <button
                            class=move || {
                                if show_emoji.get() {
                                    "p-1.5 rounded-lg text-amber-400 bg-amber-400/10 transition-colors"
                                } else {
                                    "p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
                                }
                            }
                            on:click=move |_| show_emoji.update(|v| *v = !*v)
                            title="Emoji picker"
                        >
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke-linecap="round"/>
                                <line x1="9" y1="9" x2="9.01" y2="9"/>
                                <line x1="15" y1="9" x2="15.01" y2="9"/>
                            </svg>
                        </button>

                        // Emoji popup
                        <Show when=move || show_emoji.get()>
                            <div class="absolute bottom-full left-0 mb-2 glass-card p-2 rounded-xl shadow-lg z-50 w-64">
                                <div class="emoji-grid">
                                    {EMOJIS.iter().map(|&emoji| {
                                        let emoji_static = emoji;
                                        view! {
                                            <button
                                                class="emoji-btn"
                                                on:click=move |_| insert_emoji(emoji_static)
                                            >
                                                {emoji_static}
                                            </button>
                                        }
                                    }).collect_view()}
                                </div>
                            </div>
                        </Show>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    // Character counter
                    <span class=counter_class>
                        {move || format!("{}/{}", char_count(), MAX_CHARS)}
                    </span>

                    // Send button
                    <button
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 transition-all glow-hover flex-shrink-0"
                        on:click=move |_| do_send()
                        disabled=move || is_empty() || is_over_limit()
                    >
                        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    }
}
