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

/**
 * What to do with the seen-set after trying to deliver a digest.
 *
 * Messages are marked seen only once the operator has actually been told. With
 * no operator pubkey, or a relay that rejected the digest, the same messages
 * must surface again on the next run and the job must exit non-zero, otherwise
 * enquiries vanish without anyone being notified (deepsec HIGH_BUG, 2026-10-15).
 *
 * @param {string|null} operator resolved operator pubkey, or null
 * @param {{ok: boolean, message?: string}|null} result publish result, null if not attempted
 */
export function deliveryOutcome(operator, result) {
  if (!operator) {
    return { persist: false, exitCode: 1, alert: "no operator pubkey (AGENTBOX_PUBKEY) — digest not sent" };
  }
  if (!result || !result.ok) {
    return { persist: false, exitCode: 1, alert: `relay rejected digest: ${result?.message ?? "not sent"}` };
  }
  return { persist: true, exitCode: 0, alert: "sent" };
}

/**
 * Cursor for the next (older) page of wraps, or null when paging is done.
 *
 * A relay returns the newest `limit` events, so a flood to the public monitor
 * key could push real messages out of a single window. A full page means there
 * may be more: continue below the oldest `created_at` seen. A short page, an
 * empty page, a cursor that did not move, or `maxPages` reached ends paging.
 *
 * @param {{created_at:number}[]} page events of the page just fetched
 * @param {number} limit the page size requested
 * @param {number} pagesFetched pages fetched so far, including this one
 * @param {number} maxPages hard cap on pages per run
 * @param {number|null} previousUntil the `until` this page was fetched with
 */
export function nextUntil(page, limit, pagesFetched, maxPages, previousUntil = null) {
  if (page.length < limit || pagesFetched >= maxPages) return null;
  const oldest = Math.min(...page.map((e) => e.created_at));
  if (!Number.isFinite(oldest)) return null;
  // `until` is inclusive; step below the oldest so the same events are not refetched.
  const next = oldest - 1;
  return previousUntil !== null && next >= previousUntil ? null : next;
}
