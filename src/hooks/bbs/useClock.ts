/**
 * useClock — a ticking clock for the status bar and relative timestamps.
 * Returns the current Date, refreshed on the given interval (default 1s).
 */

import { useEffect, useState } from "react";

export function useClock(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
