import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mocks (must be set up before importing Contact) ---
// vi.mock factories are hoisted above all imports, so locals referenced inside
// them must be created via vi.hoisted to be hoisted alongside. We mock the
// dependency boundary (`@/lib/nostr`) — the enquiry form now submits over the
// NIP-17 end-to-end-encrypted gift-wrap ingress, not Supabase.
const {
  generateEphemeralIdentityMock,
  buildEnquiryRumorMock,
  wrapDmMock,
  publishGiftWrapMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  generateEphemeralIdentityMock: vi.fn(),
  buildEnquiryRumorMock: vi.fn(),
  wrapDmMock: vi.fn(),
  publishGiftWrapMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/nostr", () => ({
  generateEphemeralIdentity: generateEphemeralIdentityMock,
  buildEnquiryRumor: buildEnquiryRumorMock,
  wrapDm: wrapDmMock,
  publishGiftWrap: publishGiftWrapMock,
}));

// useOGMeta is a side-effect hook; stub it so we don't touch document head.
vi.mock("@/hooks/useOGMeta", () => ({
  useOGMeta: () => undefined,
  default: () => undefined,
}));

// og-meta config object — keep the import resolvable.
vi.mock("@/lib/og-meta", () => ({
  PAGE_OG_CONFIGS: { contact: {} },
  updateOGMetaTags: () => undefined,
}));

// Toast: Contact uses sonner's `toast`. Capture success/error invocations.
vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

// Header pulls in lots of route plumbing; replace with a stub.
vi.mock("@/components/Header", () => ({
  Header: () => null,
}));

const RELAY = "wss://relay.test.solitary-paper-764d.workers.dev";
const ADMIN = "6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a";
const ENQUIRY_CONTENT = "New enquiry from alice@example.com · training\n\n{...}";
const WRAP = { id: "wrap-id", kind: 1059 };

// Contact reads VITE_RELAY_URL / VITE_ADMIN_PUBKEY into module-level consts at
// import time, so we stub env, reset the module registry, then dynamically
// import the component AND @testing-library/react + react-router-dom from the
// SAME fresh registry (a different React instance than the component would break
// hooks). Auto-cleanup does not survive resetModules, so we unmount per test.
let activeCleanup: (() => void) | null = null;

async function mountContact(opts: { relay?: string; admin?: string } = {}) {
  vi.stubEnv("VITE_RELAY_URL", opts.relay ?? RELAY);
  vi.stubEnv("VITE_ADMIN_PUBKEY", opts.admin ?? ADMIN);
  vi.resetModules();

  const React = await import("react");
  const rtl = await import("@testing-library/react");
  const { BrowserRouter } = await import("react-router-dom");
  const Contact = (await import("../Contact")).default;

  rtl.render(
    React.createElement(BrowserRouter, null, React.createElement(Contact))
  );
  activeCleanup = rtl.cleanup;
  return { screen: rtl.screen, fireEvent: rtl.fireEvent, waitFor: rtl.waitFor };
}

type Screen = Awaited<ReturnType<typeof mountContact>>["screen"];
type FireEvent = Awaited<ReturnType<typeof mountContact>>["fireEvent"];

const fillValidForm = (screen: Screen, fireEvent: FireEvent) => {
  fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Alice Tester" } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@example.com" } });
  fireEvent.change(screen.getByLabelText(/project type/i), { target: { value: "training" } });
  fireEvent.change(screen.getByLabelText(/^message$/i), {
    target: { value: "We would like to enquire about a residential AI agent training cohort." },
  });
};

describe("Contact page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateEphemeralIdentityMock.mockReturnValue({ sk: new Uint8Array([1, 2, 3]), pk: "ephemeral-pk" });
    buildEnquiryRumorMock.mockReturnValue({ kind: 14, created_at: 0, content: ENQUIRY_CONTENT, tags: [] });
    wrapDmMock.mockReturnValue(WRAP);
    publishGiftWrapMock.mockResolvedValue({ ok: true, message: "accepted" });
  });

  afterEach(() => {
    activeCleanup?.();
    activeCleanup = null;
    vi.unstubAllEnvs();
  });

  it("shows Zod validation errors when submitting an empty form", async () => {
    const { screen, fireEvent } = await mountContact();

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/please select a project type/i)).toBeInTheDocument();
    expect(await screen.findByText(/message must be at least 10 characters/i)).toBeInTheDocument();

    expect(publishGiftWrapMock).not.toHaveBeenCalled();
  });

  it("shows an email-specific error for malformed addresses", async () => {
    const { screen, fireEvent } = await mountContact();

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Alice Tester" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText(/project type/i), { target: { value: "consultation" } });
    fireEvent.change(screen.getByLabelText(/^message$/i), {
      target: { value: "This is a sufficiently long enquiry message." },
    });

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(publishGiftWrapMock).not.toHaveBeenCalled();
  });

  it("publishes a NIP-17 gift wrap to the operator on valid submission", async () => {
    const { screen, fireEvent, waitFor } = await mountContact();

    fillValidForm(screen, fireEvent);
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(publishGiftWrapMock).toHaveBeenCalledTimes(1));

    // The form fields are threaded into the enquiry rumor.
    expect(buildEnquiryRumorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice Tester",
        email: "alice@example.com",
        engagementType: "training",
        message: expect.stringMatching(/residential AI agent training/i),
      })
    );
    // The rumor is wrapped to the configured admin pubkey with the enquiry subject.
    expect(wrapDmMock).toHaveBeenCalledWith(
      ENQUIRY_CONTENT,
      expect.any(Uint8Array),
      ADMIN,
      "DreamLab website enquiry"
    );
    // The wrap is published to the configured relay.
    expect(publishGiftWrapMock).toHaveBeenCalledWith(RELAY, WRAP, {
      authSk: new Uint8Array([1, 2, 3]),
    });
    // Success is reported only on the relay OK-true.
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("reports a failure (no false success) when the relay rejects the wrap", async () => {
    publishGiftWrapMock.mockResolvedValue({ ok: false, message: "not whitelisted" });
    const { screen, fireEvent, waitFor } = await mountContact();

    fillValidForm(screen, fireEvent);
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("disables the submit button while the publish is in flight", async () => {
    let resolvePublish: (v: { ok: boolean; message: string }) => void = () => undefined;
    publishGiftWrapMock.mockImplementation(
      () => new Promise((res) => { resolvePublish = res; })
    );

    const { screen, fireEvent, waitFor } = await mountContact();

    fillValidForm(screen, fireEvent);
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    // While in flight: button text becomes "Sending..." and is disabled.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });

    resolvePublish({ ok: true, message: "accepted" });
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  });

  it("renders the contact form with all required fields visible", async () => {
    const { screen } = await mountContact();
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
  });
});
