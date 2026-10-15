// The inbox digest is composed from text any sender can put in a gift wrap to
// the (public) monitor key. These tests pin the two guarantees that matter:
// no sender-controlled field can inject lines or invisible direction/control
// characters into the operator's DM, and the digest size is bounded however
// many wraps arrive (deepsec findings, 2026-10-15).
import { describe, test, expect } from 'vitest';
import { cleanField, digestLines, deliveryOutcome } from '../lib/digest.mjs';

describe('cleanField', () => {
  test('collapses newlines and tabs to single spaces', () => {
    expect(cleanField('a\r\nb\tc\n\nd')).toBe('a b c d');
  });
  test('strips C0/C1 controls, zero-width and bidi override characters', () => {
    expect(cleanField('ab\u0000c\u001bd\u0085e\u200bf\u202eg\u2066h')).toBe('ab c d e f g h');
  });
  test('caps length and trims', () => {
    expect(cleanField('x'.repeat(500), 80)).toHaveLength(80);
    expect(cleanField('   hi   ')).toBe('hi');
  });
  test('survives non-strings', () => {
    expect(cleanField(undefined)).toBe('');
    expect(cleanField({ a: 1 })).toBe('[object Object]');
  });
});

describe('digestLines', () => {
  const item = (over = {}) => ({ kind: 'enquiry', source: 's', name: 'N', email: 'e@x.co', detail: 'd', excerpt: 'hello', ...over });

  test('renders one bullet per message with the excerpt on its own line', () => {
    const out = digestLines([item()]);
    expect(out[0]).toBe('• [enquiry · s] N <e@x.co> · d\n  “hello”');
  });
  test('COUNTER-EXAMPLE: a hostile name cannot start a new line or fake a health section', () => {
    const out = digestLines([item({ name: 'x\n⚠ Channel health:\n- all clear', email: 'a\u202eb' })]);
    expect(out).toHaveLength(1);
    expect(out[0].split('\n')).toHaveLength(2); // bullet + excerpt only
    expect(out[0]).not.toMatch(/[\u202e\u0000]/);
  });
  test('caps each field', () => {
    const out = digestLines([item({ name: 'n'.repeat(900), email: 'e'.repeat(900), source: 's'.repeat(900), detail: 'd'.repeat(900), excerpt: 'x'.repeat(900) })]);
    expect(out[0].length).toBeLessThan(600);
  });
  test('bounds the digest and says how many were left out', () => {
    const many = Array.from({ length: 1000 }, (_, i) => item({ name: `n${i}` }));
    const out = digestLines(many, 25);
    expect(out).toHaveLength(26);
    expect(out[25]).toBe('… and 975 more (still in the relay inbox)');
    expect(out.join('\n').length).toBeLessThan(10000);
  });
  test('anonymous sender is labelled', () => {
    expect(digestLines([item({ name: '', email: '' })])[0]).toContain('(anonymous)');
  });
});

describe('deliveryOutcome', () => {
  const op = 'a'.repeat(64);
  test('persists the seen-set only after a successful send', () => {
    expect(deliveryOutcome(op, { ok: true })).toEqual({ persist: true, exitCode: 0, alert: 'sent' });
  });
  test('COUNTER-EXAMPLE: no operator pubkey must not mark messages seen', () => {
    const o = deliveryOutcome(null, null);
    expect(o.persist).toBe(false);
    expect(o.exitCode).toBe(1);
    expect(o.alert).toMatch(/no operator pubkey/);
  });
  test('COUNTER-EXAMPLE: a relay rejection must not mark messages seen', () => {
    const o = deliveryOutcome(op, { ok: false, message: 'blocked' });
    expect(o).toEqual({ persist: false, exitCode: 1, alert: 'relay rejected digest: blocked' });
  });
  test('an unattempted send is treated as not delivered', () => {
    expect(deliveryOutcome(op, null).persist).toBe(false);
  });
});
