"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import type { CommunityDraftItem } from "@/types/fomo";
import { resolveCompatibleVersionsBatch, type ResolvedCompatibleVersion } from "@/lib/downloads/resolveCompatibleVersion";
import type { DownloadIntent, DownloadSessionManifest } from "@/lib/downloads/downloadTypes";
import { buildSessionManifestFromIntents } from "@/lib/downloads/downloadSessionManifest";
import type { DraftDownloadBranch } from "@/lib/fomo/draftDownloadScope";

export type PreflightRow = {
  item: CommunityDraftItem;
  storedVersionId?: string;
  resolved?: ResolvedCompatibleVersion;
  error?: string;
};

export function DraftDownloadPreflightModal({
  open,
  onClose,
  isModern,
  branch,
  loader,
  gameVersion,
  items,
  onConfirmDownload,
}: {
  open: boolean;
  onClose: () => void;
  isModern: boolean;
  branch: DraftDownloadBranch;
  loader: string;
  gameVersion: string;
  items: CommunityDraftItem[];
  onConfirmDownload: (payload: { intents: DownloadIntent[]; manifest: DownloadSessionManifest }) => void;
}) {
  const [rows, setRows] = useState<PreflightRow[]>([]);
  const [loading, setLoading] = useState(false);

  const txt = isModern ? "text-foreground" : "text-white";
  const txtSub = isModern ? "text-muted-foreground" : "text-white/60";
  const panel = isModern ? "bg-card border-border" : "bg-[#121214] border-white/10";

  useEffect(() => {
    if (!open || items.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRows(items.map((item) => ({
      item,
      storedVersionId: item.version_id,
    })));

    (async () => {
      const inputs = items.map((item) => ({
        item,
        source: item.source,
        projectId: String(item.project_id),
        projectType: item.content_type || "mod",
        loader,
        gameVersion,
        modName: item.mod_name,
      }));
      const results = await resolveCompatibleVersionsBatch(inputs, 2);
      if (cancelled) return;
      setRows(results.map((result) => ({
        item: result.input.item,
        storedVersionId: result.input.item.version_id,
        resolved: result.ok ? result.resolved : undefined,
        error: result.ok ? undefined : result.error,
      })));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, items, loader, gameVersion]);

  const okCount = rows.filter((row) => row.resolved).length;
  const failCount = rows.filter((row) => row.error).length;

  const branchLabel = branch === "all" ? "Todo" : branch === "client" ? "Client" : branch === "server" ? "Server" : "Both";

  const buildIntents = (onlyOk: boolean): DownloadIntent[] => {
    return rows
      .filter((row) => (onlyOk ? row.resolved : row.resolved || !row.error))
      .filter((row) => row.resolved)
      .map((row) => ({
        id: crypto.randomUUID(),
        projectId: row.item.project_id!,
        versionId: row.resolved!.versionId,
        platform: (row.item.source as "modrinth" | "curseforge") || "modrinth",
        projectType: row.item.content_type || "mod",
        modName: row.item.mod_name,
        loader,
        gameVersion,
        resolvedVersionLabel: row.resolved!.versionLabel || row.resolved!.versionId,
      }));
  };

  const confirmDownload = (intents: DownloadIntent[]) => {
    onConfirmDownload({
      intents,
      manifest: buildSessionManifestFromIntents(intents),
    });
    onClose();
  };

  const handleDownload = () => {
    if (failCount > 0) {
      const proceed = window.confirm(
        `${failCount} ítem(s) no tienen versión compatible.\n¿Descargar solo los ${okCount} que sí resolvieron?`,
      );
      if (!proceed) return;
      confirmDownload(buildIntents(true));
      return;
    }
    confirmDownload(buildIntents(true));
  };

  const reportText = useMemo(() => {
    const lines = [
      `Revisión descarga test (${branchLabel}) — ${loader} ${gameVersion}`,
      `OK: ${okCount} | Fallos: ${failCount}`,
      "",
      ...rows.map((row) => {
        const name = row.item.mod_name || row.item.project_id;
        if (row.resolved) {
          return `OK  ${name} → ${row.resolved.versionLabel || row.resolved.versionId} (draft: ${row.storedVersionId || "—"})`;
        }
        return `FAIL ${name} — ${row.error}`;
      }),
    ];
    return lines.join("\n");
  }, [rows, okCount, failCount, branchLabel, loader, gameVersion]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${panel}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-download-preflight-title"
      >
        <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${isModern ? "border-border" : "border-white/10"}`}>
          <div>
            <h2 id="draft-download-preflight-title" className={`text-lg font-black ${txt}`}>
              Revisar descarga de test
            </h2>
            <p className={`mt-1 text-xs ${txtSub}`}>
              Rama {branchLabel} · {items.length} ítems · versión más nueva compatible con {loader} {gameVersion}
            </p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-lg p-2 ${isModern ? "hover:bg-muted" : "hover:bg-white/10"}`} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-5 py-3">
          {loading && (
            <div className={`flex items-center gap-2 py-8 text-sm ${txtSub}`}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resolviendo versiones…
            </div>
          )}
          {!loading && (
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className={txtSub}>
                  <th className="pb-2 font-bold">Mod</th>
                  <th className="pb-2 font-bold">En draft</th>
                  <th className="pb-2 font-bold">Se bajará</th>
                  <th className="pb-2 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = row.item.mod_name || row.item.project_id || "—";
                  return (
                    <tr key={row.item.id} className={`border-t ${isModern ? "border-border/60" : "border-white/5"}`}>
                      <td className={`py-2 pr-2 font-semibold ${txt}`}>{name}</td>
                      <td className={`py-2 pr-2 ${txtSub}`}>{row.storedVersionId || "—"}</td>
                      <td className={`py-2 pr-2 ${txt}`}>{row.resolved?.versionLabel || row.resolved?.versionId || "—"}</td>
                      <td className="py-2">
                        {row.resolved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400" title={row.error}>
                            <AlertTriangle className="h-3 w-3" /> {row.error || "Error"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={`flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4 ${isModern ? "border-border" : "border-white/10"}`}>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(reportText)}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${isModern ? "bg-muted text-muted-foreground" : "bg-white/10 text-white/70"}`}
          >
            Copiar informe
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${isModern ? "bg-muted" : "bg-white/10"}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading || okCount === 0}
              onClick={handleDownload}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {failCount === 0 ? `Descargar ${okCount} archivos` : `Descargar ${okCount} (${failCount} sin versión)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
