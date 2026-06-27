/**
 * React context plumbing for the BBS session. Kept in a `.ts` file (no JSX) so
 * the provider component file stays component-only for fast-refresh.
 */

import { createContext } from "react";
import type { BbsConfig, Identity, RelayStatus, ThemeId } from "@/lib/bbs/types";
import type { RelayClient } from "@/lib/bbs/relay";
import type { WhitelistStatus } from "@/lib/bbs/services";

export interface BbsSessionValue {
  config: BbsConfig;
  relay: RelayClient;
  status: RelayStatus;
  authed: boolean;
  identity: Identity;
  whitelist: WhitelistStatus;
  theme: ThemeId;
  node: string;
  /** Whether a NIP-07 signing extension is present. */
  hasExtension: boolean;
  setTheme: (theme: ThemeId) => void;
  /** Adopt a new identity (persists, re-signs, re-auths, rechecks whitelist). */
  applyIdentity: (identity: Identity) => void;
  /** Drop the current identity back to read-only anon. */
  logout: () => void;
}

export const BbsSessionContext = createContext<BbsSessionValue | null>(null);
