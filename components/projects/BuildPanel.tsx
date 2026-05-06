"use client";

import { useState } from "react";
import { Archive, Server, Loader2, CheckCircle, XCircle, FolderOpen } from "lucide-react";

type BuildType = "alluser" | "allhost";

interface BuildResult {
  success: boolean;
  message: string;
  modsCount: number;
  outputPath: string;
}

interface BuildPanelProps {
  projectName: string;
  version: string;
  loader: string;
}

/**
 * Panel de construcción (Build). Permite generar las versiones "alluser" 
 * (para el cliente) o "allhost" (para el servidor) enviando una petición
 * al endpoint de la API.
 */
export function BuildPanel({ projectName, version, loader }: BuildPanelProps) {
  const [building, setBuilding] = useState<BuildType | null>(null);
  const [result, setResult]     = useState<{ type: BuildType; data: BuildResult } | null>(null);

  const runBuild = async (buildType: BuildType) => {
    setBuilding(buildType);
    setResult(null);
    try {
      const res  = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, loader, buildType }),
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
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── alluser ─────────────────────────────────────────────── */}
        <BuildButton
          type="alluser"
          icon={<Archive className="w-4.5 h-4.5" />}
          title="Build alluser"
          subtitle=".zip listo para jugadores"
          tags=".essential · .local · shaders"
          accentColor="var(--color-primary)"
          accentBg="rgba(187,150,228,0.08)"
          accentBorder="rgba(187,150,228,0.2)"
          isBuilding={building === "alluser"}
          disabled={!!building}
          onClick={() => runBuild("alluser")}
        />

        {/* ── allhost ─────────────────────────────────────────────── */}
        <BuildButton
          type="allhost"
          icon={<Server className="w-4.5 h-4.5" />}
          title="Build allhost"
          subtitle="Carpeta lista para servidor"
          tags=".essential · .server · datapacks"
          accentColor="var(--color-accent)"
          accentBg="rgba(255,208,102,0.06)"
          accentBorder="rgba(255,208,102,0.18)"
          isBuilding={building === "allhost"}
          disabled={!!building}
          onClick={() => runBuild("allhost")}
        />
      </div>

      {/* ── Result ──────────────────────────────────────────────────── */}
      {result && (
        <div
          className="flex items-start gap-3 p-4 rounded-[1.5rem] border animate-scale-in"
          style={{
            background: result.data.success ? "rgba(16,92,64,0.25)"  : "rgba(92,16,16,0.25)",
            borderColor: result.data.success ? "rgba(102,200,160,0.25)" : "rgba(239,68,68,0.25)",
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

      {/* ── Open Project Folder Button ──────────────────────────────────────────────────── */}
      <button
        onClick={async () => {
          try {
            await fetch("/api/project/open", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectName, version }),
            });
          } catch (e) {
            console.error(e);
          }
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[1.5rem] transition-all group"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed var(--color-border-strong)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "rgba(255,255,255,0.06)";
          el.style.borderColor = "var(--color-primary)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "rgba(255,255,255,0.03)";
          el.style.borderColor = "var(--color-border-strong)";
        }}
      >
        <FolderOpen className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
        <span className="font-subhead text-sm transition-colors group-hover:text-primary" style={{ color: "var(--color-muted)" }}>
          Abrir carpeta del proyecto (Packs / Config)
        </span>
      </button>
    </div>
  );
}

/* ── Internal sub-component ─────────────────────────────────────────────────── */
function BuildButton({
  icon, title, subtitle, tags,
  accentColor, accentBg, accentBorder,
  isBuilding, disabled, onClick,
}: {
  type: BuildType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tags: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  isBuilding: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative text-left rounded-[1.5rem] overflow-hidden transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        padding: "1.1rem",
        backdropFilter: "blur(14px)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-2px)";
          el.style.borderColor = accentColor.replace(")", ", 0.4)").replace("var(", "rgba(");
          el.style.boxShadow = `0 10px 28px rgba(0,0,0,0.2)`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.borderColor = accentBorder;
          el.style.boxShadow = "none";
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
            : icon
          }
        </div>
        <div>
          <p className="font-subhead text-sm transition-colors duration-200" style={{ color: "var(--color-foreground)" }}>
            {title}
          </p>
          <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>{subtitle}</p>
          <p className="font-label mt-2" style={{ color: accentColor, opacity: 0.5, fontSize: "0.58rem" }}>{tags}</p>
        </div>
      </div>
    </button>
  );
}