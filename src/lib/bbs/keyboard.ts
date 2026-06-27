/**
 * Keyboard helpers shared across BBS screens.
 */

/** True if the event target is a text input / textarea (so nav keys defer). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/** Map a KeyboardEvent to a function-key label ("F1".."F12") or null. */
export function functionKeyOf(e: KeyboardEvent): string | null {
  if (/^F\d{1,2}$/.test(e.key)) return e.key;
  return null;
}
