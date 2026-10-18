import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Team from "../Team";
import { LONG_PRESS_MS } from "@/hooks/useLongPress";

// Header and OG meta pull in route plumbing and document-head side effects we
// don't need here.
vi.mock("@/components/Header", () => ({ Header: () => null }));
vi.mock("@/hooks/useOGMeta", () => ({ useOGMeta: () => undefined, default: () => undefined }));
vi.mock("@/lib/og-meta", () => ({ PAGE_OG_CONFIGS: { team: {} }, updateOGMetaTags: () => undefined }));

const MEMBERS = [
  {
    id: "01",
    imageSrc: "/images/team/01.webp",
    headline: "Ada Lovelace, Analytical engines",
    fullDetails: "First programmer.\n\nWrote the notes on the Analytical Engine.",
  },
  {
    id: "02",
    imageSrc: "/images/team/02.webp",
    headline: "Grace Hopper - Compilers",
    fullDetails: "Built the first compiler.",
  },
];

// src/test/setup.ts installs a matchMedia stub that reports matches:false, and
// useIsMobileSync reads it in a lazy initialiser on first render, so the mobile
// branch needs a stub that says "narrow" *before* render.
const originalMatchMedia = window.matchMedia;

// jsdom ships no PointerEvent. Without it, testing-library falls back to a bare
// Event and drops button/clientX/clientY, so the hook's scroll-cancel path can't
// be exercised. Browsers derive PointerEvent from MouseEvent; mirror that.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "touch";
    }
  }
  (window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill;
}

function stubMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function mount() {
  // Team still kicks off its manifest fetch on mount; fail it quietly so the
  // initialMembers we passed stay in place.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Team initialMembers={MEMBERS} />
    </BrowserRouter>,
  );
}

function longPress(el: HTMLElement) {
  fireEvent.pointerDown(el, { button: 0, clientX: 10, clientY: 10 });
  act(() => {
    vi.advanceTimersByTime(LONG_PRESS_MS);
  });
  fireEvent.pointerUp(el);
  // Browsers follow pointerup with a click; the hook must swallow this one.
  fireEvent.click(el);
}

describe("Team page (mobile)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMatchMedia(true);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.matchMedia = originalMatchMedia;
  });

  it("renders the mobile grid with the gesture hint", () => {
    mount();
    expect(screen.getByText(/Press and hold to add them to your roster/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Read about Ada Lovelace/ })).toBeInTheDocument();
    expect(screen.getByText("0 specialists selected")).toBeInTheDocument();
  });

  it("tap opens the member's details without adding them to the roster", () => {
    mount();
    const card = screen.getByRole("button", { name: /Read about Ada Lovelace/ });
    fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(card);
    fireEvent.click(card);

    expect(screen.getByText("Wrote the notes on the Analytical Engine.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to roster/ })).toBeInTheDocument();
    expect(screen.getByText("0 specialists selected")).toBeInTheDocument();
  });

  it("closing the drawer returns focus to the card", () => {
    mount();
    const card = screen.getByRole("button", { name: /Read about Ada Lovelace/ });
    card.focus();
    fireEvent.click(card);
    expect(screen.getByText("Wrote the notes on the Analytical Engine.")).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(card).toHaveFocus();
  });

  it("the drawer's roster button adds and removes the member", () => {
    mount();
    const card = screen.getByRole("button", { name: /Read about Grace Hopper/ });
    fireEvent.click(card);

    const add = screen.getByRole("button", { name: /Add to roster/ });
    fireEvent.click(add);
    expect(screen.getByText("1 specialist selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove from roster/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Remove from roster/ }));
    expect(screen.getByText("0 specialists selected")).toBeInTheDocument();
  });

  it("press and hold toggles the roster and does not open the details", () => {
    mount();
    const card = screen.getByRole("button", { name: /Read about Ada Lovelace/ });

    longPress(card);
    expect(screen.getByText("1 specialist selected")).toBeInTheDocument();
    expect(screen.queryByText("Wrote the notes on the Analytical Engine.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Read about Ada Lovelace, on your roster/ })).toBeInTheDocument();

    longPress(card);
    expect(screen.getByText("0 specialists selected")).toBeInTheDocument();
  });

  it("a press that turns into a scroll does not toggle the roster", () => {
    mount();
    const card = screen.getByRole("button", { name: /Read about Ada Lovelace/ });
    fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(card, { clientX: 10, clientY: 60 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    });
    fireEvent.pointerCancel(card);
    expect(screen.getByText("0 specialists selected")).toBeInTheDocument();
  });

  it("the enquire bar is enabled once someone is on the roster and carries their names", () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, set href(v: string) { assign(v); } },
    });
    try {
      mount();
      const enquire = screen.getByRole("button", { name: "Enquire" });
      expect(enquire).toBeDisabled();

      longPress(screen.getByRole("button", { name: /Read about Grace Hopper/ }));
      expect(enquire).toBeEnabled();
      fireEvent.click(enquire);
      expect(assign).toHaveBeenCalledWith(
        `/contact?team=${encodeURIComponent("Grace Hopper - Compilers")}`,
      );
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});
