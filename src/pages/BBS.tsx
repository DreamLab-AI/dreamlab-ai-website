/**
 * BBS — the retro ASCII terminal route (`/bbs`). A full-screen, parallel
 * front-end for the DreamLab community forum that shares the same Nostr relay
 * backend as the modern forum at `/community/`.
 */

import { useOGMeta } from "@/hooks/useOGMeta";
import { BbsProvider } from "@/components/bbs/session/BbsProvider";
import { BbsTerminal } from "@/components/bbs/BbsTerminal";
import "@/components/bbs/bbs.css";

const BBS = () => {
  useOGMeta({
    title: "DreamLab BBS — Claude Code Terminal",
    description:
      "A retro ASCII bulletin-board interface to the DreamLab community forum.",
    url: "https://dreamlab-ai.com/bbs",
  });

  return (
    <BbsProvider>
      <BbsTerminal />
    </BbsProvider>
  );
};

export default BBS;
