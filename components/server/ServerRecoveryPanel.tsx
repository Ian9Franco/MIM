"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";

interface Props {
  pending: NonNullable<ServerInspectionResult["pending"]>;
  inspectRequest: InspectServerRequest | null;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onRecoveryChanged?: () => void;
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ServerRecoveryPanel({ pending, inspectRequest, busy, onBusyChange, onRecoveryChanged }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function rollback(snapshotId: string) {
    if (!inspectRequest) {
      setError("Auditá el servidor primero para reutilizar la conexión.");
      return;
    }
    setError(null);
    setMessage(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/recovery/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inspectRequest, snapshotId, confirm: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo ejecutar el rollback.");
      setMessage(
        data.rollback?.success
          ? `Rollback completado (${data.rollback.restoredEntries} restaurados, ${data.rollback.deletedEntries} eliminados).`
          : "Rollback incompleto. Revisá el servidor manualmente antes de volver a desplegar."
      );
      onRecoveryChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  if (pending.pendingOperationCount === 0) return null;

  return (
    <section
      aria-label="Recuperación de operaciones pendientes"
      className="space-y-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
        <div className="space-y-2 text-sm text-rose-100">
          <h3 className="font-semibold text-rose-50">
            {pending.pendingOperationCount === 1
              ? "Hay una operación de servidor sin cerrar"
              : `Hay ${pending.pendingOperationCount} operaciones de servidor sin cerrar`}
          </h3>
          <p>
            MIM detectó snapshots activos tras un reinicio o un despliegue interrumpido. Revisá el estado antes de aplicar un nuevo plan.
          </p>
          {pending.latestChange && (
            <p className="text-xs text-rose-200/80">
              Último evento: {pending.latestChange.summary} · {formatTimestamp(pending.latestChange.timestamp)}
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {pending.openSnapshots.map((snapshot) => (
          <li
            key={snapshot.snapshotId}
            className="flex flex-col gap-2 rounded-lg border border-rose-400/20 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-mono text-xs text-rose-100">{snapshot.snapshotId}</p>
              <p className="text-xs text-rose-200/80">
                {formatTimestamp(snapshot.createdAt)} · {snapshot.entries.length} entradas · estado {snapshot.status}
              </p>
            </div>
            <button
              type="button"
              disabled={busy || !inspectRequest}
              onClick={() => { void rollback(snapshot.snapshotId); }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-medium text-rose-50 hover:bg-rose-500/20 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restaurar snapshot
            </button>
          </li>
        ))}
      </ul>

      {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
    </section>
  );
}
