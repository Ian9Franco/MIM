"use client";

import { Loader2, RefreshCw, Users } from "lucide-react";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import { useMultiplayerSync } from "@/hooks/useMultiplayerSync";
import { ServerMultiplayerSyncResultView } from "@/components/server/ServerMultiplayerSyncResult";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverPanelClass, serverPanelStyle } from "./serverUi";

interface Props {
  inspectRequest: InspectServerRequest | null;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

export function ServerMultiplayerSyncPanel({ inspectRequest, busy, onBusyChange }: Props) {
  const { error, result, sync } = useMultiplayerSync(inspectRequest, onBusyChange);

  return (
    <section aria-label="Sync multiplayer cliente-servidor" className={`${serverPanelClass} space-y-4`} style={serverPanelStyle}>
      <SectionHeading
        icon={<Users className="w-4 h-4" />}
        title="Sync multiplayer"
        sub="Compará tu build alluser local contra el manifest distribuible del servidor remoto."
        accentColor="#f59e0b"
      />
      <button
        type="button"
        onClick={() => { void sync(); }}
        disabled={busy || !inspectRequest}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Comparar cliente vs servidor
      </button>
      {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      {result && <ServerMultiplayerSyncResultView result={result} />}
    </section>
  );
}
