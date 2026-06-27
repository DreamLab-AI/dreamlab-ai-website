/**
 * StatusBar — the top status line: connection light, forum title, node info,
 * users online, and a live clock. Mirrors the WILDCAT header bar.
 */

import { clock } from "@/lib/bbs/format";
import type { RelayStatus } from "@/lib/bbs/types";

interface StatusBarProps {
  forumName: string;
  node: string;
  status: RelayStatus;
  users: number | null;
  now: Date;
}

const STATUS_LABEL: Record<RelayStatus, string> = {
  idle: "CONNECT",
  connecting: "DIALING",
  online: "ON-LINE",
  authenticating: "AUTH...",
  error: "NO CARR.",
  closed: "OFFLINE",
};

export function StatusBar({
  forumName,
  node,
  status,
  users,
  now,
}: StatusBarProps) {
  const online = status === "online" || status === "authenticating";
  return (
    <header className="shrink-0 border-b border-[var(--bbs-border)] text-[0.95em]">
      <div className="flex items-center justify-between gap-2 px-3 py-1">
        <span
          className={online ? "text-[var(--bbs-ok)]" : "text-[var(--bbs-warn)]"}
        >
          [{STATUS_LABEL[status]}]
        </span>
        <span className="truncate text-center font-bold tracking-wide text-[var(--bbs-primary)]">
          {forumName.toUpperCase()} — CLAUDE CODE BBS
        </span>
        <span className="text-[var(--bbs-ok)]">{clock(now)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--bbs-border)]/50 px-3 py-1 text-[var(--bbs-dim)]">
        <span>
          Node: <span className="text-[var(--bbs-accent)]">{node}</span>
        </span>
        <span className="hidden sm:inline">
          Location:{" "}
          <span className="text-[var(--bbs-fg)]">Deep in the Lake District</span>
        </span>
        <span>
          Users:{" "}
          <span className="text-[var(--bbs-ok)]">
            {users === null ? "—" : users} {users === null ? "" : "Online"}
          </span>
        </span>
      </div>
    </header>
  );
}
