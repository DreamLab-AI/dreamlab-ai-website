/**
 * FunctionKeyBar — the bottom F-key legend (F1=Help … F10=Quit). Keys are also
 * wired globally in the terminal; clicking a cell triggers the same action.
 */

import { FN_KEYS } from "@/lib/bbs/menu";
import type { ScreenId } from "@/lib/bbs/types";

interface FunctionKeyBarProps {
  onTrigger: (target: ScreenId | "logoff") => void;
}

export function FunctionKeyBar({ onTrigger }: FunctionKeyBarProps) {
  return (
    <nav
      aria-label="Function keys"
      className="shrink-0 border-t border-[var(--bbs-border)] px-2 py-1 text-[0.85em]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {FN_KEYS.map((k) => (
          <button
            key={k.fkey}
            type="button"
            onClick={() => onTrigger(k.target)}
            className="text-[var(--bbs-info)] transition-colors hover:text-[var(--bbs-accent)] focus:outline-none focus:text-[var(--bbs-accent)]"
          >
            <span className="text-[var(--bbs-dim)]">{k.fkey}</span>=
            {k.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
