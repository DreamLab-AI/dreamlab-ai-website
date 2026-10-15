// Composition of the nightly inbox digest (scripts/inbox-watch/run.mjs).
//
// Every field below is controlled by whoever wrapped a message to the public
// monitor key, so each is flattened to one line, stripped of control and
// direction-override characters, and length-capped; and the number of itemised
// entries is bounded so a flood cannot grow the DM past the relay's size limit
// and silence the alert. Entries past the cap stay in the relay inbox.

// C0/C1 controls, zero-width/bidi marks (U+200B-200F), line/paragraph separators
// and embeddings/overrides/isolates (U+2028-202E, U+2066-2069), BOM.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]+/g;

export function cleanField(value, max = 80) {
  return String(value ?? '').replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Bullet lines for `fresh` messages, at most `maxItems` of them plus a summary line. */
export function digestLines(fresh, maxItems = 25) {
  const lines = fresh.slice(0, maxItems).map((f) => {
    const name = cleanField(f.name);
    const email = cleanField(f.email);
    const who = [name, email].filter(Boolean).join(' <') + (email && name ? '>' : '');
    const source = cleanField(f.source, 40);
    const detail = cleanField(f.detail, 60);
    const excerpt = cleanField(f.excerpt, 160);
    return `• [${cleanField(f.kind, 20)}${source ? ' · ' + source : ''}] ${who || '(anonymous)'}${detail ? ' · ' + detail : ''}${excerpt ? `\n  “${excerpt}”` : ''}`;
  });
  if (fresh.length > maxItems) lines.push(`… and ${fresh.length - maxItems} more (still in the relay inbox)`);
  return lines;
}
