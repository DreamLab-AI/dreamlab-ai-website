/**
 * Small shared presentational bits used across BBS screens.
 */

import type { ReactNode } from "react";

/** Right-edge caption reminding the user how to leave the current screen. */
export function BackHint({ label = "Back" }: { label?: string }) {
  return (
    <span>
      <span className="text-[var(--bbs-info)]">ESC</span> ← {label}
    </span>
  );
}

/** A centered status line (loading / empty / error) inside a screen body. */
export function Notice({
  children,
  tone = "dim",
}: {
  children: ReactNode;
  tone?: "dim" | "ok" | "warn" | "info";
}) {
  const color =
    tone === "ok"
      ? "text-[var(--bbs-ok)]"
      : tone === "warn"
        ? "text-[var(--bbs-warn)]"
        : tone === "info"
          ? "text-[var(--bbs-info)]"
          : "text-[var(--bbs-dim)]";
  return <p className={`py-6 text-center ${color}`}>{children}</p>;
}

/** A blinking-cursor flavored "working…" line. */
export function Working({ label = "Working" }: { label?: string }) {
  return (
    <Notice tone="info">
      {label}
      <span className="bbs-cursor align-middle" />
    </Notice>
  );
}
