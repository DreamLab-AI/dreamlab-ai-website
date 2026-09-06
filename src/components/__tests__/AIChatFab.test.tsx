import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";

// --- Mocks (must be set up before importing AIChatFab) ---
// vi.mock factories are hoisted above all imports; locals referenced inside them
// are created via vi.hoisted so they are hoisted alongside. `@/lib/nostr` is
// replaced with a controllable fake DmSession that captures the onReply/onError
// callbacks the component registers, so tests can drive replies and errors.
const h = vi.hoisted(() => {
  const connectMock = vi.fn<() => Promise<void>>();
  const sendQuestionMock = vi.fn<(text: string, recipientPk: string) => Promise<void>>();
  const closeMock = vi.fn<() => void>();
  const generateEphemeralIdentityMock = vi.fn();

  interface ReplyChannelStatus {
    healthy: string[];
    exhausted: string[];
    allDown: boolean;
  }

  const state: {
    onReply: ((text: string) => void) | null;
    onError: (() => void) | null;
    onReplyChannelStatus: ((status: ReplyChannelStatus) => void) | null;
    expectedSenderPk: string | null;
    instances: number;
  } = {
    onReply: null,
    onError: null,
    onReplyChannelStatus: null,
    expectedSenderPk: null,
    instances: 0,
  };

  class FakeDmSession {
    constructor(
      _relayUrl: string,
      _identity: unknown,
      opts: {
        onReply: (text: string) => void;
        onError?: () => void;
        onReplyChannelStatus?: (status: ReplyChannelStatus) => void;
        expectedSenderPk?: string;
      }
    ) {
      state.instances += 1;
      state.onReply = opts.onReply;
      state.onError = opts.onError ?? null;
      state.onReplyChannelStatus = opts.onReplyChannelStatus ?? null;
      state.expectedSenderPk = opts.expectedSenderPk ?? null;
    }
    connect(): Promise<void> {
      return connectMock();
    }
    sendQuestion(text: string, recipientPk: string): Promise<void> {
      return sendQuestionMock(text, recipientPk);
    }
    close(): void {
      closeMock();
    }
  }

  return {
    connectMock,
    sendQuestionMock,
    closeMock,
    generateEphemeralIdentityMock,
    state,
    FakeDmSession,
  };
});

vi.mock("@/lib/nostr", () => ({
  DmSession: h.FakeDmSession,
  generateEphemeralIdentity: h.generateEphemeralIdentityMock,
}));

const RELAY = "wss://relay.example.test";
const JARVIS = "2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9";
const REPLY_TIMEOUT_MS = 30000;
const SEND_COOLDOWN_MS = 3000;
const MAX_TURNS_PER_SESSION = 12;
const ONTOLOGY_LOOKUP_PREFIX =
  "Ontology lookup — deterministic public record. No model generation.";

// The component reads VITE_RELAY_URL / VITE_JARVIS_PUBKEY into module-level
// constants at import time, so env is stubbed and the module re-imported per
// test. React/RTL live in node_modules (externalised, not reset), so
// resetModules re-evaluates only the component graph — no duplicate React.
async function loadFab(env: { relay: string; jarvis: string }) {
  vi.resetModules();
  vi.stubEnv("VITE_RELAY_URL", env.relay);
  vi.stubEnv("VITE_JARVIS_PUBKEY", env.jarvis);
  const mod = await import("../AIChatFab");
  return mod.AIChatFab;
}

const openPanel = () =>
  fireEvent.click(screen.getByRole("button", { name: /talk to ai/i }));

const getInput = () => screen.getByPlaceholderText("Type a message...");

const clickSend = () =>
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));

const typeAndSend = (text: string) => {
  fireEvent.change(getInput(), { target: { value: text } });
  clickSend();
};

