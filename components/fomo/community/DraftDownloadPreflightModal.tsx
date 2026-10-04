"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RotateCcw, Save, X } from "lucide-react";
import type { CommunityDraftItem } from "@/types/fomo";
import { resolveCompatibleVersionsBatch, type ResolvedCompatibleVersion } from "@/lib/downloads/resolveCompatibleVersion";
import type { DownloadIntent, DownloadSessionManifest } from "@/lib/downloads/downloadTypes";
import { buildSessionManifestFromIntents } from "@/lib/downloads/downloadSessionManifest";
import type { DraftDownloadBranch } from "@/lib/fomo/draftDownloadScope";
import { draftDownloadRelativePath } from "@/lib/downloads/draftDownloadFolderPath";
import type { DraftMapLayout } from "@/lib/fomo/draftMapLayout";
import { draftItemPlatformUrl } from "@/lib/fomo/draftItemPlatformUrl";
import {
  buildStashEntry,
  clearPreflightFailedStash,
  formatPreflightFailureReport,
  mergePreflightFailedStash,
  readPreflightFailedStash,
  savePreflightFailedStash,
  type PreflightFailedStash,
} from "@/lib/fomo/draftDownloadPreflightStash";

export type PreflightRow = {
  item: CommunityDraftItem;
  storedVersionId?: string;
  resolved?: ResolvedCompatibleVersion;
  error?: string;
};

async function resolvePreflightRows(
  items: CommunityDraftItem[],
  loader: string,
  gameVersion: string,
  concurrency = 2,
): Promise<PreflightRow[]> {
  const inputs = items.map((item) => ({
    item,
    source: item.source,
    projectId: String(item.project_id),
    projectType: item.content_type || "mod",
    loader,
    gameVersion,
    modName: item.mod_name,
  }));
  const results = await resolveCompatibleVersionsBatch(inputs, concurrency);
  return results.map((result) => ({
    item: result.input.item,
    storedVersionId: result.input.item.version_id,
    resolved: result.ok ? result.resolved : undefined,
    error: result.ok ? undefined : result.error,
  }));
}

