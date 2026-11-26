// Behavioural tests for scripts/backup/forum-backup.sh (audit 2026-11-26 C-2, H-11).
//
// The script is run for real against a stub `curl` placed first on PATH. The stub
// logs every argv it receives and serves canned Cloudflare API answers, so these
// tests prove what the script SENDS (no token in argv, auth only to the API host,
// every live v2 resource including ADMIN_KV) and what it DOES with failures
// (no pruning, nothing counted as a completed night) without touching Cloudflare.

import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = join(REPO, "scripts/backup/forum-backup.sh");
const TOKEN = "tokSECRETvalue_0123456789";

const roots = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

// Stub curl: records argv, enforces "auth only on the API host", serves answers.
const STUB = String.raw`#!/usr/bin/env bash
log="$STUB_LOG"
printf 'ARGV:' >> "$log"; printf ' %q' "$@" >> "$log"; printf '\n' >> "$log"
cfg="" out="" url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -K|--config) cfg="$2"; shift 2 ;;
    -o|--output) out="$2"; shift 2 ;;
    -d|--data|--data-binary|-H|--header|-w|--write-out|-X|--request|--max-time|--retry|--retry-delay) shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
hdr=""
[ -n "$cfg" ] && hdr=$(cat "$cfg")
echo "URL $url AUTH=$( [ -n "$hdr" ] && echo yes || echo no )" >> "$log"
case "$url" in
  https://api.cloudflare.com/*)
    printf '%s' "$hdr" | grep -q "Authorization: Bearer $STUB_TOKEN" || { echo "no auth for API" >> "$log"; exit 22; } ;;
  *)
    [ -z "$hdr" ] || { echo "LEAK: auth sent to $url" >> "$log"; exit 22; } ;;
esac
if [ -n "$STUB_FAIL" ] && printf '%s' "$url" | grep -q -- "$STUB_FAIL"; then exit 22; fi
emit() { if [ -n "$out" ]; then printf '%s' "$1" > "$out"; else printf '%s' "$1"; fi; }
case "$url" in
  */d1/database/*/export)
    id=$(printf '%s' "$url" | sed -E 's#.*/database/([^/]+)/export#\1#')
    emit "{\"success\":true,\"result\":{\"at_bookmark\":\"bm\",\"result\":{\"signed_url\":\"https://signed.example/$id.sql\"}}}" ;;
  https://signed.example/*) emit "CREATE TABLE t(x);" ;;
  */r2/buckets/*/objects\?*)
    emit '{"success":true,"result":[{"key":"a/b"},{"key":"a__b"},{"key":".."}],"result_info":{"is_truncated":"false"}}' ;;
  */r2/buckets/*/objects/*) emit "object:$(basename "$url")" ;;
  */storage/kv/namespaces/*/keys\?*)
    emit '{"success":true,"result":[{"name":"k1"},{"name":"k 2"}],"result_info":{"cursor":""}}' ;;
  */storage/kv/namespaces/*/values/*) emit "value-of-$(basename "$url")" ;;
  *) echo "unexpected url $url" >> "$log"; exit 22 ;;
esac
`;

function setup({ keep = 14, fail = "", preexisting = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "forum-backup-"));
  roots.push(root);
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "curl"), STUB);
  chmodSync(join(bin, "curl"), 0o755);
  // The script polls with sleep only when no signed_url is returned; keep it instant.
  writeFileSync(join(bin, "sleep"), "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(join(bin, "sleep"), 0o755);
  const dest = join(root, "nas", "dreamlab-forum");
  mkdirSync(dest, { recursive: true });
  for (const name of preexisting) mkdirSync(join(dest, name));
  const log = join(root, "curl.log");
  writeFileSync(log, "");
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: root,
    CLOUDFLARE_API_TOKEN: TOKEN,
    CLOUDFLARE_ACCOUNT_ID: "acct123",
    FORUM_BACKUP_DEST: dest,
    FORUM_BACKUP_ENV: join(root, "missing.env"),
    FORUM_BACKUP_LOCK: join(root, "lock"),
    FORUM_BACKUP_KEEP: String(keep),
    STUB_LOG: log,
    STUB_TOKEN: TOKEN,
    STUB_FAIL: fail,
  };
  const run = () => spawnSync("bash", [SCRIPT], { env, encoding: "utf8" });
  return { root, dest, log, run, env };
}

