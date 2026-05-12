"use client";

import React, { useEffect, useState } from "react";
import { Coffee, Ghost, Sun } from "lucide-react";

type Theme = "official" | "vampire" | "modern";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("official");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mim-theme") as Theme | null;
    const resolved = saved ?? "official";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  const setThemeValue = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("mim-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  if (!mounted) return <div className="w-[104px] h-8 rounded-xl" />;

  const options: { id: Theme; icon: React.ReactNode; label: string }[] = [
    { id: "official", icon: <Coffee className="w-3.5 h-3.5" />, label: "Oficial" },
    { id: "vampire", icon: <Ghost className="w-3.5 h-3.5" />, label: "Vampire" },
    { id: "modern", icon: <Sun className="w-3.5 h-3.5" />, label: "Modern" },
  ];

  const activeIndex = options.findIndex(o => o.id === theme);

  return (
    <div
      className="relative flex items-center h-9 w-[106px] p-1 rounded-xl transition-all"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Liquid Sliding Pill */}
      <div 
        className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-lg pointer-events-none inset-y-1"
        style={{
          width: "32px",
          transform: `translateX(${activeIndex * 32}px)`,
          background: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
          boxShadow: "0 0 20px color-mix(in srgb, var(--color-primary) 10%, transparent)",
          left: "4px",
        }}
      />

      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setThemeValue(opt.id)}
          title={opt.label}
          className={`relative z-10 w-8 h-full flex items-center justify-center rounded-lg transition-all duration-300 ${theme === opt.id ? "" : "opacity-40 hover:opacity-100"}`}
          style={{
            color: theme === opt.id ? "var(--color-primary)" : "var(--color-foreground)",
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}