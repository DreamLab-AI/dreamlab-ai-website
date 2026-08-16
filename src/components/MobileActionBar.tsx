import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Sticky bottom action bar for the mobile surface (≤767px only).
 *
 * The shipped site scatters up to five CTAs down a screen; the mobile redesign
 * keeps exactly one primary action per screen and parks it here so it survives a
 * long scroll (Rule 3). Rendered on Home, Track detail, Workshop module and Team.
 *
 * Screens that mount this must add `pb-safe-bar` (120px) to their scroll
 * container so the last content clears the bar.
 *
 * Composed rather than prop-driven because the four screens arrange the bar
 * differently: fill-primary + trailing icon (Home), leading icon + primary
 * (Workshop module), left counter + auto-width primary (Team).
 */
export function MobileActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-40 px-6 pt-3",
        "pb-[calc(20px+env(safe-area-inset-bottom))]",
        // A fade, not a hard edge — content dissolves into the bar.
        "bg-gradient-to-t from-dlm-sunken from-[60%] to-transparent",
        className
      )}
    >
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

type BarPrimaryProps = {
  label: string;
  /** internal route; omit and use onClick for in-page actions (e.g. mark-done) */
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** default true — the primary fills the row; set false for auto width (Team) */
  fill?: boolean;
  className?: string;
};

/** 50px solid-cyan primary. One per screen. */
export function BarPrimary({
  label,
  to,
  onClick,
  disabled = false,
  fill = true,
  className,
}: BarPrimaryProps) {
  const cls = cn(
    "flex items-center justify-center h-[50px] rounded-[10px]",
    "bg-dlm-action text-dlm-ink text-[16px] font-semibold",
    "transition-colors active:bg-[#0891B2]",
    "disabled:opacity-40 disabled:pointer-events-none",
    fill ? "flex-1" : "px-5",
    className
  );
  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {label}
    </button>
  );
}

type BarIconButtonProps = {
  label: string; // accessible label
  to?: string;
  onClick?: () => void;
  children: React.ReactNode; // the icon
};

/** 50×50 outline icon button — the optional secondary slot. */
export function BarIconButton({ label, to, onClick, children }: BarIconButtonProps) {
  const cls = cn(
    "flex items-center justify-center w-[50px] h-[50px] shrink-0 rounded-[10px]",
    "border border-white/[0.16] text-[#FAFAFA]",
    "transition-colors active:bg-white/[0.05]"
  );
  if (to) {
    return (
      <Link to={to} onClick={onClick} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  );
}
