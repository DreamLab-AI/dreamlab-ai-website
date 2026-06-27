/**
 * BbsFrame — a bordered panel with a centered `[ TITLE ]` caption on the top
 * edge, echoing the bracketed boxes of the WILDCAT BBS layout.
 */

import type { ReactNode } from "react";

interface BbsFrameProps {
  title?: string;
  /** Optional right-aligned caption on the top edge (e.g. "--- More ---"). */
  rightCaption?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Make the body scrollable and fill available height. */
  scroll?: boolean;
}

export function BbsFrame({
  title,
  rightCaption,
  children,
  className = "",
  scroll = false,
}: BbsFrameProps) {
  return (
    <section
      className={`relative border border-[var(--bbs-border)] bg-black/30 ${className}`}
    >
      {(title || rightCaption) && (
        <div className="absolute -top-[0.7em] left-0 right-0 flex items-center justify-between px-3 text-[0.95em]">
          {title ? (
            <span className="bg-[var(--bbs-bg)] px-2 font-bold tracking-wider text-[var(--bbs-primary)]">
              [ {title} ]
            </span>
          ) : (
            <span />
          )}
          {rightCaption ? (
            <span className="bg-[var(--bbs-bg)] px-2 text-[var(--bbs-dim)]">
              {rightCaption}
            </span>
          ) : (
            <span />
          )}
        </div>
      )}
      <div
        className={`flex min-h-0 flex-1 flex-col p-3 pt-4 ${
          scroll ? "bbs-scroll overflow-y-auto" : ""
        }`}
        style={scroll ? { maxHeight: "100%" } : undefined}
      >
        {children}
      </div>
    </section>
  );
}
