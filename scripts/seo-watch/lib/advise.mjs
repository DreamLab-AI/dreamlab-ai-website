// The model's half of the night, kept pure: build the prompt from receipts and
// decide whether tonight is worth a call. The GLM transport is in glm.mjs.
//
// Cost discipline: one call a night at most, only when the finding set changed,
// a Lighthouse regression appeared, it is the weekly digest day, or the
// operator forced it; capped input; a monthly token budget that skips advise
// when exhausted. A quiet night costs nothing.

import { clip } from './safety.mjs';

export function monthTokens(ledger, now = new Date()) {
  const ym = now.toISOString().slice(0, 7);
  return ledger.filter((r) => (r.date ?? '').startsWith(ym)).reduce((n, r) => n + (r.advise?.tokens?.input ?? 0) + (r.advise?.tokens?.output ?? 0), 0);
}

export function decideAdvise({ fingerprint, lastFingerprint, regressions, force, now, config, spentTokens }) {
  if (spentTokens >= (config.monthly_token_budget ?? 2_000_000)) return { call: false, reason: `monthly token budget spent (${spentTokens})` };
  if (force) return { call: true, reason: 'forced' };
  if (regressions > 0) return { call: true, reason: `${regressions} Lighthouse regression(s)` };
  if (fingerprint !== lastFingerprint) return { call: true, reason: lastFingerprint ? 'finding set changed' : 'first run' };
  if (config.weekly_digest_weekday !== undefined && now.getUTCDay() === config.weekly_digest_weekday) return { call: true, reason: 'weekly digest' };
  return { call: false, reason: 'findings unchanged since last night' };
}

export const SYSTEM = `You are the SEO and AI-discoverability engineer for dreamlab-ai.com, a prerendered React SPA on GitHub Pages (static files, no server, no server-side redirects). You receive tonight's deterministic audit receipts, trend data and the exact current contents of a few source files. You never invent measurements: every claim cites a receipt.

Write a concise report in Markdown with these sections, in order: "## Summary" (3 sentences max), "## Priorities" (ordered list, each item names the check id and the page), "## Trend" (what changed versus the ledger tail), "## Next change" (the one change you would make first and why).

Then write exactly one line: "PROPOSE: YES" or "PROPOSE: NO".

If YES, follow it with ONE unified diff in a fenced block tagged seo-patch, applying cleanly with \`git apply\` to the file contents given below (same paths, "a/" and "b/" prefixes, correct hunk line counts). Rules for the patch: touch only the allowlisted files named in the prompt; at most 60 changed lines; no renames, new files, deletions or mode changes; never change which crawlers robots.txt allows or disallows (that is a human policy decision: raise it in the report instead); never add claims, figures or testimonials that the receipts do not support; UK English. Prefer NO over a speculative patch. Never patch a file listed under cool-down (a human declined a change to it recently) and never patch a reference file (they are read-only context: cite the exact line in the report instead). If the prompt says a proposal is already open, answer PROPOSE: NO.`;

const SEVERITY_RANK = { high: 0, medium: 1, low: 2, info: 3 };

export function buildPrompt({ date, origin, audit, ledgerTail, sources, references = {}, allowlist, cooldown, presence, blocked = null, maxChars = 120_000 }) {
  const cool = Object.entries(cooldown ?? {});
  const findings = [...audit.findings]
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .slice(0, 80)
    .map((f) => ({ ...f, detail: clip(f.detail, 240) }));
  const parts = [
    `Date: ${date}. Site: ${origin}. Pages audited tonight: ${audit.roster.length} of ${audit.sources.sitemapCount} in the sitemap.`,
    '',
    '## Findings (deterministic receipts)',
    '```json',
    JSON.stringify(findings, null, 1),
    '```',
    audit.notes?.length ? `\n## Notes flagged for a human (do not patch)\n${audit.notes.map((n) => `- ${n}`).join('\n')}` : '',
    Object.keys(audit.lighthouse ?? {}).length ? `\n## Lighthouse tonight (mobile)\n\`\`\`json\n${JSON.stringify(audit.lighthouse)}\n\`\`\`` : '\n## Lighthouse\nnot run tonight',
    `\n## Agent parity\n${JSON.stringify(audit.parity)}`,
    presence?.results?.length ? `\n## AI search presence (weekly)\n${presence.results.map((p) => `- "${p.query}": ${p.cited ? 'cited' : 'not cited'}${p.error ? ` (${p.error})` : ''}`).join('\n')}` : '',
    `\n## Ledger tail (previous nights)\n\`\`\`json\n${JSON.stringify(ledgerTail.map((r) => ({ date: r.date, findings: r.findings, fingerprint: r.fingerprint, lighthouse: r.lighthouse, proposal: r.propose?.status, pr: r.propose?.pr })), null, 0)}\n\`\`\``,
    blocked ? `\n## Proposal gate\nA proposal is already open or deferred (${blocked}); report only, PROPOSE: NO.` : '',
    cool.length ? `\n## Cool-down (files a human declined to change; do not patch before the date)\n${cool.map(([f, until]) => `- ${f} until ${until}`).join('\n')}` : '',
    `\n## Allowlisted files (exact current contents of origin/main; a patch must apply to these)\n${allowlist.join(', ')}`,
  ];
  for (const [file, text] of Object.entries(sources)) parts.push(`\n=== FILE: ${file} ===\n${text}\n=== END ${file} ===`);
  if (Object.keys(references).length) parts.push('\n## Reference files (read-only: cite line numbers in the report, never patch)');
  for (const [file, text] of Object.entries(references)) parts.push(`\n=== REFERENCE: ${file} ===\n${text}\n=== END ${file} ===`);
  let user = parts.filter(Boolean).join('\n');
  if (user.length > maxChars) user = `${user.slice(0, maxChars)}\n…[prompt truncated at ${maxChars} chars]`;
  return { system: SYSTEM, user };
}
