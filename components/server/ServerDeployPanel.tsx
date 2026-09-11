"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Undo2 } from "lucide-react";
import type { DeploymentReport } from "@mim/contracts-core/server";
import type { DeployPlanCounts } from "@/lib/server/deployEligibility";

export type DesktopDeployPhase =
  | "idle"
  | "confirming"
  | "preflight"
  | "executing"
  | "completed"
  | "failed"
  | "recovery-required";

export interface ServerDeployPanelProps {
  counts: DeployPlanCounts;
  phase: DesktopDeployPhase;
  report: DeploymentReport | null;
  error: string | null;
  busy: boolean;
  onBeginConfirm: () => void;
  onCancelConfirm: () => void;
  onApply: () => void;
  onCancelApply?: () => void;
  onReaudit?: () => void;
  onAcknowledgeRecovery?: () => void;
}

function CountLine({ counts }: { counts: DeployPlanCounts }) {
  const parts = [
    counts.install ? `${counts.install} instalar` : null,
    counts.replace ? `${counts.replace} reemplazar` : null,
    counts.remove ? `${counts.remove} quitar` : null,
    counts.config ? `${counts.config} config` : null,
  ].filter(Boolean);
  return <p className="text-sm font-medium">{parts.length ? parts.join(" · ") : "Sin cambios de archivos"}</p>;
}

function PhaseStrip({ phase }: { phase: DesktopDeployPhase }) {
  const steps = [
    { id: "preflight", label: "Comprobación" },
    { id: "executing", label: "Escritura" },
    { id: "done", label: "Resultado" },
  ] as const;
  const active = phase === "preflight" ? 0 : phase === "executing" ? 1 : 2;
  const failed = phase === "failed" || phase === "recovery-required";
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {steps.map((step, index) => {
        const current = index === active && (phase === "preflight" || phase === "executing");
        const done = index < active || (index === 2 && (phase === "completed" || failed));
        return (
          <li key={step.id} className={current ? "font-semibold text-emerald-400" : done ? "opacity-80" : "opacity-50"}>
            {done && !current ? "✓ " : current ? "● " : "○ "}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export function ServerDeployPanel({
  counts, phase, report, error, busy, onBeginConfirm, onCancelConfirm, onApply,   onCancelApply, onReaudit, onAcknowledgeRecovery,
}: ServerDeployPanelProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const mutating = counts.install + counts.replace + counts.remove + counts.config;
  const rolledBack = report?.status === "rolled-back";

  if (phase === "recovery-required") {
    return (
      <section aria-label="Recuperación requerida" className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="space-y-2">
            <h3 className="font-semibold text-rose-200">Recuperación manual requerida</h3>
            <p>El despliegue falló y MIM no pudo restaurar el estado anterior. No inicies otro despliegue hasta revisar el servidor.</p>
            <p className="opacity-80">Qué hacer: conectate por SFTP o el panel del hosting, revisá la carpeta <code className="rounded bg-black/30 px-1">mods</code> y <code className="rounded bg-black/30 px-1">.mim_staging</code>, restaurá desde un backup si hace falta, y después repetí una auditoría de solo lectura.</p>
            {report?.error && <p className="text-xs opacity-70">Referencia interna: el operador debe inspeccionar el servidor; no se muestran detalles de conexión.</p>}
            {report?.snapshotId && <p className="font-mono text-xs opacity-70">Snapshot {report.snapshotId}</p>}
            {onAcknowledgeRecovery && (
              <button type="button" onClick={onAcknowledgeRecovery} className="rounded-lg border border-rose-400/40 px-4 py-2 text-sm">
                Ya revisé el servidor; permitir un nuevo intento
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (phase === "preflight" || phase === "executing") {
    return (
      <section aria-label="Progreso del despliegue" aria-live="polite" className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          {phase === "preflight" ? "Comprobando inventario y plan…" : "Escribiendo archivos en el servidor…"}
        </div>
        <PhaseStrip phase={phase} />
        <CountLine counts={counts} />
        {onCancelApply && (
          <button type="button" onClick={onCancelApply} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">
            Cancelar despliegue
          </button>
        )}
      </section>
    );
  }

  if (phase === "completed") {
    return (
      <section aria-label="Despliegue completado" className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="space-y-2">
            <h3 className="font-semibold">Cambios aplicados</h3>
            <p>Se ejecutaron {report?.appliedActions ?? mutating} acciones sobre el servidor.</p>
            <p className="opacity-80">Las credenciales no se guardan. Para comprobar el resultado, repetí la comparación.</p>
            {onReaudit && (
              <button type="button" onClick={onReaudit} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
                Volver a comparar
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (phase === "failed") {
    return (
      <section role="alert" className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="space-y-2">
            <h3 className="font-semibold">{rolledBack ? "Despliegue revertido" : "No se pudo aplicar el plan"}</h3>
            <p>{error || "El servidor no se modificó de forma permanente."}</p>
            {rolledBack && (
              <p className="flex items-center gap-1.5 opacity-80">
                <Undo2 className="h-4 w-4" />
                MIM restauró los archivos previos. Podés auditar de nuevo e intentar otra vez.
              </p>
            )}
            <button
              type="button"
              onClick={onBeginConfirm}
              disabled={busy}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
            >
              Revisar el plan otra vez
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "confirming") {
    return (
      <section aria-label="Confirmar despliegue" className="space-y-4 rounded-xl border border-rose-500/40 bg-rose-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Esto modifica archivos en el servidor remoto</h3>
            <p>Se van a instalar, reemplazar o borrar JAR en la carpeta del servidor. No hay deshacer desde el panel de hosting. Si algo falla, MIM intenta revertir; si la reversión también falla, el servidor queda en recuperación manual.</p>
            <CountLine counts={counts} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>Entiendo que estos cambios son irreversibles desde MIM si la recuperación falla.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!acknowledged || busy}
            onClick={onApply}
            className="rounded-lg bg-rose-700 px-5 py-2.5 font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            Aplicar en el servidor
          </button>
          <button type="button" onClick={() => { setAcknowledged(false); onCancelConfirm(); }} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">
            Cancelar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Aplicar plan" className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
      <h3 className="font-semibold">Aplicar cambios en el servidor</h3>
      <p className="text-sm opacity-80">La comparación no escribe nada. El siguiente paso copia JAR desde el último build AllHost y puede borrar mods que no estén en ese build.</p>
      <CountLine counts={counts} />
      <button
        type="button"
        onClick={() => { setAcknowledged(false); onBeginConfirm(); }}
        disabled={busy || mutating === 0}
        className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
      >
        Revisar y aplicar…
      </button>
    </section>
  );
}
