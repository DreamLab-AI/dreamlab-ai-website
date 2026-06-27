/**
 * DoorGamesScreen — the classic BBS "doors". A small door menu with a fully
 * playable number-guessing game and a fortune oracle, for authentic flavor.
 */

import { useState } from "react";
import { useEscape } from "@/hooks/bbs/useEscape";
import { useListNav } from "@/hooks/bbs/useListNav";
import { BbsFrame } from "../BbsFrame";
import { BackHint } from "../common";
import type { ScreenProps } from "./types";

type Door = "menu" | "guess" | "oracle";

const DOORS: { id: Exclude<Door, "menu">; title: string; blurb: string }[] = [
  { id: "guess", title: "DIGITAL DRIFTER", blurb: "Guess the number, 1–100" },
  { id: "oracle", title: "THE ORACLE", blurb: "Ask the BBS for your fortune" },
];

const BEST_KEY = "dreamlab.bbs.guess.best";

const FORTUNES = [
  "The best agent is the one that knows when to ask.",
  "Ship the spike. Refactor the proof.",
  "A green build is a temporary state of grace.",
  "Latency is a feature you forgot to design.",
  "Read the relay logs; they are trying to tell you something.",
  "The bug is in the layer you trust the most.",
  "Curiosity compiles. Fear segfaults.",
  "Your future self is a code reviewer. Be kind.",
  "Cache invalidation waits for no one.",
  "Dream in lowercase; deploy in uppercase.",
];

function readBest(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function DoorGamesScreen({ onExit }: ScreenProps) {
  const [door, setDoor] = useState<Door>("menu");
  useEscape(() => (door === "menu" ? onExit() : setDoor("menu")));

  const nav = useListNav({
    count: DOORS.length,
    enabled: door === "menu",
    onSelect: (i) => setDoor(DOORS[i].id),
  });

  return (
    <BbsFrame
      title={door === "menu" ? "DOOR GAMES" : `DOOR · ${door.toUpperCase()}`}
      rightCaption={<BackHint label={door === "menu" ? "Menu" : "Doors"} />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      {door === "menu" ? (
        <ul className="space-y-0.5">
          {DOORS.map((d, i) => {
            const sel = i === nav.index;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setDoor(d.id)}
                  onMouseEnter={() => nav.setIndex(i)}
                  className={`flex w-full items-baseline gap-3 px-1 text-left ${
                    sel ? "bbs-selected" : ""
                  }`}
                >
                  <span
                    className={
                      sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-ok)]"
                    }
                  >
                    [{i + 1}]
                  </span>
                  <span
                    className={`w-44 shrink-0 font-bold ${
                      sel
                        ? "text-[var(--bbs-sel-fg)]"
                        : "text-[var(--bbs-secondary)]"
                    }`}
                  >
                    {d.title}
                  </span>
                  <span
                    className={
                      sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-dim)]"
                    }
                  >
                    {d.blurb}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : door === "guess" ? (
        <GuessGame />
      ) : (
        <Oracle />
      )}
    </BbsFrame>
  );
}

/* ------------------------------- guess game ------------------------------ */

const MAX_TRIES = 7;

function GuessGame() {
  const [target, setTarget] = useState(() => 1 + Math.floor(Math.random() * 100));
  const [guess, setGuess] = useState("");
  const [log, setLog] = useState<string[]>([
    "I'm thinking of a number between 1 and 100.",
    `You have ${MAX_TRIES} tries. Good luck, drifter.`,
  ]);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState<number | null>(() => readBest());

  const reset = () => {
    setTarget(1 + Math.floor(Math.random() * 100));
    setGuess("");
    setTries(0);
    setDone(false);
    setLog([
      "New round! 1 to 100.",
      `You have ${MAX_TRIES} tries.`,
    ]);
  };

  const submit = () => {
    const n = parseInt(guess, 10);
    setGuess("");
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      setLog((l) => [...l, "> enter a number 1–100"]);
      return;
    }
    const used = tries + 1;
    setTries(used);
    if (n === target) {
      setDone(true);
      const won = `> ${n} — CORRECT in ${used} tr${used === 1 ? "y" : "ies"}! 🏆`;
      let line = won;
      if (best === null || used < best) {
        try {
          window.localStorage.setItem(BEST_KEY, String(used));
        } catch {
          /* ignore */
        }
        setBest(used);
        line = `${won}  NEW RECORD!`;
      }
      setLog((l) => [...l, line]);
      return;
    }
    if (used >= MAX_TRIES) {
      setDone(true);
      setLog((l) => [...l, `> ${n} — out of tries. It was ${target}. 💀`]);
      return;
    }
    setLog((l) => [...l, `> ${n} — too ${n < target ? "low" : "high"}.`]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="bbs-scroll min-h-0 flex-1 overflow-y-auto">
        {log.map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith(">")
                ? "text-[var(--bbs-fg)]"
                : "text-[var(--bbs-info)]"
            }
          >
            {line}
          </div>
        ))}
      </div>
      <div className="text-[0.9em] text-[var(--bbs-dim)]">
        Tries: {tries}/{MAX_TRIES} · Best:{" "}
        <span className="text-[var(--bbs-accent)]">{best ?? "—"}</span>
      </div>
      {done ? (
        <button
          type="button"
          onClick={reset}
          className="self-start border border-[var(--bbs-border)] px-3 py-1 text-[var(--bbs-accent)] hover:bg-[var(--bbs-sel-bg)] hover:text-[var(--bbs-sel-fg)] focus:outline-none"
        >
          PLAY AGAIN
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[var(--bbs-accent)]">&gt;</span>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            inputMode="numeric"
            placeholder="your guess (1–100), Enter"
            className="min-w-0 flex-1 border border-[var(--bbs-border)] bg-black/40 px-2 py-1 text-[var(--bbs-fg)] placeholder:text-[var(--bbs-dim)]/60 focus:border-[var(--bbs-accent)] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

/* --------------------------------- oracle -------------------------------- */

function Oracle() {
  const [fortune, setFortune] = useState<string | null>(null);
  const ask = () =>
    setFortune(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
      <pre className="text-[var(--bbs-secondary)] text-[0.9em] leading-tight">
        {"   .-.\n  (o o)\n  | O |   the oracle awaits\n   '-'"}
      </pre>
      {fortune && (
        <p className="max-w-md text-[var(--bbs-fg)]">“{fortune}”</p>
      )}
      <button
        type="button"
        onClick={ask}
        className="border border-[var(--bbs-border)] px-4 py-1 text-[var(--bbs-accent)] hover:bg-[var(--bbs-sel-bg)] hover:text-[var(--bbs-sel-fg)] focus:outline-none"
      >
        {fortune ? "ASK AGAIN" : "ASK THE ORACLE"}
      </button>
    </div>
  );
}
