import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Recovery for pages left open (or cached) across a deploy.
 *
 * Every route is a separate, content-hashed script. A deploy replaces those
 * files, so a page loaded before it asks for a script that no longer exists
 * and the first click to another route fails with "Failed to fetch dynamically
 * imported module". Reloading fetches the current page and its current
 * scripts, so we do that once, automatically, instead of showing the error
 * page.
 */

const STORAGE_KEY = "dreamlab:chunk-reload-at";

/** A second failure within this window is not retried: the file is really gone. */
const RETRY_WINDOW_MS = 60_000;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

/** Whether `error` is a browser's failure to load a route's script or styles. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

interface ReloadDeps {
  store: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
  now: () => number;
}

/**
 * Reload the page, unless a reload for this reason happened within the last
 * minute. Returns whether a reload was started. If the attempt cannot be
 * recorded (storage blocked), no reload happens, because nothing would stop
 * it repeating.
 */
export function reloadOnceForStaleChunk(deps: ReloadDeps): boolean {
  try {
    const last = Number(deps.store.getItem(STORAGE_KEY));
    const now = deps.now();
    if (Number.isFinite(last) && last > 0 && now - last < RETRY_WINDOW_MS) {
      return false;
    }
    deps.store.setItem(STORAGE_KEY, String(now));
  } catch {
    return false;
  }
  deps.reload();
  return true;
}

/**
 * Run `load`. On a stale-chunk failure, call `onStale`; if it started a
 * reload, never settle (the page is going away), otherwise rethrow so the
 * error page shows. Any other error is rethrown untouched.
 */
export async function loadWithReload<T>(load: () => Promise<T>, onStale: () => boolean): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (isChunkLoadError(error) && onStale()) {
      return new Promise<T>(() => {});
    }
    throw error;
  }
}

/** `React.lazy`, reloading the page once if the route's script has been replaced by a deploy. */
// `any` matches React.lazy's own bound: a route component's props are its own.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    loadWithReload(load, () =>
      reloadOnceForStaleChunk({
        store: window.sessionStorage,
        reload: () => window.location.reload(),
        now: () => Date.now(),
      }),
    ),
  );
}
