# Estate closeout evidence — 2026-09-05

Source/test evidence for the ADR-2001..2008 closeout pass. **This is not a
live-service certification**: nothing was deployed, and no live DNS, Cloudflare
Worker or GitHub Pages target was exercised. Every artefact here was produced
from a local build of the working tree.

| File | What it is |
|---|---|
| `browser-acceptance.json` | Machine-readable receipt: per-check probes, classified console errors, and eight derived verdicts. |
| `browser-check.mjs` | The probe harness that produced it (raw CDP against the browsercontainer sidecar). Re-runnable. |
| `screenshots/` | One PNG per check, named to match `checks[].id` in the receipt. |

## What was built and served

All three frontends were built from the **same pinned kit revision the deploy
workflow uses** (`KIT_REF = a7544687b4d1c09807862d749b27f8c8da307a12`) and merged
into `dist/` with the same `window.__ENV__` payloads `deploy.yml` injects, so the
served build carries the effective configuration a real deploy would ship.

| Surface | Path | Toolchain |
|---|---|---|
| React marketing SPA | `/` | Vite 5.4 |
| Leptos forum client | `/community/` | Trunk (release) |
| Retro ASCII/BBS client | `/community/bbs/` | Trunk (release) |

Served by a static server on `:8181` with a GitHub-Pages-equivalent `404.html`
fallback, so the SPA `?__p=` deep-link shim is exercised as it is in production.

## Reproducing

```bash
npm run build                      # React -> dist/
# clone the kit at KIT_REF, trunk build both clients, merge into dist/
# (the exact merge + injection steps mirror .github/workflows/deploy.yml)
python3 -m http.server 8181 -d dist # plus the 404.html fallback
OUT_DIR=docs/estate-closeout/2026-09-05 CDP_HOST=<sidecar-ip>:9223 \
  BASE_URL=http://agentbox:8181 node docs/estate-closeout/2026-09-05/browser-check.mjs
```

## Reading the console errors

Every console error in the receipt is classified, and none were left
`unclassified`:

- **`pre-existing`** — CSP `frame-ancestors` / `X-Frame-Options` delivered via
  `<meta>`, which browsers ignore. These need HTTP response headers, and GitHub
  Pages cannot set them. Present on the live origin too; not introduced here.
- **`expected`** — the deep-link `404` on the document. That *is* the GitHub
  Pages SPA shim: `404.html` redirects via `?__p=`, and the probe confirms the
  original path was restored (`probe.path`).
- **`harness`** — the worker CORS refusal. Worker CORS is scoped to
  `https://dreamlab-ai.com` and the lab origin is `http://agentbox:8181`, so the
  cross-origin fetch is correctly refused. This evidences scoped CORS rather
  than contradicting it.

## Deliberate stubs

Two stubs are injected before page scripts, both recorded in the receipt:

- **`navigator.serviceWorker`** — the lab origin is plain HTTP and non-localhost,
  so Chrome withholds this secure-context API. Both Leptos clients call
  `register()` during boot and abort on the resulting `TypeError`. The stub
  records what each client would register (see `probe.sw_registered`) so the
  surface can be observed at all. The real origin is HTTPS and unaffected.
- **`WebSocket`** (check `07` only) — the build carries the **production** relay
  URL and agent pubkey. Blocking the socket exercises the Talk-to-AI
  disconnected path without sending any DM to the live agent.
