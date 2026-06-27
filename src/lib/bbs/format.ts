/**
 * Small pure formatting helpers for the BBS terminal UI. Kept dependency-free
 * and side-effect-free so they are trivially unit-testable.
 */

/** Two-digit zero pad. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a unix-seconds timestamp as a BBS-style `Mon DD HH:MM` clock line. */
export function bbsTimestamp(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

/** Format a Date as a `HH:MM:SS` wall clock (status bar). */
export function clock(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}`;
}

/** Human relative time, e.g. `3m`, `2h`, `5d`, `just now`. */
export function relativeTime(unixSeconds: number, nowMs: number): string {
  const deltaSec = Math.max(0, Math.floor(nowMs / 1000) - unixSeconds);
  if (deltaSec < 45) return "just now";
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  if (deltaSec < 2592000) return `${Math.floor(deltaSec / 86400)}d ago`;
  return `${Math.floor(deltaSec / 2592000)}mo ago`;
}

/** Shorten a hex pubkey or npub to `abcd…wxyz`. */
export function shortKey(key: string, head = 6, tail = 4): string {
  if (!key) return "";
  if (key.length <= head + tail + 1) return key;
  return `${key.slice(0, head)}…${key.slice(-tail)}`;
}

/** Truncate a single line to `max` chars with an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1))}…`;
}

/** Wrap text to a fixed column width, returning an array of lines. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (line.length === 0) {
        line = word;
      } else if (line.length + 1 + word.length <= width) {
        line += ` ${word}`;
      } else {
        out.push(line);
        line = word;
      }
      // Hard-break words longer than the column.
      while (line.length > width) {
        out.push(line.slice(0, width));
        line = line.slice(width);
      }
    }
    if (line.length > 0) out.push(line);
  }
  return out;
}

/** Right-pad (or hard-truncate) a string to an exact column width. */
export function fit(text: string, width: number): string {
  if (text.length === width) return text;
  if (text.length > width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

/** Derive a readable handle from a profile name or npub. */
export function deriveHandle(name: string | undefined, npub: string): string {
  const trimmed = (name || "").trim();
  if (trimmed.length > 0) return trimmed;
  if (npub) return shortKey(npub, 8, 4);
  return "guest";
}
