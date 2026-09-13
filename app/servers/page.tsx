"use client";
import { useEffect, useRef } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useServerPageActions } from "@/hooks/useServerPageActions";
import { ServerConnectionForm } from "@/components/server/ServerConnectionForm";
import { ServersPageHeader } from "@/components/server/ServersPageHeader";
import { ServersPageResults } from "@/components/server/ServersPageResults";
import { serverPanelClass, serverPanelStyle } from "@/components/server/serverUi";

export default function ServersPage() {
  const { projects } = useProjects();
  const actions = useServerPageActions();
  const resultArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actions.result || actions.error) resultArea.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [actions.result, actions.error]);
  useEffect(() => () => actions.requestRef.current?.abort(), [actions.requestRef]);

  return (
    <div className="space-y-8 animate-fade-up pb-8">
      <ServersPageHeader />
      {!projects.length && (
        <p role="status" className={`${serverPanelClass} border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400`} style={serverPanelStyle}>
          Creá un proyecto en MIM y generá su build de servidor (AllHost) para poder compararlo.
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
        <ServerConnectionForm projects={projects} busy={actions.busy} onInspect={actions.inspect} onChange={actions.clearResult} />
        <div ref={resultArea} className="space-y-4 scroll-mt-28" aria-live="polite">
          <ServersPageResults
            busy={actions.busy}
            error={actions.error}
            result={actions.result}
            deployPhase={actions.deployPhase}
            deployReport={actions.deployReport}
            deployError={actions.deployError}
            activeInspect={actions.activeInspect}
            setBusy={actions.setBusy}
            onDeploy={() => { void actions.deploy(); }}
            onCancelDeploy={actions.cancelRequest}
            onReaudit={actions.reaudit}
            onAcknowledgeRecovery={actions.acknowledgeRecovery}
            onBeginConfirm={actions.beginDeployConfirm}
            onCancelConfirm={actions.cancelDeployConfirm}
          />
        </div>
      </div>
    </div>
  );
}
