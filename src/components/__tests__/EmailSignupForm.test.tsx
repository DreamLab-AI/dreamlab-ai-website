import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Radix Checkbox mounts an effect that reads element size via ResizeObserver,
// which jsdom does not implement. Provide a no-op polyfill for this test file.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// --- Mocks (must be set up before importing EmailSignupForm) ---
// vi.mock factories are hoisted above all imports, so locals referenced inside
// them must be created via vi.hoisted to be hoisted alongside. We mock the
// dependency boundary (`@/lib/nostr`) rather than the raw WebSocket, mirroring
// the Contact test's approach of mocking `@/lib/supabase`.
const {
  generateEphemeralIdentityMock,
  buildContactRumorMock,
  wrapDmMock,
  publishGiftWrapMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  generateEphemeralIdentityMock: vi.fn(),
  buildContactRumorMock: vi.fn(),
  wrapDmMock: vi.fn(),
  publishGiftWrapMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/nostr", () => ({
  generateEphemeralIdentity: generateEphemeralIdentityMock,
  buildContactRumor: buildContactRumorMock,
  wrapDm: wrapDmMock,
  publishGiftWrap: publishGiftWrapMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

const RELAY = "wss://relay.test.solitary-paper-764d.workers.dev";
const ADMIN = "6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a";

const WRAP = { id: "wrap-id", kind: 1059 };

// EmailSignupForm reads VITE_RELAY_URL / VITE_ADMIN_PUBKEY into module-level
// consts at import time, so each env permutation needs a fresh module eval.
// We stub env, reset the module registry, then dynamically import the component
// AND @testing-library/react from the SAME fresh registry (importing render
// from a different React instance than the component would break hooks).
// Auto-cleanup does not survive the resetModules boundary (each fresh rtl
// instance only tracks its own renders), so we unmount explicitly per test.
let activeCleanup: (() => void) | null = null;

async function mountForm(
  opts: { relay?: string; admin?: string } = {},
): Promise<{
  screen: typeof import("@testing-library/react")["screen"];
  fireEvent: typeof import("@testing-library/react")["fireEvent"];
  waitFor: typeof import("@testing-library/react")["waitFor"];
}> {
  vi.stubEnv("VITE_RELAY_URL", opts.relay ?? RELAY);
  vi.stubEnv("VITE_ADMIN_PUBKEY", opts.admin ?? ADMIN);
  vi.resetModules();

  const React = await import("react");
  const rtl = await import("@testing-library/react");
  const { EmailSignupForm } = await import("../EmailSignupForm");

  rtl.render(React.createElement(EmailSignupForm));
  activeCleanup = rtl.cleanup;
  return { screen: rtl.screen, fireEvent: rtl.fireEvent, waitFor: rtl.waitFor };
}

type Screen = Awaited<ReturnType<typeof mountForm>>["screen"];
type FireEvent = Awaited<ReturnType<typeof mountForm>>["fireEvent"];

const emailInput = (screen: Screen): HTMLInputElement =>
  screen.getByLabelText(/email address/i) as HTMLInputElement;
const nameInput = (screen: Screen): HTMLInputElement =>
  screen.getByLabelText(/name \(optional\)/i) as HTMLInputElement;
const consentBox = (screen: Screen): HTMLElement => screen.getByRole("checkbox");
const submitButton = (screen: Screen): HTMLElement =>
  screen.getByRole("button", { name: /sign up/i });

const typeEmail = (screen: Screen, fireEvent: FireEvent, value: string): void => {
  fireEvent.change(emailInput(screen), { target: { value } });
};
const typeName = (screen: Screen, fireEvent: FireEvent, value: string): void => {
  fireEvent.change(nameInput(screen), { target: { value } });
};

describe("EmailSignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateEphemeralIdentityMock.mockReturnValue({
      sk: new Uint8Array([1, 2, 3]),
      pk: "ephemeral-pk",
    });
    buildContactRumorMock.mockReturnValue({
      kind: 14,
      created_at: 0,
      content: "New website signup from alice@example.com\n\n{...}",
      tags: [],
    });
    wrapDmMock.mockReturnValue(WRAP);
    publishGiftWrapMock.mockResolvedValue({ ok: true, message: "accepted" });
  });

  afterEach(() => {
    activeCleanup?.();
    activeCleanup = null;
    vi.unstubAllEnvs();
  });

  it("renders the signup form with all fields visible", async () => {
    const { screen } = await mountForm();
    expect(nameInput(screen)).toBeInTheDocument();
    expect(emailInput(screen)).toBeInTheDocument();
    expect(consentBox(screen)).toBeInTheDocument();
    expect(submitButton(screen)).toBeInTheDocument();
  });

  it("blocks submission with a toast when the email is invalid", async () => {
    const { screen, fireEvent } = await mountForm();

    // `user@host` passes the input's native type=email check (no dot required)
    // but fails our stricter isValidEmail regex, so it reaches the JS guard
    // instead of being suppressed by HTML5 constraint validation.
    typeEmail(screen, fireEvent, "user@host");
    fireEvent.click(consentBox(screen));
    fireEvent.click(submitButton(screen));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Please enter a valid email address",
    );
    expect(publishGiftWrapMock).not.toHaveBeenCalled();
    expect(generateEphemeralIdentityMock).not.toHaveBeenCalled();
  });

  it("blocks submission with a toast when consent is not given", async () => {
    const { screen, fireEvent } = await mountForm();

    typeEmail(screen, fireEvent, "alice@example.com");
    // Consent left unchecked.
    fireEvent.click(submitButton(screen));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Please accept our privacy policy to sign up",
    );
    expect(publishGiftWrapMock).not.toHaveBeenCalled();
    expect(generateEphemeralIdentityMock).not.toHaveBeenCalled();
  });

  it("shows the unavailable toast and never publishes when env is unset", async () => {
    const { screen, fireEvent } = await mountForm({ relay: "", admin: "" });

    typeEmail(screen, fireEvent, "alice@example.com");
    fireEvent.click(consentBox(screen));
    fireEvent.click(submitButton(screen));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Service temporarily unavailable. Please try again later.",
    );
    expect(generateEphemeralIdentityMock).not.toHaveBeenCalled();
    expect(wrapDmMock).not.toHaveBeenCalled();
    expect(publishGiftWrapMock).not.toHaveBeenCalled();
  });

  it("wraps a DM to the admin, publishes it, shows success and clears fields", async () => {
    const { screen, fireEvent, waitFor } = await mountForm();

    typeName(screen, fireEvent, "Alice Tester");
    typeEmail(screen, fireEvent, "alice@example.com");
    fireEvent.click(consentBox(screen));
    fireEvent.click(submitButton(screen));

    await waitFor(() => expect(publishGiftWrapMock).toHaveBeenCalledTimes(1));

    // buildContactRumor receives the normalised payload for this feature.
    expect(buildContactRumorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice Tester",
        email: "alice@example.com",
        hasConsent: true,
        source: "website_signup_form",
      }),
    );

    // wrapDm targets the admin recipient with the signup subject.
    const wrapArgs = wrapDmMock.mock.calls[0];
    expect(wrapArgs[2]).toBe(ADMIN);
    expect(wrapArgs[3]).toBe("DreamLab website signup");

    // publishGiftWrap uses the configured relay and the produced wrap.
    expect(publishGiftWrapMock).toHaveBeenCalledWith(RELAY, WRAP);

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Thanks for signing up! We'll be in touch soon.",
      ),
    );

    // Fields are cleared on success.
    await waitFor(() => expect(emailInput(screen).value).toBe(""));
    expect(nameInput(screen).value).toBe("");
  });

  it("shows an error toast and retains fields when the relay returns OK-false", async () => {
    publishGiftWrapMock.mockResolvedValue({
      ok: false,
      message: "blocked: gift-wrap recipient not whitelisted",
    });

    const { screen, fireEvent, waitFor } = await mountForm();

    typeEmail(screen, fireEvent, "alice@example.com");
    fireEvent.click(consentBox(screen));
    fireEvent.click(submitButton(screen));

    await waitFor(() => expect(publishGiftWrapMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Failed to sign up. Please try again later.",
      ),
    );

    expect(toastSuccessMock).not.toHaveBeenCalled();
    // Fields retained so the visitor can retry without re-typing.
    expect(emailInput(screen).value).toBe("alice@example.com");
  });

  it("shows an error toast when publishing rejects", async () => {
    publishGiftWrapMock.mockRejectedValue(new Error("transport failure"));

    const { screen, fireEvent, waitFor } = await mountForm();

    typeEmail(screen, fireEvent, "alice@example.com");
    fireEvent.click(consentBox(screen));
    fireEvent.click(submitButton(screen));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Failed to sign up. Please try again later.",
      ),
    );
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(emailInput(screen).value).toBe("alice@example.com");
  });
});
