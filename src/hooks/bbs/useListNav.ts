/**
 * useListNav — arrow-key / vim-key navigation over a list with Enter-to-select.
 *
 * Respects text-input focus (so typing in the command prompt or a compose box
 * never moves the list selection) and clamps the index when the list resizes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isTypingTarget } from "@/lib/bbs/keyboard";

interface ListNavOptions {
  count: number;
  onSelect?: (index: number) => void;
  enabled?: boolean;
  /** Wrap around at the ends (default true). */
  wrap?: boolean;
}

interface ListNav {
  index: number;
  setIndex: (index: number) => void;
}

export function useListNav({
  count,
  onSelect,
  enabled = true,
  wrap = true,
}: ListNavOptions): ListNav {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Keep the selection within bounds as the list grows/shrinks.
  useEffect(() => {
    if (count <= 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index > count - 1) setIndex(count - 1);
  }, [count, index]);

  const move = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        if (count <= 0) return 0;
        let next = prev + delta;
        if (wrap) {
          next = (next + count) % count;
        } else {
          next = Math.min(Math.max(0, next), count - 1);
        }
        return next;
      });
    },
    [count, wrap]
  );

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          move(1);
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          move(-1);
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(Math.max(0, count - 1));
          break;
        case "Enter":
          if (count > 0 && onSelectRef.current) {
            e.preventDefault();
            onSelectRef.current(indexRef.current);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, count, move]);

  return { index, setIndex };
}
