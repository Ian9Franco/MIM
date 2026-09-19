"use client";

import { useState } from "react";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ClientSyncApplyResult } from "@mim/contracts-core/server";
import type { ServerMultiplayerSyncResult } from "@/lib/server/multiplayerServer";

function readError(data: { error?: string; message?: string }, fallback: string): string {
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

export function useMultiplayerSync(inspectRequest: InspectServerRequest | null, onBusyChange: (busy: boolean) => void) {
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerMultiplayerSyncResult | null>(null);
  const [applyResult, setApplyResult] = useState<ClientSyncApplyResult | null>(null);
  const [applying, setApplying] = useState(false);

  async function sync() {
    if (!inspectRequest) {
      setError("Auditá el servidor primero para reutilizar la conexión.");
      return;
    }
    setError(null);
    setApplyError(null);
    setApplyResult(null);
    setResult(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inspectRequest),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(readError(data, "No se pudo comparar el cliente con el servidor."));
      setResult(data as ServerMultiplayerSyncResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  async function apply() {
    if (!inspectRequest) {
      setApplyError("Auditá el servidor primero para reutilizar la conexión.");
      return;
    }
    if (!result || result.diff.status !== "mismatched") {
      setApplyError("Compará cliente vs servidor antes de aplicar cambios.");
      return;
    }
    setApplyError(null);
    setApplying(true);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/sync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inspectRequest),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(readError(data, "No se pudo aplicar la sincronización del cliente."));
      setApplyResult(data as ClientSyncApplyResult & { syncBefore?: ServerMultiplayerSyncResult });
      if (data.diffAfter) {
        setResult({
          ...result,
          diff: data.diffAfter,
          clientModCount: result.clientModCount,
        });
      }
    } catch (cause) {
      setApplyError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      setApplying(false);
      onBusyChange(false);
    }
  }

  return { error, applyError, result, applyResult, applying, sync, apply };
}
