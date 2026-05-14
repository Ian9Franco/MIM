import React from "react";
import { 
  X, Activity, ShieldCheck, ShieldAlert, Terminal, Edit3, Heart 
} from "lucide-react";
import type { SageMode } from "@/hooks/useSageManager";

// ── SageHeader ───────────────────────────────────────────────────────────────

export function SageHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative flex items-center justify-between px-6 py-4 border-b shrink-0 bg-white/[0.01]" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group shadow-inner">
          <div className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className="font-headline text-lg font-bold tracking-tight bg-gradient-to-r from-white via-white to-indigo-300 bg-clip-text text-transparent leading-none">
            SAGE
          </h2>
          <p className="font-label text-[8px] opacity-40 mt-1 tracking-[0.12em] uppercase font-bold text-indigo-200">
            Systematic Analyzer for Glitches & Exceptions
          </p>
        </div>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/15 hover:scale-105 active:scale-95 text-muted-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── SageNavigation ───────────────────────────────────────────────────────────

export function SageNavigation({ mode, setMode, activeProject, fetchScannable, secScannable, secLoading }: any) {
  if (!activeProject) {
    return (
      <div className="px-6 pt-4 shrink-0">
        <div className="p-3 rounded-xl border border-white/5 bg-white/2 text-[10px] text-foreground/40 text-center leading-relaxed">
          Selecciona un proyecto de MIM para poder leer sus logs de forma automática.
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "security", label: "Scanner", icon: <ShieldCheck className="w-4 h-4" />, color: "emerald" },
    { id: "crash", label: "Crashes", icon: <ShieldAlert className="w-4 h-4" />, color: "rose" },
    { id: "latest-log", label: "Latest Log", icon: <Terminal className="w-4 h-4" />, color: "indigo" },
    { id: "paste", label: "Manual", icon: <Edit3 className="w-4 h-4" />, color: "amber" },
    { id: "player-rescue", label: "Rescate", icon: <Heart className="w-4 h-4" />, color: "amber" },
  ];

  return (
    <div className="px-6 pt-4 shrink-0 flex gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setMode(tab.id as SageMode);
            if (tab.id === "security" && secScannable.length === 0 && !secLoading) fetchScannable();
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-label text-[10px] font-bold transition-all border ${
            mode === tab.id
              ? `bg-${tab.color}-500/10 border-${tab.color}-500/30 text-${tab.color}-400 shadow-sm`
              : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/70"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── SageEmptyState ───────────────────────────────────────────────────────────

export function SageEmptyState({ icon, title, sub }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30">
      <div className="mb-4">{icon}</div>
      <p className="font-headline text-sm tracking-widest uppercase">{title}</p>
      <p className="font-caption text-[10px] mt-2">{sub}</p>
    </div>
  );
}
