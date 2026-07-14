import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, ChevronUp } from "lucide-react";
import { DmSession, generateEphemeralIdentity } from "@/lib/nostr";
import { MAX_MESSAGE_LEN } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

type Tier = 0 | 1 | 2 | 3;

const TIER_CONFIG: Record<Tier, { label: string; color: string; dot: string; desc: string }> = {
  0: { label: "Off",    color: "text-muted-foreground/60", dot: "bg-muted-foreground/40", desc: "AI paused" },
  1: { label: "Basic",  color: "text-cyan-400",            dot: "bg-cyan-400",            desc: "General Q&A" },
  2: { label: "Pro",    color: "text-purple-400",          dot: "bg-purple-400",          desc: "Context + memory" },
  3: { label: "Full",   color: "text-amber-400",           dot: "bg-amber-400",           desc: "VisionFlow graph" },
};

// Transport config (ADR-042). The chat rides a client-side Nostr DM conversation
// with the junkiejarvis agent: the browser gift-wraps kind-14 rumors to
// VITE_JARVIS_PUBKEY and publishes the kind-1059 wrap directly to VITE_RELAY_URL.
// If either is unset the panel degrades to an offline message (mirroring the
// EmailSignupForm `!supabase` guard) rather than silently failing.
const RELAY_URL = import.meta.env.VITE_RELAY_URL || "";
const JARVIS_PUBKEY = import.meta.env.VITE_JARVIS_PUBKEY || "";

// Reply listeners (ADR-042 amendment). The primary relay's whitelist gate
// rejects any kind-1059 addressed to the session's ephemeral key, so the
// agent's reply is only readable from the open relays it also publishes to
// (the agent-side NOSTR_RELAYS fan-out). Must stay a subset of that fan-out.
const REPLY_RELAYS = (
  import.meta.env.VITE_REPLY_RELAYS || "wss://relay.damus.io,wss://relay.primal.net"
)
  .split(",")
  .map((url: string) => url.trim())
  .filter(Boolean);

// DM replies carry no e-tag correlation (junkiejarvis `_sendDm`), so sends are
// serialised — one in-flight question at a time. The client waits at most 30 s
// for a reply (above the agent's 25 s fail-open LLM timeout) before showing a
// friendly fallback and re-enabling input (ADR-042 Decision 5).
const REPLY_TIMEOUT_MS = 30000;

// Abuse throttles (ADR-042 amendment): the relay rate-limits per IP but not
// per pubkey, and fresh ephemeral keys are free — so the client enforces a
// short cooldown after each resolved turn and a hard per-session turn cap.
const SEND_COOLDOWN_MS = 3000;
const MAX_TURNS_PER_SESSION = 12;

// User-facing copy (UK English).
const OFFLINE_MESSAGE =
  "The assistant is temporarily offline. Please reach us via the contact page and we'll get back to you soon.";
const CONNECTING_MESSAGE = "Connecting to the assistant…";
const CONNECT_FAILURE_MESSAGE =
  "Couldn't reach the assistant just now. Please try again in a moment, or use the contact page.";
const SEND_FAILURE_MESSAGE =
  "Sorry — your message couldn't be delivered. Please try again in a moment.";
const REPLY_TIMEOUT_MESSAGE =
  "Sorry — I could not reach the assistant just now. Please try again in a moment.";
const SESSION_INTERRUPTED_MESSAGE =
  "Connection to the assistant was interrupted. Send your message again to reconnect.";
const TURN_LIMIT_MESSAGE =
  "You've reached this chat's message limit. Please use the contact page for anything more — or close and reopen the chat to start afresh.";

// Minimal NIP-07 signer surface (nos2x, Alby, etc.). Retained purely as a tier
// 2/3 identity signal (the greeting shows the user's pubkey); DMs always ride
// the ephemeral session key, never the NIP-07 key (ADR-042 Decision 2).
interface Nip07 {
  getPublicKey: () => Promise<string>;
}

const getNostr = (): Nip07 | undefined =>
  (window as unknown as { nostr?: Nip07 }).nostr;

// Monotonic id source so rapidly appended messages never collide on React keys.
let msgSeq = 0;
const nextMsgId = (role: string): string => `${role}_${Date.now()}_${msgSeq++}`;

