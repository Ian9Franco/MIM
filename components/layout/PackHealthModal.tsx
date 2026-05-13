"use client";

/**
 * PackHealthPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel lateral de resultado de validación de pack.
 * Diseñado como parte de la app — entra desde la derecha empujando el
 * contenido, sin overlay, sin oscurecer la interfaz. Igual que ALRT y TWEAK.
 *
 * Flujo de integración:
 *   1. BuildPanel llama a /api/validate y recibe un PackHealthReport
 *   2. Si hay issues, monta PackHealthPanel
 *   3. PackHealthPanel despacha "pack-health-toggle: true" → RootLayoutClient
 *      ajusta paddingRight → contenido se mueve a la izquierda
 *   4. Panel slides in desde la derecha con cubic-bezier spring
 *   5. Al cerrar: "pack-health-toggle: false" → paddingRight vuelve a 0
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  XCircle, CheckCircle, AlertTriangle, Info, ChevronDown,
  Loader2, Search, FolderInput, ShieldOff, Zap, ShieldCheck,
} from "lucide-react";
import type { PackHealthReport, ValidationIssue, ValidationSeverity } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PackHealthPanelProps {
  report:       PackHealthReport;
  onClose:      () => void;
  onForceBuild?: () => void;
  onFomoSearch: (query: string) => void;
  isBuilding:   boolean;
}

// ── Grade config ──────────────────────────────────────────────────────────────

const GRADE_CONFIG = {
  S: { color: "#a855f7", glow: "rgba(168,85,247,0.18)", label: "Perfecto",     emoji: "✦" },
  A: { color: "#22c55e", glow: "rgba(34,197,94,0.15)",  label: "Excelente",    emoji: "✓" },
  B: { color: "#06b6d4", glow: "rgba(6,182,212,0.15)",  label: "Bueno",        emoji: "◈" },
  C: { color: "#f59e0b", glow: "rgba(245,158,11,0.15)", label: "Aceptable",    emoji: "⚠" },
  D: { color: "#f97316", glow: "rgba(249,115,22,0.15)", label: "Problemático", emoji: "!" },
  F: { color: "#ef4444", glow: "rgba(239,68,68,0.18)",  label: "Bloqueado",    emoji: "✗" },
} as const;

const SEVERITY_CONFIG: Record<ValidationSeverity, {
  icon: React.ReactNode; color: string; bg: string; border: string;
}> = {
  error:      { icon: <XCircle       className="w-3.5 h-3.5 shrink-0" />, color: "var(--color-theme-error)",   bg: "color-mix(in srgb, var(--color-theme-error) 7%, transparent)", border: "color-mix(in srgb, var(--color-theme-error) 20%, transparent)" },
  warning:    { icon: <AlertTriangle  className="w-3.5 h-3.5 shrink-0" />, color: "var(--color-theme-warning)", bg: "color-mix(in srgb, var(--color-theme-warning) 7%, transparent)", border: "color-mix(in srgb, var(--color-theme-warning) 20%, transparent)" },
  suggestion: { icon: <Info           className="w-3.5 h-3.5 shrink-0" />, color: "var(--color-theme-info)",    bg: "color-mix(in srgb, var(--color-theme-info) 7%, transparent)", border: "color-mix(in srgb, var(--color-theme-info) 20%, transparent)" },
};

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
        <span className="text-[8px] tracking-widest uppercase mt-0.5" style={{ color: "var(--color-foreground)", opacity: 0.25 }}>/ 100</span>
      </div>
    </div>
  );
}

// ── Issue Row ─────────────────────────────────────────────────────────────────

function IssueRow({ issue, onFomoSearch }: { issue: ValidationIssue; onFomoSearch: (q: string) => void }) {
  const cfg = SEVERITY_CONFIG[issue.severity];
  const [expanded, setExpanded] = useState(false);

  const getAction = () => {
    if (!issue.fixAction) return null;
    const map: Record<string, { label: string; icon: React.ReactNode; fn: () => void }> = {
      fomo_search:    { label: "Buscar en FOMO", icon: <Search      className="w-3 h-3" />, fn: () => onFomoSearch(issue.fixPayload?.query ?? issue.affectedMod ?? "") },
      move_to_local:  { label: "→ .local",        icon: <FolderInput className="w-3 h-3" />, fn: () => {} },
      move_to_server: { label: "→ .server",        icon: <FolderInput className="w-3 h-3" />, fn: () => {} },
      disable:        { label: "Deshabilitar",     icon: <ShieldOff   className="w-3 h-3" />, fn: () => {} },
    };
    const a = map[issue.fixAction];
    if (!a) return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); a.fn(); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 hover:brightness-125 active:scale-95 shrink-0"
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, boxShadow: `0 2px 8px ${cfg.bg}` }}
      >
        {a.icon}
        {a.label}
      </button>
    );
  };

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg animate-scale-in"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5 group">
        <span className="mt-0.5 transition-transform duration-300 group-hover:scale-110" style={{ color: cfg.color }}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold leading-tight transition-colors duration-200 uppercase tracking-tight" style={{ color: cfg.color }}>
            {issue.message}
          </p>
          <p className="text-[10px] mt-1 font-medium transition-colors duration-200" style={{ color: "var(--color-foreground)", opacity: 0.5 }}>
            En mod: <span className="opacity-100">{issue.modName}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {getAction()}
          {issue.details && (
            <ChevronDown
              className="w-3 h-3 transition-transform"
              style={{ color: "rgba(255,255,255,0.2)", transform: expanded ? "rotate(180deg)" : "" }}
            />
          )}
        </div>
      </div>
      {expanded && issue.details && (
        <div
          className="px-3 pb-2.5 text-[10px] leading-relaxed animate-fade-in"
          style={{ color: "var(--color-foreground)", opacity: 0.6, borderTop: `1px solid ${cfg.border}` }}
        >
          {issue.details}
        </div>
      )}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function IssueSectionRaw({
  title, count, issues, defaultOpen, onFomoSearch, dotColor, forceOpen,
}: {
  title: string;
  count: number;
  issues: ValidationIssue[];
  defaultOpen: boolean;
  onFomoSearch: (q: string) => void;
  dotColor: string;
  forceOpen?: boolean;
}, ref: React.ForwardedRef<HTMLDivElement>) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  if (count === 0) return null;

  return (
    <div ref={ref}>
      <button
        className="w-full flex items-center gap-2 py-1.5 group"
        onClick={() => setOpen(o => !o)}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-wider transition-colors duration-200" style={{ color: "var(--color-foreground)", opacity: open ? 0.8 : 0.5 }}>
          {title} ({count})
        </span>
        <ChevronDown
          className="w-3 h-3 transition-transform duration-300"
          style={{ color: "var(--color-foreground)", opacity: 0.2, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="space-y-1.5 mt-1">
          {issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} onFomoSearch={onFomoSearch} />
          ))}
        </div>
      )}
    </div>
  );
}
const IssueSection = React.forwardRef(IssueSectionRaw);

// ── Main Panel ────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 400;

export function PackHealthPanel({
  report, onClose, onForceBuild, onFomoSearch, isBuilding,
}: PackHealthPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const grade = report.grade;
  const cfg = GRADE_CONFIG[grade];

  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const errorsRef = React.useRef<HTMLDivElement>(null);
  const warningsRef = React.useRef<HTMLDivElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  const [forceExpand, setForceExpand] = useState<{ errors?: boolean, warnings?: boolean, suggestions?: boolean }>({});

  // Mount + slide-in animation
  useEffect(() => {
    setMounted(true);
    const t = requestAnimationFrame(() => setVisible(true));
    // Notify RootLayoutClient to add paddingRight
    window.dispatchEvent(new CustomEvent("pack-health-toggle", { detail: true }));
    return () => {
      cancelAnimationFrame(t);
      window.dispatchEvent(new CustomEvent("pack-health-toggle", { detail: false }));
    };
  }, []);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (visible && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Ignore clicks on buttons that toggle panels (they have their own handlers)
        if (target.closest('[data-header-toggle="true"]')) return;
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible]);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>, type: 'errors' | 'warnings' | 'suggestions') => {
    setForceExpand({ [type]: true });
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Reset forceExpand after a while to allow manual toggling again
      setTimeout(() => setForceExpand({}), 500);
    }, 50);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 420);
  };

  if (!mounted) return null;

  const panel = (
    <div
      ref={sidebarRef}
      style={{
        position:   "fixed",
        top:        0,
        right:      0,
        bottom:     0,
        width:      `${PANEL_WIDTH}px`,
        zIndex:     200,
        display:    "flex",
        flexDirection: "column",
        transform:  visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        // Glass — matches otros paneles, usando tokens del theme
        background:       "var(--glass-bg)",
        backdropFilter:   "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft:       `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
        boxShadow:        `-24px 0 60px rgba(0,0,0,0.45), inset 1px 0 0 color-mix(in srgb, ${cfg.color} 10%, transparent)`,
      }}
    >
      {/* Accent glow strip at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
          opacity: 0.7,
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4" style={{ color: cfg.color }} />
          <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--color-foreground)", opacity: 0.75 }}>
            Pack Health
          </span>
        </div>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 hover:rotate-90 hover:scale-110 active:scale-95"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        >
          <XCircle className="w-3.5 h-3.5" style={{ color: "var(--color-foreground)", opacity: 0.4 }} />
        </button>
      </div>

      {/* ── Score area ──────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 flex items-center gap-5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <ScoreRing score={report.score} grade={grade} />

        <div className="flex-1 min-w-0 space-y-3">
          {/* Grade badge + label */}
          <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-lg"
              style={{ background: `color-mix(in srgb, ${cfg.color} 18%, transparent)`, color: cfg.color, border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)` }}
            >
              {grade}
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--color-foreground)", opacity: 0.9 }}>{cfg.label}</p>
              <p className="text-[9px] tracking-wider mt-0.5 uppercase" style={{ color: "var(--color-foreground)", opacity: 0.45 }}>
                {report.totalMods} mods · {report.buildTarget}
              </p>
            </div>
          </div>

          {/* Counters row */}
          <div className="flex gap-2">
            <button 
              onClick={() => scrollToSection(errorsRef, 'errors')}
              className="flex-1 rounded-lg p-2 text-center transition-all hover:scale-105 active:scale-95" 
              style={{ background: "color-mix(in srgb, var(--color-theme-error) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-theme-error) 15%, transparent)" }}
            >
              <p className="text-base font-bold leading-none" style={{ color: "var(--color-theme-error)" }}>{report.errors.length}</p>
              <p className="text-[8px] mt-0.5 uppercase tracking-wider" style={{ color: "var(--color-theme-error)", opacity: 0.6 }}>Errores</p>
            </button>
            <button 
              onClick={() => scrollToSection(warningsRef, 'warnings')}
              className="flex-1 rounded-lg p-2 text-center transition-all hover:scale-105 active:scale-95" 
              style={{ background: "color-mix(in srgb, var(--color-theme-warning) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-theme-warning) 15%, transparent)" }}
            >
              <p className="text-base font-bold leading-none" style={{ color: "var(--color-theme-warning)" }}>{report.warnings.length}</p>
              <p className="text-[8px] mt-0.5 uppercase tracking-wider" style={{ color: "var(--color-theme-warning)", opacity: 0.6 }}>Warnings</p>
            </button>
            <button 
              onClick={() => scrollToSection(suggestionsRef, 'suggestions')}
              className="flex-1 rounded-lg p-2 text-center transition-all hover:scale-105 active:scale-95" 
              style={{ background: "color-mix(in srgb, var(--color-theme-info) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-theme-info) 15%, transparent)" }}
            >
              <p className="text-base font-bold leading-none" style={{ color: "var(--color-theme-info)" }}>{report.suggestions.length}</p>
              <p className="text-[8px] mt-0.5 uppercase tracking-wider" style={{ color: "var(--color-theme-info)", opacity: 0.6 }}>Tips</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── Issues — scrollable body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">

        {/* Perfect pack */}
        {report.issues.length === 0 && (
          <div
            className="flex items-center gap-3 p-4 rounded-2xl animate-fade-in transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)", boxShadow: "0 8px 30px rgba(34,197,94,0.1)" }}
          >
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-400">Pack perfecto</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-foreground)", opacity: 0.55 }}>Sin issues detectados.</p>
            </div>
          </div>
        )}

        <IssueSection 
          ref={errorsRef}
          title="Errores bloqueantes" count={report.errors.length}
          issues={report.errors} defaultOpen={true}
          onFomoSearch={onFomoSearch} dotColor="#ef4444"
          forceOpen={forceExpand.errors}
        />
        <IssueSection 
          ref={warningsRef}
          title="Advertencias" count={report.warnings.length}
          issues={report.warnings} defaultOpen={report.errors.length === 0}
          onFomoSearch={onFomoSearch} dotColor="#f59e0b"
          forceOpen={forceExpand.warnings}
        />
        <IssueSection 
          ref={suggestionsRef}
          title="Sugerencias" count={report.suggestions.length}
          issues={report.suggestions} defaultOpen={false}
          onFomoSearch={onFomoSearch} dotColor="#06b6d4"
          forceOpen={forceExpand.suggestions}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 flex flex-col gap-2 shrink-0"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        {/* Blocked state */}
        {report.blocksExport && (
          <div
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold animate-pulse"
            style={{ background: "color-mix(in srgb, var(--color-theme-error) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-theme-error) 20%, transparent)", color: "var(--color-theme-error)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            <XCircle className="w-3.5 h-3.5" />
            Exportación bloqueada — corregí los errores
          </div>
        )}

        {/* Force export with warnings only */}
        {onForceBuild && !report.blocksExport && report.warnings.length > 0 && (
          <button
            onClick={() => { onForceBuild(); handleClose(); }}
            disabled={isBuilding}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 hover:opacity-100 hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24", boxShadow: "0 8px 24px rgba(245,158,11,0.1)" }}
          >
            {isBuilding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Exportar con advertencias
          </button>
        )}

        {/* Clean export */}
        {onForceBuild && !report.blocksExport && report.warnings.length === 0 && (
          <button
            onClick={() => { onForceBuild(); handleClose(); }}
            disabled={isBuilding}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 hover:-translate-y-1 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ background: "var(--color-primary)", color: "#fff", boxShadow: "0 8px 25px color-mix(in srgb, var(--color-primary) 40%, transparent)" }}
          >
            {isBuilding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Exportar Pack
          </button>
        )}

        <button
          onClick={handleClose}
          className="w-full py-2 text-[10px] font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ color: "var(--color-foreground)", opacity: 0.4 }}
        >
          ← Cerrar y corregir
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(panel, document.body);
}