describe("AIChatFab", () => {
  beforeEach(() => {
    h.connectMock.mockReset();
    h.sendQuestionMock.mockReset();
    h.closeMock.mockReset();
    h.generateEphemeralIdentityMock.mockReset();
    h.state.onReply = null;
    h.state.onError = null;
    h.state.onReplyChannelStatus = null;
    h.state.expectedSenderPk = null;
    h.state.instances = 0;

    // Happy-path defaults: connect and publish both succeed.
    h.connectMock.mockResolvedValue(undefined);
    h.sendQuestionMock.mockResolvedValue(undefined);
    h.generateEphemeralIdentityMock.mockReturnValue({
      sk: new Uint8Array(32),
      pk: "sessionpubkey",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("opens the chat panel when the FAB is tapped", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);

    expect(
      screen.queryByRole("dialog", { name: /ai chat/i })
    ).not.toBeInTheDocument();

    openPanel();

    expect(screen.getByRole("dialog", { name: /ai chat/i })).toBeInTheDocument();
  });

  it("shows an offline message and opens no session when transport env is unset", async () => {
    const Fab = await loadFab({ relay: "", jarvis: "" });
    render(<Fab />);
    openPanel();

    typeAndSend("Are you there?");

    expect(
      await screen.findByText(/assistant is temporarily offline/i)
    ).toBeInTheDocument();
    expect(h.state.instances).toBe(0);
    expect(h.connectMock).not.toHaveBeenCalled();
  });

  it("creates a session, connects, and DMs the question to junkiejarvis on first send", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);
    openPanel();

    typeAndSend("What workshops do you run?");

    await waitFor(() => expect(h.sendQuestionMock).toHaveBeenCalledTimes(1));
    expect(h.state.instances).toBe(1);
    expect(h.connectMock).toHaveBeenCalledTimes(1);

    // The payload is the correlation envelope (ADR-2008): a request-id header
    // the reply must echo, the tier as an explicitly UNVERIFIED hint, then the
    // question verbatim.
    const [payload, recipient] = h.sendQuestionMock.mock.calls[0];
    expect(recipient).toBe(JARVIS);
    expect(payload).toMatch(/^X-DreamLab-Request: [0-9a-f]{16}$/m);
    expect(payload).toContain("X-DreamLab-Tier-Hint: 1 (client-asserted, UNVERIFIED");
    expect(payload.endsWith("What workshops do you run?")).toBe(true);
    // No NIP-07 key is connected, so no identity hint is transmitted.
    expect(payload).not.toContain("X-DreamLab-Identity-Hint");

    // A subtle "connecting" system message is shown on first send.
    expect(screen.getByText(/connecting to the assistant/i)).toBeInTheDocument();
  });

  /** The request id the component minted for the Nth send. */
  const requestIdOf = (call = 0): string => {
    const payload = h.sendQuestionMock.mock.calls[call][0] as string;
    const id = payload.match(/^X-DreamLab-Request: ([0-9a-f]{16})$/m)?.[1];
    if (!id) throw new Error(`no request id in payload: ${payload}`);
    return id;
  };

  /** A reply that echoes a request id, as a correlating agent would send. */
  const correlatedReply = (requestId: string, body: string) =>
    `X-DreamLab-Request: ${requestId}\n\n${body}`;

  it("resolves the turn a correlated reply names", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);
    openPanel();
    typeAndSend("What is a pod?");
    await waitFor(() => expect(h.sendQuestionMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      h.state.onReply?.(correlatedReply(requestIdOf(0), "A pod is your own storage."));
    });

    // The body renders; the wire header never reaches the user.
    expect(screen.getByText("A pod is your own storage.")).toBeInTheDocument();
    expect(screen.queryByText(/X-DreamLab-Request/)).not.toBeInTheDocument();
  });

  it("drops a reply correlated to a request this session never made", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);
    openPanel();
    typeAndSend("Anyone home?");
    await waitFor(() => expect(h.sendQuestionMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      // A wrap replayed from an open relay's history, addressed to a request id
      // from some other session. It must not render and must not resolve.
      h.state.onReply?.(correlatedReply("00000000deadbeef", "Buy cheap crypto now"));
    });

    expect(screen.queryByText(/buy cheap crypto/i)).not.toBeInTheDocument();
    expect(getInput()).toBeDisabled(); // the real turn is still outstanding
  });

  it("does not let a late reply resolve a newer question", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    // Turn A is sent and allowed to time out.
    typeAndSend("Question A");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const idA = requestIdOf(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPLY_TIMEOUT_MS);
    });
    expect(screen.getByText(/could not reach the assistant/i)).toBeInTheDocument();

    // Cooldown elapses; the user asks B.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    typeAndSend("Question B");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.sendQuestionMock).toHaveBeenCalledTimes(2);

    // A's answer finally arrives. It must render as a LATE answer to A, and
    // must leave B outstanding rather than closing it.
    await act(async () => {
      h.state.onReply?.(correlatedReply(idA, "The answer to A."));
    });

    expect(screen.getByText("The answer to A.")).toBeInTheDocument();
    expect(screen.getByText(/late answer to your earlier question/i)).toBeInTheDocument();
    expect(getInput()).toBeDisabled(); // B is still pending

    // B's own answer resolves B.
    await act(async () => {
      h.state.onReply?.(correlatedReply(requestIdOf(1), "The answer to B."));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    expect(getInput()).not.toBeDisabled();
  });

  it("transmits a connected NIP-07 pubkey as an unverified hint, not authority", async () => {
    const pk = "a".repeat(64);
    (window as unknown as { nostr?: unknown }).nostr = {
      getPublicKey: () => Promise.resolve(pk),
    };
    try {
      const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
      render(<Fab />);
      openPanel();

      // Raise the tier, which prompts for the NIP-07 identity.
      fireEvent.click(screen.getByRole("button", { name: /change ai tier/i }));
      fireEvent.click(screen.getByText("Tier 2"));
      await screen.findByText(/signed in as/i);

      typeAndSend("What can you see?");
      await waitFor(() => expect(h.sendQuestionMock).toHaveBeenCalledTimes(1));

      const payload = h.sendQuestionMock.mock.calls[0][0] as string;
      expect(payload).toContain(`X-DreamLab-Identity-Hint: ${pk}`);
      expect(payload).toContain("no proof of possession");
      expect(payload).toContain("X-DreamLab-Tier-Hint: 2 (client-asserted, UNVERIFIED");
      // The client never claims the tier is granted or verified.
      expect(payload).not.toMatch(/authoris|entitled|granted/i);
    } finally {
      delete (window as unknown as { nostr?: unknown }).nostr;
    }
  });

  it("warns once when every reply relay has given up", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);
    openPanel();
    typeAndSend("Hello?");
    await waitFor(() => expect(h.sendQuestionMock).toHaveBeenCalled());

    await act(async () => {
      h.state.onReplyChannelStatus?.({
        healthy: [],
        exhausted: ["wss://a.test", "wss://b.test"],
        allDown: true,
      });
    });
    expect(await screen.findByText(/no answer will arrive here/i)).toBeInTheDocument();

    // A repeated status must not spam the transcript.
    await act(async () => {
      h.state.onReplyChannelStatus?.({
        healthy: [],
        exhausted: ["wss://a.test", "wss://b.test"],
        allDown: true,
      });
    });
    expect(screen.getAllByText(/no answer will arrive here/i)).toHaveLength(1);
  });

  it("keeps the input disabled while a reply is outstanding", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);
    openPanel();

    typeAndSend("Hello there");

    // Publish OK resolved but the agent reply has not arrived → still loading.
    await waitFor(() => expect(h.sendQuestionMock).toHaveBeenCalled());
    await waitFor(() => expect(getInput()).toBeDisabled());
  });

  it("renders the agent reply, applies the send cooldown, then re-enables input", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    typeAndSend("Hi");

    // Flush the connect + publish microtasks.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.sendQuestionMock).toHaveBeenCalled();

    act(() => {
      h.state.onReply?.("We run residential AI training cohorts.");
    });

    expect(
      screen.getByText(/residential AI training cohorts/i)
    ).toBeInTheDocument();

    // The resolved turn opens a short cooldown window before the next send.
    expect(screen.getByPlaceholderText("One moment…")).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    expect(getInput()).not.toBeDisabled();
  });

  it("offers an explicit AI interpretation action for ontology lookup replies", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    typeAndSend("what is AI governance?");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      h.state.onReply?.(
        `${ONTOLOGY_LOOKUP_PREFIX}\n\nSource: urn:ngm:class:ai-governance\n\nAI Governance is the oversight of AI systems.`
      );
    });

    const interpret = screen.getByRole("button", { name: /interpret with ai/i });
    expect(interpret).toBeDisabled(); // post-reply cooldown still applies

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    expect(interpret).not.toBeDisabled();

    fireEvent.click(interpret);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(h.sendQuestionMock).toHaveBeenCalledTimes(2);
    expect(h.sendQuestionMock.mock.calls[1][0]).toContain("Interpret with AI");
    expect(h.sendQuestionMock.mock.calls[1][0]).toContain("what is AI governance?");
    expect(h.sendQuestionMock.mock.calls[1][1]).toBe(JARVIS);
  });

  it("shows a delivery-failure message and re-enables input after the cooldown when the send is rejected", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    h.sendQuestionMock.mockRejectedValueOnce(
      new Error("blocked: rate limited")
    );
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    typeAndSend("Hi");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      screen.getByText(/message couldn't be delivered/i)
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText("One moment…")).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    expect(getInput()).not.toBeDisabled();
  });

  it("surfaces a connect-failure system message and tears the session down", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    h.connectMock.mockRejectedValueOnce(new Error("AUTH timeout"));
    render(<Fab />);
    openPanel();

    typeAndSend("Hi");

    expect(
      await screen.findByText(/couldn't reach the assistant just now/i)
    ).toBeInTheDocument();
    expect(h.closeMock).toHaveBeenCalled();
    expect(h.sendQuestionMock).not.toHaveBeenCalled();
    await waitFor(() => expect(getInput()).not.toBeDisabled());
  });

  it("renders a fallback and re-enables input after the 30s reply timeout", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    typeAndSend("Hello");

    // Flush the connect + publish microtasks so the reply timer is armed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.sendQuestionMock).toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPLY_TIMEOUT_MS);
    });

    expect(
      screen.getByText(/could not reach the assistant just now/i)
    ).toBeInTheDocument();
    // Timeout resolution also opens the cooldown window.
    expect(screen.getByPlaceholderText("One moment…")).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    expect(getInput()).not.toBeDisabled();
  });

  it("still renders a reply that lands after the timeout without double-resolving", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    typeAndSend("Hello");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPLY_TIMEOUT_MS);
    });

    // Fallback rendered once.
    expect(
      screen.getAllByText(/could not reach the assistant just now/i)
    ).toHaveLength(1);

    // A late reply still renders and does not fire a second fallback.
    act(() => {
      h.state.onReply?.("Actually, here is your answer.");
    });
    expect(screen.getByText(/here is your answer/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/could not reach the assistant just now/i)
    ).toHaveLength(1);
    // Past the post-timeout cooldown, input is usable again.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
    });
    expect(getInput()).not.toBeDisabled();
  });

  it("caps transported turns per session and directs overflow to the contact page", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    vi.useFakeTimers();
    render(<Fab />);
    openPanel();

    for (let i = 0; i < MAX_TURNS_PER_SESSION; i++) {
      typeAndSend(`question ${i + 1}`);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      act(() => {
        h.state.onReply?.(`answer ${i + 1}`);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEND_COOLDOWN_MS);
      });
    }
    expect(h.sendQuestionMock).toHaveBeenCalledTimes(MAX_TURNS_PER_SESSION);

    typeAndSend("one more?");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText(/message limit/i)).toBeInTheDocument();
    expect(h.sendQuestionMock).toHaveBeenCalledTimes(MAX_TURNS_PER_SESSION);
  });

  it("closes the DM session when the panel is closed", async () => {
    const Fab = await loadFab({ relay: RELAY, jarvis: JARVIS });
    render(<Fab />);
    openPanel();

    typeAndSend("Hi");
    await waitFor(() => expect(h.state.instances).toBe(1));

    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));

    await waitFor(() => expect(h.closeMock).toHaveBeenCalled());
  });
});
