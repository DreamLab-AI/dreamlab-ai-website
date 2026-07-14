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

  const state: {
    onReply: ((text: string) => void) | null;
    onError: (() => void) | null;
    instances: number;
  } = { onReply: null, onError: null, instances: 0 };

  class FakeDmSession {
    constructor(
      _relayUrl: string,
      _identity: unknown,
      opts: { onReply: (text: string) => void; onError?: () => void }
    ) {
      state.instances += 1;
      state.onReply = opts.onReply;
      state.onError = opts.onError ?? null;
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
    expect(h.sendQuestionMock).toHaveBeenCalledWith(
      "What workshops do you run?",
      JARVIS
    );
    // A subtle "connecting" system message is shown on first send.
    expect(screen.getByText(/connecting to the assistant/i)).toBeInTheDocument();
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
