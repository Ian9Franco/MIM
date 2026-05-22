"use client";

/**
 * BuildPanel — con Build Gate integrado.
 * ─────────────────────────────────────────────────────────────────────────────
 * Flujo:
 *   1. Usuario hace click en Build alluser / allhost
 *   2. Se llama a /api/validate (instantáneo gracias al scanner cache)
 *   3a. Si score perfecto (sin issues) → build directo, toast
 *   3b. Si hay issues → abre PackHealthModal
 *      3b-I.  Errores: modal bloqueado, solo permite "← Corregir"
 *      3b-II. Warnings: permite "Exportar con advertencias"
 *      3b-III. Sin errores: permite "Exportar Pack" directamente
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from "react";
import { Archive, Server, Loader2, CheckCircle, XCircle, FolderOpen, ShieldCheck, Pickaxe } from "lucide-react";
import type { PackHealthReport } from "@/lib/core/types";

type BuildType = "alluser" | "allhost";

interface BuildResult {
  success:    boolean;
  message:    string;
  modsCount:  number;
  outputPath: string;
}

interface BuildPanelProps {
  projectName: string;
  version:     string;
  loader:      string;
}

export function BuildPanel({ projectName, version, loader }: BuildPanelProps) {
  const [building, setBuilding]       = useState<BuildType | null>(null);
  const [validating, setValidating]   = useState<BuildType | null>(null);
  const [result, setResult]           = useState<{ type: BuildType; data: BuildResult } | null>(null);
  const [healthReport, setHealthReport] = useState<PackHealthReport | null>(null);
  const [pendingBuildType, setPendingBuildType] = useState<BuildType | null>(null);

  // ── Core build execution (called after validation passes) ─────────────────
  const executeBuild = useCallback(async (buildType: BuildType) => {
    setHealthReport(null);
    setPendingBuildType(null);
    setBuilding(buildType);
    setResult(null);
    try {
      const res  = await fetch("/api/build", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectName, version, loader, buildType }),
      });
      const data = await res.json();
      setResult({
        type: buildType,
        data: res.ok
          ? data
          : { success: false, message: data.error, modsCount: 0, outputPath: "" },
      });
    } catch {
      setResult({ type: buildType, data: { success: false, message: "Error de red", modsCount: 0, outputPath: "" } });
    } finally {
      setBuilding(null);
    }
  }, [projectName, version, loader]);

  // ── Gate: validate first, then decide ─────────────────────────────────────
  const handleBuildClick = useCallback(async (buildType: BuildType) => {
    setValidating(buildType);
    setResult(null);
    try {
      const res = await fetch("/api/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectName, version, loader, buildTarget: buildType }),
      });
      const report: PackHealthReport = await res.json();
      
      // Emit event for ALRT/GATE integration
      import("@/lib/events/eventBus").then(({ eventBus }) => {
        eventBus.emit("builder:validation-completed", {
          buildId: report.validatedAt || Date.now().toString(),
          validationType: "compatibility",
          passed: report.score === 100 || !report.issues.some(i => i.severity === "error"),
          issues: report.issues.filter(i => i.severity === "error").map(i => i.message),
          warnings: report.issues.filter(i => i.severity === "warning").map(i => i.message)
        });
      });

      if (!res.ok) {
        // API error — proceed without gate (fail-open: don't block on validator crash)
        console.warn("[BuildPanel] Validation API error, proceeding anyway:", report);
        executeBuild(buildType);
        return;
      }

      if (report.issues.length === 0) {
        // Perfect pack — build directly
        executeBuild(buildType);
        return;
      }

      // Has issues — show modal
      setHealthReport(report);
      setPendingBuildType(buildType);
    } catch (err) {
      console.warn("[BuildPanel] Validation failed, proceeding without gate:", err);
      executeBuild(buildType);
    } finally {
      setValidating(null);
    }
  }, [projectName, version, loader, executeBuild]);

  // Atajos de teclado: H y U
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        handleBuildClick("allhost");
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        handleBuildClick("alluser");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBuildClick]);

  // ── Sync health report to global panel ──────────────────────────────────
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  if (healthReport && pendingBuildType && healthReport.validatedAt !== lastReportId) {
    setLastReportId(healthReport.validatedAt);
    window.dispatchEvent(new CustomEvent("pack-health-toggle", { 
      detail: { 
        open: true, 
        report: healthReport, 
        onForceBuild: () => executeBuild(pendingBuildType),
        buildType: pendingBuildType
      } 
    }));
    setHealthReport(null);
  }

  // ── FOMO search integration ────────────────────────────────────────────────
  const handleFomoSearch = useCallback((query: string) => {
    setHealthReport(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
    }
  }, []);

  const busy = !!(building || validating);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* alluser */}
        <BuildButton
          type="alluser"
          icon={<Archive className="w-4.5 h-4.5" />}
          title="Build alluser"
          subtitle=".zip listo para jugadores"
          tags=".essential · .local · shaders"
          accentColor="var(--color-primary)"
          accentBg="rgba(187,150,228,0.08)"
          accentBorder="rgba(187,150,228,0.2)"
          isValidating={validating === "alluser"}
          isBuilding={building === "alluser"}
          disabled={busy}
          onClick={() => handleBuildClick("alluser")}
        />

        {/* allhost */}
        <BuildButton
          type="allhost"
          icon={<Server className="w-4.5 h-4.5" />}
          title="Build allhost"
          subtitle="Carpeta lista para servidor"
          tags=".essential · .server · datapacks"
          accentColor="var(--color-accent)"
          accentBg="rgba(255,208,102,0.06)"
          accentBorder="rgba(255,208,102,0.18)"
          isValidating={validating === "allhost"}
          isBuilding={building === "allhost"}
          disabled={busy}
          onClick={() => handleBuildClick("allhost")}
        />
      </div>

      {/* Build result */}
      {result && (
        <div
          className="flex items-start gap-3 p-4 rounded-[1.5rem] border animate-scale-in"
          style={{
            background:   result.data.success ? "rgba(16,92,64,0.25)"  : "rgba(92,16,16,0.25)",
            borderColor:  result.data.success ? "rgba(102,200,160,0.25)" : "rgba(239,68,68,0.25)",
          }}
        >
          {result.data.success
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#66C8A0" }} />
            : <XCircle     className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-body-med text-sm" style={{ color: result.data.success ? "#a7f3d0" : "#fca5a5" }}>
              {result.data.message}
            </p>
            {result.data.success && result.data.modsCount > 0 && (
              <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>
                {result.data.modsCount} mods incluidos
              </p>
            )}
            {result.data.success && result.data.outputPath && (
              <div className="flex items-center gap-1.5 mt-2">
                <FolderOpen className="w-3 h-3 shrink-0" style={{ color: "var(--color-muted)" }} />
                <p className="font-caption font-mono truncate" style={{ color: "var(--color-muted)", fontSize: "0.65rem" }}>
                  {result.data.outputPath}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pack Health is now handled globally by RootLayoutClient via events */}
    </div>
  );
}

// ── Internal sub-component ────────────────────────────────────────────────────

function BuildButton({
  icon, title, subtitle, tags,
  accentColor, accentBg, accentBorder,
  isValidating, isBuilding, disabled, onClick,
}: {
  type:          BuildType;
  icon:          React.ReactNode;
  title:         string;
  subtitle:      string;
  tags:          string;
  accentColor:   string;
  accentBg:      string;
  accentBorder:  string;
  isValidating:  boolean;
  isBuilding:    boolean;
  disabled:      boolean;
  onClick:       () => void;
}) {
  const busy = isValidating || isBuilding;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative text-left rounded-[1.5rem] overflow-hidden transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background:     accentBg,
        border:         `1px solid ${accentBorder}`,
        padding:        "1.1rem",
        backdropFilter: "blur(14px)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform   = "translateY(-2px)";
          el.style.boxShadow   = "0 10px 28px rgba(0,0,0,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform   = "translateY(0)";
          el.style.borderColor = accentBorder;
          el.style.boxShadow   = "none";
        }
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)`, border: `1px solid ${accentBorder}`, color: accentColor }}
        >
          {isBuilding
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isValidating
              ? <ShieldCheck className="w-4 h-4 animate-pulse" />
              : icon
          }
        </div>
        <div>
          <p className="font-subhead text-sm transition-colors duration-200" style={{ color: "var(--color-foreground)" }}>
            {title}
          </p>
          <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>
            {isValidating ? "Validando pack…" : isBuilding ? "Generando…" : subtitle}
          </p>
          <p className="font-label mt-2" style={{ color: accentColor, opacity: 0.5, fontSize: "0.58rem" }}>{tags}</p>
        </div>
      </div>
    </button>
  );
}