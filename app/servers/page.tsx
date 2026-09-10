"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Server, ShieldCheck } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ServerConnectionForm } from "@/components/server/ServerConnectionForm";
import { ServerInspectionResultView } from "@/components/server/ServerInspectionResultView";
import { inspectServerSchema, type InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";

export default function ServersPage() {
  const { projects } = useProjects();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerInspectionResult | null>(null);
  const request = useRef<AbortController | null>(null);
  const resultArea = useRef<HTMLDivElement>(null);
  useEffect(() => { if (result || error) resultArea.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [result, error]);
  useEffect(() => () => request.current?.abort(), []);
  async function inspect(input: InspectServerRequest) {
    const parsed = inspectServerSchema.safeParse(input);
    if (!parsed.success) { setError(`Revisá los datos de conexión: ${parsed.error.issues[0].message}`); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/server/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "No se pudo completar la auditoría.");
      if (!controller.signal.aborted) setResult(data as ServerInspectionResult);
    } catch (cause) {
      if (request.current === controller) setError(controller.signal.aborted ? "Auditoría cancelada." : cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  return <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
    <Link href="/" className="text-sm underline underline-offset-4">← Volver a proyectos</Link>
    <header className="space-y-3">
      <div className="flex items-center gap-3"><Server className="h-8 w-8 text-emerald-500" /><h1 className="text-3xl font-bold">MIM Server</h1><span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs">En desarrollo</span></div>
      <p className="max-w-3xl text-sm opacity-80">Compará los mods del último build de servidor de tu proyecto con los archivos del servidor remoto.</p>
      <p className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-emerald-500" />Auditoría de solo lectura: no instala, elimina ni modifica archivos.</p>
      <p className="text-xs opacity-70">Alcance de esta entrega: archivos JAR en mods. Configuraciones, mundos y sincronización quedan pendientes.</p>
    </header>
    {!projects.length && <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">Creá un proyecto en MIM y generá su build de servidor (AllHost) para poder compararlo.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(340px,440px)_1fr]">
      <div className="space-y-3">
        <ServerConnectionForm projects={projects} busy={busy} onInspect={inspect} onChange={() => { setResult(null); setError(null); }} />
        {busy && <button onClick={() => request.current?.abort()} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">Cancelar auditoría</button>}
      </div>
      <div ref={resultArea} className="space-y-4 scroll-mt-28" aria-live="polite">
        {busy && <p role="status" className="rounded-xl border border-[var(--color-border)] p-6">Conectando y leyendo mods… La consulta puede tardar hasta 90 segundos.</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm">{error}</p>}
        {result && <ServerInspectionResultView result={result} />}
        {!result && !busy && !error && <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8"><h2 className="font-semibold">El resultado aparecerá acá</h2><p className="mt-2 text-sm opacity-70">Vas a poder revisar diferencias de versiones, mods faltantes, sobrantes y problemas de compatibilidad.</p></div>}
      </div>
    </div>
  </section>;
}
