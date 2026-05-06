"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FomoSidebar } from "@/components/fomo/FomoSidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { Settings, RefreshCw, ChevronRight } from "lucide-react";

/**
 * Cliente de Layout Principal (Client Component).
 * Envuelve el contenido de la aplicación y gestiona el estado global de UI
 * que requiere interactividad (como la apertura del panel FOMO,
 * la modal de configuración y el toggle de temas).
 */
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [fomoOpen, setFomoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleToggleFomo = (isOpen: boolean) => {
    setFomoOpen(isOpen);
    
    if (typeof window !== "undefined") {
      const soundFile = isOpen ? "/fomo_sound.mp3" : "/fomoff.mp3";
      const audio = new Audio(soundFile);
      audio.volume = 0.4;
      audio.play().catch(e => console.warn("Audio play failed:", e));

      window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: isOpen }));
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refresh-system"));
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="font-poppins">
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

            {/* Left side: FOMO toggle + App Title */}
            <div className="flex items-center gap-6 animate-fade-up">
              {/* FOMO button (Drawer Handle style) */}
              <button
                onClick={() => handleToggleFomo(!fomoOpen)}
                className="flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl transition-all duration-500 group/fomo relative overflow-hidden"
                style={{
                  background: fomoOpen ? "rgba(255,108,62,0.2)" : "rgba(255,108,62,0.08)",
                  border: `1px solid ${fomoOpen ? "rgba(255,108,62,0.6)" : "rgba(255,108,62,0.2)"}`,
                  color: "#FF6C3E",
                  boxShadow: fomoOpen ? "0 0 30px rgba(255,108,62,0.25)" : "none",
                  transform: fomoOpen ? "translateX(4px)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (!fomoOpen) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,108,62,0.18)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,108,62,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!fomoOpen) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,108,62,0.08)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,108,62,0.2)";
                  }
                }}
                title={fomoOpen ? "Cerrar Panel" : "Explorar Mods (FOMO)"}
              >
                {/* Decorative sliding indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary/40 transition-transform duration-500 ${fomoOpen ? 'translate-x-0' : '-translate-x-full'}`} />
                
                <Image 
                  src="/fomoico.png" 
                  alt="" 
                  width={24} 
                  height={24} 
                  className={`w-6 h-6 object-contain transition-all duration-500 ${fomoOpen ? 'rotate-0' : 'animate-pulse'}`} 
                />
                
                <div className="flex flex-col items-start leading-none gap-1">
                  <span className="font-headline text-xs tracking-wider">FOMO</span>
                  <span className="text-[8px] opacity-40 font-medium tracking-widest hidden sm:inline">DISCOVER</span>
                </div>

                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${fomoOpen ? 'rotate-180' : 'group-hover/fomo:translate-x-1'}`} />
              </button>

              {/* App Title Wrapper with Premium Styling */}
              <div className="flex flex-col relative group/title">
                {/* Decorative background glow for the title area */}
                <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-2xl opacity-0 group-hover/title:opacity-100 transition-opacity duration-500" />
                
                <h1 className="relative font-headline text-2xl tracking-tighter leading-none flex items-center gap-3">
                  <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    MIM
                  </span>
                  
                  {/* Premium divider & decorative gliph */}
                  <div className="w-px h-4 bg-primary/30" />
                  
                  <span className="font-caption text-[10px] text-primary/80 uppercase tracking-[0.2em] font-medium hidden sm:inline-block translate-y-[1px]">
                    Intelligent <span className="text-foreground/40">Manager</span>
                  </span>

                  {/* Tiny decorative element */}
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse hidden lg:block" />
                </h1>

                <div className="flex items-center gap-2 mt-2.5 relative z-10">
                  <span className="font-label text-[9px] text-accent/90 bg-accent/5 px-2.5 py-1 rounded-lg border border-accent/10 shadow-inner">
                    v4.0 Alpha
                  </span>
                  <span className="font-label text-[9px] text-[#66C8A0] bg-[#66C8A0]/5 px-2.5 py-1 rounded-lg border border-[#66C8A0]/10 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#66C8A0] shadow-[0_0_8px_#66C8A0]" />
                    Watcher
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Global controls */}
            <div className="flex items-center gap-3 animate-fade-up stagger-2">
              <button
                onClick={handleRefresh}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/5 ${isRefreshing ? 'rotate-180 text-primary' : ''}`}
                style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                title="Sincronizar con Disco"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

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

        {/* ── Main Content Area ───────────────────────────────────────────────── */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {children}
        </main>

        {/* ── Sticky Footer ───────────────────────────────────────────────────── */}
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
    </div>
  );
}
