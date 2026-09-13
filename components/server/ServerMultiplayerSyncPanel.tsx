"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Users, XCircle } from "lucide-react";
import type { ClientSyncDiffResult } from "@mim/contracts-core/server";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerMultiplayerSyncResult } from "@/lib/server/multiplayerServer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverPanelClass, serverPanelStyle } from "./serverUi";

const STATUS_LABELS: Record<ClientSyncDiffResult["status"], string> = {
  ready: "Listo para jugar",
  mismatched: "Mods desalineados",
  incompatible: "Incompatible",
};

interface Props {
  inspectRequest: InspectServerRequest | null;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

function jsonError(data: { error?: string; message?: string }, fallback: string) {
  return typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : fallback;
}

export function ServerMultiplayerSyncPanel({ inspectRequest, busy, onBusyChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerMultiplayerSyncResult | null>(null);

  async function sync() {
    if (!inspectRequest) {
      setError("Auditá el servidor primero para reutilizar la conexión.");
      return;
    }
    setError(null);
    setResult(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inspectRequest),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(jsonError(data, "No se pudo comparar el cliente con el servidor."));
      setResult(data as ServerMultiplayerSyncResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  const diff = result?.diff;
  const statusClass =
    diff?.status === "ready"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : diff?.status === "incompatible"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
        : "border-amber-500/30 bg-amber-500/10 text-amber-200";

  return (
    <section aria-label="Sync multiplayer cliente-servidor" className={`${serverPanelClass} space-y-4`} style={serverPanelStyle}>
      <SectionHeading
        icon={<Users className="w-4 h-4" />}
        title="Sync multiplayer"
        sub="Compará tu build alluser local contra el manifest distribuible del servidor remoto. Preserva mods solo-cliente."
        accentColor="#f59e0b"
      />

      <p className="text-xs text-[var(--color-muted)]">
        Requiere builds <strong className="font-medium text-[var(--color-foreground)]">alluser</strong> y conexión SFTP válida.
        Este paso es diagnóstico: no descarga ni instala mods automáticamente.
      </p>

      <button
        type="button"
        onClick={() => { void sync(); }}
        disabled={busy || !inspectRequest}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Comparar cliente vs servidor
      </button>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {result && diff && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${statusClass}`}>
            {diff.status === "ready" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {STATUS_LABELS[diff.status]}
          </div>

          <div className="grid gap-3 text-xs text-[var(--color-muted)] sm:grid-cols-3">
            <p>Mods en alluser: <span className="text-[var(--color-foreground)]">{result.clientModCount}</span></p>
            <p>Mods en servidor: <span className="text-[var(--color-foreground)]">{result.serverModCount}</span></p>
            <p>Requeridos distribuibles: <span className="text-[var(--color-foreground)]">{result.distributable.requiredMods.length}</span></p>
          </div>

          {diff.incompatibleMinecraft && (
            <p className="text-sm text-rose-200">
              Versión de Minecraft distinta — servidor {diff.incompatibleMinecraft.server}, cliente {diff.incompatibleMinecraft.client}.
            </p>
          )}
          {diff.incompatibleLoaders && (
            <p className="text-sm text-rose-200">
              Loader distinto — servidor {diff.incompatibleLoaders.server}, cliente {diff.incompatibleLoaders.client}.
            </p>
          )}

          {diff.missingMods.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-foreground)]">Faltan en tu cliente ({diff.missingMods.length})</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                {diff.missingMods.map((mod) => (
                  <li key={mod.identity}>{mod.displayName} · {mod.filename}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.versionMismatches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-foreground)]">Versiones distintas ({diff.versionMismatches.length})</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                {diff.versionMismatches.map(({ required, actual }) => (
                  <li key={required.identity}>
                    {required.displayName}: servidor pide {required.filename}, tenés {actual.fileName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diff.clientOnlyModsPreserved.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-foreground)]">Mods solo-cliente preservados ({diff.clientOnlyModsPreserved.length})</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                {diff.clientOnlyModsPreserved.map((mod) => (
                  <li key={mod.modId || mod.fileName}>{mod.modName || mod.fileName}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.status === "ready" && diff.missingMods.length === 0 && diff.versionMismatches.length === 0 && (
            <p className="text-sm text-emerald-200">Tu build alluser coincide con lo que el servidor exige para jugar en multiplayer.</p>
          )}
        </div>
      )}
    </section>
  );
}
