import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";

/** Default hold before a press counts as "long". iOS raises its own callout at
 *  roughly 500 ms, so anything longer loses the race to the OS. */
export const LONG_PRESS_MS = 450;

/** Finger drift tolerated before the press is treated as a scroll and cancelled. */
const MOVE_TOLERANCE_PX = 10;

interface UseLongPressOptions {
  /** Called once the hold threshold is reached. */
  onLongPress: () => void;
  /** Called for an ordinary tap/click that was *not* preceded by a long press. */
  onClick?: () => void;
  /** Hold duration in ms; defaults to {@link LONG_PRESS_MS}. */
  threshold?: number;
}

/**
 * Distinguish a tap from a press-and-hold on one element using Pointer Events.
 *
 * Browsers fire `click` after every `pointerup`, including the one that ends a
 * long press, so a naive implementation runs both actions. The hook remembers
 * that a long press fired and swallows exactly that trailing click. The flag is
 * also reset on the next `pointerdown`, because some Android builds send no
 * click after a held touch and a stale flag would eat the next real tap.
 *
 * A scroll that starts on the element arrives as `pointercancel` (the browser
 * takes the touch) or as `pointermove` past a small tolerance; both cancel the
 * hold. `touch-action` is left at its default so the surrounding grid still
 * scrolls. The native `contextmenu` that mobile browsers raise on a held touch
 * is suppressed.
 *
 * `pressing` is true while the timer is running so callers can show feedback.
 */
export function useLongPress({ onLongPress, onClick, threshold = LONG_PRESS_MS }: UseLongPressOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const [pressing, setPressing] = useState(false);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
    setPressing(false);
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      // Only the primary button / first touch starts a hold. Environments
      // without PointerEvent (jsdom) leave `button` undefined; treat as primary.
      if (e.button > 0) return;
      firedRef.current = false;
      clear();
      // jsdom's synthetic pointer events may carry no coordinates.
      origin.current = { x: e.clientX || 0, y: e.clientY || 0 };
      setPressing(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        firedRef.current = true;
        setPressing(false);
        // Chrome blocks vibrate until the page has seen a user activation; a
        // bare touch pointerdown does not count, so check first to avoid a
        // console warning on the very first hold.
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.vibrate === "function" &&
          (navigator.userActivation?.hasBeenActive ?? true)
        ) {
          navigator.vibrate(10);
        }
        onLongPress();
      }, threshold);
    },
    [clear, onLongPress, threshold],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!origin.current || timer.current === null) return;
      const dx = (e.clientX || 0) - origin.current.x;
      const dy = (e.clientY || 0) - origin.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clear();
    },
    [clear],
  );

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (firedRef.current) {
        // This click is the tail of the long press just handled; drop it.
        firedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.();
    },
    [onClick],
  );

  const onContextMenu = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    e.preventDefault();
  }, []);

  return {
    pressing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
      onClick: handleClick,
      onContextMenu,
    },
  };
}
