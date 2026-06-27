/**
 * SettingsScreen — identity management (generate / import / NIP-07 / export /
 * log off) and terminal theme selection.
 */

import { useState } from "react";
import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useEscape } from "@/hooks/bbs/useEscape";
import {
  connectNip07,
  generateLocalIdentity,
  importSecret,
  nsecOf,
} from "@/lib/bbs/identity";
import { THEME_ORDER } from "@/lib/bbs/theme";
import type { ThemeId } from "@/lib/bbs/types";
import { BbsFrame } from "../BbsFrame";
import { BackHint } from "../common";
import type { ScreenProps } from "./types";

function Btn({
  children,
  onClick,
  tone = "normal",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "normal" | "warn";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border border-[var(--bbs-border)] px-3 py-1 focus:outline-none hover:bg-[var(--bbs-sel-bg)] hover:text-[var(--bbs-sel-fg)] ${
        tone === "warn" ? "text-[var(--bbs-warn)]" : "text-[var(--bbs-accent)]"
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsScreen({ onExit }: ScreenProps) {
  const {
    identity,
    whitelist,
    theme,
    setTheme,
    applyIdentity,
    logout,
    hasExtension,
    config,
  } = useBbsSession();
  useEscape(onExit);

  const [importValue, setImportValue] = useState("");
  const [message, setMessage] = useState<{
    tone: "ok" | "warn";
    text: string;
  } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const flash = (tone: "ok" | "warn", text: string) => {
    setMessage({ tone, text });
    window.setTimeout(() => setMessage(null), 4000);
  };

  const onImport = () => {
    try {
      const next = importSecret(importValue);
      applyIdentity(next);
      setImportValue("");
      setRevealed(false);
      flash("ok", `imported ${next.npub.slice(0, 14)}…`);
    } catch (e) {
      flash("warn", e instanceof Error ? e.message : "invalid key");
    }
  };

  const onGenerate = () => {
    applyIdentity(generateLocalIdentity());
    setRevealed(false);
    flash("ok", "generated a new local key");
  };

  const onExtension = async () => {
    try {
      applyIdentity(await connectNip07());
      flash("ok", "connected NIP-07 extension");
    } catch (e) {
      flash("warn", e instanceof Error ? e.message : "extension error");
    }
  };

  return (
    <BbsFrame
      title="SETTINGS"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="bbs-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
        <section>
          <div className="text-[var(--bbs-primary)]">═══ IDENTITY ═══</div>
          <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-0.5">
            <span className="text-[var(--bbs-dim)]">Handle</span>
            <span className="text-[var(--bbs-accent)]">{identity.handle}</span>
            <span className="text-[var(--bbs-dim)]">Signer</span>
            <span className="text-[var(--bbs-fg)]">{identity.kind}</span>
            <span className="text-[var(--bbs-dim)]">npub</span>
            <span className="break-all text-[var(--bbs-fg)]">
              {identity.npub || "— (anonymous)"}
            </span>
            <span className="text-[var(--bbs-dim)]">Whitelist</span>
            <span
              className={
                whitelist.whitelisted
                  ? "text-[var(--bbs-ok)]"
                  : "text-[var(--bbs-warn)]"
              }
            >
              {!whitelist.checked
                ? "unknown"
                : whitelist.whitelisted
                  ? `yes (${whitelist.cohorts.join(", ") || "member"})`
                  : "no — posting will be rejected"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Btn onClick={onGenerate}>Generate key</Btn>
            {hasExtension && <Btn onClick={onExtension}>Connect NIP-07</Btn>}
            {identity.kind === "local" && identity.secretHex && (
              <Btn onClick={() => setRevealed((v) => !v)}>
                {revealed ? "Hide nsec" : "Export nsec"}
              </Btn>
            )}
            {identity.kind !== "anon" && (
              <Btn tone="warn" onClick={logout}>
                Log off identity
              </Btn>
            )}
          </div>

          <p className="mt-2 text-[0.85em] text-[var(--bbs-warn)]">
            ⚠ A generated/imported key is stored unencrypted in this browser's
            localStorage — treat it as a throwaway BBS identity, not high-value
            custody. For a key you care about, use a NIP-07 extension (the
            extension holds the secret; the BBS never sees it).
          </p>

          {revealed && identity.secretHex && (
            <p className="mt-2 break-all border border-[var(--bbs-warn)] p-2 text-[0.85em] text-[var(--bbs-warn)]">
              ⚠ keep this secret. nsec: {nsecOf(identity.secretHex)}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <input
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onImport();
                } else if (e.key === "Escape") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              spellCheck={false}
              autoComplete="off"
              placeholder="paste nsec1… or 64-char hex to import"
              className="min-w-0 flex-1 border border-[var(--bbs-border)] bg-black/40 px-2 py-1 text-[var(--bbs-fg)] placeholder:text-[var(--bbs-dim)]/60 focus:border-[var(--bbs-accent)] focus:outline-none"
            />
            <Btn onClick={onImport}>Import</Btn>
          </div>

          <p className="mt-2 text-[0.85em] text-[var(--bbs-dim)]">
            New here? Register a passkey at{" "}
            <a
              href="/community/"
              className="text-[var(--bbs-info)] underline"
            >
              the forum
            </a>{" "}
            to be whitelisted for posting. Auth API: {config.authApiUrl}
          </p>

          {message && (
            <p
              className={`mt-2 ${
                message.tone === "ok"
                  ? "text-[var(--bbs-ok)]"
                  : "text-[var(--bbs-warn)]"
              }`}
            >
              {message.text}
            </p>
          )}
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ THEME ═══</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {THEME_ORDER.map((t: ThemeId) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`border px-3 py-1 uppercase focus:outline-none ${
                  theme === t
                    ? "bbs-selected border-[var(--bbs-accent)]"
                    : "border-[var(--bbs-border)] text-[var(--bbs-fg)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      </div>
    </BbsFrame>
  );
}
