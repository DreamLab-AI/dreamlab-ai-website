// Turning advice into a reviewable proposal, under the human-merge gate.
//
// Pure part: extract the ```seo-patch block and PROPOSE flag from the model
// text, and validate the diff against a path allowlist (no renames, modes,
// binaries, new or deleted files, `..`, or more than maxChangedLines).
//
// IO part: a detached worktree of origin/main, `git apply`, the real build
// (which runs the repo's own discovery check), lint and tests under a CLEARED
// environment with a throwaway HOME, then a draft PR. Anything red stops
// before the push. The allowlist is text the build never executes, so the
// clearing is belt-and-braces, not a sandbox: this is still the same uid.
// After the build the tree must contain exactly the patch (hash-compared) and
// nothing else; only those files plus the report are staged, with hooks off.
// One proposal at a time; a proposal a human closed unmerged puts its FILES
// on a cool-down so the same patch does not come back the next night.

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { scrubSecrets } from './safety.mjs';

const execFileP = promisify(execFile);

export function extractAdvice(text) {
  const src = String(text ?? '');
  const flag = /^PROPOSE:\s*(YES|NO)\b/mi.exec(src)?.[1]?.toUpperCase() ?? null;
  const block = /```seo-patch\s*\n([\s\S]*?)\n```/m.exec(src);
  const patch = block ? `${block[1].replace(/\s+$/, '')}\n` : null;
  const body = block ? src.replace(block[0], '_(patch block moved to the proposal)_') : src;
  return { flag, patch, body };
}

function pathAllowed(file, allowlist) {
  if (!file || file.startsWith('/') || file.split('/').includes('..') || file.includes('\\')) return false;
  return allowlist.some((rule) => (rule.endsWith('/**') ? file.startsWith(rule.slice(0, -2)) : rule.endsWith('/*') ? path.posix.dirname(file) === rule.slice(0, -2) : file === rule));
}

export function validatePatch(diff, { allowlist, maxChangedLines = 60, cooldown = {} }) {
  if (!diff || !diff.trim()) return { ok: false, reason: 'empty patch', files: [], changed: 0 };
  const files = [];
  let changed = 0;
  const lines = diff.split('\n');
  let sawHeader = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(rename (from|to)|similarity index|new mode|old mode|deleted file mode|new file mode|GIT binary patch|Binary files|copy (from|to))/.test(line)) return { ok: false, reason: `forbidden hunk header: ${line.slice(0, 40)}`, files, changed };
    const g = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (g) {
      sawHeader = true;
      if (g[1] !== g[2]) return { ok: false, reason: `rename ${g[1]} → ${g[2]}`, files, changed };
      if (!pathAllowed(g[1], allowlist)) return { ok: false, reason: `path not on allowlist: ${g[1]}`, files, changed };
      files.push(g[1]);
      continue;
    }
    const m = /^(---|\+\+\+) (a|b)\/(.+)$/.exec(line);
    if (m) {
      if (m[3] === '/dev/null') return { ok: false, reason: 'file creation or deletion', files, changed };
      if (!pathAllowed(m[3], allowlist)) return { ok: false, reason: `path not on allowlist: ${m[3]}`, files, changed };
      if (!files.includes(m[3])) files.push(m[3]);
      continue;
    }
    if (/^(---|\+\+\+) /.test(line) && !/^(---|\+\+\+) (a|b)\//.test(line)) return { ok: false, reason: `unexpected file header: ${line.slice(0, 40)}`, files, changed };
    if (/^[+-]/.test(line)) changed++; // file headers were consumed above
  }
  const cooled = files.filter((f) => cooldown[f]);
  if (cooled.length) return { ok: false, reason: `file on cool-down: ${cooled.map((f) => `${f} until ${cooldown[f]}`).join(', ')}`, files, changed };
  if (!sawHeader && !files.length) return { ok: false, reason: 'no file headers', files, changed };
  if (!changed) return { ok: false, reason: 'no changed lines', files, changed };
  if (changed > maxChangedLines) return { ok: false, reason: `${changed} changed lines > ${maxChangedLines}`, files, changed };
  return { ok: true, files: [...new Set(files)], changed };
}

