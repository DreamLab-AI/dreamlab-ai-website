/**
 * MainMenu — the numbered command grid. Arrow/vim keys move the highlight,
 * Enter opens it, and pressing a number jumps straight to that entry.
 */

import { useEffect } from "react";
import { BbsFrame } from "./BbsFrame";
import { MENU_ITEMS } from "@/lib/bbs/menu";
import { isTypingTarget } from "@/lib/bbs/keyboard";
import { useListNav } from "@/hooks/bbs/useListNav";
import type { ScreenId } from "@/lib/bbs/types";

interface MainMenuProps {
  onSelect: (target: ScreenId | "logoff") => void;
}

export function MainMenu({ onSelect }: MainMenuProps) {
  const { index, setIndex } = useListNav({
    count: MENU_ITEMS.length,
    onSelect: (i) => onSelect(MENU_ITEMS[i].target),
  });

  // Number hot keys jump to and open the matching entry.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const item = MENU_ITEMS.find((m) => m.key === e.key);
      if (item) {
        e.preventDefault();
        setIndex(MENU_ITEMS.indexOf(item));
        onSelect(item.target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSelect, setIndex]);

  return (
    <BbsFrame title="MAIN MENU" className="bbs-screen-enter">
      <ul className="grid grid-cols-1 gap-x-8 gap-y-0.5 sm:grid-cols-2">
        {MENU_ITEMS.map((item, i) => {
          const selected = i === index;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.target)}
                onMouseEnter={() => setIndex(i)}
                aria-current={selected ? "true" : undefined}
                className={`flex w-full items-baseline gap-2 px-1 text-left ${
                  selected ? "bbs-selected" : ""
                }`}
              >
                <span
                  className={
                    selected
                      ? "text-[var(--bbs-sel-fg)]"
                      : "text-[var(--bbs-ok)]"
                  }
                >
                  [{item.key}]
                </span>
                <span
                  className={`w-32 shrink-0 font-bold ${
                    selected ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-fg)]"
                  }`}
                >
                  {item.title}
                </span>
                <span
                  className={`truncate ${
                    selected
                      ? "text-[var(--bbs-sel-fg)]"
                      : "text-[var(--bbs-dim)]"
                  }`}
                >
                  {item.desc}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-center text-[0.9em] text-[var(--bbs-info)]">
        Use ↑/↓ to navigate, Enter to select, number to jump, / for command line
      </p>
    </BbsFrame>
  );
}
