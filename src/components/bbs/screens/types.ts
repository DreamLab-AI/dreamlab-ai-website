/** Shared prop contract for every top-level BBS screen. */

import type { ScreenId } from "@/lib/bbs/types";

export interface ScreenProps {
  /** Return to the main menu. */
  onExit: () => void;
  /** Jump to another screen (or trigger logoff). */
  onNavigate: (target: ScreenId | "logoff") => void;
}
