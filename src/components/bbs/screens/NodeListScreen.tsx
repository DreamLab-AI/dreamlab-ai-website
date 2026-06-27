/**
 * NodeListScreen — the relay node (with live NIP-11 info) and the four-zone
 * access map projected from the deployment's zone config.
 */

import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useEscape } from "@/hooks/bbs/useEscape";
import { fetchRelayInfo } from "@/lib/bbs/services";
import { zoneUnlocked } from "@/lib/bbs/rank";
import { BbsFrame } from "../BbsFrame";
import { BackHint, Working } from "../common";
import type { ScreenProps } from "./types";

export function NodeListScreen({ onExit }: ScreenProps) {
  const { relay, config, status, authed, whitelist } = useBbsSession();
  useEscape(onExit);
  const { data: info, loading } = useAsync(
    () => fetchRelayInfo(config.relayUrl),
    [config.relayUrl]
  );

  const online = status === "online" || status === "authenticating";

  return (
    <BbsFrame
      title="NODE LIST"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="bbs-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
        <section>
          <div className="text-[var(--bbs-primary)]">═══ RELAY NODE ═══</div>
          <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-0.5">
            <span className="text-[var(--bbs-dim)]">Node</span>
            <span className="text-[var(--bbs-accent)]">{config.forumName}</span>
            <span className="text-[var(--bbs-dim)]">Status</span>
            <span className={online ? "text-[var(--bbs-ok)]" : "text-[var(--bbs-warn)]"}>
              {online ? "ON-LINE" : status.toUpperCase()}
              {authed ? " · AUTHED" : " · ANON"}
            </span>
            <span className="text-[var(--bbs-dim)]">Address</span>
            <span className="break-all text-[var(--bbs-fg)]">
              {relay.url}
            </span>
            {loading ? (
              <>
                <span className="text-[var(--bbs-dim)]">NIP-11</span>
                <Working label="probing" />
              </>
            ) : info ? (
              <>
                <span className="text-[var(--bbs-dim)]">Software</span>
                <span className="break-all text-[var(--bbs-fg)]">
                  {info.software || "—"} {info.version}
                </span>
                <span className="text-[var(--bbs-dim)]">NIPs</span>
                <span className="text-[var(--bbs-info)]">
                  {info.supportedNips.join(", ") || "—"}
                </span>
                {info.description && (
                  <>
                    <span className="text-[var(--bbs-dim)]">About</span>
                    <span className="text-[var(--bbs-fg)]">
                      {info.description}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-[var(--bbs-dim)]">NIP-11</span>
                <span className="text-[var(--bbs-dim)]">unavailable</span>
              </>
            )}
          </div>
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ ZONES ═══</div>
          <ul className="mt-1 space-y-0.5">
            {config.zones.map((z) => {
              const unlocked = zoneUnlocked(z, whitelist.cohorts);
              return (
                <li key={z.id} className="flex items-baseline gap-2">
                  <span
                    className={
                      unlocked ? "text-[var(--bbs-ok)]" : "text-[var(--bbs-warn)]"
                    }
                  >
                    {unlocked ? "○" : "⚿"}
                  </span>
                  <span className="w-32 shrink-0 font-bold text-[var(--bbs-secondary)]">
                    {z.display_name}
                  </span>
                  <span className="text-[var(--bbs-dim)]">
                    {z.visibility}
                    {z.encrypted ? " · encrypted" : ""}
                    {z.required_cohorts.length > 0
                      ? ` · needs: ${z.required_cohorts.join(", ")}`
                      : " · open"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ MESH ═══</div>
          <p className="mt-1 text-[var(--bbs-dim)]">
            Federation mode:{" "}
            <span className="text-[var(--bbs-fg)]">standalone</span> — no peer
            relays configured.
          </p>
        </section>
      </div>
    </BbsFrame>
  );
}
