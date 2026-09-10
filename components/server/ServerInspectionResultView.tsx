"use client";
import { useState } from "react";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";
import { ServerAuditSummaryCards, type DiffFilterTab } from "./ServerAuditSummaryCards";
import { ServerDiffTable } from "./ServerDiffTable";

export function ServerInspectionResultView({ result }: { result: ServerInspectionResult }) {
  const [filter, setFilter] = useState<DiffFilterTab>("all");
  return <section aria-label="Resultado de auditoría" className="space-y-5 rounded-2xl border border-[var(--color-border)] p-5 md:p-6">
    <div>
      <h2 className="text-xl font-semibold">{result.isPartialAudit ? "Auditoría incompleta" : "Comparación de mods"}</h2>
      <p className="mt-1 text-sm opacity-70">{result.scannedMods} de {result.totalJarFiles} archivos JAR detectados analizados.</p>
    </div>
    {result.warnings.length > 0 && <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <ul className="list-inside list-disc space-y-1">{result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
    </div>}
    {!result.report ? <p className="text-sm">Corregí las lecturas fallidas y repetí la auditoría. No se calculan faltantes ni sobrantes con un inventario incompleto.</p> : <div className="space-y-5 rounded-xl bg-zinc-950 p-4 text-zinc-100">
      <ServerAuditSummaryCards compact summary={result.report.summary} activeFilter={filter} onSelectFilter={setFilter} />
      <ServerDiffTable diff={result.report.diff} activeFilter={filter} />
      {result.report.validation.errors.length > 0 && <ul className="list-inside list-disc text-sm text-rose-300">
        {result.report.validation.errors.map((issue, i) => <li key={i}>{issue.message}</li>)}
      </ul>}
    </div>}
  </section>;
}
