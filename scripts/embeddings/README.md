# scripts/embeddings

These scripts belong to the **agent-memory pipeline**, not the website build.

They sync content embeddings into the agentbox `ruvector-postgres` instance for
agent semantic memory. They are not part of the Vite build, the Cloudflare
Workers deploy, or forum search, and they are not invoked by any `npm` script
or CI workflow. Do not remove them as build debt.
