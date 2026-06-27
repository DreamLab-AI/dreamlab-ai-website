/**
 * Hook to consume the BBS session context. Throws if used outside the provider
 * so misuse surfaces immediately during development.
 */

import { useContext } from "react";
import {
  BbsSessionContext,
  type BbsSessionValue,
} from "@/components/bbs/session/context";

export function useBbsSession(): BbsSessionValue {
  const ctx = useContext(BbsSessionContext);
  if (!ctx) {
    throw new Error("useBbsSession must be used within a BbsProvider");
  }
  return ctx;
}
