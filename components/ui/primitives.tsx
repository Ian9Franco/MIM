/**
 * @fileoverview Reusable low-level UI primitive components.
 * These have no business logic and are purely presentational.
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import type { StatusType } from "@/hooks/useStatusBanner";

/* ── IconButton ─────────────────────────────────────────────────────────────── */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for screen readers */
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "accent" | "danger";
}

/**
 * A square icon-only button with consistent hover state and ARIA label.
 */
export const IconButton = React.memo(function IconButton({
  label, size = "md", variant = "ghost", children, className = "", ...rest
}: IconButtonProps) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const variantStyle: Record<string, React.CSSProperties> = {
    ghost:  { border: `1px solid ${COLORS.border}`,    color: COLORS.muted },
    accent: { border: `1px solid rgba(187,150,228,0.3)`, color: COLORS.wisteria, background: "rgba(187,150,228,0.08)" },
    danger: { border: `1px solid rgba(239,68,68,0.2)`,  color: COLORS.red,      background: COLORS.redBg },
  };

  return (
    <button
      aria-label={label}
      title={label}
      className={`${dim} flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={variantStyle[variant]}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ── Chip ───────────────────────────────────────────────────────────────────── */

interface ChipProps {
  children: React.ReactNode;
  color?: string;
  bg?:    string;
  className?: string;
}

/**
 * Small pill/badge for labels, version numbers, loader names, etc.
 */
export const Chip = React.memo(function Chip({ children, color, bg, className = "" }: ChipProps) {
  return (
    <span
      className={`font-label rounded-full px-2 py-0.5 ${className}`}
      style={{ fontSize: "0.6rem", background: bg ?? "rgba(255,255,255,0.08)", color: color ?? COLORS.muted }}
    >
      {children}
    </span>
  );
});

/* ── StatusBanner ───────────────────────────────────────────────────────────── */

import { X } from "lucide-react";

interface StatusBannerProps {
  text:    string;
  type:    StatusType;
  onClose: () => void;
}

const STATUS_BG: Record<StatusType, string> = {
  success: COLORS.emerald,
  error:   "#EF4444",
  info:    COLORS.primary,
};

/**
 * Transient top/bottom banner for feedback messages.
 * Accessible via role="status" for screen readers.
 */
export const StatusBanner = React.memo(function StatusBanner({
  text, type, onClose,
}: StatusBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-0 left-0 right-0 py-2 px-4 flex items-center justify-between text-xs font-bold z-20 animate-slide-down"
      style={{ background: STATUS_BG[type], color: "white" }}
    >
      <span className="truncate">{text}</span>
      <button onClick={onClose} aria-label="Cerrar notificación">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
});

/* ── LoadingSpinner ─────────────────────────────────────────────────────────── */

interface SpinnerProps {
  label?: string;
  className?: string;
}

/**
 * Centered loading spinner with optional label below.
 */
export const LoadingSpinner = React.memo(function LoadingSpinner({
  label, className = "",
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label ?? "Cargando"}
      className={`flex flex-col items-center justify-center py-24 gap-4 ${className}`}
    >
      <Loader2 className="w-9 h-9 animate-spin" style={{ color: COLORS.wisteria, opacity: 0.5 }} />
      {label && (
        <p className="font-subhead text-sm animate-pulse" style={{ color: COLORS.muted }}>
          {label}
        </p>
      )}
    </div>
  );
});

/* ── EmptyState ─────────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon:    React.ReactNode;
  title:   string;
  subtitle?:string;
}

/**
 * Empty-state placeholder with icon, title, and optional subtitle.
 */
export const EmptyState = React.memo(function EmptyState({
  icon, title, subtitle,
}: EmptyStateProps) {
  return (
    <div className="text-center py-20 opacity-40" role="status" aria-label={title}>
      <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
        {icon}
      </div>
      <p className="font-subhead">{title}</p>
      {subtitle && <p className="font-caption mt-1">{subtitle}</p>}
    </div>
  );
});

/* ── PillToggleGroup ────────────────────────────────────────────────────────── */

interface PillToggleOption {
  value:  string;
  label:  string;
  icon?:  React.ReactNode;
  activeColor?: string;
  activeBg?:    string;
  activeBorder?:string;
}

interface PillToggleGroupProps {
  options:  PillToggleOption[];
  value:    string;
  onChange: (v: string) => void;
  className?:string;
  ariaLabel: string;
}

/**
 * A group of pill-style toggle buttons with accessible keyboard navigation.
 */
export const PillToggleGroup = React.memo(function PillToggleGroup({
  options, value, onChange, className = "", ariaLabel,
}: PillToggleGroupProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-2 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-subhead transition-all"
            style={{
              background: active ? (opt.activeBg   ?? "rgba(255,108,62,0.15)") : "transparent",
              color:      active ? (opt.activeColor ?? "#FF6C3E")               : COLORS.muted,
              border: active
                ? `1px solid ${opt.activeBorder ?? "rgba(255,108,62,0.3)"}`
                : "1px solid transparent",
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
});

/* ── SectionHeading ─────────────────────────────────────────────────────────── */

interface SectionHeadingProps {
  icon:        React.ReactNode;
  title:       string;
  sub?:        string;
  badge?:      number;
  accentColor?:string;
  actions?:    React.ReactNode;
}

/**
 * Consistent section-level heading with icon, title, subtitle, optional badge,
 * and optional right-aligned action buttons.
 */
export const SectionHeading = React.memo(function SectionHeading({
  icon, title, sub, badge, accentColor, actions,
}: SectionHeadingProps) {
  const color = accentColor ?? COLORS.primary;
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        aria-hidden="true"
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border:     `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
          color,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-headline text-base leading-none" style={{ color: COLORS.foreground }}>
            {title}
          </h2>
          {badge !== undefined && badge > 0 && (
            <span
              aria-label={`${badge} elementos`}
              className="font-label rounded-full px-2 py-0.5 animate-fade-in"
              style={{ background: COLORS.accent, color: "#1a0a00", fontSize: "0.6rem" }}
            >
              {badge}
            </span>
          )}
        </div>
        {sub && (
          <p className="font-caption mt-0.5" style={{ color: COLORS.muted }}>{sub}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
});