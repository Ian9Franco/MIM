"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import type { ServerAuditReport } from "@/lib/server/types";

export type ServerHealthState =
  | "synced"
  | "drift_detected"
  | "validation_blocked"
  | "partial"
  | "idle";

interface ServerHealthBadgeProps {
  report: ServerAuditReport | null;
  isPartial?: boolean;
  className?: string;
}

export function computeServerHealthState(
  report: ServerAuditReport | null,
  isPartial?: boolean
): { state: ServerHealthState; label: string; details: string } {
  if (!report) {
    return { state: "idle", label: "Sin Auditar", details: "Escanear servidor para evaluar estado" };
  }

  if (isPartial) {
    return {
      state: "partial",
      label: "Auditoría Parcial",
      details: "Se omitieron o fallaron algunas lecturas de archivos remotos",
    };
  }

  if (report.validation.blocksExport || report.summary.validationErrors > 0) {
    return {
      state: "validation_blocked",
      label: "Bloqueado por Validación",
      details: `${report.summary.validationErrors} errores críticos de compatibilidad`,
    };
  }

  if (
    report.summary.missingFromServer > 0 ||
    report.summary.extraOnServer > 0 ||
    report.summary.updatesRequired > 0 ||
    report.summary.duplicateIdentities > 0 ||
    report.summary.environmentMismatches > 0
  ) {
    const totalDiscrepancies =
      report.summary.missingFromServer +
      report.summary.extraOnServer +
      report.summary.updatesRequired +
      report.summary.duplicateIdentities +
      report.summary.environmentMismatches;

    return {
      state: "drift_detected",
      label: "Desincronizado",
      details: `${totalDiscrepancies} discrepancia(s) detectada(s)`,
    };
  }

  return {
    state: "synced",
    label: "Sincronizado",
    details: "El servidor remoto coincide exactamente con el proyecto local",
  };
}

export function ServerHealthBadge({ report, isPartial, className = "" }: ServerHealthBadgeProps) {
  const { state, label, details } = computeServerHealthState(report, isPartial);

  const styles = {
    synced: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    drift_detected: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    validation_blocked: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    partial: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    idle: "bg-zinc-800 text-zinc-400 border-zinc-700",
  }[state];

  const Icon = {
    synced: CheckCircle2,
    drift_detected: AlertTriangle,
    validation_blocked: AlertOctagon,
    partial: Info,
    idle: Info,
  }[state];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-sm transition-all ${styles} ${className}`}
      title={details}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-semibold">{label}</span>
      <span className="opacity-75 hidden sm:inline">• {details}</span>
    </div>
  );
}
