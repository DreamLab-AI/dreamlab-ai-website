/**
 * CommandPrompt — the `user@bbs ~ >` command line. Accepts menu numbers and
 * word commands (see resolveCommand). Press `/` anywhere to focus it; Escape
 * blurs back to keyboard navigation.
 */

import { useEffect, useRef, useState } from "react";
import { isTypingTarget } from "@/lib/bbs/keyboard";

interface CommandPromptProps {
  user: string;
  /** Returns an error string to flash, or null on success. */
  onSubmit: (raw: string) => string | null;
}

export function CommandPrompt({ user, onSubmit }: CommandPromptProps) {
  const [value, setValue] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global `/` focuses the prompt (unless already typing somewhere).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submit = () => {
    const raw = value;
    if (!raw.trim()) return;
    const error = onSubmit(raw);
    setValue("");
    setFlash(error);
    if (error) {
      window.setTimeout(() => setFlash(null), 2500);
    }
  };

  return (
    <div className="shrink-0 border-t border-[var(--bbs-border)] px-3 py-1.5">
      <label className="flex items-center gap-2 text-[0.95em]">
        <span className="whitespace-nowrap text-[var(--bbs-ok)]">
          {user.toLowerCase().replace(/\s+/g, "")}@bbs
          <span className="text-[var(--bbs-dim)]"> ~</span>
        </span>
        <span className="text-[var(--bbs-accent)]">&gt;</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              inputRef.current?.blur();
            }
          }}
          spellCheck={false}
          autoComplete="off"
          aria-label="BBS command prompt"
          placeholder="type a command or number… (try: help)"
          className="min-w-0 flex-1 bg-transparent text-[var(--bbs-fg)] placeholder:text-[var(--bbs-dim)]/60 focus:outline-none"
        />
        {flash && (
          <span className="whitespace-nowrap text-[var(--bbs-warn)]">
            {flash}
          </span>
        )}
      </label>
    </div>
  );
}
