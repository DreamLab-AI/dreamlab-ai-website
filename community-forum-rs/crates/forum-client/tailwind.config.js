/**
 * Tailwind config for the DreamLab community forum (Leptos CSR).
 *
 * Mirrors the inline `tailwind.config = { ... }` block that previously sat
 * next to the CDN <script> in index.html. Production builds use the
 * standalone Tailwind CLI (downloaded by Trunk pre-build hook) to produce
 * tree-shaken CSS, eliminating the dev-only Play CDN warning.
 *
 * Content scanning: Leptos `view! { ... }` macros expand to Rust source,
 * so utility classes appear in `src/**/*.rs`. The HTML shell is also
 * scanned for any inline classes.
 */
module.exports = {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.rs',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
            },
            colors: {
                amber: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                    950: '#451a03',
                },
            },
        },
    },
    plugins: [],
};
