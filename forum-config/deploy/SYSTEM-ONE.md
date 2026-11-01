# System One activation

The deployment opts in public search reranking, public-post moderation triage,
and the rationale-check API. Changes take effect on the next Worker
deployment; an Agentbox rebuild does not deploy Cloudflare Workers.

Search and relay use Typesafe Jev (`jev-latest`). Set the `TYPESAFE_API_KEY` GitHub repository secret
and run `set-worker-secrets.yml` to provision it into the search, relay and auth Workers. The
deploy workflow checks the Worker secret names before deploying. Keys remain
outside Wrangler plaintext variables. The relay's five-minute cron invokes the
existing advisory sweep; it does not hide or moderate posts automatically.

The rationale-check route uses the same `TYPESAFE_API_KEY` Worker secret
(provisioned into the auth Worker by `set-worker-secrets.yml`) and reaches
Typesafe directly, since the kit's per-consumer local-only switch is off by
default. To keep the rationale private, set `JEV_RATIONALE_CHECK_LOCAL_ONLY=1`;
the route then refuses Typesafe and returns its existing unavailable result
until an authenticated sovereign endpoint is configured (`JEV_ENDPOINT`,
`JEV_MODEL`, the key name and `JEV_LOCAL=1`, only after verifying it runs local
inference). Docker DNS and Agentbox loopback are unreachable from Cloudflare.
There is no forum-client button yet; clients can use the existing signed API
route.

Existing search entries need a normal signed re-ingest containing public
snippets. The worker cannot reconstruct source text from old embeddings.
New client ingests include snippets; missing snippets retain the original search
order. Do not scrape private posts to fill this store.

The deployed kit source pin must include the Jev changes (first commit
`f8f14ab`, with subsequent fixes on `8a5cf81`) and the env-driven local-only
switches (`9c36b60`). Enabling flags against the older `ebcfaa2` pin has no
effect, and against `8a5cf81` the rationale check stays local-only. Thresholds remain their existing advisory defaults;
these changes establish execution, not measured quality improvement.
