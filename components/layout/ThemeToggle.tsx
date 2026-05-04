"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Paintbrush } from "lucide-react";

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
    { id: "official", icon: <Monitor className="w-3.5 h-3.5" />, label: "Oficial" },
    { id: "vampire", icon: <Moon className="w-3.5 h-3.5" />, label: "Vampire" },
    { id: "modern", icon: <Sun className="w-3.5 h-3.5" />, label: "Modern" },
  ];

  return (
    <div
      className="flex items-center p-0.5 rounded-xl transition-all"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--color-border)",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setThemeValue(opt.id)}
          title={opt.label}
          className={`relative w-8 h-7 flex items-center justify-center rounded-lg transition-all duration-300 ${theme === opt.id ? "shadow-sm" : "opacity-40 hover:opacity-100"}`}
          style={{
            background: theme === opt.id ? "color-mix(in srgb, var(--color-primary) 15%, transparent)" : "transparent",
            color: theme === opt.id ? "var(--color-primary)" : "var(--color-foreground)",
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}