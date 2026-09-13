"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { ClientSyncDiffResult } from "@mim/contracts-core/server";
import type { ServerMultiplayerSyncResult } from "@/lib/server/multiplayerServer";

const STATUS_LABELS: Record<ClientSyncDiffResult["status"], string> = {
  ready: "Listo para jugar",
  mismatched: "Mods desalineados",
  incompatible: "Incompatible",
};

function statusClassName(status: ClientSyncDiffResult["status"]): string {
  if (status === "ready") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "incompatible") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

interface Props {
  result: ServerMultiplayerSyncResult;
}

export function ServerMultiplayerSyncResultView({ result }: Props) {
  const diff = result.diff;
  const statusClass = statusClassName(diff.status);

  return (
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
  );
}
