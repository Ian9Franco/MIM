"use client";

import React from "react";
import { motion } from "framer-motion";

export type FomoSegmentItem<T extends string> = {
  id: T;
  label: string;
  icon?: React.ReactNode;
  title?: string;
};

export function FomoSegmentedNav<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  compact = false,
}: {
  items: FomoSegmentItem<T>[];
  value: T;
  onChange: (id: T) => void;
  layoutId: string;
  compact?: boolean;
}) {
  return (
    <div
      className="relative flex items-center rounded-xl border p-1"
      style={{ borderColor: "var(--fomo-border)", background: "var(--fomo-secondary-bg)" }}
      role="tablist"
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            title={item.title || item.label}
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
              compact ? "h-8 w-8" : "h-9 min-w-0 flex-1 px-2.5"
            }`}
            style={{
              color: active ? "var(--color-primary)" : "var(--fomo-text-muted)",
            }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 18%, transparent)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {item.icon}
            {!compact && <span className="truncate hidden sm:inline">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
