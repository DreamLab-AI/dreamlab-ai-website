// Z.AI GLM client over the Anthropic Messages API, the same shape the agentbox
// diagram-review cadence uses (skills/sealmap-review/scripts/review-cadence.cjs).
//
// Only the Z.AI key reaches the request: ZAI_ANTHROPIC_API_KEY first, then
// ZAI_API_KEY. Nothing else from the caller's environment is read here.

export function zaiEndpoint(env = process.env) {
  return {
    url: (env.ZAI_URL || 'https://api.z.ai/api/anthropic').replace(/\/+$/, ''),
    key: env.ZAI_ANTHROPIC_API_KEY || env.ZAI_API_KEY || '',
  };
}

export async function glm({ model, system, user, maxTokens = 4096, thinkingBudget, timeoutMs = 180_000, env = process.env, fetchImpl = globalThis.fetch }) {
  const { url, key } = zaiEndpoint(env);
  if (!key) throw new Error('set ZAI_ANTHROPIC_API_KEY (or ZAI_API_KEY) in the environment');
  const body = { model, max_tokens: maxTokens, messages: [{ role: 'user', content: user }] };
  if (system) body.system = system;
  // GLM reasons by default. A positive budget bounds it; 0 switches it off
  // (the retry path after a reply that spent everything thinking); undefined
  // leaves the provider default.
  if (thinkingBudget > 0) body.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
  else if (thinkingBudget === 0) body.thinking = { type: 'disabled' };
  const res = await fetchImpl(`${url}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  if (!res.ok) throw new Error(`glm ${res.status}: ${JSON.stringify(json.error ?? json).slice(0, 300)}`);
  const text = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  if (!text) throw new Error(`glm: empty reply (stop_reason ${json.stop_reason ?? 'none'})`);
  return {
    text,
    usage: { input: json.usage?.input_tokens ?? 0, output: json.usage?.output_tokens ?? 0 },
    stopReason: json.stop_reason ?? null,
  };
}
