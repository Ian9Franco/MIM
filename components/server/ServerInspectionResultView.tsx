"use client";
import { useState } from "react";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";
import { ServerAuditSummaryCards, type DiffFilterTab } from "./ServerAuditSummaryCards";
import { ServerDiffTable } from "./ServerDiffTable";
import { ServerDeployPanel, type ServerDeployPanelProps } from "./ServerDeployPanel";
import { countsFromDiff, isCompleteDeployableAudit } from "@/lib/server/deployEligibility";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BarChart3 } from "lucide-react";
import { serverPanelClass, serverPanelStyle } from "./serverUi";

interface Props {
  result: ServerInspectionResult;
  deploy?: Omit<ServerDeployPanelProps, "counts">;
}

export function ServerInspectionResultView({ result, deploy }: Props) {
  const [filter, setFilter] = useState<DiffFilterTab>("all");
  const deployable = isCompleteDeployableAudit(result);
  const counts = result.report ? countsFromDiff(result.report.diff) : null;
  return (
    <section aria-label="Resultado de auditoría" className={`${serverPanelClass} space-y-5`} style={serverPanelStyle}>
      <SectionHeading
        icon={<BarChart3 className="w-4 h-4" />}
        title={result.isPartialAudit ? "Auditoría incompleta" : "Comparación de mods"}
        sub={`${result.scannedMods} de ${result.totalJarFiles} archivos JAR detectados analizados.`}
        accentColor="#10b981"
      />
      {result.warnings.length > 0 && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          <ul className="list-inside list-disc space-y-1">{result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
        </div>
      )}
      {!result.report ? (
        <p className="text-sm text-[var(--color-muted)]">Corregí las lecturas fallidas y repetí la auditoría. No se calculan faltantes ni sobrantes con un inventario incompleto.</p>
      ) : (
        <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-white/[0.02] p-4 md:p-5">
          <ServerAuditSummaryCards compact summary={result.report.summary} activeFilter={filter} onSelectFilter={setFilter} />
          <ServerDiffTable diff={result.report.diff} activeFilter={filter} />
          {result.report.validation.errors.length > 0 && (
            <ul className="list-inside list-disc text-sm text-rose-300">
              {result.report.validation.errors.map((issue, i) => <li key={i}>{issue.message}</li>)}
            </ul>
          )}
        </div>
      )}
    {deploy && counts && (deployable || deploy.phase === "recovery-required" || deploy.phase === "completed" || deploy.phase === "failed") && (
      <ServerDeployPanel {...deploy} counts={counts} />
    )}
    {result.report && !deployable && !result.isPartialAudit && deploy?.phase !== "recovery-required" && (
      <p className="text-sm text-[var(--color-muted)]">
        {result.report.readyForPlanning
          ? "El servidor ya coincide con el build. No hay cambios para aplicar."
          : "Esta auditoría no autoriza un despliegue: hay duplicados, incompatibles o un runtime distinto."}
      </p>
    )}
  </section>
  );
}
