/**
 * ASCII art assets for the BBS banner. Pure string constants — no logic — so
 * they render identically in a monospace <pre> on every platform.
 */

/** Block-letter "DREAMLAB" banner (standard small figlet style). */
export const DREAMLAB_LOGO: string[] = [
  " ____  ____  ____   __   _  _  __    __   ____ ",
  "(    \\(  _ \\(  __) / _\\ ( \\/ )(  )  / _\\ (  _ \\",
  " ) D ( )   / ) _) /    \\/ \\/ \\/ (_/\\/    \\ ) _ (",
  "(____/(__\\_)(____)\\_/\\_/\\_)(_/\\____/\\_/\\_/(____/",
];

/** Compact "BBS" sub-banner shown beneath the logo. */
export const BBS_SUBLOGO: string[] = [
  "========  B B S  ========",
];

/** A small dreaming-cat mascot — a nod to classic BBS art (and Claude). */
export const CAT_MASCOT: string[] = [
  "   /\\_/\\  ",
  "  ( o.o ) ",
  "   > ^ <  ",
];

/** Tagline under the banner. */
export const TAGLINE = "Stay Curious. Stay Building. Dream Free.";

/**
 * Build a centered ASCII line within a fixed width. Used for banner layout.
 */
export function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  return " ".repeat(left) + text;
}

/** A horizontal rule of box-drawing dashes. */
export function rule(width: number, char = "─"): string {
  return char.repeat(Math.max(0, width));
}
