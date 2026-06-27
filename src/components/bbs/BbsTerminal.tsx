/**
 * BbsTerminal — the full-screen terminal shell. Composes the status bar,
 * banner, the active screen (or main menu), the user-stats line, the command
 * prompt, and the function-key legend, and owns top-level navigation + global
 * function-key handling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useClock } from "@/hooks/bbs/useClock";
import { themeVars } from "@/lib/bbs/theme";
import { fetchProfiles } from "@/lib/bbs/forum";
import { resolveCommand, FN_KEYS } from "@/lib/bbs/menu";
import { functionKeyOf, isTypingTarget } from "@/lib/bbs/keyboard";
import type { ScreenId } from "@/lib/bbs/types";

import { StatusBar } from "./StatusBar";
import { Banner } from "./Banner";
import { MainMenu } from "./MainMenu";
import { NewestPosts } from "./NewestPosts";
import { StatsBar } from "./StatsBar";
import { CommandPrompt } from "./CommandPrompt";
import { FunctionKeyBar } from "./FunctionKeyBar";

import { MessageBaseScreen } from "./screens/MessageBaseScreen";
import { FileBaseScreen } from "./screens/FileBaseScreen";
import { NodeListScreen } from "./screens/NodeListScreen";
import { UserListScreen } from "./screens/UserListScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { DoorGamesScreen } from "./screens/DoorGamesScreen";
import { CodeExchangeScreen } from "./screens/CodeExchangeScreen";
import { SystemInfoScreen } from "./screens/SystemInfoScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { HelpScreen } from "./screens/HelpScreen";
import type { ScreenProps } from "./screens/types";

const SCREENS: Record<
  Exclude<ScreenId, "menu">,
  (props: ScreenProps) => JSX.Element
> = {
  messages: MessageBaseScreen,
  files: FileBaseScreen,
  nodes: NodeListScreen,
  users: UserListScreen,
  chat: ChatScreen,
  doors: DoorGamesScreen,
  code: CodeExchangeScreen,
  sysinfo: SystemInfoScreen,
  settings: SettingsScreen,
  help: HelpScreen,
};

export function BbsTerminal() {
  const session = useBbsSession();
  const { config, status, theme, node, identity, relay } = session;
  const now = useClock();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<ScreenId>("menu");
  const [users, setUsers] = useState<number | null>(null);
  const usersFetched = useRef(false);

  const go = useCallback(
    (target: ScreenId | "logoff") => {
      if (target === "logoff") {
        navigate("/");
        return;
      }
      setScreen(target);
    },
    [navigate]
  );

  // Pull a one-time "users online" count once the relay is up.
  useEffect(() => {
    if (status !== "online" || usersFetched.current) return;
    usersFetched.current = true;
    let cancelled = false;
    fetchProfiles(relay, 100)
      .then((profiles) => {
        if (!cancelled) setUsers(profiles.length);
      })
      .catch(() => {
        if (!cancelled) setUsers(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status, relay]);

  // Global function keys (F1..F10) work from any screen.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const fkey = functionKeyOf(e);
      if (!fkey) return;
      const match = FN_KEYS.find((k) => k.fkey === fkey);
      if (match) {
        e.preventDefault();
        go(match.target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  // From the menu, Escape exits to the marketing site; deeper screens own ESC.
  useEffect(() => {
    if (screen !== "menu") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isTypingTarget(e.target)) {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, navigate]);

  const handleCommand = useCallback(
    (raw: string): string | null => {
      const target = resolveCommand(raw);
      if (!target) return `unknown command: ${raw.trim().slice(0, 20)}`;
      if (target === "menu") {
        setScreen("menu");
        return null;
      }
      go(target);
      return null;
    },
    [go]
  );

  const ActiveScreen = screen === "menu" ? null : SCREENS[screen];

  return (
    <main
      className="bbs-root z-[60] flex flex-col text-[clamp(12px,1.55vw,16px)]"
      style={themeVars(theme)}
      aria-label="DreamLab BBS terminal"
    >
      <StatusBar
        forumName={config.forumName}
        node={node}
        status={status}
        users={users}
        now={now}
      />

      <div className="bbs-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-2 sm:px-4">
        {screen === "menu" ? (
          <>
            <Banner />
            <MainMenu onSelect={go} />
            <NewestPosts />
          </>
        ) : (
          ActiveScreen && (
            <ActiveScreen
              onExit={() => setScreen("menu")}
              onNavigate={go}
            />
          )
        )}
      </div>

      <StatsBar />
      <CommandPrompt user={identity.handle} onSubmit={handleCommand} />
      <FunctionKeyBar onTrigger={go} />
    </main>
  );
}
