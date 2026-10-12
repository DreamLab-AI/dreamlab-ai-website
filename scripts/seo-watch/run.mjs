#!/usr/bin/env node
// Nightly SEO & agent-searchability watch for dreamlab-ai.com (ADR-2010).
//
//   node scripts/seo-watch/run.mjs nightly [--dry-run] [--no-browser] [--force-advise] [--date YYYY-MM-DD]
//   node scripts/seo-watch/run.mjs audit    # receipts only, printed as JSON
//   node scripts/seo-watch/run.mjs status   # last ledger rows and cool-downs
//   node scripts/seo-watch/run.mjs verify --patch <file>   # worktree build/lint/test of a diff, no push
//   --no-propose runs advise for real but withholds the PR (patch saved under reports/)
//
// Three phases, each of which can be skipped without breaking the next:
//   audit    deterministic receipts from the live site and the browser sidecar
//   advise   GLM (Z.AI) reads the receipts and the allowlisted sources, writes
//            a report and, when warranted, ONE small patch
//   propose  the patch is built and tested in an isolated worktree under a
//            cleared environment and opened as a DRAFT PR; a human merges
//
// Runs alongside the dream engine, not inside it: it never touches
// docs/dream-cycle/, dream.config.json or the dream branches, and writes its
// own state under $SEO_WATCH_STATE_DIR (default ~/workspace/.agentbox/seo-watch).
// Reports land there too; a proposal carries its report into the PR branch.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runAudit } from './lib/audit.mjs';
import * as C from './lib/checks.mjs';
import { glm } from './lib/glm.mjs';
import { buildPrompt, decideAdvise, monthTokens } from './lib/advise.mjs';
import { probePresence } from './lib/presence.mjs';
import * as P from './lib/propose.mjs';
import { scrubSecrets } from './lib/safety.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const STATE_DIR = process.env.SEO_WATCH_STATE_DIR || '/home/devuser/workspace/.agentbox/seo-watch';

const log = (msg) => console.error(`[seo-watch ${new Date().toISOString()}] ${msg}`);

