"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Flame } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FomoSidebar } from "@/components/fomo/FomoSidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { Settings } from "lucide-react";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [fomoOpen, setFomoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleToggleFomo = (isOpen: boolean) => {
    setFomoOpen(isOpen);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: isOpen }));
    }
  };

  return (
    <>
      {/* ── Ambient overlay ──────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 70% 50% at 8% -8%, rgba(187,150,228,0.09) 0%, transparent 58%)",
            "radial-gradient(ellipse 45% 35% at 92% 108%, rgba(255,208,102,0.05) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      {/* ── FOMO Sidebar ─────────────────────────────────────────────────────── */}
      <FomoSidebar open={fomoOpen} onClose={() => handleToggleFomo(false)} />

      {/* ── Main app shell ──────────────────────────────────────────────────── */}
      <div
        className="relative z-10 min-h-screen flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ paddingLeft: fomoOpen ? "min(100vw, 500px)" : "0px" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-primary/20 bg-background/80 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-6">

            {/* Left: FOMO toggle + logo */}
            <div className="flex items-center gap-4 animate-fade-up">
              {/* FOMO button */}
              <button
                onClick={() => handleToggleFomo(!fomoOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
                style={{
                  background: fomoOpen ? "rgba(255,108,62,0.15)" : "rgba(255,108,62,0.08)",
                  border: `1px solid ${fomoOpen ? "rgba(255,108,62,0.4)" : "rgba(255,108,62,0.2)"}`,
                  color: "#FF6C3E",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,108,62,0.18)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,108,62,0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!fomoOpen) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,108,62,0.08)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,108,62,0.2)";
                  }
                }}
                title="Find Out More, Obviously"
              >
                <Flame className="w-4 h-4" />
                <span className="font-headline text-xs tracking-wide hidden sm:inline">FOMO</span>
              </button>

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-primary/30 shadow-[0_0_20px_rgba(187,150,228,0.2)]">
                  <Image src="/icono.jpg" alt="MIM" fill className="object-cover" priority />
                </div>
                <div>
                  <h1 className="font-headline text-lg text-foreground tracking-wide leading-none flex items-baseline gap-2">
                    MIM{" "}
                    <span className="font-caption text-primary/60 hidden sm:inline">
                      Minecraft Intelligent Manager
                    </span>
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-label text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                      v4.0 Alpha
                    </span>
                    <span className="font-label text-[#66C8A0] bg-[#66C8A0]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#66C8A0] animate-pulse" />
                      Watcher Activo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3 animate-fade-up stagger-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/5"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                title="Ajustes de Ubicaciones"
              >
                <Settings className="w-4 h-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* ── Content ──────────────────────────────────────────────────────────── */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {children}
        </main>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <footer className="px-6 py-6 border-t border-primary/20 text-center backdrop-blur-sm">
          <div className="space-y-2.5">
            <p className="text-xs text-foreground/40 font-thin tracking-wide">
              MIM —{" "}
              <span className="font-caption text-primary/60">
                Minecraft Intelligent Manager
              </span>
            </p>
            <p className="text-[11px] text-foreground/30 font-light tracking-wide">
              Hecho con café, malas decisiones y demasiadas noches sin dormir por{" "}
              <a
                href="https://ian-pontorno-portfolio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/70 font-medium hover:text-primary transition-colors duration-300"
              >
                Ian
              </a>
            </p>
            <p className="text-[10px] text-foreground/20 italic">
              Porque organizar mods manualmente debería ser ilegal.
            </p>
          </div>
        </footer>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
