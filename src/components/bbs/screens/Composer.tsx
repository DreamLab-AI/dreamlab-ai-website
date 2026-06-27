/**
 * Composer — a compose box shared by the message, chat, and code screens.
 * Ctrl/Cmd+Enter submits. Surfaces the relay's verdict (including whitelist
 * rejections) honestly rather than faking success.
 */

import { useState } from "react";

interface ComposerProps {
  onSend: (text: string) => Promise<string | null>;
  canPost: boolean;
  whitelisted: boolean;
  onConfigure: () => void;
  placeholder?: string;
  rows?: number;
}

export function Composer({
  onSend,
  canPost,
  whitelisted,
  onConfigure,
  placeholder = "Type a message…  (Ctrl+Enter to send)",
  rows = 2,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "ok" | "warn";
    msg: string;
  } | null>(null);

  if (!canPost) {
    return (
      <div className="border-t border-[var(--bbs-border)] pt-2 text-[0.95em] text-[var(--bbs-dim)]">
        Read-only session.{" "}
        <button
          type="button"
          onClick={onConfigure}
          className="text-[var(--bbs-accent)] underline focus:outline-none"
        >
          Set up an identity in Settings
        </button>{" "}
        to post.
      </div>
    );
  }

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setFeedback(null);
    const error = await onSend(value);
    setSending(false);
    if (error) {
      setFeedback({ tone: "warn", msg: error });
    } else {
      setText("");
      setFeedback({ tone: "ok", msg: "posted ✓" });
      window.setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="border-t border-[var(--bbs-border)] pt-2">
      {!whitelisted && (
        <p className="mb-1 text-[0.85em] text-[var(--bbs-warn)]">
          ⚠ your key is not whitelisted — the relay may reject this post.
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          rows={rows}
          spellCheck={false}
          placeholder={placeholder}
          className="bbs-scroll min-w-0 flex-1 resize-none border border-[var(--bbs-border)] bg-black/40 px-2 py-1 text-[var(--bbs-fg)] placeholder:text-[var(--bbs-dim)]/60 focus:border-[var(--bbs-accent)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={sending || text.trim().length === 0}
          className="shrink-0 border border-[var(--bbs-border)] px-3 py-1 text-[var(--bbs-accent)] hover:bg-[var(--bbs-sel-bg)] hover:text-[var(--bbs-sel-fg)] disabled:opacity-40 focus:outline-none"
        >
          {sending ? "…" : "SEND"}
        </button>
      </div>
      {feedback && (
        <p
          className={`mt-1 text-[0.85em] ${
            feedback.tone === "ok"
              ? "text-[var(--bbs-ok)]"
              : "text-[var(--bbs-warn)]"
          }`}
        >
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
