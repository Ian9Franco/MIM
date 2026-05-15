"use client";

/**
 * PackHealthPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel lateral de resultado de validación de pack.
 * Optimized for v5.9: Components extracted to PackHealthComponents.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { XCircle, ShieldCheck, CheckCircle } from "lucide-react";
import type { PackHealthReport } from "@/lib/types";
import { IssueSection } from "./PackHealthComponents";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PackHealthPanelProps {
  report:       PackHealthReport;
  isOpen:       boolean;
  onClose:      () => void;
  onForceBuild?: () => void;
  onFomoSearch: (query: string) => void;
  isBuilding:   boolean;
  activeProject?: { name: string; version: string; loader: string } | null;
}

const GRADE_CONFIG = {
  S: { color: "#a855f7", label: "Perfecto" },
  A: { color: "#22c55e", label: "Excelente" },
  B: { color: "#06b6d4", label: "Bueno" },
  C: { color: "#f59e0b", label: "Aceptable" },
  D: { color: "#f97316", label: "Problemático" },
  F: { color: "#ef4444", label: "Bloqueado" },
} as const;

// ── Animated Score Ring ───────────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: keyof typeof GRADE_CONFIG }) {
  const [display, setDisplay] = useState(0);
  const cfg = GRADE_CONFIG[grade];
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (display / 100) * circ;

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / 950, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(e * score));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={cfg.color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 6px ${cfg.color}70)` }}
        />
      </svg>
      <div className="flex flex-col items-center z-10 leading-none">
        <span className="text-2xl font-bold tabular-nums" style={{ color: cfg.color }}>{display}</span>
        <span className="text-[8px] tracking-widest uppercase mt-0.5 opacity-25">/ 100</span>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function PackHealthPanel({
  report, isOpen, onClose, onForceBuild, onFomoSearch, isBuilding, activeProject
}: PackHealthPanelProps) {
  const grade = report.grade;
  const cfg = GRADE_CONFIG[grade];

  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const errorsRef = React.useRef<HTMLDivElement>(null);
  const warningsRef = React.useRef<HTMLDivElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  const [forceExpand, setForceExpand] = useState<{ errors?: boolean, warnings?: boolean, suggestions?: boolean }>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Escape & Click Outside
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const click = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest('[data-header-toggle="true"]')) onClose();
      }
    };
    window.addEventListener("keydown", h);
    document.addEventListener("mousedown", click);
    return () => { window.removeEventListener("keydown", h); document.removeEventListener("mousedown", click); };
  }, [isOpen, onClose]);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>, type: 'errors' | 'warnings' | 'suggestions') => {
    setForceExpand({ [type]: true });
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => setForceExpand({}), 500);
    }, 50);
  };

  const panel = (
      <aside
        ref={sidebarRef}
        className="fixed inset-y-0 right-0 w-[400px] z-[200] flex flex-col transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-r-0"
        style={{
          transform:  visible ? "translateX(0)" : "translateX(100%)",
          opacity:    visible ? 1 : 0,
          background: "var(--glass-bg)",
          borderColor: "var(--color-border)",
          borderLeftColor: `color-mix(in srgb, ${cfg.color} 30%, transparent)`,
          backdropFilter: "blur(40px)",
          borderRadius: "2.5rem 0 0 2.5rem",
          boxShadow:  `-24px 0 60px rgba(0,0,0,0.45), inset 1px 0 0 color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        }}
      >
      <div className="absolute top-0 inset-x-0 h-[2px] opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5 opacity-70">
          <ShieldCheck className="w-4 h-4" style={{ color: cfg.color }} />
          <span className="text-[11px] font-bold tracking-widest uppercase">Pack Health</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/5 hover:rotate-90 hover:scale-110 active:scale-95 transition-all">
          <XCircle className="w-3.5 h-3.5 opacity-40" />
        </button>
      </div>

      {/* Score */}
      <div className="px-5 py-4 flex items-center gap-5 border-b border-white/5">
        <ScoreRing score={report.score} grade={grade} />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black shadow-lg" style={{ background: `color-mix(in srgb, ${cfg.color} 18%, transparent)`, color: cfg.color, border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)` }}>{grade}</span>
            <div>
              <p className="text-sm font-semibold opacity-90">{cfg.label}</p>
              <p className="text-[9px] tracking-wider uppercase opacity-45">{report.totalMods} mods · {report.buildTarget}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Errores', count: report.errors.length, color: 'var(--color-theme-error)', ref: errorsRef, key: 'errors' },
              { label: 'Warnings', count: report.warnings.length, color: 'var(--color-theme-warning)', ref: warningsRef, key: 'warnings' },
              { label: 'Tips', count: report.suggestions.length, color: 'var(--color-theme-info)', ref: suggestionsRef, key: 'suggestions' }
            ].map(b => (
              <button key={b.key} onClick={() => scrollToSection(b.ref as any, b.key as any)} className="flex-1 rounded-lg p-2 text-center hover:scale-105 active:scale-95 transition-all" style={{ background: `color-mix(in srgb, ${b.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${b.color} 15%, transparent)` }}>
                <p className="text-base font-bold" style={{ color: b.color }}>{b.count}</p>
                <p className="text-[8px] uppercase tracking-wider opacity-60" style={{ color: b.color }}>{b.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Issues */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
        {report.issues.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 shadow-lg shadow-green-500/5 transition-all hover:-translate-y-1">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs font-semibold text-green-400">Pack perfecto</p>
              <p className="text-[10px] opacity-50">Sin issues detectados.</p>
            </div>
          </div>
        )}
        <IssueSection ref={errorsRef} title="Errores bloqueantes" count={report.errors.length} issues={report.errors} defaultOpen={true} onFomoSearch={onFomoSearch} dotColor="#ef4444" forceOpen={forceExpand.errors} activeProject={activeProject} />
        <IssueSection ref={warningsRef} title="Advertencias" count={report.warnings.length} issues={report.warnings} defaultOpen={report.errors.length === 0} onFomoSearch={onFomoSearch} dotColor="#f59e0b" forceOpen={forceExpand.warnings} activeProject={activeProject} />
        <IssueSection ref={suggestionsRef} title="Sugerencias" count={report.suggestions.length} issues={report.suggestions} defaultOpen={false} onFomoSearch={onFomoSearch} dotColor="#06b6d4" forceOpen={forceExpand.suggestions} activeProject={activeProject} />
      </div>

      {/* Footer */}
      <div className="px-5 py-4 flex flex-col gap-2 border-t border-white/5">
        {report.blocksExport && <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse">Exportación bloqueada</div>}
        {onForceBuild && !report.blocksExport && (
          <button onClick={() => { onForceBuild(); onClose(); }} disabled={isBuilding} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-40 ${report.warnings.length > 0 ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-primary text-white shadow-lg shadow-primary/30"}`}>
            {report.warnings.length > 0 ? "Exportar con advertencias" : "Exportar Pack"}
          </button>
        )}
        <button onClick={onClose} className="w-full py-2 text-[10px] font-medium opacity-40 hover:opacity-100 transition-all">← Cerrar y corregir</button>
      </div>
    </aside>
  );

  return ReactDOM.createPortal(panel, document.body);
}
