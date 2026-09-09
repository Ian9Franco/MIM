"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Server, RefreshCw, ShieldAlert, ArrowRight } from "lucide-react";
import type { InstanceManifest } from "@/lib/instances/types";
import type { ServerAuditReport } from "@/lib/server/types";
import { ServerHealthBadge } from "./ServerHealthBadge";
import { ServerAuditSummaryCards, type DiffFilterTab } from "./ServerAuditSummaryCards";
import { ServerDiffTable } from "./ServerDiffTable";

export interface ServerAuditPanelProps {
  desiredManifest: InstanceManifest;
  observedManifest?: InstanceManifest;
  serverAddress?: string;
  isPartialAudit?: boolean;
  onPlanReconciliation?: (report: ServerAuditReport) => void;
  onRefreshDiscovery?: () => Promise<InstanceManifest | void>;
}

export function ServerAuditPanel({
  desiredManifest,
  observedManifest,
  serverAddress = "sftp://mc.example.com:25565",
  isPartialAudit = false,
  onPlanReconciliation,
  onRefreshDiscovery,
}: ServerAuditPanelProps) {
  const [report, setReport] = useState<ServerAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DiffFilterTab>("all");
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(
    async (targetObserved?: InstanceManifest) => {
      const actual = targetObserved || observedManifest;
      if (!actual) {
        setError("No se ha detectado el estado observado del servidor remoto.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/server/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            desiredManifest,
            actualManifest: actual,
            isPartialAudit,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setReport(data.report);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al auditar servidor";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [desiredManifest, observedManifest, isPartialAudit]
  );

  const handleRefreshAndAudit = async () => {
    if (onRefreshDiscovery) {
      setLoading(true);
      try {
        const fresh = await onRefreshDiscovery();
        if (fresh) {
          await runAudit(fresh);
          return;
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error refrescando servidor");
      } finally {
        setLoading(false);
      }
    }
    await runAudit();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 text-zinc-100">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center shrink-0 shadow-inner">
            <Server className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Auditoría de Servidor
              </h2>
              <ServerHealthBadge report={report} isPartial={isPartialAudit} />
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{serverAddress}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleRefreshAndAudit}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{report ? "Re-Auditar" : "Iniciar Auditoría"}</span>
          </button>

          {report && report.readyForPlanning && onPlanReconciliation && (
            <button
              type="button"
              onClick={() => onPlanReconciliation(report)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <span>Generar Plan de Sync</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Validation Warnings / Blockers */}
      {report && report.validation.blocksExport && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Auditoría Bloqueada: Se detectaron errores de validación de pack</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-rose-200/90 text-[11px]">
            {report.validation.errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Report Content */}
      {report ? (
        <div className="flex flex-col gap-6">
          {/* Summary Metrics */}
          <ServerAuditSummaryCards
            summary={report.summary}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />

          {/* Detailed Discrepancy Table */}
          <ServerDiffTable diff={report.diff} activeFilter={activeFilter} />
        </div>
      ) : (
        !loading && (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
            <Server className="w-10 h-10 text-zinc-600" />
            <div className="text-sm font-semibold text-zinc-300">
              Listo para auditar el servidor
            </div>
            <p className="text-xs text-zinc-500 max-w-sm">
              Compara el proyecto deseado contra el servidor remoto vía SFTP para identificar discrepancias sin mutar archivos.
            </p>
            <button
              type="button"
              onClick={handleRefreshAndAudit}
              className="mt-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 transition-all cursor-pointer"
            >
              Auditar Ahora
            </button>
          </div>
        )
      )}
    </div>
  );
}
