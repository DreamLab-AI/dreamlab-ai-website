/**
 * Static menu / function-key definitions for the BBS, mirroring the classic
 * WILDCAT main-menu layout but mapped onto real DreamLab forum features.
 */

import type { ScreenId } from "./types";

export interface MenuItem {
  /** Single-character hot key shown in brackets, e.g. "1". */
  key: string;
  /** Screen to open, or "logoff" for the exit action. */
  target: ScreenId | "logoff";
  title: string;
  desc: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { key: "1", target: "messages", title: "Message Base", desc: "Read/Post Messages" },
  { key: "2", target: "files", title: "File Base", desc: "Pods & Downloads" },
  { key: "3", target: "nodes", title: "Node List", desc: "Relay & Mesh Nodes" },
  { key: "4", target: "users", title: "User List", desc: "List Forum Users" },
  { key: "5", target: "chat", title: "Chat", desc: "Live Forum Feed" },
  { key: "6", target: "doors", title: "Door Games", desc: "Play Door Games" },
  { key: "7", target: "code", title: "Code Exchange", desc: "Share Code Snippets" },
  { key: "8", target: "sysinfo", title: "System Info", desc: "System/Node Info" },
  { key: "9", target: "settings", title: "Settings", desc: "User Settings" },
  { key: "0", target: "logoff", title: "Log Off", desc: "Return to Site" },
];

export interface FnKey {
  label: string;
  /** Function key, e.g. "F1". */
  fkey: string;
  /** Screen to open, "help" overlay, or "logoff". */
  target: ScreenId | "logoff";
}

export const FN_KEYS: FnKey[] = [
  { fkey: "F1", label: "Help", target: "help" },
  { fkey: "F2", label: "Msgs", target: "messages" },
  { fkey: "F3", label: "Files", target: "files" },
  { fkey: "F4", label: "Chat", target: "chat" },
  { fkey: "F5", label: "Doors", target: "doors" },
  { fkey: "F6", label: "Code", target: "code" },
  { fkey: "F7", label: "Info", target: "sysinfo" },
  { fkey: "F10", label: "Quit", target: "logoff" },
];

/** Resolve a typed command word to a screen target (for the command prompt). */
export function resolveCommand(input: string): ScreenId | "logoff" | null {
  const cmd = input.trim().toLowerCase();
  if (!cmd) return null;
  const byNumber = MENU_ITEMS.find((m) => m.key === cmd);
  if (byNumber) return byNumber.target;
  const aliases: Record<string, ScreenId | "logoff"> = {
    menu: "menu",
    main: "menu",
    messages: "messages",
    msgs: "messages",
    msg: "messages",
    boards: "messages",
    files: "files",
    file: "files",
    pods: "files",
    nodes: "nodes",
    node: "nodes",
    relay: "nodes",
    users: "users",
    who: "users",
    user: "users",
    chat: "chat",
    feed: "chat",
    doors: "doors",
    door: "doors",
    games: "doors",
    code: "code",
    snippets: "code",
    sysinfo: "sysinfo",
    info: "sysinfo",
    sys: "sysinfo",
    settings: "settings",
    config: "settings",
    prefs: "settings",
    help: "help",
    "?": "help",
    logoff: "logoff",
    logout: "logoff",
    quit: "logoff",
    exit: "logoff",
    bye: "logoff",
    off: "logoff",
  };
  return aliases[cmd] ?? null;
}