export const AIChatFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tier, setTier] = useState<Tier>(1);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [showTierMenu, setShowTierMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tierMenuRef = useRef<HTMLDivElement>(null);

  // Warm DM session for the open panel. Created lazily on first send and reused
  // until the panel closes or the component unmounts.
  const sessionRef = useRef<DmSession | null>(null);
  const connectedRef = useRef(false);
  // A turn is "pending" between publishing a question and resolving it (reply,
  // timeout, or failure). Guards against double resolution of a single turn.
  const pendingRef = useRef(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Abuse throttles: a short cooldown after each resolved turn, and a hard cap
  // on transported turns per panel-open session (reset when the panel closes).
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnsRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close tier menu on outside click
  useEffect(() => {
    if (!showTierMenu) return;
    const handler = (e: MouseEvent) => {
      if (tierMenuRef.current && !tierMenuRef.current.contains(e.target as Node)) {
        setShowTierMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTierMenu]);

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  }, []);

  const clearCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setIsCoolingDown(false);
  }, []);

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    setIsCoolingDown(true);
    cooldownTimerRef.current = setTimeout(() => {
      cooldownTimerRef.current = null;
      setIsCoolingDown(false);
    }, SEND_COOLDOWN_MS);
  }, []);

  // Resolve any in-flight turn without emitting a message and re-enable input.
  const resetPending = useCallback(() => {
    pendingRef.current = false;
    clearReplyTimer();
    setIsLoading(false);
  }, [clearReplyTimer]);

  const teardownSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    connectedRef.current = false;
  }, []);

  // Close the warm session and cancel any in-flight turn when the panel closes
  // or the component unmounts (also runs before each re-run of this effect).
  // The turn budget resets with the panel: a reopened chat starts afresh.
  useEffect(() => {
    if (!isOpen) {
      teardownSession();
      resetPending();
      clearCooldown();
      turnsRef.current = 0;
    }
    return () => {
      teardownSession();
      resetPending();
      clearCooldown();
      turnsRef.current = 0;
    };
  }, [isOpen, teardownSession, resetPending, clearCooldown]);

  const requestNostrAuth = useCallback(async (): Promise<string | null> => {
    const nostr = getNostr();
    if (!nostr) return null;
    try {
      const pk = await nostr.getPublicKey();
      setPubkey(pk);
      return pk;
    } catch {
      return null;
    }
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextMsgId("sys"), role: "system", content },
    ]);
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextMsgId("ai"), role: "assistant", content },
    ]);
  }, []);

  // Any reply always renders (even one that arrives after the 30 s timeout).
  // Only an outstanding turn is resolved — re-enabling input once, not twice.
  const handleReply = useCallback((text: string) => {
    addAssistantMessage(text);
    if (pendingRef.current) {
      resetPending();
      startCooldown();
    }
  }, [addAssistantMessage, resetPending, startCooldown]);

  const handleReplyTimeout = useCallback(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    replyTimerRef.current = null;
    addAssistantMessage(REPLY_TIMEOUT_MESSAGE);
    setIsLoading(false);
    startCooldown();
  }, [addAssistantMessage, startCooldown]);

  // Post-connect transport error (relay CLOSED, socket error, keepalive send
  // failure). Connect-phase failures are surfaced by the sendMessage catch, so
  // this is a no-op until the session is established.
  const handleSessionError = useCallback(() => {
    if (!connectedRef.current) return;
    addSystemMessage(SESSION_INTERRUPTED_MESSAGE);
    teardownSession();
    if (pendingRef.current) {
      resetPending();
    }
  }, [addSystemMessage, teardownSession, resetPending]);

  const ensureSession = useCallback(async (): Promise<DmSession> => {
    if (sessionRef.current) return sessionRef.current;
    const identity = generateEphemeralIdentity();
    const session = new DmSession(RELAY_URL, identity, {
      onReply: handleReply,
      onError: handleSessionError,
      replyRelays: REPLY_RELAYS,
    });
    sessionRef.current = session;
    addSystemMessage(CONNECTING_MESSAGE);
    await session.connect();
    connectedRef.current = true;
    return session;
  }, [handleReply, handleSessionError, addSystemMessage]);

  const switchTier = useCallback(async (target: Tier) => {
    setShowTierMenu(false);

    if (target === 0) {
      setTier(0);
      addSystemMessage("AI paused. Your messages won't get responses until you switch back on.");
      return;
    }

    if (target >= 2 && !pubkey) {
      const pk = await requestNostrAuth();
      if (!pk) {
        addSystemMessage(
          target === 2
            ? "Tier 2 requires a Nostr identity. Install a NIP-07 extension (nos2x, Alby) and try again."
            : "Tier 3 requires a Nostr identity with VisionFlow access. Install a NIP-07 extension and try again."
        );
        return;
      }
      addSystemMessage(`Signed in as ${pk.slice(0, 8)}...${pk.slice(-4)}`);
    }

    setTier(target);
    const cfg = TIER_CONFIG[target];
    addSystemMessage(`Switched to ${cfg.label} — ${cfg.desc}`);
  }, [pubkey, requestNostrAuth, addSystemMessage]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isCoolingDown) return;

    setMessages((prev) => [
      ...prev,
      { id: nextMsgId("user"), role: "user", content: trimmed },
    ]);
    setInput("");

    // Tier 0: log-only, no transport (semantics unchanged).
    if (tier === 0) return;

    // Graceful offline path when transport is not configured.
    if (!RELAY_URL || !JARVIS_PUBKEY) {
      addAssistantMessage(OFFLINE_MESSAGE);
      return;
    }

    // Hard per-session budget on transported turns (tier-0 logging is free).
    if (turnsRef.current >= MAX_TURNS_PER_SESSION) {
      addSystemMessage(TURN_LIMIT_MESSAGE);
      return;
    }
    turnsRef.current += 1;

    // Open a single in-flight turn: input/send stay disabled until it resolves.
    setIsLoading(true);
    pendingRef.current = true;

    let session: DmSession;
    try {
      session = await ensureSession();
    } catch {
      teardownSession();
      if (pendingRef.current) resetPending();
      addSystemMessage(CONNECT_FAILURE_MESSAGE);
      return;
    }

    try {
      // Resolves on the relay publish OK, not on the agent reply. Only after the
      // question is accepted do we arm the reply-wait timer (unless a reply has
      // already landed during connect/publish, which would clear pendingRef).
      await session.sendQuestion(trimmed, JARVIS_PUBKEY);
      if (pendingRef.current) {
        clearReplyTimer();
        replyTimerRef.current = setTimeout(handleReplyTimeout, REPLY_TIMEOUT_MS);
      }
    } catch {
      if (pendingRef.current) resetPending();
      addAssistantMessage(SEND_FAILURE_MESSAGE);
      startCooldown();
    }
  }, [
    input,
    isLoading,
    isCoolingDown,
    tier,
    ensureSession,
    teardownSession,
    resetPending,
    clearReplyTimer,
    handleReplyTimeout,
    addAssistantMessage,
    addSystemMessage,
    startCooldown,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentTier = TIER_CONFIG[tier];

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] bg-background/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 flex flex-col overflow-hidden animate-scale-in"
          role="dialog"
          aria-label="AI Chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
            <span className="font-semibold text-sm">Talk to AI</span>
            <div className="flex items-center gap-2">
              {/* Tier selector */}
              <div className="relative" ref={tierMenuRef}>
                <button
                  onClick={() => setShowTierMenu(!showTierMenu)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-purple-500/10"
                  aria-label="Change AI tier"
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${currentTier.dot} ${tier > 0 ? "animate-pulse" : ""}`}
                  />
                  <span className={currentTier.color}>{currentTier.label}</span>
                  <ChevronUp
                    className={`w-3 h-3 transition-transform ${showTierMenu ? "" : "rotate-180"} ${currentTier.color}`}
                  />
                </button>

                {/* Tier dropdown */}
                {showTierMenu && (
                  <div className="absolute bottom-full right-0 mb-1 w-52 bg-background/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-xl shadow-purple-500/20 overflow-hidden">
                    {([3, 2, 1, 0] as Tier[]).map((t) => {
                      const cfg = TIER_CONFIG[t];
                      const isActive = tier === t;
                      const needsAuth = t >= 2 && !pubkey;
                      return (
                        <button
                          key={t}
                          onClick={() => switchTier(t)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-purple-500/10 ${
                            isActive ? "bg-purple-500/5" : ""
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-medium ${isActive ? cfg.color : ""}`}>
                                {t === 0 ? "Off" : `Tier ${t}`}
                              </span>
                              {t > 0 && (
                                <span className="text-muted-foreground/50">{cfg.label}</span>
                              )}
                              {isActive && (
                                <span className="ml-auto text-[10px] text-muted-foreground/50">current</span>
                              )}
                            </div>
                            <div className="text-muted-foreground/60 text-[10px] leading-tight mt-0.5">
                              {cfg.desc}
                              {needsAuth && " (sign in required)"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[50vh]"
          >
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>
                  Ask anything about DreamLab training, workshops, or how AI
                  agents can help your team.
                </p>
                <p className="mt-3 text-xs text-muted-foreground/50">
                  Tap the tier badge above to upgrade capabilities
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user"
                    ? "justify-end"
                    : msg.role === "system"
                      ? "justify-center"
                      : "justify-start"
                }`}
              >
                {msg.role === "system" ? (
                  <div className="text-[11px] text-muted-foreground/50 bg-muted/10 rounded-full px-3 py-1 max-w-[90%]">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white"
                        : "bg-purple-500/10 border border-purple-500/20 text-foreground/90"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-purple-500/20">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                maxLength={MAX_MESSAGE_LEN}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  tier === 0
                    ? "AI paused — type to log only"
                    : isCoolingDown
                      ? "One moment…"
                      : "Type a message..."
                }
                className="flex-1 bg-background/50 border border-purple-500/20 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40"
                disabled={isLoading || isCoolingDown}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || isCoolingDown}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? "bg-background/90 border border-purple-500/30 hover:bg-purple-500/20 shadow-purple-500/20"
            : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-110"
        }`}
        aria-label={isOpen ? "Close AI chat" : "Talk to AI"}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageSquare className="w-5 h-5 text-white" />
        )}
      </button>
    </>
  );
};
