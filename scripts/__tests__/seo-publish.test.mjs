import { afterEach, expect, test, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { publish, applyAndVerify } from '../seo-watch/lib/propose.mjs';

let scratch;
afterEach(async () => {
  vi.unstubAllEnvs();
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

test('publishes the verified patch and report after committing, with an empty index', async () => {
  scratch = await mkdtemp(path.join(tmpdir(), 'seo-publish-'));
  const repo = path.join(scratch, 'repo');
  const remote = path.join(scratch, 'remote.git');
  const bin = path.join(scratch, 'bin');
  await mkdir(repo);
  await mkdir(bin);
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  await writeFile(path.join(repo, 'llms.txt'), 'before\n');
  git('add', 'llms.txt');
  git('commit', '-qm', 'baseline');
  execFileSync('git', ['init', '--bare', '-q', remote]);
  git('remote', 'add', 'origin', remote);
  // Only the GitHub boundary is faked; commit/index/push use real local Git.
  await writeFile(path.join(bin, 'gh'), '#!/bin/sh\ncase "$1 $2" in\n"pr list") echo "[]";;\n"label create") exit 0;;\n"pr create") echo "https://example.invalid/pr/1";;\n*) exit 91;;\nesac\n', { mode: 0o755 });
  vi.stubEnv('PATH', `${bin}:${process.env.PATH}`);
  await writeFile(path.join(repo, 'llms.txt'), 'after\n');
  const appliedDiff = execFileSync('git', ['-C', repo, 'diff'], { encoding: 'utf8' });
  const result = await publish({ wt: repo, branch: 'seo-watch/test', title: 'proposal', body: 'body', files: ['llms.txt'], appliedDiff, reportRel: 'reports/test.md', reportMd: 'report', label: 'seo-watch', runId: 'test' });
  expect(result.url).toBe('https://example.invalid/pr/1');
  expect(git('diff', '--cached', '--name-only')).toBe('');
  expect(git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n')).toEqual(['llms.txt', 'reports/test.md']);
  expect(git('ls-remote', 'origin', 'refs/heads/seo-watch/test').split(/\s/)[0]).toBe(git('rev-parse', 'HEAD'));
});

test('the apply boundary independently enforces Git changed-line counts', async () => {
  scratch = await mkdtemp(path.join(tmpdir(), 'seo-cap-'));
  execFileSync('git', ['-C', scratch, 'init', '-q']);
  await writeFile(path.join(scratch, 'llms.txt'), 'old\n');
  const diff = `diff --git a/llms.txt b/llms.txt\n--- a/llms.txt\n+++ b/llms.txt\n@@ -1 +1,71 @@\n-old\n+new\n${'+++ b/llms.txt\n'.repeat(70)}`;
  const result = await applyAndVerify({ wt: scratch, diff, allowlist: ['llms.txt'], maxChangedLines: 60 });
  expect(result).toMatchObject({ ok: false, stage: 'numstat' });
  expect(result.log).toMatch(/72 changed lines/);
});
