"use client";

import React from "react";

interface HotkeyCardProps {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: "wisteria" | "gold";
}

export function HotkeyCard({ num, title, desc, icon, onClick, color = "wisteria" }: HotkeyCardProps) {
  const isGold   = color === "gold";
  const accent   = isGold ? "var(--color-accent)"  : "var(--color-primary)";
  const accentBg = isGold ? "var(--color-accent-bg)" : "rgba(187,150,228,0.07)";
  const accentBorder = isGold ? "var(--color-accent-border)" : "rgba(187,150,228,0.22)";
  const hoverBorder  = isGold ? "var(--color-accent)" : "rgba(187,150,228,0.45)";

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-250 animate-fade-up"
      style={{
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        padding: "1.1rem 1.1rem 1rem",
        backdropFilter: "blur(14px)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = hoverBorder;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = isGold
          ? "0 12px 32px var(--glow-accent), 0 4px 16px rgba(0,0,0,0.1)"
          : "0 12px 32px rgba(187,150,228,0.12), 0 4px 16px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = accentBorder;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Number — large, editorial, background */}
      <div
        className="font-black-it absolute -top-2 -right-1 text-6xl leading-none select-none pointer-events-none transition-all duration-300"
        style={{ color: accent, opacity: 0.07 }}
      >
        {num}
      </div>

      {/* Number badge */}
      <div
        className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center font-black-it text-base transition-all duration-200 group-hover:scale-105"
        style={{
          background: isGold ? "var(--color-accent-bg)" : "rgba(187,150,228,0.14)",
          border: `1px solid ${accentBorder}`,
          color: accent,
        }}
      >
        {num}
      </div>

      {/* Icon + title */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" style={{ color: accent }}>
          {icon}
        </span>
        <span
          className="font-subhead text-sm transition-colors duration-200"
          style={{ color: "var(--color-foreground)" }}
        >
          {title}
        </span>
      </div>

      <p className="font-caption leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {desc}
      </p>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-400"
        style={{
          background: isGold
            ? "linear-gradient(90deg, var(--color-accent) 0%, transparent 100%)"
            : "linear-gradient(90deg, rgba(187,150,228,0.6) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}