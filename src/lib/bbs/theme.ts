/**
 * Terminal color themes for the BBS, expressed as CSS custom properties applied
 * to the terminal root. Components reference the vars via Tailwind arbitrary
 * values (e.g. `text-[var(--bbs-primary)]`) so a theme swap recolors everything.
 *
 * The default `amber` theme matches `dreamlab.toml` `[branding].theme = "amber"`.
 */

import type { CSSProperties } from "react";
import type { ThemeId } from "./types";

interface ThemePalette {
  bg: string;
  fg: string;
  primary: string;
  secondary: string;
  accent: string;
  info: string;
  ok: string;
  warn: string;
  dim: string;
  border: string;
  selBg: string;
  selFg: string;
}

const COMMON = {
  bg: "#08070a",
  fg: "#d4d4cf",
  info: "#5b9bd5",
  ok: "#4ec94e",
  warn: "#e0564a",
  dim: "#7c7c84",
  selFg: "#0a0a0a",
};

export const THEMES: Record<ThemeId, ThemePalette> = {
  amber: {
    ...COMMON,
    primary: "#f0a830",
    secondary: "#c084fc",
    accent: "#f5b942",
    border: "#9c7330",
    selBg: "#f5b942",
  },
  green: {
    ...COMMON,
    primary: "#54d854",
    secondary: "#9be29b",
    accent: "#7cfc6a",
    border: "#2f7a2f",
    selBg: "#54d854",
  },
  purple: {
    ...COMMON,
    primary: "#c084fc",
    secondary: "#f0a8ff",
    accent: "#a855f7",
    border: "#7c3aed",
    selBg: "#c084fc",
  },
  sky: {
    ...COMMON,
    primary: "#56bdf8",
    secondary: "#bae6fd",
    accent: "#38bdf8",
    border: "#2b6f9e",
    selBg: "#56bdf8",
  },
};

export const THEME_ORDER: ThemeId[] = ["amber", "green", "purple", "sky"];

/** Build the inline CSS-variable style object for a theme. */
export function themeVars(theme: ThemeId): CSSProperties {
  const p = THEMES[theme] ?? THEMES.amber;
  return {
    "--bbs-bg": p.bg,
    "--bbs-fg": p.fg,
    "--bbs-primary": p.primary,
    "--bbs-secondary": p.secondary,
    "--bbs-accent": p.accent,
    "--bbs-info": p.info,
    "--bbs-ok": p.ok,
    "--bbs-warn": p.warn,
    "--bbs-dim": p.dim,
    "--bbs-border": p.border,
    "--bbs-sel-bg": p.selBg,
    "--bbs-sel-fg": p.selFg,
  } as CSSProperties;
}
