"use client";

import React, { useEffect, useState } from "react";
import { Coffee, Ghost, Sun } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import { supabase } from "@/lib/core/supabaseClient";

type Theme = "official" | "vampire" | "modern";

const THEMES: { id: Theme; icon: typeof Coffee; label: string }[] = [
  { id: "official", icon: Coffee, label: "Oficial" },
  { id: "vampire", icon: Ghost, label: "Vampire" },
  { id: "modern", icon: Sun, label: "Modern" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("official");
  const [mounted, setMounted] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mim-theme") as Theme | null;
    const resolved = saved ?? "official";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  useEffect(() => {
    const bannerMeta = profile?.banner_meta as { theme?: string } | null | undefined;
    if (bannerMeta?.theme && ["official", "vampire", "modern"].includes(bannerMeta.theme)) {
      const cloudTheme = bannerMeta.theme as Theme;
      setTheme(cloudTheme);
      localStorage.setItem("mim-theme", cloudTheme);
      document.documentElement.setAttribute("data-theme", cloudTheme);
    }
  }, [profile]);

  const setThemeValue = async (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("mim-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);

    if (user?.id) {
      try {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("banner_meta")
          .eq("id", user.id)
          .single();

        const updatedBannerMeta = {
          ...(currentProfile?.banner_meta || {}),
          theme: newTheme,
        };

        await supabase
          .from("profiles")
          .update({
            banner_meta: updatedBannerMeta,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (err) {
        console.error("Error syncing theme to Supabase:", err);
      }
    }
  };

  if (!mounted) return <div className="w-26 h-8 rounded-xl" />;

  const activeIndex = THEMES.findIndex((opt) => opt.id === theme);

  return (
    <div
      className="mim-theme-toggle relative flex items-center h-9 w-26.5 p-1 rounded-xl transition-all border"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-lg pointer-events-none inset-y-1"
        style={{
          width: "32px",
          transform: `translateX(${activeIndex * 32}px)`,
          background: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
          boxShadow: "0 0 15px color-mix(in srgb, var(--color-primary) 15%, transparent)",
          left: "4px",
        }}
      />
      {THEMES.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setThemeValue(opt.id)}
            data-active={active}
            data-theme-icon={opt.id}
            className={`mim-theme-option relative z-10 flex h-full w-8 items-center justify-center rounded-lg transition-all duration-300 ${active ? "" : "opacity-40 hover:opacity-100"}`}
            style={{ color: active ? "var(--color-primary)" : "var(--color-foreground)" }}
            title={opt.label}
          >
            <span className="mim-theme-icon-wrap relative flex items-center justify-center">
              <Icon className="mim-theme-icon h-3.5 w-3.5" />
              {active && opt.id === "official" && (
                <>
                  <span className="mim-theme-steam mim-theme-steam-a" aria-hidden />
                  <span className="mim-theme-steam mim-theme-steam-b" aria-hidden />
                  <span className="mim-theme-steam mim-theme-steam-c" aria-hidden />
                </>
              )}
              {active && opt.id === "modern" && (
                <>
                  <span className="mim-theme-spark mim-theme-spark-a" aria-hidden />
                  <span className="mim-theme-spark mim-theme-spark-b" aria-hidden />
                  <span className="mim-theme-spark mim-theme-spark-c" aria-hidden />
                  <span className="mim-theme-spark mim-theme-spark-d" aria-hidden />
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
