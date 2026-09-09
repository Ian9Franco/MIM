import type { InstanceManifest } from "@/lib/instances/types";
import type { ReconciliationPlan } from "@/lib/server/types";

export type ServerEventMap = {
  "server:connected": {
    serverId: string;
    capabilities: Array<"files" | "process" | "commands" | "telemetry">;
  };
  "server:disconnected": { serverId: string; reason?: string };
  "server:manifest-scanned": {
    serverId: string;
    manifest: InstanceManifest;
    durationMs: number;
  };
  "server:manifest-changed": {
    serverId: string;
    previousManifestId?: string;
    manifest: InstanceManifest;
  };
  "server:reconciliation-planned": {
    serverId: string;
    plan: ReconciliationPlan;
  };
  "server:sync-started": {
    serverId: string;
    desiredInstanceId: string;
    actualInstanceId: string;
  };
  "server:sync-completed": {
    serverId: string;
    actionsApplied: number;
    durationMs: number;
  };
  "server:sync-failed": {
    serverId: string;
    error: string;
    rollbackAttempted: boolean;
  };
  "server:crash-detected": {
    serverId: string;
    logPath: string;
    detectedAt: string;
  };
  "server:health-degraded": {
    serverId: string;
    reason: string;
    tps?: number;
    mspt?: number;
  };
};
