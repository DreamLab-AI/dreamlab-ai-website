// Minimal TOML reader for the operator config files in this repo.
//
// Scope is deliberately narrow: `forum-config/dreamlab.toml` and the five
// `forum-config/deploy/*.wrangler.toml` files. It covers tables, arrays of
// tables, basic and multi-line-basic strings, booleans, integers, inline
// arrays (single- and multi-line) and comments - which is everything those
// files use. Anything outside that subset throws rather than silently
// mis-parsing, because a mirror check that quietly misreads its input is worse
// than no check at all.
//
// A focused reader is preferred here over a new npm dependency: this runs in a
// CI gate that must not be able to fail on a supply-chain fetch, and the
// parsing surface is small enough to hold in one screen.

/** Strip a trailing `# comment` that is not inside a string literal. */
function stripComment(line) {
  let inStr = false;
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === "#") return line.slice(0, i);
  }
  return line;
}

/** Parse a scalar TOML value (string, bool, integer, float). */
function parseScalar(raw, context) {
  const v = raw.trim();
  if (v.startsWith('"')) {
    // Basic string. JSON.parse handles the escape set TOML shares with JSON.
    const end = findStringEnd(v, '"');
    if (end === -1) throw new Error(`unterminated string in ${context}: ${raw}`);
    return JSON.parse(v.slice(0, end + 1));
  }
  if (v.startsWith("'")) {
    const end = v.indexOf("'", 1);
    if (end === -1) throw new Error(`unterminated literal string in ${context}: ${raw}`);
    return v.slice(1, end);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^[+-]?\d+$/.test(v)) return Number.parseInt(v, 10);
  if (/^[+-]?\d*\.\d+$/.test(v)) return Number.parseFloat(v);
  throw new Error(`unsupported TOML value in ${context}: ${raw}`);
}

/** Index of the closing quote of a basic string starting at position 0. */
function findStringEnd(s, quote) {
  for (let i = 1; i < s.length; i++) {
    if (s[i] === "\\") {
      i++;
      continue;
    }
    if (s[i] === quote) return i;
  }
  return -1;
}

/** Split the body of an inline array on top-level commas. */
function splitArray(body) {
  const parts = [];
  let depth = 0;
  let inStr = false;
  let quote = "";
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      cur += ch;
      if (ch === "\\") {
        cur += body[++i] ?? "";
        continue;
      }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseArray(raw, context) {
  const inner = raw.trim().slice(1, -1);
  return splitArray(inner)
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map((p) => (p.startsWith("[") ? parseArray(p, context) : parseScalar(p, context)));
}

/**
 * Parse a TOML document into a plain object.
 * Arrays of tables ([[x]]) become arrays; tables ([x]) become nested objects.
 */
export function parseToml(text) {
  const root = {};
  let current = root;
  const lines = text.split("\n");

  const setPath = (obj, path, value) => {
    let node = obj;
    for (let i = 0; i < path.length - 1; i++) {
      node[path[i]] ??= {};
      node = node[path[i]];
    }
    node[path[path.length - 1]] = value;
  };
  const descend = (obj, path) => {
    let node = obj;
    for (const key of path) {
      node[key] ??= {};
      node = node[key];
    }
    return node;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = stripComment(lines[i]).trim();
    if (line === "") continue;

    const arrayTable = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayTable) {
      const path = arrayTable[1].split(".").map((s) => s.trim());
      const parentPath = path.slice(0, -1);
      const key = path[path.length - 1];
      const parent = descend(root, parentPath);
      parent[key] ??= [];
      const entry = {};
      parent[key].push(entry);
      current = entry;
      continue;
    }
    const table = line.match(/^\[([^\]]+)\]$/);
    if (table) {
      current = descend(
        root,
        table[1].split(".").map((s) => s.trim()),
      );
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!kv) throw new Error(`unparsable TOML line ${i + 1}: ${lines[i]}`);
    const key = kv[1];
    let value = kv[2].trim();

    // Multi-line basic string.
    if (value.startsWith('"""')) {
      let buf = value.slice(3);
      while (!buf.includes('"""')) {
        i++;
        if (i >= lines.length) throw new Error(`unterminated multi-line string at key ${key}`);
        buf += "\n" + lines[i];
      }
      const body = buf.slice(0, buf.indexOf('"""'));
      // TOML line-continuation: a trailing backslash swallows the newline.
      setPath(current, key.split("."), body.replace(/\\\n\s*/g, "").replace(/^\n/, ""));
      continue;
    }

    // Multi-line array.
    if (value.startsWith("[") && !value.endsWith("]")) {
      let depth = (value.match(/\[/g) || []).length - (value.match(/\]/g) || []).length;
      while (depth > 0) {
        i++;
        if (i >= lines.length) throw new Error(`unterminated array at key ${key}`);
        const next = stripComment(lines[i]);
        value += "\n" + next;
        depth += (next.match(/\[/g) || []).length - (next.match(/\]/g) || []).length;
      }
    }

    if (value.startsWith("[")) {
      setPath(current, key.split("."), parseArray(value, `key ${key}`));
    } else {
      setPath(current, key.split("."), parseScalar(value, `key ${key}`));
    }
  }
  return root;
}