function parseArgs(argv) {
  const opts = { cmd: 'nightly', dryRun: false, browser: true, forceAdvise: false, noPropose: false, patchFile: null, date: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--no-browser') opts.browser = false;
    else if (a === '--force-advise') opts.forceAdvise = true;
    else if (a === '--date') opts.date = argv[++i];
    else if (a === '--no-propose') opts.noPropose = true;
    else if (a === '--patch') opts.patchFile = argv[++i];
    else if (!a.startsWith('--')) opts.cmd = a;
  }
  return opts;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readLedger(file) {
  try {
    return (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// The files as the patch will meet them: origin/main after a fetch, never the
// working tree (which may be dirty, behind, or on another branch). Without a
// fetch there is no proposal at all.
async function readSources(files, { log }) {
  const out = {};
  let base = null;
  try {
    base = await P.fetchMain(REPO);
  } catch (err) {
    log(`fetch origin/main failed (${err.message.slice(0, 120)}); sources withheld, no patch tonight`);
    return { out, base: null };
  }
  for (const rel of files) {
    try {
      out[rel] = await P.showFile(REPO, rel);
    } catch {
      /* a missing file is simply not offered */
    }
  }
  return { out, base };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config = await readJson(path.join(HERE, 'config.json'), null);
  if (!config) {
    console.error('seo-watch: config.json unreadable');
    process.exit(2);
  }
  const now = opts.date ? new Date(`${opts.date}T05:40:00Z`) : new Date();
  const date = now.toISOString().slice(0, 10);
  await fs.mkdir(path.join(STATE_DIR, 'reports'), { recursive: true });
  const stateFile = path.join(STATE_DIR, 'state.json');
  const ledgerFile = path.join(STATE_DIR, 'ledger.jsonl');
  const state = await readJson(stateFile, {});
  const ledger = await readLedger(ledgerFile);

  if (opts.cmd === 'status') {
    for (const r of ledger.slice(-7)) console.log(JSON.stringify({ date: r.date, findings: r.findings, advise: r.advise?.reason, proposal: r.propose?.status, pr: r.propose?.pr }));
    console.log(JSON.stringify({ cooldown: state.cooldown ?? {}, proposals: Object.keys(state.proposals ?? {}), lighthousePages: Object.keys(state.lighthouse ?? {}).length }));
    return;
  }

  if (opts.cmd === 'verify') {
    if (!opts.patchFile) {
      console.error('seo-watch verify: --patch <file> required');
      process.exit(2);
    }
    const diff = await fs.readFile(opts.patchFile, 'utf8');
    const v = P.validatePatch(diff, { allowlist: config.propose.allowlist, maxChangedLines: config.propose.max_changed_lines });
    if (!v.ok) {
      console.log(JSON.stringify({ ok: false, stage: 'validate', reason: v.reason }));
      process.exit(1);
    }
    const wtDir = path.join(STATE_DIR, 'worktree');
    try {
      const wt = await P.prepareWorktree({ repo: REPO, dir: wtDir, log });
      const result = await P.applyAndVerify({ wt: wt.dir, diff, allowlist: config.propose.allowlist, buildEnv: config.propose.build_env, log });
      console.log(JSON.stringify({ ...result, log: scrubSecrets(result.log ?? ''), base: wt.head }, null, 1));
      process.exitCode = result.ok ? 0 : 1;
    } finally {
      await P.removeWorktree({ repo: REPO, dir: wtDir });
    }
    return;
  }

  const runId = createHash('sha256').update(`${date}|${config.origin}|${process.pid}|${Date.now()}`).digest('hex').slice(0, 12);
  log(`run ${runId} for ${date}${opts.dryRun ? ' (dry run)' : ''}`);

  // ── audit ──────────────────────────────────────────────────────────────────
  const audit = await runAudit({ config, state, log, now, browser: opts.browser });
  const counts = C.countBySeverity(audit.findings);
  const fp = C.fingerprint(audit.findings, config.always_pages.map((p) => config.origin + p));
  log(`audit: ${audit.roster.length} pages, ${counts.high} high / ${counts.medium} medium / ${counts.low} low / ${counts.info} info, fingerprint ${fp}`);
  if (opts.cmd === 'audit') {
    console.log(JSON.stringify({ date, runId, counts, fingerprint: fp, findings: audit.findings, notes: audit.notes, lighthouse: audit.lighthouse, parity: audit.parity, roster: audit.roster }, null, 1));
    return;
  }

  // ── weekly presence probe ─────────────────────────────────────────────────
  let presence = null;
  if (config.presence && now.getUTCDay() === config.presence.weekday && !opts.dryRun) {
    presence = await probePresence({ queries: config.presence.queries, origin: config.origin, model: config.presence.model });
    if (presence.skipped) log(`presence: ${presence.skipped}`);
    else log(`presence: cited in ${presence.cited} of ${presence.total} queries`);
  }

  // ── gate (before the model call so cool-downs and an open PR shape the prompt) ──
  const proposing = config.propose.mode !== 'off' && !opts.dryRun && !opts.noPropose;
  let gate = { allowed: false, reason: opts.dryRun ? 'dry run' : opts.noPropose ? '--no-propose' : 'propose.mode is off' };
  if (proposing) {
    gate = await P.reconcile({ repo: REPO, label: config.propose.label, prefix: config.propose.branch_prefix, state, now, cooldownDays: config.propose.cooldown_days, log }).catch((err) => ({ allowed: false, reason: `reconcile failed: ${err.message.slice(0, 160)}` }));
    log(`gate: ${gate.allowed ? 'may propose' : `no proposal tonight (${gate.reason})`}`);
  }

  // ── advise ─────────────────────────────────────────────────────────────────
  const last = ledger.at(-1);
  const regressions = audit.findings.filter((f) => /^lighthouse-.*-regression$/.test(f.check)).length;
  const decision = decideAdvise({ fingerprint: fp, lastFingerprint: last?.fingerprint, regressions, force: opts.forceAdvise, now, config: config.glm, spentTokens: monthTokens(ledger, now) });
  let advice = { called: false, reason: decision.reason, text: null, tokens: null };
  let patch = null;
  let base = null;
  if (decision.call && !opts.dryRun) {
    const src = await readSources([...config.propose.allowlist, ...(config.propose.reference_files ?? [])], { log });
    base = src.base;
    const sources = Object.fromEntries(config.propose.allowlist.filter((f) => f in src.out).map((f) => [f, src.out[f]]));
    const references = Object.fromEntries((config.propose.reference_files ?? []).filter((f) => f in src.out).map((f) => [f, src.out[f]]));
    const prompt = buildPrompt({ date, origin: config.origin, audit, ledgerTail: ledger.slice(-7), sources, references, allowlist: config.propose.allowlist, cooldown: state.cooldown, presence, blocked: proposing && !gate.allowed ? gate.reason : null, maxChars: config.glm.max_input_chars });
    log(`advise: calling ${config.glm.model} (${decision.reason}, ${prompt.user.length} chars)`);
    try {
      const call = (thinkingBudget) => glm({ model: config.glm.model, system: prompt.system, user: prompt.user, maxTokens: config.glm.max_tokens, thinkingBudget, timeoutMs: config.glm.timeout_ms });
      // One retry without extended thinking: a reply that spent the whole
      // budget thinking arrives empty with stop_reason max_tokens.
      const r = await call(config.glm.thinking_budget).catch((err) => (/empty reply/.test(err.message) ? call(0) : Promise.reject(err)));
      const parsed = P.extractAdvice(r.text);
      advice = { called: true, reason: decision.reason, text: scrubSecrets(parsed.body), tokens: r.usage, flag: parsed.flag };
      if (parsed.flag === 'YES' && parsed.patch) patch = parsed.patch;
      log(`advise: ${r.usage.input}+${r.usage.output} tokens, PROPOSE ${parsed.flag ?? 'unstated'}${patch ? ', patch present' : ''}`);
    } catch (err) {
      advice = { called: true, reason: decision.reason, text: null, error: err.message.slice(0, 300), tokens: null };
      log(`advise failed: ${err.message.slice(0, 200)}`);
    }
  } else {
    log(`advise: skipped (${decision.reason}${opts.dryRun ? ', dry run' : ''})`);
  }

  // ── propose ────────────────────────────────────────────────────────────────
  let proposal = { status: 'none', reason: patch ? null : 'no patch offered' };
  if (patch && proposing) {
    const v = P.validatePatch(patch, { allowlist: config.propose.allowlist, maxChangedLines: config.propose.max_changed_lines, cooldown: state.cooldown });
    if (!v.ok) proposal = { status: 'rejected', reason: `patch invalid: ${v.reason}` };
    else if (!base) proposal = { status: 'deferred', reason: 'origin/main was not fetched; the patch was written against nothing' };
    else {
      if (!gate.allowed) proposal = { status: 'deferred', reason: gate.reason };
      else {
        const wtDir = path.join(STATE_DIR, 'worktree');
        try {
          const wt = await P.prepareWorktree({ repo: REPO, dir: wtDir, log });
          if (wt.head !== base) log(`origin/main moved during the run (${base.slice(0, 12)} → ${wt.head.slice(0, 12)}); applying anyway, git apply decides`);
          const result = await P.applyAndVerify({ wt: wt.dir, diff: patch, allowlist: config.propose.allowlist, buildEnv: config.propose.build_env, log });
          if (!result.ok) proposal = { status: 'failed-verification', reason: `${result.stage}: ${scrubSecrets(result.log).slice(0, 600)}`, files: result.files };
          else if (config.propose.mode === 'branch' || config.propose.mode === 'pr') {
            const branch = `${config.propose.branch_prefix}nightly-${date}`;
            const title = `seo-watch: ${date} proposal (${result.files.join(', ')})`;
            const reportRel = path.posix.join(config.propose.report_dir, `${date}.md`);
            const reportMd = C.renderReport({ date, origin: config.origin, findings: audit.findings, notes: audit.notes, lighthouse: audit.lighthouse, parity: audit.parity, presence, advice, proposal: { status: 'proposed' }, pagesAudited: audit.roster.length, runId });
            const body = [`Draft PR opened by the nightly SEO watch (run \`${runId}\`, base \`${wt.head.slice(0, 12)}\`).`, '', `The patch (text files only; nothing the build executes) was applied on a detached worktree of origin/main, and the build (with its discovery check), lint and vitest ran against that tree under a cleared environment: all green, and the tree afterwards equalled the patch. A human decides the merge.`, '', `Files: ${result.files.map((f) => `\`${f}\``).join(', ')}`, '', '---', '', reportMd].join('\n');
            const pub = await P.publish({ wt: wt.dir, branch, title, body, files: result.files, appliedDiff: result.applied, reportRel, reportMd, label: config.propose.label, runId, log });
            state.proposals ??= {};
            state.proposals[branch] = { date, files: result.files, pr: pub.url };
            // Persist at once: a SIGTERM between here and the end of the run
            // must not lose the record that lets a closed PR cool its files.
            await fs.writeFile(stateFile, JSON.stringify(state, null, 1));
            proposal = { status: 'proposed', pr: pub.url, branch, files: result.files };
          }
        } catch (err) {
          proposal = { status: 'error', reason: scrubSecrets(err.message).slice(0, 300) };
        } finally {
          await P.removeWorktree({ repo: REPO, dir: wtDir });
        }
      }
    }
    log(`propose: ${proposal.status}${proposal.reason ? ` (${proposal.reason.split('\n')[0]})` : ''}${proposal.pr ? ` ${proposal.pr}` : ''}`);
  } else if (patch) {
    proposal = { status: 'withheld', reason: gate.reason };
  }

  // ── report, ledger, state ─────────────────────────────────────────────────
  const report = C.renderReport({ date, origin: config.origin, findings: audit.findings, notes: audit.notes, lighthouse: audit.lighthouse, parity: audit.parity, presence, advice, proposal, pagesAudited: audit.roster.length, runId });
  const reportFile = path.join(STATE_DIR, 'reports', `${date}${opts.dryRun ? '-dry' : ''}.md`);
  await fs.writeFile(reportFile, scrubSecrets(report));
  if (patch) await fs.writeFile(path.join(STATE_DIR, 'reports', `${date}.patch`), scrubSecrets(patch));

  if (!opts.dryRun) {
    state.lastAudited ??= {};
    for (const url of audit.roster) state.lastAudited[url] = date;
    state.lighthouse ??= {};
    for (const [url, scores] of Object.entries(audit.lighthouse)) {
      state.lighthouse[url] = [...(state.lighthouse[url] ?? []), { date, scores }].slice(-30);
    }
    state.lastRun = { date, runId, fingerprint: fp };
    await fs.writeFile(stateFile, JSON.stringify(state, null, 1));
    const row = { ts: new Date().toISOString(), date, run_id: runId, pages: audit.roster.length, findings: counts, fingerprint: fp, lighthouse: audit.lighthouse, parity: audit.parity, advise: { called: advice.called, reason: advice.reason, tokens: advice.tokens, flag: advice.flag ?? null, error: advice.error ?? null }, propose: { status: proposal.status, pr: proposal.pr ?? null, branch: proposal.branch ?? null, reason: proposal.reason ? proposal.reason.split('\n')[0].slice(0, 200) : null }, presence: presence && !presence.skipped ? { cited: presence.cited, total: presence.total } : null, report: reportFile };
    await fs.appendFile(ledgerFile, `${JSON.stringify(row)}\n`);
  }
  log(`done: report ${reportFile}`);
}

// Exit explicitly: a half-open SSE stream or an orphaned child must not keep
// the night alive until cron's timeout kills it with the lock still held.
main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    log(`fatal: ${scrubSecrets(err.stack || err.message)}`);
    process.exit(1);
  },
);
