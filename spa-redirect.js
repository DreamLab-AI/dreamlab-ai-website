// SPA redirect restore for static hosting (GitHub Pages / Cloudflare Pages).
// public/404.html stores the originally requested deep-link path in
// sessionStorage.redirect and bounces to "/". This runs before the app module
// (classic, render-blocking script in <head>) and restores that path via
// history.replaceState so React Router renders the correct route.
//
// This lives in an external "'self'" file — not an inline <script> — so the CSP
// script-src can stay 'self' with no 'unsafe-inline' (see index.html CSP).
(function () {
  try {
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== location.pathname) {
      history.replaceState(null, null, redirect);
    }
  } catch (e) {
    /* sessionStorage unavailable (private mode / disabled) — no-op */
  }
})();
