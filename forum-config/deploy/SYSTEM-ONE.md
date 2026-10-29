# System One activation

The deployment opts in public search reranking, public-post moderation triage,
and the local-only rationale-check API. Changes take effect on the next Worker
deployment; an Agentbox rebuild does not deploy Cloudflare Workers.

Search and relay use Typesafe Jev (`jev-latest`). Set the `TYPESAFE_API_KEY` GitHub repository secret
and run `set-worker-secrets.yml` to provision it into those two Workers. The
deploy workflow checks the Worker secret names before deploying. Keys remain
outside Wrangler plaintext variables. The relay's five-minute cron invokes the
existing advisory sweep; it does not hide or moderate posts automatically.

The rationale-check flag enables its API route, but inference still requires an
authenticated sovereign endpoint reachable from the Worker. None is provisioned
by this change. Configure `JEV_ENDPOINT`, `JEV_MODEL`, the appropriate key name,
and `JEV_LOCAL=1` only after verifying that endpoint runs local inference. Docker
DNS and Agentbox loopback are unreachable from Cloudflare; Typesafe is not local.
Until then the route returns its existing unavailable result without sending the
private rationale to a cloud judge. There is no forum-client button yet; clients
can use the existing signed API route.

Existing search entries need a normal signed re-ingest containing public
snippets. The worker cannot reconstruct source text from old embeddings.
New client ingests include snippets; missing snippets retain the original search
order. Do not scrape private posts to fill this store.

The deployed kit source pin must include the Jev changes (first commit
`f8f14ab`, with subsequent fixes on `8a5cf81`). Enabling flags against the older
`ebcfaa2` pin has no effect. Thresholds remain their existing advisory defaults;
these changes establish execution, not measured quality improvement.
