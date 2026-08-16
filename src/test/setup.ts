// Sprint v9 STREAM-E3: vitest setup file.
// Registers @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
// for use in all test files via the global `expect`.
import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia. Components branch on useIsMobile /
// useIsMobileSync (which read it during render), so tests need a stub. Default
// matches:false → components render their desktop tree under test, which is what
// the page tests assert against.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
