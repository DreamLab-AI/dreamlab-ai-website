/**
 * Banner — the ASCII art masthead: dreaming-cat mascot beside the DREAMLAB
 * block logo, with the BBS sub-banner and tagline beneath.
 */

import {
  BBS_SUBLOGO,
  CAT_MASCOT,
  DREAMLAB_LOGO,
  TAGLINE,
} from "@/lib/bbs/ascii";

export function Banner() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        <pre
          aria-hidden="true"
          className="hidden text-[var(--bbs-accent)] leading-[1.05] text-[clamp(7px,1.1vw,12px)] sm:block"
        >
          {CAT_MASCOT.join("\n")}
        </pre>
        <pre className="text-[var(--bbs-primary)] leading-[1.05] text-[clamp(6px,1.3vw,13px)]">
          {DREAMLAB_LOGO.join("\n")}
        </pre>
      </div>
      <pre className="text-[var(--bbs-secondary)] leading-tight text-[clamp(7px,1vw,12px)]">
        {BBS_SUBLOGO.join("\n")}
      </pre>
      <p className="text-[var(--bbs-accent)] text-[0.95em]">{TAGLINE}</p>
    </div>
  );
}
