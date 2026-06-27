/**
 * FileBaseScreen — a window onto the user's Solid pod (Cloudflare R2 backed).
 * Lists well-known pod resources with openable links and previews the profile
 * card. Pod reads are public GETs; writes require NIP-98 and are out of scope
 * here, so this is a read/browse surface.
 */

import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useListNav } from "@/hooks/bbs/useListNav";
import { useEscape } from "@/hooks/bbs/useEscape";
import { truncate } from "@/lib/bbs/format";
import { BbsFrame } from "../BbsFrame";
import { BackHint, Notice, Working } from "../common";
import type { ScreenProps } from "./types";

interface PodResource {
  label: string;
  path: string;
  note: string;
}

export function FileBaseScreen({ onExit, onNavigate }: ScreenProps) {
  const { config, identity } = useBbsSession();
  useEscape(onExit);

  const podRoot = identity.pubkey
    ? `${config.podApiUrl.replace(/\/$/, "")}/pods/${identity.pubkey}`
    : "";

  const resources: PodResource[] = identity.pubkey
    ? [
        { label: "profile/card", path: "/profile/card", note: "public WebID card" },
        { label: "public/", path: "/public/", note: "world-readable container" },
        { label: "private/", path: "/private/", note: "WAC-locked (owner only)" },
        { label: "inbox/", path: "/inbox/", note: "LDN notifications" },
      ]
    : [];

  const { index, setIndex } = useListNav({
    count: resources.length,
    enabled: resources.length > 0,
    onSelect: (i) => window.open(podRoot + resources[i].path, "_blank"),
  });

  const card = useAsync<string | null>(async () => {
    if (!podRoot) return null;
    try {
      const res = await fetch(`${podRoot}/profile/card`);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }, [podRoot]);

  if (identity.kind === "anon") {
    return (
      <BbsFrame
        title="FILE BASE"
        rightCaption={<BackHint label="Menu" />}
        className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
      >
        <Notice>
          The File Base browses your Solid pod.{" "}
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="text-[var(--bbs-accent)] underline focus:outline-none"
          >
            Set up an identity
          </button>{" "}
          to view your pod.
        </Notice>
        <p className="text-center text-[var(--bbs-dim)]">
          Pod host:{" "}
          <span className="break-all text-[var(--bbs-fg)]">
            {config.podApiUrl}
          </span>
        </p>
      </BbsFrame>
    );
  }

  return (
    <BbsFrame
      title="FILE BASE · POD"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="bbs-scroll min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div>
          <span className="text-[var(--bbs-dim)]">Pod root: </span>
          <a
            href={`${podRoot}/`}
            target="_blank"
            rel="noreferrer"
            className="break-all text-[var(--bbs-accent)] underline"
          >
            {podRoot}/
          </a>
        </div>

        <ul>
          {resources.map((r, i) => {
            const sel = i === index;
            return (
              <li key={r.path}>
                <a
                  href={podRoot + r.path}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setIndex(i)}
                  className={`flex items-baseline gap-3 px-1 ${
                    sel ? "bbs-selected" : ""
                  }`}
                >
                  <span
                    className={
                      sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-ok)]"
                    }
                  >
                    ▤
                  </span>
                  <span
                    className={`w-32 shrink-0 ${
                      sel
                        ? "text-[var(--bbs-sel-fg)]"
                        : "text-[var(--bbs-secondary)]"
                    }`}
                  >
                    {r.label}
                  </span>
                  <span
                    className={
                      sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-dim)]"
                    }
                  >
                    {r.note}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <section className="border-t border-[var(--bbs-border)] pt-2">
          <div className="text-[var(--bbs-primary)]">profile/card</div>
          {card.loading ? (
            <Working label="Fetching card" />
          ) : card.data ? (
            <pre className="bbs-scroll mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[0.85em] text-[var(--bbs-fg)]">
              {truncate(card.data, 1200)}
            </pre>
          ) : (
            <p className="text-[var(--bbs-dim)]">
              No readable profile card (not provisioned or access-restricted).
            </p>
          )}
        </section>
      </div>
    </BbsFrame>
  );
}
