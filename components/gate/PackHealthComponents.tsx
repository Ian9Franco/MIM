"use client";

import React, { useState, useEffect } from "react";
import {
  XCircle, AlertTriangle, Info, ChevronDown,
  Search, FolderInput, Settings
} from "lucide-react";
import type { ValidationIssue, ValidationSeverity } from "@/lib/types";

// ── Severity Config ───────────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<ValidationSeverity, {
  icon: React.ReactNode; color: string; bg: string; border: string;
}> = {
  error:      { icon: <XCircle       className="w-3.5 h-3.5 shrink-0" />, color: "var(--color-theme-error)",   bg: "color-mix(in srgb, var(--color-theme-error) 7%, transparent)", border: "color-mix(in srgb, var(--color-theme-error) 20%, transparent)" },
  warning:    { icon: <AlertTriangle  className="w-3.5 h-3.5 shrink-0" />, color: "var(--color-theme-warning)", bg: "color-mix(in srgb, var(--color-theme-warning) 7%, transparent)", border: "color-mix(in srgb, var(--color-theme-warning) 20%, transparent)" },
  suggestion: { icon: <Info           className="w-3.5 h-3.5 shrink-0" />, color: "var(--color-theme-info)",    bg: "color-mix(in srgb, var(--color-theme-info) 7%, transparent)", border: "color-mix(in srgb, var(--color-theme-info) 20%, transparent)" },
};

// ── Issue Row ─────────────────────────────────────────────────────────────────

export function IssueRow({ issue, onFomoSearch, activeProject }: { issue: ValidationIssue; onFomoSearch: (q: string) => void, activeProject?: any }) {
  const cfg = SEVERITY_CONFIG[issue.severity];
  const [expanded, setExpanded] = useState(false);

  const handleFix = async (action: string, payload?: any) => {
    if (!activeProject) return;
    try {
      await fetch("/api/project/fix-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: activeProject.name,
          version: activeProject.version,
          loader: activeProject.loader,
          fileName: issue.modFile,
          action,
          payload
        })
      });
      window.dispatchEvent(new Event("refresh-system"));
      window.dispatchEvent(new CustomEvent("pack-health-toggle", { detail: false }));
    } catch (e) {
      console.error(e);
    }
  };

  const getAction = () => {
    if (!issue.fixAction) return null;
    
    const map: Record<string, { label: string; icon: React.ReactNode; fn: () => void }> = {
      fomo_search:    { label: "Buscar en FOMO", icon: <Search      className="w-3 h-3" />, fn: () => onFomoSearch(issue.fixPayload?.query ?? issue.affectedMod ?? "") },
      move_to_local:  { label: "→ .local",        icon: <FolderInput className="w-3 h-3" />, fn: () => handleFix("move_to_local", issue.fixPayload) },
      move_to_server: { label: "→ .server",        icon: <FolderInput className="w-3 h-3" />, fn: () => handleFix("move_to_server", issue.fixPayload) },
      disable:        { label: "Deshabilitar",     icon: <Settings   className="w-3 h-3" />, fn: () => handleFix("disable") },
      override:       { label: "Corregir Meta",    icon: <Settings    className="w-3 h-3" />, fn: () => handleFix("override", issue.fixPayload) },
    };
    const a = map[issue.fixAction];
    const b = issue.secondaryAction ? map[issue.secondaryAction] : null;

    if (!a && !b) return null;

    return (
      <div className="flex items-center gap-1.5">
        {a && (
          <button
            onClick={(e) => { e.stopPropagation(); a.fn(); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 hover:brightness-125 active:scale-95 shrink-0"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, boxShadow: `0 2px 8px ${cfg.bg}` }}
          >
            {a.icon}
            {a.label}
          </button>
        )}
        {b && (
          <button
            onClick={(e) => { e.stopPropagation(); b.fn(); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 hover:opacity-100 active:scale-95 shrink-0 opacity-60"
            style={{ background: "transparent", color: "var(--color-foreground)", border: `1px solid var(--color-border)` }}
          >
            {b.icon}
            {b.label}
          </button>
        )}
      </div>
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
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-[10px] font-medium transition-colors duration-200" style={{ color: "var(--color-foreground)", opacity: 0.5 }}>
              En mod: <span className="opacity-100">{issue.modName}</span>
            </p>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40">{issue.modType || "mod"}</span>
          </div>
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

// ── Issue Section ─────────────────────────────────────────────────────────────

function IssueSectionRaw({
  title, count, issues, defaultOpen, onFomoSearch, dotColor, forceOpen, activeProject,
}: {
  title: string;
  count: number;
  issues: ValidationIssue[];
  defaultOpen: boolean;
  onFomoSearch: (q: string) => void;
  dotColor: string;
  forceOpen?: boolean;
  activeProject?: any;
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
            <IssueRow key={i} issue={issue} onFomoSearch={onFomoSearch} activeProject={activeProject} />
          ))}
        </div>
      )}
    </div>
  );
}

export const IssueSection = React.forwardRef(IssueSectionRaw);
