// SPA redirect restore for static hosting (GitHub Pages / Cloudflare Pages).
// public/404.html stores the originally requested deep-link path in
// sessionStorage.redirect and bounces to "/". This runs before the app module
// (classic, render-blocking script in <head>) and restores that path via
// history.replaceState so React Router renders the correct route.
//
// This lives in an external "'self'" file — not an inline <script> — so the CSP
// script-src can stay 'self' with no 'unsafe-inline' (see index.html CSP).
(function () {
  // Scheme 1: ?__p=<path> query param — set by the CI-generated dist/404.html
  // (deploy.yml). Handled here, NOT via an inline <script> injection, because
  // the CSP blocks inline scripts and would silently drop the deep link.
  try {
    var params = new URLSearchParams(location.search);
    var p = params.get('__p');
    if (p && p.charAt(0) === '/' && p.charAt(1) !== '/') {
      params.delete('__p');
      var rest = params.toString();
      history.replaceState(null, '', p + (rest ? '?' + rest : '') + location.hash);
      return;
    }
  } catch (e) {
    /* URLSearchParams unavailable — fall through */
  }

  // Scheme 2: sessionStorage.redirect — set by the repo's public/404.html
  // (used on hosts that serve it directly, e.g. Cloudflare Pages).
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
