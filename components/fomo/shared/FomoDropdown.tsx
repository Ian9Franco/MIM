"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type FomoDropdownProps = {
  label?: string;
  valueLabel: React.ReactNode;
  disabled?: boolean;
  align?: "left" | "right";
  fullWidth?: boolean;
  className?: string;
  menuClassName?: string;
  children: React.ReactNode;
};

export function FomoDropdown({
  label,
  valueLabel,
  disabled,
  align = "left",
  fullWidth,
  className = "",
  menuClassName = "",
  children,
}: FomoDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : ""} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => !disabled && setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
          fullWidth ? "w-full justify-between" : ""
        }`}
        style={{
          borderColor: "var(--fomo-border)",
          color: "var(--fomo-text-primary)",
          background: "var(--fomo-secondary-bg)",
        }}
      >
        <span className="min-w-0 truncate text-left">
          {label ? (
            <span className="mr-1.5 font-semibold" style={{ color: "var(--fomo-text-muted)" }}>
              {label}
            </span>
          ) : null}
          {valueLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            id={menuId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-full z-[120] mt-1.5 min-w-full max-h-60 overflow-y-auto overflow-x-visible rounded-xl border shadow-[0_18px_40px_rgba(0,0,0,0.35)] origin-top ${
              align === "right" ? "right-0" : "left-0"
            } ${fullWidth ? "w-full" : "min-w-[10rem]"} ${menuClassName}`}
            style={{
              borderColor: "var(--fomo-border)",
              background: "color-mix(in srgb, var(--fomo-card-bg) 92%, transparent)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <div onClick={() => setOpen(false)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FomoDropdownOption({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className="block w-full px-3.5 py-2.5 text-left text-xs font-bold leading-snug whitespace-normal break-words transition-colors hover:bg-white/6"
      style={{
        color: active ? "var(--color-primary)" : "var(--fomo-text-primary)",
        background: active ? "color-mix(in srgb, var(--color-primary) 14%, transparent)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}