// ── shell ───────────────────────────────────────────────────────────────────

export async function run(cmd, args, { cwd, env, timeoutMs = 600_000, input } = {}) {
  try {
    const { stdout, stderr } = await execFileP(cmd, args, { cwd, env, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, ...(input !== undefined ? { input } : {}) });
    return { code: 0, stdout: String(stdout), stderr: String(stderr) };
  } catch (err) {
    return { code: typeof err.code === 'number' ? err.code : 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? err.message), killed: Boolean(err.killed) };
  }
}

const git = (repo, args, opts = {}) => run('git', ['-C', repo, ...args], opts);
const tail = (s, n = 25) => s.trim().split('\n').slice(-n).join('\n');

// The build and lint run with ONLY these variables: nothing the container
// holds for other jobs (model keys, GitHub token) is visible to build scripts,
// since a model-written patch is code the build might execute.
export function clearedEnv(extra = {}, src = process.env, home = null) {
  const keep = ['PATH', 'LANG', 'LC_ALL', 'TZ', 'TMPDIR', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NIX_SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS', 'USER', 'SHELL'];
  const env = { CI: '1' };
  for (const k of keep) if (src[k] !== undefined) env[k] = src[k];
  // A throwaway HOME: the real one holds gh's hosts.yml and npm's config.
  env.HOME = home ?? src.HOME;
  if (home) {
    env.npm_config_cache = path.join(home, '.npm');
    env.XDG_CONFIG_HOME = path.join(home, '.config');
    env.XDG_CACHE_HOME = path.join(home, '.cache');
  }
  for (const [k, v] of Object.entries(extra)) if (/^VITE_[A-Z0-9_]+$/.test(k)) env[k] = String(v);
  return env;
}

export async function fetchMain(repo) {
  const fetch = await git(repo, ['fetch', '--quiet', 'origin', 'main'], { timeoutMs: 120_000 });
  if (fetch.code !== 0) throw new Error(`git fetch failed: ${tail(fetch.stderr, 5)}`);
  const head = await git(repo, ['rev-parse', 'origin/main']);
  return head.stdout.trim();
}

// The file as it is on origin/main, which is what the patch will be applied
// to; the working tree may be dirty, behind, or on another branch.
export async function showFile(repo, rel, rev = 'origin/main') {
  const r = await git(repo, ['show', `${rev}:${rel}`]);
  if (r.code !== 0) throw new Error(`git show ${rev}:${rel} failed: ${tail(r.stderr, 2)}`);
  return r.stdout;
}

export async function prepareWorktree({ repo, dir, log = () => {} }) {
  await git(repo, ['worktree', 'prune']);
  await git(repo, ['worktree', 'remove', '--force', dir]).catch(() => {});
  await fs.rm(dir, { recursive: true, force: true });
  await fetchMain(repo);
  await fs.mkdir(path.dirname(dir), { recursive: true });
  const add = await git(repo, ['worktree', 'add', '--detach', dir, 'origin/main']);
  if (add.code !== 0) throw new Error(`git worktree add failed: ${tail(add.stderr, 5)}`);
  // Share the checkout's node_modules instead of a fresh npm ci every night.
  // The allowlist cannot touch package.json or the lockfile, so the tree the
  // build needs is the one already installed.
  const nm = path.join(repo, 'node_modules');
  try {
    await fs.access(nm);
    await fs.symlink(nm, path.join(dir, 'node_modules'), 'dir');
  } catch {
    log('no node_modules to share; the build will install');
  }
  const head = await git(dir, ['rev-parse', 'HEAD']);
  return { dir, head: head.stdout.trim() };
}

export async function applyAndVerify({ wt, diff, allowlist, buildEnv, timeoutMs = 900_000, log = () => {} }) {
  const patchFile = path.join(wt, '.seo-watch.patch');
  await fs.writeFile(patchFile, diff);
  const stat = await git(wt, ['apply', '--numstat', patchFile]);
  if (stat.code !== 0) return { ok: false, stage: 'numstat', log: tail(stat.stderr) };
  const touched = stat.stdout.trim().split('\n').filter(Boolean).map((l) => l.split('\t')[2]);
  const outside = touched.filter((f) => !pathAllowed(f, allowlist));
  if (outside.length) return { ok: false, stage: 'allowlist', log: `git sees paths outside the allowlist: ${outside.join(', ')}` };
  const check = await git(wt, ['apply', '--check', patchFile]);
  if (check.code !== 0) return { ok: false, stage: 'apply-check', log: tail(check.stderr) };
  const apply = await git(wt, ['apply', patchFile]);
  if (apply.code !== 0) return { ok: false, stage: 'apply', log: tail(apply.stderr) };
  await fs.rm(patchFile, { force: true });
  const names = await git(wt, ['diff', '--name-only']);
  const changedFiles = names.stdout.trim().split('\n').filter(Boolean);
  if (changedFiles.some((f) => !pathAllowed(f, allowlist))) return { ok: false, stage: 'allowlist-post', log: `applied diff touched ${changedFiles.join(', ')}` };
  const applied = (await git(wt, ['diff'])).stdout;
  const home = path.join(path.dirname(wt), 'build-home');
  await fs.rm(home, { recursive: true, force: true });
  await fs.mkdir(home, { recursive: true });
  const env = clearedEnv(buildEnv, process.env, home);
  try {
    await fs.access(path.join(wt, 'node_modules'));
  } catch {
    log('npm ci in worktree');
    const ci = await run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: wt, env, timeoutMs });
    if (ci.code !== 0) return { ok: false, stage: 'npm-ci', log: tail(ci.stderr) };
  }
  log('npm run build');
  const build = await run('npm', ['run', 'build'], { cwd: wt, env, timeoutMs });
  if (build.code !== 0) return { ok: false, stage: 'build', log: tail(`${build.stdout}\n${build.stderr}`, 40), files: changedFiles };
  log('npm run lint');
  const lint = await run('npm', ['run', 'lint'], { cwd: wt, env, timeoutMs: 300_000 });
  if (lint.code !== 0) return { ok: false, stage: 'lint', log: tail(`${lint.stdout}\n${lint.stderr}`, 40), files: changedFiles };
  log('vitest');
  const test = await run('npx', ['vitest', 'run', '--reporter=dot'], { cwd: wt, env, timeoutMs: 600_000 });
  if (test.code !== 0) return { ok: false, stage: 'test', log: tail(`${test.stdout}\n${test.stderr}`, 40), files: changedFiles };
  await fs.rm(home, { recursive: true, force: true }).catch(() => {});
  // The tree after the build must be exactly the patch: same diff, no other
  // modified or untracked path (ignored build output is fine, --porcelain
  // does not list it).
  const integrity = await treeIntegrity(wt, changedFiles, applied);
  if (!integrity.ok) return { ok: false, stage: 'tree-integrity', log: integrity.reason, files: changedFiles };
  return { ok: true, stage: 'verified', files: changedFiles, applied, log: tail(build.stdout, 6) };
}

