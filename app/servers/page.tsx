"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Server, ShieldCheck, ShieldAlert } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { ServerConnectionForm } from "@/components/server/ServerConnectionForm";
import { ServerInspectionResultView } from "@/components/server/ServerInspectionResultView";
import { ServerSageDiagnosticPanel } from "@/components/server/ServerSageDiagnosticPanel";
import { inspectServerSchema, type InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";
import type { DesktopDeployPhase } from "@/components/server/ServerDeployPanel";
import type { DeploymentReport } from "@mim/contracts-core/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverPanelClass, serverPanelStyle } from "@/components/server/serverUi";

function recoveryKey(input: InspectServerRequest): string {
  return `mim-server-recovery:${input.connection.host}:${input.connection.port}:${input.connection.rootPath}`;
}

export default function ServersPage() {
  const { projects } = useProjects();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerInspectionResult | null>(null);
  const [deployPhase, setDeployPhase] = useState<DesktopDeployPhase>("idle");
  const [deployReport, setDeployReport] = useState<DeploymentReport | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const lastInspect = useRef<InspectServerRequest | null>(null);
  const [activeInspect, setActiveInspect] = useState<InspectServerRequest | null>(null);
  const resultArea = useRef<HTMLDivElement>(null);
  useEffect(() => { if (result || error) resultArea.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [result, error]);
  useEffect(() => () => request.current?.abort(), []);

  function resetDeploy(phase: DesktopDeployPhase = "idle") {
    setDeployPhase(phase);
    if (phase === "idle") { setDeployReport(null); setDeployError(null); }
  }

  async function inspect(input: InspectServerRequest) {
    const parsed = inspectServerSchema.safeParse(input);
    if (!parsed.success) { setError(`Revisá los datos de conexión: ${parsed.error.issues[0].message}`); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    lastInspect.current = input;
    setActiveInspect(input);
    setBusy(true); setError(null); setResult(null);
    const blocked = typeof sessionStorage !== "undefined" && sessionStorage.getItem(recoveryKey(input)) === "1";
    resetDeploy(blocked ? "recovery-required" : "idle");
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

  async function deploy() {
    const input = lastInspect.current;
    if (!input) { setDeployError("Volvé a auditar e ingresá las credenciales otra vez."); setDeployPhase("failed"); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setDeployError(null); setDeployPhase("preflight");
    queueMicrotask(() => {
      if (request.current === controller) setDeployPhase((current) => current === "preflight" ? "executing" : current);
    });
    try {
      const response = await fetch("/api/server/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, confirm: true }),
        signal: controller.signal,
      });
      const data = await response.json() as { deployment?: DeploymentReport; error?: string; message?: string };
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "No se pudo completar el despliegue.");
      const deployment = data.deployment;
      if (!deployment) throw new Error("No se pudo completar el despliegue.");
      setDeployReport(deployment);
      if (deployment.status === "recovery-required") {
        setDeployPhase("recovery-required");
        try { sessionStorage.setItem(recoveryKey(input), "1"); } catch { /* ignore quota */ }
      } else if (deployment.status === "completed") {
        setDeployPhase("completed");
      } else {
        setDeployPhase("failed");
        setDeployError(deployment.error || (deployment.status === "rolled-back" ? "El despliegue falló y se revirtieron los cambios." : "El despliegue no se completó."));
      }
    } catch (cause) {
      if (request.current === controller) {
        setDeployPhase("failed");
        setDeployError(controller.signal.aborted ? "Despliegue cancelado." : cause instanceof Error ? cause.message : "Error de conexión.");
      }
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }

  return (
    <div className="space-y-8 animate-fade-up pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/5 px-3 py-2 text-xs font-medium text-[var(--color-muted)] transition-colors hover:border-primary/30 hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a proyectos
      </Link>

      <header className={`${serverPanelClass} space-y-4`} style={serverPanelStyle}>
        <SectionHeading
          icon={<Server className="w-4 h-4" />}
          title="MIM Server"
          sub="Compará y sincronizá mods del build AllHost contra tu servidor remoto por SFTP."
          accentColor="#10b981"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-label text-[9px] uppercase tracking-wider rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
            En desarrollo
          </span>
          <span className="font-label text-[9px] uppercase tracking-wider rounded-lg border border-[var(--color-border)] bg-white/5 px-2.5 py-1 text-[var(--color-muted)]">
            Solo JAR en mods/
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            La auditoría es de solo lectura. Aplicar el plan escribe, reemplaza o quita JAR en el servidor.
          </p>
          <p className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            Configs, mundos y sync multiplayer siguen pendientes. Las credenciales no se guardan.
          </p>
        </div>
      </header>

      {!projects.length && (
        <p role="status" className={`${serverPanelClass} border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400`} style={serverPanelStyle}>
          Creá un proyecto en MIM y generá su build de servidor (AllHost) para poder compararlo.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
        <ServerConnectionForm
          projects={projects}
          busy={busy}
          onInspect={inspect}
          onChange={() => { setResult(null); setError(null); setActiveInspect(null); if (deployPhase !== "recovery-required") resetDeploy(); }}
        />
        <div ref={resultArea} className="space-y-4 scroll-mt-28" aria-live="polite">
          {busy && !result && deployPhase !== "preflight" && deployPhase !== "executing" && (
            <div className={serverPanelClass} style={serverPanelStyle} role="status">
              <p className="text-sm text-[var(--color-muted)]">Conectando y leyendo mods… La consulta puede tardar hasta 90 segundos.</p>
            </div>
          )}
          {error && (
            <p role="alert" className={`${serverPanelClass} text-sm text-rose-200`} style={{ ...serverPanelStyle, borderColor: "rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.08)" }}>
              {error}
            </p>
          )}
          {result && (
            <>
              <ServerInspectionResultView
                result={result}
                deploy={{
                  phase: deployPhase,
                  report: deployReport,
                  error: deployError,
                  busy,
                  onBeginConfirm: () => setDeployPhase("confirming"),
                  onCancelConfirm: () => setDeployPhase("idle"),
                  onApply: () => { void deploy(); },
                  onCancelApply: () => request.current?.abort(),
                  onReaudit: () => { if (lastInspect.current) void inspect(lastInspect.current); },
                  onAcknowledgeRecovery: () => {
                    if (!lastInspect.current) return;
                    try { sessionStorage.removeItem(recoveryKey(lastInspect.current)); } catch { /* ignore */ }
                    setDeployPhase("idle");
                    setDeployReport(null);
                    setDeployError(null);
                  },
                }}
              />
              <ServerSageDiagnosticPanel
                inspectRequest={activeInspect}
                deploymentId={deployReport?.deploymentId}
                busy={busy}
                onBusyChange={setBusy}
              />
            </>
          )}
          {!result && !busy && !error && (
            <div className={`${serverPanelClass} border-dashed`} style={serverPanelStyle}>
              <h2 className="font-headline text-base text-[var(--color-foreground)]">El resultado aparecerá acá</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Vas a poder revisar diferencias de versiones, mods faltantes, sobrantes y, si la auditoría está completa, aplicar el plan en el servidor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