export function DraftDownloadPreflightModal({
  open,
  onClose,
  isModern,
  branch,
  loader,
  gameVersion,
  items,
  mapLayout,
  onConfirmDownload,
}: {
  open: boolean;
  onClose: () => void;
  isModern: boolean;
  branch: DraftDownloadBranch;
  loader: string;
  gameVersion: string;
  items: CommunityDraftItem[];
  mapLayout?: DraftMapLayout | null;
  onConfirmDownload: (payload: { intents: DownloadIntent[]; manifest: DownloadSessionManifest }) => void;
}) {
  const [rows, setRows] = useState<PreflightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [stash, setStash] = useState<PreflightFailedStash | null>(null);
  const [showStashPanel, setShowStashPanel] = useState(false);

  const txt = isModern ? "text-foreground" : "text-white";
  const txtSub = isModern ? "text-muted-foreground" : "text-white/60";
  const panel = isModern ? "bg-card border-border" : "bg-[#121214] border-white/10";
  const btnMuted = isModern ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-white/10 text-white/70 hover:bg-white/15";

  const refreshStash = useCallback(() => {
    setStash(readPreflightFailedStash());
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshStash();
    setShowFailedOnly(false);
    setShowStashPanel(false);
  }, [open, refreshStash]);

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

    void resolvePreflightRows(items, loader, gameVersion, 2).then((next) => {
      if (cancelled) return;
      setRows(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, items, loader, gameVersion]);

  const okCount = rows.filter((row) => row.resolved).length;
  const failCount = rows.filter((row) => row.error).length;
  const failedRows = useMemo(() => rows.filter((row) => row.error), [rows]);
  const visibleRows = showFailedOnly ? failedRows : rows;

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
        downloadSubdir: draftDownloadRelativePath(row.item, mapLayout),
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
    const header = `Revisión descarga test (${branchLabel}) — ${loader} ${gameVersion}\nOK: ${okCount} | Fallos: ${failCount}`;
    const okLines = rows
      .filter((row) => row.resolved)
      .map((row) => {
        const name = row.item.mod_name || row.item.project_id;
        return `OK  ${name} → ${row.resolved!.versionLabel || row.resolved!.versionId} (draft: ${row.storedVersionId || "—"})`;
      });
    const failBlock = formatPreflightFailureReport(
      failedRows.map((row) => ({
        modName: String(row.item.mod_name || row.item.project_id || "—"),
        error: row.error || "Error",
        platformUrl: draftItemPlatformUrl(row.item),
        storedVersionId: row.storedVersionId,
      })),
      "",
    );
    return [header, "", ...okLines, failBlock].filter(Boolean).join("\n");
  }, [rows, failedRows, okCount, failCount, branchLabel, loader, gameVersion]);

  const retryFailed = async () => {
    if (failedRows.length === 0 || loading) return;
    setLoading(true);
    const retried = await resolvePreflightRows(
      failedRows.map((row) => row.item),
      loader,
      gameVersion,
      1,
    );
    const byId = new Map(retried.map((row) => [row.item.id, row]));
    setRows((prev) => prev.map((row) => byId.get(row.item.id) ?? row));
    setLoading(false);
  };

  const saveFailedToStash = () => {
    if (failedRows.length === 0) return;
    const entries = failedRows.map((row) =>
      buildStashEntry(row.item, row.error || "Error"),
    );
    const merged = mergePreflightFailedStash(branchLabel, loader, gameVersion, entries);
    savePreflightFailedStash(merged);
    refreshStash();
    window.dispatchEvent(new CustomEvent("fomo-show-status", {
      detail: {
        text: `${entries.length} ítem(s) guardados en la cola temporal. Podés abrirlos en Modrinth/CurseForge cuando quieras.`,
        type: "success",
      },
    }));
  };

  const openUrls = (urls: string[], label: string) => {
    const list = urls.filter(Boolean);
    if (list.length === 0) return;
    if (list.length > 12) {
      const proceed = window.confirm(
        `Se abrirán ${list.length} pestañas (${label}). ¿Continuar?`,
      );
      if (!proceed) return;
    }
    for (const url of list) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const openFailedOnOrigin = () => {
    openUrls(
      failedRows.map((row) => draftItemPlatformUrl(row.item)),
      "fallidos del preflight",
    );
  };

  const openStashOnOrigin = () => {
    if (!stash?.entries.length) return;
    openUrls(
      stash.entries.map((entry) => entry.platformUrl),
      "cola guardada",
    );
  };

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

        {(failCount > 0 || (stash?.entries.length ?? 0) > 0) && (
          <div className={`flex flex-wrap items-center gap-2 border-b px-5 py-2 text-[11px] ${isModern ? "border-border bg-muted/30" : "border-white/10 bg-white/5"}`}>
            {failCount > 0 && (
              <label className={`inline-flex cursor-pointer items-center gap-1.5 ${txtSub}`}>
                <input
                  type="checkbox"
                  checked={showFailedOnly}
                  onChange={(event) => setShowFailedOnly(event.target.checked)}
                  className="rounded border-border"
                />
                Solo fallidos ({failCount})
              </label>
            )}
            {stash && stash.entries.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStashPanel((value) => !value)}
                className={`rounded-lg px-2 py-1 font-bold ${btnMuted}`}
              >
                Cola guardada ({stash.entries.length})
              </button>
            )}
          </div>
        )}

        {showStashPanel && stash && stash.entries.length > 0 && (
          <div className={`max-h-40 overflow-y-auto border-b px-5 py-3 text-[11px] custom-scrollbar ${isModern ? "border-border" : "border-white/10"}`}>
            <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 ${txtSub}`}>
              <span>
                Guardado {new Date(stash.savedAt).toLocaleString()} · {stash.loader} {stash.gameVersion}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={openStashOnOrigin} className={`rounded px-2 py-1 font-bold ${btnMuted}`}>
                  Abrir todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearPreflightFailedStash();
                    refreshStash();
                    setShowStashPanel(false);
                  }}
                  className={`rounded px-2 py-1 font-bold ${btnMuted}`}
                >
                  Vaciar cola
                </button>
              </div>
            </div>
            <ul className={`space-y-1 ${txt}`}>
              {stash.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{entry.modName} — {entry.error}</span>
                  {entry.platformUrl ? (
                    <a
                      href={entry.platformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-primary hover:underline"
                    >
                      Abrir
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

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
                  <th className="pb-2 font-bold w-8" aria-label="Origen" />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const name = row.item.mod_name || row.item.project_id || "—";
                  const platformUrl = draftItemPlatformUrl(row.item);
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
                      <td className="py-2">
                        {platformUrl ? (
                          <a
                            href={platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex rounded p-1 ${isModern ? "hover:bg-muted" : "hover:bg-white/10"}`}
                            title="Abrir en Modrinth o CurseForge"
                          >
                            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={`flex flex-col gap-3 border-t px-5 py-4 ${isModern ? "border-border" : "border-white/10"}`}>
          {failCount > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void retryFailed()}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${btnMuted} disabled:opacity-50`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar fallidos ({failCount})
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={saveFailedToStash}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${btnMuted}`}
              >
                <Save className="h-3.5 w-3.5" />
                Guardar fallidos en cola
              </button>
              <button
                type="button"
                onClick={openFailedOnOrigin}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${btnMuted}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir fallidos en origen
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(reportText)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${btnMuted}`}
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
    </div>
  );
}
