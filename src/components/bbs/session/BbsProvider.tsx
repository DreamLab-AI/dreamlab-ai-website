/**
 * BbsProvider — owns the relay connection, identity, theme, and whitelist
 * status for the whole terminal, exposing them via BbsSessionContext.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getBbsConfig } from "@/lib/bbs/env";
import { RelayClient } from "@/lib/bbs/relay";
import {
  anonIdentity,
  createSigner,
  hasNip07,
  loadIdentity,
  saveIdentity,
  clearIdentity,
} from "@/lib/bbs/identity";
import { checkWhitelist, type WhitelistStatus } from "@/lib/bbs/services";
import type { Identity, RelayStatus, ThemeId } from "@/lib/bbs/types";
import { BbsSessionContext, type BbsSessionValue } from "./context";

const THEME_KEY = "dreamlab.bbs.theme";
const NODE_NAME = "DREAMLAB";

function loadTheme(): ThemeId {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === "amber" || raw === "green" || raw === "purple" || raw === "sky") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "amber";
}

const NEUTRAL_WHITELIST: WhitelistStatus = {
  whitelisted: false,
  cohorts: [],
  checked: false,
};

export function BbsProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => getBbsConfig(), []);
  const relayRef = useRef<RelayClient | null>(null);
  if (relayRef.current === null) {
    relayRef.current = new RelayClient(config.relayUrl);
  }
  const relay = relayRef.current;

  const [status, setStatus] = useState<RelayStatus>("idle");
  const [identity, setIdentity] = useState<Identity>(() => loadIdentity());
  const [theme, setThemeState] = useState<ThemeId>(() => loadTheme());
  const [whitelist, setWhitelist] = useState<WhitelistStatus>(NEUTRAL_WHITELIST);
  const [authed, setAuthed] = useState(false);
  const hasExtension = useMemo(() => hasNip07(), []);

  // Relay lifecycle: connect on mount, close on unmount.
  useEffect(() => {
    const offStatus = relay.onStatus((s) => {
      setStatus(s);
      setAuthed(relay.isAuthed());
    });
    relay.setSigner(createSigner(identity));
    relay.connect();
    return () => {
      offStatus();
      relay.close();
    };
    // Mount-only: identity changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relay]);

  // React to identity changes: re-sign, re-auth, recheck whitelist, persist.
  useEffect(() => {
    relay.setSigner(createSigner(identity));
    if (identity.kind !== "anon") {
      relay.reconnect();
    }
    let cancelled = false;
    if (identity.pubkey) {
      checkWhitelist(config.relayUrl, identity.pubkey).then((status) => {
        if (!cancelled) setWhitelist(status);
      });
    } else {
      setWhitelist(NEUTRAL_WHITELIST);
    }
    return () => {
      cancelled = true;
    };
  }, [identity, relay, config.relayUrl]);

  const value: BbsSessionValue = useMemo(
    () => ({
      config,
      relay,
      status,
      authed,
      identity,
      whitelist,
      theme,
      node: NODE_NAME,
      hasExtension,
      setTheme: (t: ThemeId) => {
        setThemeState(t);
        try {
          window.localStorage.setItem(THEME_KEY, t);
        } catch {
          /* ignore */
        }
      },
      applyIdentity: (next: Identity) => {
        saveIdentity(next);
        setIdentity(next);
      },
      logout: () => {
        clearIdentity();
        setIdentity(anonIdentity());
      },
    }),
    [config, relay, status, authed, identity, whitelist, theme, hasExtension]
  );

  return (
    <BbsSessionContext.Provider value={value}>
      {children}
    </BbsSessionContext.Provider>
  );
}
