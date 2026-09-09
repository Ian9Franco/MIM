/**
 * Server Domain Contracts
 *
 * Remote capabilities, transport abstractions, reconciliation, preflight,
 * and durable snapshots. Re-exported from @mim/contracts-core for backward compatibility.
 */

import type { PackHealthReport } from "@/lib/core/types";
import type { InstanceManifestDiff } from "@mim/contracts-core/instances";
import type { ServerAuditSummary, WritableFileTransport, FileTransport } from "@mim/contracts-core/server";

export * from "@mim/contracts-core/server";

export interface ServerAuditReport {
  desiredInstanceId: string;
  actualInstanceId: string;
  generatedAt: string;
  validation: PackHealthReport;
  diff: InstanceManifestDiff;
  summary: ServerAuditSummary;
  readyForPlanning: boolean;
}

export function isWritableTransport(transport: FileTransport): transport is WritableFileTransport {
  return (
    typeof (transport as WritableFileTransport).write === "function" &&
    typeof (transport as WritableFileTransport).remove === "function" &&
    typeof (transport as WritableFileTransport).move === "function"
  );
}
