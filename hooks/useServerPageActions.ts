"use client";

import { useRef, useState } from "react";
import { inspectServerSchema, type InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";
import type { DesktopDeployPhase } from "@/components/server/ServerDeployPanel";
import type { DeploymentReport } from "@mim/contracts-core/server";

function recoveryKey(input: InspectServerRequest): string {
  return `mim-server-recovery:${input.connection.host}:${input.connection.port}:${input.connection.rootPath}`;
}

function readApiError(data: { error?: string; message?: string }, fallback: string): string {
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

export function useServerPageActions() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerInspectionResult | null>(null);
  const [deployPhase, setDeployPhase] = useState<DesktopDeployPhase>("idle");
  const [deployReport, setDeployReport] = useState<DeploymentReport | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const lastInspect = useRef<InspectServerRequest | null>(null);
  const [activeInspect, setActiveInspect] = useState<InspectServerRequest | null>(null);

  function resetDeploy(phase: DesktopDeployPhase = "idle") {
    setDeployPhase(phase);
    if (phase === "idle") {
      setDeployReport(null);
      setDeployError(null);
    }
  }

  function clearResult() {
    setResult(null);
    setError(null);
    setActiveInspect(null);
    if (deployPhase !== "recovery-required") resetDeploy();
  }

  async function inspect(input: InspectServerRequest) {
    const parsed = inspectServerSchema.safeParse(input);
    if (!parsed.success) {
      setError(`Revisá los datos de conexión: ${parsed.error.issues[0].message}`);
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    lastInspect.current = input;
    setActiveInspect(input);
    setBusy(true);
    setError(null);
    setResult(null);
    const blocked = typeof sessionStorage !== "undefined" && sessionStorage.getItem(recoveryKey(input)) === "1";
    resetDeploy(blocked ? "recovery-required" : "idle");
    try {
      const response = await fetch("/api/server/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(readApiError(data, "No se pudo completar la auditoría."));
      if (!controller.signal.aborted) setResult(data as ServerInspectionResult);
    } catch (cause) {
      if (request.current === controller) {
        setError(controller.signal.aborted ? "Auditoría cancelada." : cause instanceof Error ? cause.message : "Error de conexión.");
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  async function deploy() {
    const input = lastInspect.current;
    if (!input) {
      setDeployError("Volvé a auditar e ingresá las credenciales otra vez.");
      setDeployPhase("failed");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setDeployError(null);
    setDeployPhase("preflight");
    queueMicrotask(() => {
      if (request.current === controller) {
        setDeployPhase((current) => (current === "preflight" ? "executing" : current));
      }
    });
    try {
      const response = await fetch("/api/server/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, confirm: true }),
        signal: controller.signal,
      });
      const data = (await response.json()) as { deployment?: DeploymentReport; error?: string; message?: string };
      if (!response.ok) throw new Error(readApiError(data, "No se pudo completar el despliegue."));
      const deployment = data.deployment;
      if (!deployment) throw new Error("No se pudo completar el despliegue.");
      setDeployReport(deployment);
      if (deployment.status === "recovery-required") {
        setDeployPhase("recovery-required");
        try {
          sessionStorage.setItem(recoveryKey(input), "1");
        } catch {
          /* ignore quota */
        }
      } else if (deployment.status === "completed") {
        setDeployPhase("completed");
      } else {
        setDeployPhase("failed");
        setDeployError(
          deployment.error ||
            (deployment.status === "rolled-back" ? "El despliegue falló y se revirtieron los cambios." : "El despliegue no se completó.")
        );
      }
    } catch (cause) {
      if (request.current === controller) {
        setDeployPhase("failed");
        setDeployError(controller.signal.aborted ? "Despliegue cancelado." : cause instanceof Error ? cause.message : "Error de conexión.");
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  function cancelRequest() {
    request.current?.abort();
  }

  function reaudit() {
    if (lastInspect.current) void inspect(lastInspect.current);
  }

  function acknowledgeRecovery() {
    if (!lastInspect.current) return;
    try {
      sessionStorage.removeItem(recoveryKey(lastInspect.current));
    } catch {
      /* ignore */
    }
    setDeployPhase("idle");
    setDeployReport(null);
    setDeployError(null);
  }

  function beginDeployConfirm() {
    setDeployPhase("confirming");
  }

  function cancelDeployConfirm() {
    setDeployPhase("idle");
  }

  return {
    busy,
    setBusy,
    error,
    result,
    deployPhase,
    deployReport,
    deployError,
    activeInspect,
    inspect,
    deploy,
    clearResult,
    cancelRequest,
    reaudit,
    acknowledgeRecovery,
    beginDeployConfirm,
    cancelDeployConfirm,
    requestRef: request,
  };
}
