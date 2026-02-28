import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, ChevronUp } from "lucide-react";

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

const AI_CHAT_URL = import.meta.env.VITE_AI_CHAT_URL || "";

export const AIChatFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tier, setTier] = useState<Tier>(1);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [showTierMenu, setShowTierMenu] = useState(false);
  const [sessionId] = useState(
    () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tierMenuRef = useRef<HTMLDivElement>(null);

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

  const requestNostrAuth = useCallback(async (): Promise<string | null> => {
    const nostr = (window as Record<string, unknown>).nostr as { getPublicKey: () => Promise<string> } | undefined;
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
      { id: `sys_${Date.now()}`, role: "system", content },
    ]);
  }, []);

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
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (tier === 0) return;

    setIsLoading(true);

    if (!AI_CHAT_URL) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: "assistant",
            content:
              "I'm not connected yet. Once the AI service is live, I'll be able to help you here. In the meantime, reach out via the contact page.",
          },
        ]);
        setIsLoading(false);
      }, 600);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        message: trimmed,
        session_id: sessionId,
        tier,
      };
      if (pubkey) body.pubkey = pubkey;

      const res = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content:
            data.response ||
            data.message ||
            "I couldn't generate a response. Please try again.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I couldn't reach the AI service right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, tier, pubkey, sessionId]);

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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tier === 0 ? "AI paused — type to log only" : "Type a message..."}
                className="flex-1 bg-background/50 border border-purple-500/20 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
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
