"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, Trash2, RefreshCw, Monitor, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import type { InstanceManifestDiff } from "@/lib/instances/types";
import type { DiffFilterTab } from "./ServerAuditSummaryCards";

interface ServerDiffTableProps {
  diff: InstanceManifestDiff;
  activeFilter: DiffFilterTab;
}

type UnifiedDiffRow = {
  id: string;
  kind: "addition" | "removal" | "update" | "mismatch" | "duplicate" | "unchanged";
  modName: string;
  modId: string;
  desiredVersion?: string;
  actualVersion?: string;
  desiredFileName?: string;
  actualFileName?: string;
  sideRequirement?: string;
  reason: string;
};

export function ServerDiffTable({ diff, activeFilter }: ServerDiffTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const rows: UnifiedDiffRow[] = useMemo(() => {
    const list: UnifiedDiffRow[] = [];

    // 1. Additions (Missing on server)
    for (const art of diff.additions) {
      list.push({
        id: `add-${art.fileName}`,
        kind: "addition",
        modName: art.modName !== "unknown" ? art.modName : art.fileName,
        modId: art.modId,
        desiredVersion: art.modVersion,
        desiredFileName: art.fileName,
        sideRequirement: art.environment?.server || "optional",
        reason: "Presente en el proyecto local; debe instalarse en el servidor.",
      });
    }

    // 2. Removals (Extra on server)
    for (const art of diff.removals) {
      list.push({
        id: `rem-${art.fileName}`,
        kind: "removal",
        modName: art.modName !== "unknown" ? art.modName : art.fileName,
        modId: art.modId,
        actualVersion: art.modVersion,
        actualFileName: art.fileName,
        sideRequirement: art.environment?.server || "optional",
        reason: "Presente en el servidor remoto pero ausente en el proyecto deseado.",
      });
    }

    // 3. Updates (Version / content mismatch)
    for (const up of diff.updates) {
      list.push({
        id: `up-${up.identity}`,
        kind: "update",
        modName: up.desired.modName !== "unknown" ? up.desired.modName : up.desired.fileName,
        modId: up.desired.modId,
        desiredVersion: up.desired.modVersion,
        actualVersion: up.actual.modVersion,
        desiredFileName: up.desired.fileName,
        actualFileName: up.actual.fileName,
        reason: `Difiere por: ${up.reasons.join(", ")}`,
      });
    }

    // 4. Environment Mismatches (e.g. Client-Only in server)
    for (const mis of diff.environmentMismatches) {
      list.push({
        id: `mis-${mis.artifact.fileName}`,
        kind: "mismatch",
        modName: mis.artifact.modName !== "unknown" ? mis.artifact.modName : mis.artifact.fileName,
        modId: mis.artifact.modId,
        desiredFileName: mis.artifact.fileName,
        actualFileName: mis.artifact.fileName,
        desiredVersion: mis.artifact.modVersion,
        sideRequirement: mis.artifact.environment?.client === "required" ? "Solo Cliente" : "Incompatible",
        reason: mis.reason || "Mod exclusivo de cliente no compatible con runtime servidor.",
      });
    }

    // 5. Duplicates
    for (const dup of diff.duplicates.actual.concat(diff.duplicates.desired)) {
      list.push({
        id: `dup-${dup.identity}`,
        kind: "duplicate",
        modName: dup.identity,
        modId: dup.identity,
        reason: `Identidad duplicada: ${dup.artifacts.map((a) => a.fileName).join(", ")}`,
      });
    }

    // 6. Unchanged
    for (const un of diff.unchanged) {
      list.push({
        id: `un-${un.fileName}`,
        kind: "unchanged",
        modName: un.modName !== "unknown" ? un.modName : un.fileName,
        modId: un.modId,
        desiredVersion: un.modVersion,
        actualVersion: un.modVersion,
        desiredFileName: un.fileName,
        actualFileName: un.fileName,
        reason: "Sincronizado e idéntico.",
      });
    }

    return list;
  }, [diff]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (activeFilter === "missing") result = result.filter((r) => r.kind === "addition");
    else if (activeFilter === "extra") result = result.filter((r) => r.kind === "removal");
    else if (activeFilter === "updates") result = result.filter((r) => r.kind === "update");
    else if (activeFilter === "mismatches") result = result.filter((r) => r.kind === "mismatch");
    else if (activeFilter === "duplicates") result = result.filter((r) => r.kind === "duplicate");
    else if (activeFilter === "correct") result = result.filter((r) => r.kind === "unchanged");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.modName.toLowerCase().includes(q) ||
          r.modId.toLowerCase().includes(q) ||
          r.desiredFileName?.toLowerCase().includes(q) ||
          r.actualFileName?.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, activeFilter, searchQuery]);

  const kindBadge = {
    addition: { label: "Faltante", bg: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: Download },
    removal: { label: "Sobrante", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Trash2 },
    update: { label: "Actualizar", bg: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: RefreshCw },
    mismatch: { label: "Client-Only", bg: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: Monitor },
    duplicate: { label: "Duplicado", bg: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: Copy },
    unchanged: { label: "Correcto", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Search Header */}
      <div className="flex items-center justify-between gap-4 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por mod, archivo o razón..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="text-xs text-zinc-400">
          Mostrando <strong className="text-white">{filteredRows.length}</strong> de{" "}
          <strong className="text-zinc-300">{rows.length}</strong> elementos
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px] bg-zinc-900/50">
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Mod / Artefacto</th>
              <th className="py-3 px-4">Proyecto Deseado</th>
              <th className="py-3 px-4">Servidor Remoto</th>
              <th className="py-3 px-4">Diagnóstico / Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            <AnimatePresence mode="popLayout">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-zinc-600" />
                      <span>No hay discrepancias que coincidan con el filtro actual</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const badge = kindBadge[row.kind];
                  const Icon = badge.icon;

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${badge.bg}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-200">{row.modName}</div>
                        {row.modId && row.modId !== "unknown" && (
                          <div className="text-[10px] text-zinc-500 font-mono">{row.modId}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        {row.desiredFileName ? (
                          <div>
                            <div className="font-medium text-zinc-200">{row.desiredVersion || "v?"}</div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[180px]" title={row.desiredFileName}>
                              {row.desiredFileName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">No requerido</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        {row.actualFileName ? (
                          <div>
                            <div className="font-medium text-zinc-200">{row.actualVersion || "v?"}</div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[180px]" title={row.actualFileName}>
                              {row.actualFileName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">No instalado</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-400 max-w-xs">
                        <div className="text-xs leading-relaxed">{row.reason}</div>
                        {row.sideRequirement && (
                          <span className="inline-block mt-1 text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                            {row.sideRequirement}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
