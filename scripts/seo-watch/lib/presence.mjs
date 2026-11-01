// Weekly outcome metric: does an AI search engine cite dreamlab-ai.com for the
// queries we care about? Uses the Perplexity API (sonar) because its answers
// carry a `citations` list. Off unless PERPLEXITY_API_KEY is set; runs only on
// the configured weekday so the spend is a handful of calls a week.

export async function probePresence({ queries, origin, env = process.env, fetchImpl = globalThis.fetch, model = 'sonar', timeoutMs = 60_000 }) {
  const key = env.PERPLEXITY_API_KEY;
  if (!key) return { skipped: 'PERPLEXITY_API_KEY not set', results: [] };
  const host = origin.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const base = (env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai').replace(/\/+$/, '');
  const results = [];
  for (const query of queries) {
    try {
      const res = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: query }], max_tokens: 400 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json.error ?? json).slice(0, 120)}`);
      const citations = [...(json.citations ?? []), ...((json.search_results ?? []).map((r) => r.url).filter(Boolean))];
      const unique = [...new Set(citations)];
      results.push({ query, citations: unique, cited: unique.some((c) => { try { return new URL(c).hostname.replace(/^www\./, '') === host; } catch { return false; } }) });
    } catch (err) {
      results.push({ query, citations: [], cited: false, error: err.message.slice(0, 160) });
    }
  }
  return { results, cited: results.filter((r) => r.cited).length, total: results.length };
}
