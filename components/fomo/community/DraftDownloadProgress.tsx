"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, DownloadCloud, CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { downloadEvents } from "@/lib/downloads/downloadEvents";
import { DownloadIntent, DownloadSessionState, DownloadTask } from "@/lib/downloads/downloadTypes";
import { downloadBroker } from "@/lib/downloads/DraftDownloadBroker";
import {
  evaluateManifestCompletion,
  formatManifestReport,
  buildSessionManifestFromIntents,
} from "@/lib/downloads/downloadSessionManifest";

export function DraftDownloadProgress({ isModern }: { isModern?: boolean }) {
  const [activeSession, setActiveSession] = useState<DownloadSessionState | null>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onStarted = ({ session }: { session: DownloadSessionState }) => {
      setActiveSession(session);
      setVisible(true);
      setExpanded(false);
    };
    
    const onProgress = ({ session }: { session: DownloadSessionState }) => {
      setActiveSession(prev => prev?.sessionId === session.sessionId ? { ...session } : prev);
    };

    const onCompleted = ({ session }: { session: DownloadSessionState }) => {
      setActiveSession(prev => prev?.sessionId === session.sessionId ? { ...session } : prev);
      setExpanded(true);
    };

    const onFailed = ({ session }: { session: DownloadSessionState; error?: string }) => {
      setActiveSession(prev => prev?.sessionId === session.sessionId ? { ...session, status: "failed" } : prev);
      setExpanded(true);
    };

    const cleanupStarted = downloadEvents.on("session:started", onStarted);
    const cleanupProgress = downloadEvents.on("session:progress", onProgress);
    const cleanupCompleted = downloadEvents.on("session:completed", onCompleted);
    const cleanupFailed = downloadEvents.on("session:failed", onFailed);

    return () => {
      cleanupStarted();
      cleanupProgress();
      cleanupCompleted();
      cleanupFailed();
    };
  }, []);

  const failedTasks = useMemo(
    () => activeSession?.tasks.filter((task) => task.status === "failed") || [],
    [activeSession],
  );
  const completedTasks = useMemo(
    () => activeSession?.tasks.filter((task) => task.status === "completed") || [],
    [activeSession],
  );

  const manifestReport = useMemo(() => {
    if (!activeSession) return null;
    return evaluateManifestCompletion(activeSession.manifest, activeSession.tasks);
  }, [activeSession]);

  const reportText = useMemo(() => {
    if (!activeSession) return "";
    const report = evaluateManifestCompletion(activeSession.manifest, activeSession.tasks);
    const lines = [
      `Sesión ${activeSession.sessionId}`,
      formatManifestReport(report),
      activeSession.completionMessage || "",
      "",
      ...activeSession.tasks.map((task) => formatTaskLine(task)),
    ];
    return lines.filter(Boolean).join("\n");
  }, [activeSession]);

  const retryFailed = () => {
    if (!activeSession || failedTasks.length === 0) return;
    const intents: DownloadIntent[] = failedTasks.map((task) => ({
      id: crypto.randomUUID(),
      projectId: task.projectId,
      versionId: task.versionId,
      platform: task.platform,
      projectType: task.projectType,
      modName: task.modName || task.title,
      loader: task.loader,
      gameVersion: task.gameVersion,
      resolvedVersionLabel: task.resolvedVersionLabel,
    }));
    const manifest = activeSession.manifest
      ? {
          expectedCount: failedTasks.length,
          entries: activeSession.manifest.entries.filter((entry) =>
            failedTasks.some(
              (task) =>
                task.projectId === entry.projectId &&
                task.versionId === entry.versionId &&
                task.platform === entry.platform,
            ),
          ),
        }
      : buildSessionManifestFromIntents(intents);
    const sessionId = `${activeSession.sessionId}_retry_${Date.now()}`;
    downloadBroker.enqueueSession(sessionId, intents, manifest);
  };

  if (!visible || !activeSession) return null;

  const percentage = Math.round((activeSession.completedTasks / activeSession.totalTasks) * 100) || 0;
  const isDone = activeSession.status === "completed";
  const isFailed = activeSession.status === "failed";
  const isActive = !isDone && !isFailed;

  return (
    <div className={`fixed bottom-6 right-6 z-[999] w-[min(92vw,420px)] rounded-2xl border shadow-2xl animate-slide-up transition-all ${
      isModern ? "bg-white border-black/10 text-slate-800" : "bg-neutral-900 border-white/10 text-white"
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDone ? "bg-emerald-500/20 text-emerald-500" : 
            isFailed ? "bg-red-500/20 text-red-500" : 
            "bg-primary/20 text-primary"
          }`}>
            {isDone ? <CheckCircle2 className="w-5 h-5" /> : 
             isFailed ? <XCircle className="w-5 h-5" /> : 
             <DownloadCloud className="w-5 h-5 animate-pulse" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-bold text-sm truncate">
              {isDone ? "Descarga completa" : 
               isFailed ? "Descarga con errores" : 
               "Descargando draft…"}
            </span>
            <span className={`text-xs ${isModern ? "text-slate-500" : "text-white/50"}`}>
              Esperados {manifestReport?.expectedCount ?? activeSession.totalTasks} · Completados {manifestReport?.completedCount ?? activeSession.completedTasks} · Fallidos {manifestReport?.failedCount ?? activeSession.failedTasks}
            </span>
          </div>
          {isActive && (
            <span className="font-black text-primary text-sm">{percentage}%</span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={`rounded-lg p-1.5 ${isModern ? "hover:bg-slate-100" : "hover:bg-white/10"}`}
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        <div className={`w-full h-2 rounded-full overflow-hidden ${isModern ? "bg-slate-100" : "bg-white/10"}`}>
          <div 
            className={`h-full transition-all duration-300 ${
              isDone ? "bg-emerald-500" : 
              isFailed ? "bg-red-500" : 
              "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className={`border-t px-4 py-3 max-h-64 overflow-y-auto custom-scrollbar ${isModern ? "border-black/10" : "border-white/10"}`}>
          {manifestReport && manifestReport.missingEntries.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Faltantes del manifiesto</p>
              <ul className="space-y-1">
                {manifestReport.missingEntries.slice(0, 8).map((entry) => (
                  <li key={`${entry.platform}:${entry.projectId}:${entry.versionId}`} className="text-[11px] text-amber-200/90">
                    {entry.modName || entry.projectId}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {failedTasks.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase text-red-400 mb-1">Fallidos</p>
              <ul className="space-y-1">
                {failedTasks.map((task) => (
                  <li key={task.id} className="text-[11px] text-red-300">
                    {task.modName || task.title || task.projectId}: {task.error || "Error"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {completedTasks.length > 0 && (
            <div>
              <p className={`text-[10px] font-black uppercase mb-1 ${isModern ? "text-slate-500" : "text-white/40"}`}>Completados</p>
              <ul className="space-y-1">
                {completedTasks.slice(0, 12).map((task) => (
                  <li key={task.id} className={`text-[11px] ${isModern ? "text-slate-600" : "text-white/60"}`}>
                    {task.modName || task.title || task.projectId}
                    {task.resolvedVersionLabel ? ` · ${task.resolvedVersionLabel}` : task.versionId ? ` · ${task.versionId}` : ""}
                  </li>
                ))}
                {completedTasks.length > 12 && (
                  <li className={`text-[10px] ${isModern ? "text-slate-400" : "text-white/40"}`}>+{completedTasks.length - 12} más</li>
                )}
              </ul>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(reportText)}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${isModern ? "bg-slate-100" : "bg-white/10"}`}
            >
              <Copy className="w-3 h-3" /> Copiar informe
            </button>
            {failedTasks.length > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary"
              >
                <RotateCcw className="w-3 h-3" /> Reintentar fallidos
              </button>
            )}
            {!isActive && (
              <button
                type="button"
                onClick={() => { setVisible(false); setActiveSession(null); }}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold ${isModern ? "bg-slate-100" : "bg-white/10"}`}
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTaskLine(task: DownloadTask): string {
  const name = task.modName || task.title || task.projectId;
  const version = task.resolvedVersionLabel || task.versionId || "—";
  if (task.status === "completed") return `OK   ${name} (${version})`;
  if (task.status === "failed") return `FAIL ${name} — ${task.error || "error"}`;
  return `…    ${name} (${task.status})`;
}
