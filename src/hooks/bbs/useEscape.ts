/**
 * useEscape — invoke a handler when Escape is pressed and focus is not in a
 * text field (so Escape in a compose box blurs the field instead of navigating).
 */

import { useEffect, useRef } from "react";
import { isTypingTarget } from "@/lib/bbs/keyboard";

export function useEscape(handler: () => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isTypingTarget(e.target)) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [enabled]);
}