const nights = (dest) => readdirSync(dest).filter((n) => /^20\d\d-/.test(n)).sort();

describe("forum-backup.sh against a stub Cloudflare", () => {
  it("backs up every live v2 resource, ADMIN_KV included, and never puts the token in argv", () => {
    const { dest, log, run } = setup();
    const res = run();
    expect(res.status, res.stdout + res.stderr).toBe(0);
    const calls = readFileSync(log, "utf8");
    expect(calls).not.toContain(TOKEN);
    expect(calls).not.toContain("LEAK");
    for (const needle of [
      "/d1/database/eb33cf2f-44db-433c-9771-6db850d8b64c/export",
      "/d1/database/a53a49db-beec-4ee5-b09b-a2573923d21f/export",
      "/r2/buckets/dreamlab-pods-v2/objects",
      "/storage/kv/namespaces/40fdb0ce2d814f77b3db9d7b922ff579/keys",
      "/storage/kv/namespaces/d4c2d7bc103e4ce697340fa6962d2728/keys",
      "/storage/kv/namespaces/36c5f8d2157b4b3e8ef53c47c7fb68f1/keys",
    ]) {
      expect(calls, needle).toContain(needle);
    }
    // No v1 resource is touched.
    for (const v1 of ["97c77d23", "e3981999", "buckets/dreamlab-pods/", "901345296c28", "8ec8759ab40d", "440b1f07ff22"]) {
      expect(calls, v1).not.toContain(v1);
    }
    const [night] = nights(dest);
    expect(night).toBeDefined();
    const dir = join(dest, night);
    expect(existsSync(join(dir, "MANIFEST.sha256"))).toBe(true);
    expect(existsSync(join(dir, "kv", "admin-kv.json"))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, "kv", "admin-kv.json"), "utf8"))).toEqual({
      k1: "value-of-k1",
      "k 2": "value-of-k%202",
    });
  });

  it("writes the snapshot owner-only (umask 077)", () => {
    const { dest, run } = setup();
    expect(run().status).toBe(0);
    const dir = join(dest, nights(dest)[0]);
    expect(statSync(dir).mode & 0o077).toBe(0);
    expect(statSync(join(dir, "kv", "sessions.json")).mode & 0o077).toBe(0);
  });

  it("stores R2 keys collision-free and never as a path component like ..", () => {
    const { dest, run } = setup();
    expect(run().status).toBe(0);
    const files = readdirSync(join(dest, nights(dest)[0], "r2", "dreamlab-pods-v2")).sort();
    expect(files).toHaveLength(3);
    expect(new Set(files).size).toBe(3);
    expect(files).not.toContain("..");
  });

  it("on any failure: exits non-zero, records no completed night and prunes nothing", () => {
    const old = ["2026-10-01", "2026-10-02", "2026-10-03"];
    const { dest, run } = setup({ keep: 1, fail: "values/k1", preexisting: old });
    const res = run();
    expect(res.status).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/ERROR|FAIL/);
    // Old nights untouched; today's partial run is kept, but not as a 20* night.
    expect(nights(dest)).toEqual(old);
    expect(readdirSync(dest).some((n) => n.startsWith("failed-"))).toBe(true);
  });

  it("a single failed R2 object download fails the run", () => {
    const { run } = setup({ fail: "objects/a__b" });
    expect(run().status).not.toBe(0);
  });

  it("retention keeps the newest KEEP completed nights after a clean run", () => {
    const old = ["2026-10-01", "2026-10-02", "2026-10-03"];
    const { dest, run } = setup({ keep: 2, preexisting: old });
    expect(run().status).toBe(0);
    const left = nights(dest);
    expect(left).toHaveLength(2);
    expect(left[0]).toBe("2026-10-03");
  });

  it("refuses to run while another run holds the lock", () => {
    const { run, env } = setup();
    mkdirSync(env.FORUM_BACKUP_LOCK);
    // A live pid (this test process) owns the lock.
    writeFileSync(join(env.FORUM_BACKUP_LOCK, "pid"), String(process.pid));
    const res = run();
    expect(res.status).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/already running/);
  });

  it("refuses a token that would need quoting in the curl config", () => {
    const { run, env } = setup();
    env.CLOUDFLARE_API_TOKEN = 'abc"\nurl = "http://evil';
    const res = run();
    expect(res.status).toBe(2);
  });
});
