"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FomoSidebar } from "@/components/fomo/FomoSidebar";
import { SageSidebar } from "@/components/sage/SageSidebar";
import { TweakSidebar } from "@/components/layout/TweakSidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { Settings, RefreshCw, ChevronRight, Activity, Settings2, Bell, Package } from "lucide-react";
import { useStaging } from "@/hooks/useStaging";
import { StagingModal } from "@/components/layout/StagingModal";
import type { Project } from "@/lib/types";

/**
 * Cliente de Layout Principal (Client Component).
 * Envuelve el contenido de la aplicación y gestiona el estado global de UI
 * que requiere interactividad (como la apertura del panel FOMO,
 * la modal de configuración y el toggle de temas).
 */
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [fomoOpen, setFomoOpen] = useState(false);
  const [sageOpen, setSageOpen] = useState(false);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSidebarOpen, setAlertSidebarOpen] = useState(false);
  const [hasAlerts, setHasAlerts] = useState(false);
  const [stagingOpen, setStagingOpen] = useState(false);
  const staging = useStaging();

  React.useEffect(() => {
    const handleAlertToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setAlertSidebarOpen(customEvent.detail);
    };

    const handleFomoToggleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setFomoOpen(customEvent.detail);
    };

    const handleSageToggleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setSageOpen(customEvent.detail);
    };

    const handleTweakToggleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setTweakOpen(customEvent.detail);
    };

    const handleProjectChange = (e: Event) => {
      const customEvent = e as CustomEvent<Project | null>;
      setActiveProject(customEvent.detail);
    };

    const handleAlertStatus = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setHasAlerts(customEvent.detail);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("alert-sidebar-toggle", handleAlertToggle);
      window.addEventListener("alert-status-changed", handleAlertStatus);
      window.addEventListener("fomo-toggle", handleFomoToggleEvent);
      window.addEventListener("sage-toggle", handleSageToggleEvent);
      window.addEventListener("tweak-toggle", handleTweakToggleEvent);
      window.addEventListener("active-project-changed", handleProjectChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("alert-sidebar-toggle", handleAlertToggle);
        window.removeEventListener("alert-status-changed", handleAlertStatus);
        window.removeEventListener("fomo-toggle", handleFomoToggleEvent);
        window.removeEventListener("sage-toggle", handleSageToggleEvent);
        window.removeEventListener("tweak-toggle", handleTweakToggleEvent);
        window.removeEventListener("active-project-changed", handleProjectChange);
      }
    };
  }, []);

  const handleToggleFomo = (isOpen: boolean) => {
    setFomoOpen(isOpen);
    if (typeof window !== "undefined") {
      const soundFile = isOpen ? "/fomo_sound.mp3" : "/fomoff.mp3";
      const audio = new Audio(soundFile);
      audio.volume = 0.4;
      audio.play().catch(e => console.warn("Audio play failed:", e));

      window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: isOpen }));
      if (isOpen) {
        window.dispatchEvent(new CustomEvent("sage-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("tweak-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: false }));
        setSageOpen(false);
        setTweakOpen(false);
        setAlertSidebarOpen(false);
      }
    }
  };

  const handleToggleSage = (isOpen: boolean) => {
    setSageOpen(isOpen);
    if (typeof window !== "undefined") {
      const soundFile = isOpen ? "/fomo_sound.mp3" : "/fomoff.mp3";
      const audio = new Audio(soundFile);
      audio.volume = 0.3;
      audio.play().catch(e => console.warn("Audio play failed:", e));

      window.dispatchEvent(new CustomEvent("sage-toggle", { detail: isOpen }));
      if (isOpen) {
        window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("tweak-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: false }));
        setFomoOpen(false);
        setTweakOpen(false);
        setAlertSidebarOpen(false);
      }
    }
  };

  const handleToggleTweak = (isOpen: boolean) => {
    setTweakOpen(isOpen);
    if (typeof window !== "undefined") {
      const soundFile = isOpen ? "/fomo_sound.mp3" : "/fomoff.mp3";
      const audio = new Audio(soundFile);
      audio.volume = 0.35;
      audio.play().catch(e => console.warn("Audio play failed:", e));

      window.dispatchEvent(new CustomEvent("tweak-toggle", { detail: isOpen }));
      if (isOpen) {
        window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("sage-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: false }));
        setFomoOpen(false);
        setSageOpen(false);
        setAlertSidebarOpen(false);
      }
    }
  };

  const handleToggleAlerts = (isOpen: boolean) => {
    setAlertSidebarOpen(isOpen);
    if (typeof window !== "undefined") {
      const soundFile = isOpen ? "/fomo_sound.mp3" : "/fomoff.mp3";
      const audio = new Audio(soundFile);
      audio.volume = 0.3;
      audio.play().catch(e => console.warn("Audio play failed:", e));

      window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: isOpen }));
      if (isOpen) {
        window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("sage-toggle", { detail: false }));
        window.dispatchEvent(new CustomEvent("tweak-toggle", { detail: false }));
        setFomoOpen(false);
        setSageOpen(false);
        setTweakOpen(false);
      }
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
      <FomoSidebar open={fomoOpen} onClose={() => handleToggleFomo(false)} activeProject={activeProject} />

      {/* ── SAGE Sidebar ─────────────────────────────────────────────────────── */}
      <SageSidebar open={sageOpen} onClose={() => handleToggleSage(false)} activeProject={activeProject} />

      {/* ── TWEAK Sidebar ────────────────────────────────────────────────────── */}
      <TweakSidebar isOpen={tweakOpen} onClose={() => handleToggleTweak(false)} activeProject={activeProject} />

      {/* ── Main app shell ──────────────────────────────────────────────────── */}
      <div
        className="relative z-10 min-h-screen flex flex-col transition-all duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] overflow-x-hidden"
        style={{ 
          transform: `translateX(${fomoOpen || sageOpen ? 500 : 0}px)`,
          paddingRight: (alertSidebarOpen || tweakOpen) ? "400px" : "0px",
          width: "100%",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-[150] border-b border-primary/20 bg-background/80 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-6">

            {/* Left side: FOMO toggle + App Title */}
            <div className="flex items-center gap-6 animate-fade-up">
              {/* FOMO button (Premium Minimalist style) */}
              <button
                data-header-toggle="true"
                onClick={() => handleToggleFomo(!fomoOpen)}
                className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-2xl transition-all duration-500 group/fomo relative overflow-hidden glass"
                style={{
                  background: fomoOpen ? "rgba(187,150,228,0.15)" : "rgba(255,255,255,0.03)",
                  borderColor: fomoOpen ? "rgba(187,150,228,0.4)" : "rgba(255,255,255,0.08)",
                  color: fomoOpen ? "var(--color-primary)" : "var(--color-muted)",
                  boxShadow: fomoOpen ? "0 8px 32px rgba(187,150,228,0.15)" : "none",
                }}
                title={fomoOpen ? "Cerrar Panel" : "Explorar Mods (FOMO)"}
              >
                <div className="relative flex items-center justify-center">
                  {/* Particles (Ender Eye theme) */}
                  {!fomoOpen && (
                    <>
                      <div className="absolute w-1 h-1 bg-primary/40 rounded-full animate-ender-particle" style={{ "--tw-translate-x": "-15px", "--tw-translate-y": "-15px", animationDelay: "0s" } as any} />
                      <div className="absolute w-1 h-1 bg-accent/40 rounded-full animate-ender-particle" style={{ "--tw-translate-x": "15px", "--tw-translate-y": "-10px", animationDelay: "0.5s" } as any} />
                      <div className="absolute w-1 h-1 bg-primary/30 rounded-full animate-ender-particle" style={{ "--tw-translate-x": "5px", "--tw-translate-y": "18px", animationDelay: "1s" } as any} />
                      <div className="absolute w-1 h-1 bg-accent/30 rounded-full animate-ender-particle" style={{ "--tw-translate-x": "-12px", "--tw-translate-y": "12px", animationDelay: "1.5s" } as any} />
                    </>
                  )}
                  
                  <Image 
                    src="/fomoico.png" 
                    alt="" 
                    width={28} 
                    height={28} 
                    className={`w-7 h-7 object-contain transition-all duration-700 ${fomoOpen ? 'scale-110 brightness-110 rotate-12' : 'animate-ender-eye'}`} 
                  />
                  {/* Subtle aura behind eye when fomo is open */}
                  <div className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-500 ${fomoOpen ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                
                <div className="flex flex-col items-start leading-tight">
                  <span className={`font-headline text-[11px] tracking-[0.15em] transition-colors duration-300 ${fomoOpen ? 'text-primary' : 'text-foreground/80'}`}>FOMO</span>
                  <span className="text-[8px] opacity-30 font-bold tracking-[0.2em] uppercase">Descubrir</span>
                </div>

                <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/10 transition-all duration-500 ${
                  fomoOpen 
                    ? 'rotate-180 bg-primary/10 border-primary/20' 
                    : 'rotate-180 group-hover/fomo:rotate-0 bg-white/5 border-white/10 group-hover/fomo:bg-primary/10 group-hover/fomo:border-primary/20'
                }`}>
                  <ChevronRight className={`w-3 h-3 transition-colors ${fomoOpen ? 'text-primary' : 'text-foreground/40 group-hover/fomo:text-primary'}`} />
                </div>
              </button>

              {/* App Title Wrapper with Premium Styling */}
              <div className="flex flex-col relative group/title">
                {/* Decorative background glow for the title area */}
                <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-2xl opacity-0 group-hover/title:opacity-100 transition-opacity duration-500" />
                
                <h1 className="relative font-headline text-2xl tracking-tighter leading-none flex items-center gap-3">
                  <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-3">
                    <Image src="/icon.png" alt="MIM Logo" width={32} height={32} className="w-8 h-8 rounded-lg shadow-lg animate-slime" />
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
                    Beta
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
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 hover:bg-white/5 ${isRefreshing ? 'rotate-180 text-primary' : ''}`}
                style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                title="Sincronizar con Disco"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/5"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                title="Ajustes de Ubicaciones"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={() => setStagingOpen(true)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 relative ${staging.hasFiles ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' : 'hover:bg-white/5 text-muted-foreground'}`}
                style={{ border: staging.hasFiles ? "1px solid rgba(251,191,36,0.3)" : "1px solid var(--color-border)" }}
                title="Archivos en Staging (Pendientes)"
              >
                <Package className={`w-4 h-4 ${staging.hasFiles ? 'animate-bounce-subtle' : ''}`} />
                {staging.hasFiles && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                  </span>
                )}
              </button>

              {/* ALRT Button */}
              <button
                data-header-toggle="true"
                onClick={() => handleToggleAlerts(!alertSidebarOpen)}
                className={`group h-9 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 hover:bg-red-500/10 ${alertSidebarOpen ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]' : 'hover:bg-white/5'}`}
                style={{ 
                  border: alertSidebarOpen ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--color-border)", 
                  color: alertSidebarOpen ? "#f87171" : "var(--color-muted)" 
                }}
                title={alertSidebarOpen ? "Cerrar Alertas" : "Centro de Alertas e Incompatibilidades (ALRT)"}
              >
                <div className="relative">
                  <Bell className={`w-3.5 h-3.5 transition-all ${alertSidebarOpen ? 'animate-bell-ring text-red-400 scale-110' : 'group-hover:animate-bell-ring'}`} />
                  {hasAlerts && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-headline tracking-widest font-bold">ALRT</span>
              </button>

              {/* SGE Button */}
              <button
                data-header-toggle="true"
                onClick={() => handleToggleSage(!sageOpen)}
                className={`group h-9 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 hover:bg-indigo-500/10 ${sageOpen ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]' : 'hover:bg-white/5'}`}
                style={{ 
                  border: sageOpen ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--color-border)", 
                  color: sageOpen ? "#818cf8" : "var(--color-muted)" 
                }}
                title={sageOpen ? "Cerrar SAGE" : "Analizar Logs y Crashes (SAGE)"}
              >
                <Activity className={`w-3.5 h-3.5 transition-all ${sageOpen ? 'animate-pulse text-indigo-400 scale-110' : ''}`} />
                <span className="text-[10px] font-headline tracking-widest font-bold">SAGE</span>
              </button>

              {/* TWK Button */}
              <button
                data-header-toggle="true"
                onClick={() => handleToggleTweak(!tweakOpen)}
                className={`group h-9 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 hover:bg-primary/10 ${tweakOpen ? 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_15px_rgba(187,150,228,0.25)]' : 'hover:bg-white/5'}`}
                style={{ 
                  border: tweakOpen ? "1px solid rgba(187,150,228,0.4)" : "1px solid var(--color-border)", 
                  color: tweakOpen ? "var(--color-primary)" : "var(--color-muted)" 
                }}
                title={tweakOpen ? "Cerrar TWEAK" : "Ajustes de Juego y Optimización (TWEAK)"}
              >
                <Settings2 className={`w-3.5 h-3.5 transition-all ${tweakOpen ? 'animate-spin-slow text-primary scale-110' : ''}`} />
                <span className="text-[10px] font-headline tracking-widest font-bold">TWEAK</span>
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
        <footer className="px-6 py-10 border-t border-primary/10 bg-background/40 backdrop-blur-md">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-60 hover:opacity-100 transition-opacity duration-700">
            
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2">
                <Image src="/icon.png" alt="" width={20} height={20} className="w-5 h-5 grayscale opacity-50" />
                <span className="font-headline text-[10px] tracking-[0.3em] uppercase text-foreground/50">Minecraft Intelligent Manager</span>
              </div>
              <p className="text-[10px] font-light tracking-wide text-foreground/30">
                &copy; {new Date().getFullYear()} MIM Project. Porque organizar mods manualmente debería ser ilegal.
              </p>
            </div>

            <div className="flex items-center gap-8">
              <a
                href="https://github.com/Ian9Franco/MIM"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-1 transition-all duration-300"
              >
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-foreground/20 group-hover:text-primary/60 transition-colors">Repository</span>
                <span className="text-[11px] font-medium text-foreground/40 group-hover:text-foreground/80 transition-colors">github.com/Ian9Franco/MIM</span>
              </a>

              <div className="w-px h-6 bg-white/5" />

              <a
                href="https://github.com/Ian9Franco"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-1 transition-all duration-300"
              >
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-foreground/20 group-hover:text-primary/60 transition-colors">Developer</span>
                <span className="text-[11px] font-medium text-foreground/40 group-hover:text-foreground/80 transition-colors">@Ian9Franco</span>
              </a>
            </div>

            <div className="hidden lg:block">
              <p className="text-[10px] text-foreground/20 font-thin italic max-w-[200px] text-right leading-relaxed">
                Hecho con mucho cold brew y demasiadas <br /> noches sin dormir por Ian.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {stagingOpen && <StagingModal onClose={() => setStagingOpen(false)} />}
    </div>
  );
}
