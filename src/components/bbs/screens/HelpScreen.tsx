/**
 * HelpScreen — keybinding + command reference and a short "what is this".
 */

import { useEscape } from "@/hooks/bbs/useEscape";
import { MENU_ITEMS } from "@/lib/bbs/menu";
import { BbsFrame } from "../BbsFrame";
import { BackHint } from "../common";
import type { ScreenProps } from "./types";

const KEYS: [string, string][] = [
  ["↑ / ↓  (or j / k)", "move the highlight"],
  ["Enter", "open the selected item"],
  ["1 – 0", "jump to a main-menu entry"],
  ["Esc", "go back / up one level"],
  ["/", "focus the command line"],
  ["F1 … F10", "function-key shortcuts (see footer)"],
  ["Ctrl+Enter", "send, in any compose box"],
];

export function HelpScreen({ onExit }: ScreenProps) {
  useEscape(onExit);
  return (
    <BbsFrame
      title="HELP"
      rightCaption={<BackHint label="Back" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="bbs-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
        <p className="text-[var(--bbs-fg)]">
          This is the{" "}
          <span className="text-[var(--bbs-primary)]">Claude Code BBS</span> — a
          retro ASCII front-end for the DreamLab community forum. It talks to the
          same Nostr relay as the modern forum at{" "}
          <a href="/community/" className="text-[var(--bbs-info)] underline">
            /community/
          </a>
          , so posts, users, and zones are shared between the two.
        </p>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ KEYS ═══</div>
          <div className="mt-1 grid grid-cols-[12rem_1fr] gap-x-3 gap-y-0.5">
            {KEYS.map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-[var(--bbs-accent)]">{k}</span>
                <span className="text-[var(--bbs-fg)]">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ COMMANDS ═══</div>
          <p className="mt-1 text-[var(--bbs-dim)]">
            Press <span className="text-[var(--bbs-accent)]">/</span> then type a
            number or one of:
          </p>
          <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {MENU_ITEMS.map((m) => (
              <div key={m.key} className="flex items-baseline gap-2">
                <span className="w-4 text-[var(--bbs-ok)]">{m.key}</span>
                <span className="text-[var(--bbs-secondary)]">
                  {m.title.toLowerCase().split(" ")[0]}
                </span>
                <span className="text-[var(--bbs-dim)]">— {m.desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[var(--bbs-dim)]">
            Also: <span className="text-[var(--bbs-accent)]">who</span>,{" "}
            <span className="text-[var(--bbs-accent)]">feed</span>,{" "}
            <span className="text-[var(--bbs-accent)]">help</span>,{" "}
            <span className="text-[var(--bbs-accent)]">quit</span>.
          </p>
        </section>
      </div>
    </BbsFrame>
  );
}
