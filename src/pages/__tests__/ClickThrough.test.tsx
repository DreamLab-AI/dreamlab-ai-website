import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// The page submits over the same NIP-17 gift-wrap ingress as /contact; mock
// that boundary and assert on what crosses it.
const {
  generateEphemeralIdentityMock,
  buildEnquiryRumorMock,
  wrapDmMock,
  publishGiftWrapMock,
  publishMonitorCopyMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  generateEphemeralIdentityMock: vi.fn(),
  buildEnquiryRumorMock: vi.fn(),
  wrapDmMock: vi.fn(),
  publishGiftWrapMock: vi.fn(),
  publishMonitorCopyMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/nostr", () => ({
  generateEphemeralIdentity: generateEphemeralIdentityMock,
  buildEnquiryRumor: buildEnquiryRumorMock,
  wrapDm: wrapDmMock,
  publishGiftWrap: publishGiftWrapMock,
  publishMonitorCopy: publishMonitorCopyMock,
}));

vi.mock("@/hooks/useOGMeta", () => ({
  useOGMeta: () => undefined,
  default: () => undefined,
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

import ClickThrough, {
  CLICKTHROUGH_ENGAGEMENT_TYPE,
  CLICKTHROUGH_ENQUIRY_SUBJECT,
  CLICKTHROUGH_SOURCE,
} from "../ClickThrough";
import { SITE_FACTS } from "@/data/site-facts";

const RELAY = "wss://relay.test.solitary-paper-764d.workers.dev";
const ADMIN = "6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a";
const MONITOR = "4ed429aa7f30d6e63c41be50685cffeb03cd7b07e37d37a0c4ae5321e642aad7";
const SK = new Uint8Array(32).fill(7);
const RUMOR = { kind: 14, created_at: 1, content: "New enquiry …", tags: [] };
const WRAP = { id: "wrap-id", kind: 1059 };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/clickthrough"]}>
      <ClickThrough />
    </MemoryRouter>,
  );

const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/your name/i), "Alice Example");
  await user.type(screen.getByLabelText(/company/i), "Example Ltd");
  await user.type(screen.getByLabelText(/work email/i), "Alice@Example.com");
  await user.selectOptions(screen.getByLabelText(/how many people/i), "3–4");
  await user.type(
    screen.getByLabelText(/what should ai do/i),
    "Automate our quoting process end to end.",
  );
};

describe("ClickThrough landing page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_RELAY_URL", RELAY);
    vi.stubEnv("VITE_ADMIN_PUBKEY", ADMIN);
    vi.stubEnv("VITE_MONITOR_PUBKEY", MONITOR);
    generateEphemeralIdentityMock.mockReturnValue({ sk: SK, pk: "pk" });
    buildEnquiryRumorMock.mockReturnValue(RUMOR);
    wrapDmMock.mockReturnValue(WRAP);
    publishGiftWrapMock.mockResolvedValue({ ok: true, message: "" });
    publishMonitorCopyMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    document.head.querySelector('meta[name="robots"]')?.remove();
  });

  it("names both companies and states the site's own pricing figures", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AI training/);
    expect(screen.getAllByText(/Click Through/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DreamLab/).length).toBeGreaterThan(0);
    expect(screen.getByText(`From ${SITE_FACTS.priceResidentialFrom}`)).toBeInTheDocument();
    expect(screen.getByText(`From ${SITE_FACTS.priceSprintFrom}`)).toBeInTheDocument();
    expect(screen.getByText(SITE_FACTS.pricingNote)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01609 590035/ })).toHaveAttribute("href", "tel:01609590035");
  });

  it("marks itself noindex so the QR-only page stays out of search", async () => {
    renderPage();
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "noindex, nofollow",
      );
    });
  });

  it("sends a partner-tagged enquiry over the gift-wrap ingress and resets on OK", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send enquiry/i }));

    await waitFor(() => expect(publishGiftWrapMock).toHaveBeenCalledTimes(1));

    const params = buildEnquiryRumorMock.mock.calls[0][0];
    expect(params).toMatchObject({
      name: "Alice Example",
      email: "Alice@Example.com",
      engagementType: CLICKTHROUGH_ENGAGEMENT_TYPE,
      source: CLICKTHROUGH_SOURCE,
      hasConsent: true,
    });
    expect(params.teamMembers).toContain("Click Through");
    expect(params.teamMembers).toContain("Example Ltd");
    expect(params.teamMembers).toContain("3–4");

    expect(wrapDmMock).toHaveBeenCalledWith(RUMOR.content, SK, ADMIN, CLICKTHROUGH_ENQUIRY_SUBJECT);
    expect(publishGiftWrapMock).toHaveBeenCalledWith(RELAY, WRAP, { authSk: SK });
    expect(publishMonitorCopyMock).toHaveBeenCalledWith(
      RELAY, RUMOR.content, SK, MONITOR, ADMIN, CLICKTHROUGH_ENQUIRY_SUBJECT,
    );
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText(/your name/i)).toHaveValue(""));
  });

  it("shows an error and keeps the form when the relay rejects the wrap", async () => {
    publishGiftWrapMock.mockResolvedValue({ ok: false, message: "blocked: not whitelisted" });
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send enquiry/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(publishMonitorCopyMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Alice Example");
    // The relay's reason must never surface to the visitor.
    expect(toastErrorMock.mock.calls[0][0]).not.toMatch(/whitelist/);
  });

  it("does not publish anything when a required field is missing", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /send enquiry/i }));
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(publishGiftWrapMock).not.toHaveBeenCalled();
  });

  it("degrades gracefully when the ingress is not configured", async () => {
    vi.stubEnv("VITE_RELAY_URL", "");
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send enquiry/i }));
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
    expect(publishGiftWrapMock).not.toHaveBeenCalled();
  });
});