export function porcelainEntries(text) {
  return text.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2), file: l.slice(3).replace(/^"|"$/g, '') }));
}

export async function treeIntegrity(wt, expectedFiles, expectedDiff, extraUntracked = []) {
  const status = await git(wt, ['status', '--porcelain', '--untracked-files=all']);
  if (status.code !== 0) return { ok: false, reason: `git status failed: ${tail(status.stderr, 2)}` };
  const entries = porcelainEntries(status.stdout);
  const expected = new Set(expectedFiles);
  const extras = new Set(extraUntracked);
  for (const e of entries) {
    if (e.status === ' M' && expected.has(e.file)) continue;
    if (e.status === '??' && extras.has(e.file)) continue;
    return { ok: false, reason: `unexpected tree entry after build: ${e.status} ${e.file}` };
  }
  const missing = [...expected].filter((f) => !entries.some((e) => e.file === f));
  if (missing.length) return { ok: false, reason: `patched file no longer modified: ${missing.join(', ')}` };
  const now = (await git(wt, ['diff'])).stdout;
  if (now !== expectedDiff) return { ok: false, reason: 'the build changed a patched file; the tree no longer equals the patch' };
  return { ok: true };
}

// ── GitHub side ─────────────────────────────────────────────────────────────

async function gh(args, { cwd, timeoutMs = 60_000 } = {}) {
  return run('gh', args, { cwd, timeoutMs });
}

