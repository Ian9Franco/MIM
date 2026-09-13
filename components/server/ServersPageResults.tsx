import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerInspectionResult } from "@/lib/server/inspectServer";
import type { DesktopDeployPhase } from "@/components/server/ServerDeployPanel";
import type { DeploymentReport } from "@mim/contracts-core/server";
import { ServerInspectionResultView } from "@/components/server/ServerInspectionResultView";
import { ServerSageDiagnosticPanel } from "@/components/server/ServerSageDiagnosticPanel";
import { ServerAdminPanel } from "@/components/server/ServerAdminPanel";
import { ServerMultiplayerSyncPanel } from "@/components/server/ServerMultiplayerSyncPanel";
import { serverPanelClass, serverPanelStyle } from "./serverUi";

interface Props {
  busy: boolean;
  error: string | null;
  result: ServerInspectionResult | null;
  deployPhase: DesktopDeployPhase;
  deployReport: DeploymentReport | null;
  deployError: string | null;
  activeInspect: InspectServerRequest | null;
  setBusy: (busy: boolean) => void;
  onDeploy: () => void;
  onCancelDeploy: () => void;
  onReaudit: () => void;
  onAcknowledgeRecovery: () => void;
  onBeginConfirm: () => void;
  onCancelConfirm: () => void;
}

export function ServersPageResults({
  busy,
  error,
  result,
  deployPhase,
  deployReport,
  deployError,
  activeInspect,
  setBusy,
  onDeploy,
  onCancelDeploy,
  onReaudit,
  onAcknowledgeRecovery,
  onBeginConfirm,
  onCancelConfirm,
}: Props) {
  return (
    <>
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
              onBeginConfirm,
              onCancelConfirm,
              onApply: onDeploy,
              onCancelApply: onCancelDeploy,
              onReaudit,
              onAcknowledgeRecovery,
            }}
          />
          <ServerSageDiagnosticPanel inspectRequest={activeInspect} deploymentId={deployReport?.deploymentId} busy={busy} onBusyChange={setBusy} />
          <ServerAdminPanel inspectRequest={activeInspect} busy={busy} onBusyChange={setBusy} />
          <ServerMultiplayerSyncPanel inspectRequest={activeInspect} busy={busy} onBusyChange={setBusy} />
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
    </>
  );
}
