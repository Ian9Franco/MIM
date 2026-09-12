"use client";

import { useState } from "react";
import { Activity, AlertTriangle, FileText, Loader2, Stethoscope } from "lucide-react";
import type { ServerSageIncidentReport } from "@mim/contracts-core/server";
import type { DiagnoseServerRequest } from "@/lib/server/diagnoseSchema";
import type { ServerDiagnosisResult } from "@/lib/server/diagnoseServer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverPanelClass, serverPanelStyle } from "./serverUi";

const CATEGORY_LABELS: Record<ServerSageIncidentReport["category"], string> = {
  mod_incompatibility: "Incompatibilidad de mods",
  missing_dependency: "Dependencia faltante",
  ticking_entity: "Entidad corrupta",
  ticking_block: "Bloque con tick",
  mixin_injection_failure: "Fallo de mixin",
  class_not_found: "Clase no encontrada",
  java_version_mismatch: "Versión de Java",
  out_of_memory: "Sin memoria (OOM)",
  corrupted_save: "Mundo corrupto",
  unknown: "Sin clasificar",
};

interface Props {
  inspectRequest: DiagnoseServerRequest | null;
  deploymentId?: string | null;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

export function ServerSageDiagnosticPanel({ inspectRequest, deploymentId, busy, onBusyChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerDiagnosisResult | null>(null);
  const [source, setSource] = useState<"latest-log" | "crash-report">("latest-log");

  async function diagnose() {
    if (!inspectRequest) {
      setError("Auditá el servidor primero para reutilizar la conexión.");
      return;
    }
    setError(null);
    setResult(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inspectRequest,
          logSource: source,
          deploymentId: deploymentId ?? undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "No se pudo diagnosticar el servidor.");
      }
      setResult(data as ServerDiagnosisResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  const report = result?.report;

  return (
    <section aria-label="Diagnóstico SAGE remoto" className={`${serverPanelClass} space-y-4`} style={serverPanelStyle}>
      <SectionHeading
        icon={<Stethoscope className="w-4 h-4" />}
        title="SAGE remoto"
        sub="Lee latest.log o el crash report más reciente y correlaciona con despliegues y cambios recientes."
        accentColor="#818cf8"
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-[var(--color-muted)]">
          Fuente
          <select
            className="mt-1 block rounded-lg border border-[var(--color-border)] bg-white/5 px-2.5 py-1.5 text-sm text-[var(--color-foreground)]"
            value={source}
            onChange={(event) => setSource(event.target.value as "latest-log" | "crash-report")}
            disabled={busy}
          >
            <option value="latest-log">logs/latest.log</option>
            <option value="crash-report">Último crash report</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => { void diagnose(); }}
          disabled={busy || !inspectRequest}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Diagnosticar servidor
        </button>
      </div>

      {!inspectRequest && (
        <p className="text-sm text-[var(--color-muted)]">Completá una auditoría para habilitar el diagnóstico remoto.</p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {report && (
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/80">SAGE · servidor remoto</p>
              <h3 className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
                {CATEGORY_LABELS[report.category]}
              </h3>
              {result?.logPath && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <FileText className="h-3.5 w-3.5" />
                  {result.logPath}
                </p>
              )}
            </div>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono text-[var(--color-muted)]">
              {new Date(report.analyzedAt).toLocaleString()}
            </span>
          </div>

          {report.culpritMods.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Mods sospechosos</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {report.culpritMods.map((mod) => (
                  <li key={mod} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                    {mod}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-[var(--color-foreground)]">Causa detectada: </span>
              <span className="text-[var(--color-muted)]">{report.rootCause}</span>
            </p>
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-100">
              <span className="font-medium">Acción recomendada: </span>
              {report.recommendedAction}
            </p>
          </div>

          {report.correlatedDeploymentId && (
            <p className="text-xs text-[var(--color-muted)]">
              Despliegue correlacionado: <code className="text-indigo-300">{report.correlatedDeploymentId}</code>
            </p>
          )}

          {report.correlatedChanges && report.correlatedChanges.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Cambios recientes relacionados
              </p>
              <ul className="mt-2 space-y-2">
                {report.correlatedChanges.map((change) => (
                  <li key={change.id} className="rounded-lg border border-[var(--color-border)] bg-white/[0.03] px-3 py-2 text-xs">
                    <p className="font-medium text-[var(--color-foreground)]">{change.summary}</p>
                    <p className="mt-0.5 text-[var(--color-muted)]">
                      {change.type} · {new Date(change.timestamp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.stackTraceSnippet && (
            <details className="rounded-xl border border-[var(--color-border)] bg-black/20 p-3">
              <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted)]">Fragmento del log</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--color-muted)]">
                {report.stackTraceSnippet}
              </pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