export const isProposalBranch = (name, prefix) => new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}nightly-\\d{4}-\\d{2}-\\d{2}$`).test(name);

export async function listProposalPrs({ repo, label, state = 'open' }) {
  const r = await gh(['pr', 'list', '--label', label, '--state', state, '--limit', '50', '--json', 'number,url,headRefName,state,mergedAt,closedAt,title'], { cwd: repo });
  if (r.code !== 0) throw new Error(`gh pr list failed: ${tail(r.stderr, 3)}`);
  return JSON.parse(r.stdout || '[]');
}

export async function remoteProposalBranches({ repo, prefix }) {
  // ls-remote patterns match on the tail of the ref, so `seo/*` would also
  // match a human's `jj/seo/x`; anchor on the full ref and re-check the shape.
  const r = await git(repo, ['ls-remote', '--heads', 'origin', `refs/heads/${prefix}nightly-*`], { timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(`git ls-remote failed: ${tail(r.stderr, 3)}`);
  return r.stdout.trim().split('\n').filter(Boolean).map((l) => l.split(/\s+/)[1].replace(/^refs\/heads\//, '')).filter((b) => isProposalBranch(b, prefix));
}

// Decides whether tonight may propose, and tidies up after last night.
// Returns { allowed, reason }. Mutates state.proposals / state.cooldown.
// Deletes only branches this job owns (recorded in state, or carrying a PR
// with our label), never one with an OPEN PR, and never on a gh error.
export async function reconcile({ repo, label, prefix, state, now = new Date(), cooldownDays = 14, log = () => {} }) {
  state.proposals ??= {};
  state.cooldown ??= {};
  const today = now.toISOString().slice(0, 10);
  for (const [file, until] of Object.entries(state.cooldown)) if (until < today) delete state.cooldown[file];
  const open = await listProposalPrs({ repo, label, state: 'open' });
  const branches = await remoteProposalBranches({ repo, prefix });
  for (const branch of branches) {
    const prs = await gh(['pr', 'list', '--head', branch, '--state', 'all', '--limit', '10', '--json', 'number,url,state,mergedAt,labels'], { cwd: repo });
    if (prs.code !== 0) {
      log(`reconcile: gh failed for ${branch}; leaving it alone (${tail(prs.stderr, 1)})`);
      continue;
    }
    const list = JSON.parse(prs.stdout || '[]');
    if (list.some((p) => p.state === 'OPEN')) continue;
    const ours = Boolean(state.proposals[branch]) || list.some((p) => (p.labels ?? []).some((l) => l.name === label));
    if (!ours) {
      log(`reconcile: ${branch} has no record and no ${label} PR; not ours to delete`);
      continue;
    }
    const closedUnmerged = list.find((p) => p.state === 'CLOSED' && !p.mergedAt);
    const merged = list.find((p) => p.state === 'MERGED' || p.mergedAt);
    if (closedUnmerged && !merged) {
      const until = new Date(now.getTime() + cooldownDays * 86_400_000).toISOString().slice(0, 10);
      const files = state.proposals[branch]?.files ?? [];
      for (const file of files) state.cooldown[file] = until;
      log(`proposal ${branch} was closed unmerged; cooling down ${files.length} file(s) until ${until}`);
    }
    // Merged, declined, or pushed without a PR (a crashed night): the PR, if
    // any, preserves the diff; the branch is clutter.
    const del = await git(repo, ['push', '--quiet', 'origin', '--delete', branch], { timeoutMs: 60_000 });
    if (del.code !== 0) log(`could not delete ${branch}: ${tail(del.stderr, 2)}`);
    delete state.proposals[branch];
  }
  if (open.length) return { allowed: false, reason: `open proposal awaits review: ${open[0].url}` };
  return { allowed: true, reason: 'no open proposal' };
}

export async function publish({ wt, branch, title, body, files, appliedDiff, reportRel, reportMd, label, runId, env = process.env, log = () => {} }) {
  const existing = await gh(['pr', 'list', '--head', branch, '--state', 'open', '--limit', '1', '--json', 'url'], { cwd: wt });
  const already = existing.code === 0 ? JSON.parse(existing.stdout || '[]')[0] : null;
  if (already) throw new Error(`a PR is already open for ${branch}: ${already.url}`);
  const reportPath = path.join(wt, reportRel);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, scrubSecrets(reportMd, env));
  // Stage exactly the verified patch plus the report, nothing the build left
  // behind; hooks are off because the worktree shares .git with the checkout.
  const integrity = await treeIntegrity(wt, files, appliedDiff, [reportRel]);
  if (!integrity.ok) throw new Error(`refusing to commit: ${integrity.reason}`);
  const noHooks = ['-c', 'core.hooksPath=/dev/null'];
  const ident = ['-c', 'user.name=seo-watch', '-c', 'user.email=seo-watch@dreamlab-ai.com'];
  const steps = [
    ['checkout', '-q', '-b', branch],
    ['add', '--', ...files, reportRel],
    [...noHooks, ...ident, 'commit', '-q', '--no-verify', '-m', title, '-m', `Nightly SEO watch proposal, run ${runId}. A human decides the merge.\n\nCo-Authored-By: jjohare <github@thedreamlab.uk>`],
  ];
  for (const s of steps) {
    const r = await git(wt, s);
    if (r.code !== 0) throw new Error(`git ${s.filter((x) => !x.startsWith('-c') && !x.startsWith('user.')).slice(0, 2).join(' ')} failed: ${tail(r.stderr, 3)}`);
  }
  // Credentials come from gh's helper at push time: nothing lands in .git/config.
  const staged = (await git(wt, ['diff', '--cached', '--name-only'])).stdout.trim().split('\n').filter(Boolean).sort();
  const want = [...files, reportRel].sort();
  if (JSON.stringify(staged) !== JSON.stringify(want)) throw new Error(`staged set ${staged.join(', ')} differs from ${want.join(', ')}`);
  const push = await git(wt, [...noHooks, '-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '--quiet', '-u', 'origin', branch], { timeoutMs: 120_000 });
  if (push.code !== 0) throw new Error(`git push failed: ${tail(push.stderr, 3)}`);
  const labelled = await gh(['label', 'create', label, '--color', '0E8A16', '--description', 'Nightly SEO / agent-searchability proposal (human merge)', '--force'], { cwd: wt });
  if (labelled.code !== 0) log(`label ${label} could not be ensured: ${tail(labelled.stderr, 1)}`);
  const bodyFile = path.join(path.dirname(wt), `${branch.replace(/\//g, '-')}.body.md`);
  await fs.writeFile(bodyFile, scrubSecrets(body, env).slice(0, 60_000));
  const labelArgs = labelled.code === 0 ? ['--label', label] : [];
  const pr = await gh(['pr', 'create', '--draft', '--base', 'main', '--head', branch, ...labelArgs, '--title', title, '--body-file', bodyFile], { cwd: wt, timeoutMs: 120_000 });
  await fs.rm(bodyFile, { force: true });
  if (pr.code !== 0) {
    // The branch is up; without a PR the next night's reconcile would see an
    // orphan and delete it, then re-propose. Remove it now so the ledger row
    // and the retry tell the same story.
    await git(wt, ['push', '--quiet', 'origin', '--delete', branch], { timeoutMs: 60_000 }).catch(() => {});
    throw new Error(`gh pr create failed: ${tail(pr.stderr, 3)}`);
  }
  const url = pr.stdout.trim().split('\n').pop();
  log(`draft PR ${url}`);
  return { url, branch };
}

export async function removeWorktree({ repo, dir }) {
  await git(repo, ['worktree', 'remove', '--force', dir]).catch(() => {});
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  await git(repo, ['worktree', 'prune']).catch(() => {});
}
