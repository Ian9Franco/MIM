import type { DiagnoseServerRequest } from "./diagnoseSchema";
import { diagnoseRemoteServer } from "@mim/server-engine/sageRemote";
import { getRecentServerChanges } from "@mim/server-engine/history";
import type { ReadOnlyFileTransport, RemoteFileEntry } from "@mim/contracts-core/server";
import { openSftpReadTransport, SftpAuditError } from "./transport/sftpReadTransport";
import { acquireServerSession } from "./sessionLock";
import { REMOTE_SERVER_INSTANCE_ID } from "./serverIdentity";
import { createServerSnapshotStore } from "./snapshotStoreFactory";

const DEFAULT_LATEST_LOG = "logs/latest.log";
const CRASH_REPORTS_DIR = "crash-reports";

async function resolveCrashReportPath(transport: ReadOnlyFileTransport): Promise<string> {
  let entries: RemoteFileEntry[];
  try {
    entries = await transport.list(CRASH_REPORTS_DIR);
  } catch {
    throw new SftpAuditError("LOG_UNAVAILABLE", "No se encontró la carpeta crash-reports en el servidor.");
  }
  const reports = entries
    .filter((entry) => entry.kind === "file" && entry.name.toLowerCase().endsWith(".txt"))
    .sort((a, b) => b.name.localeCompare(a.name));
  if (!reports.length) {
    throw new SftpAuditError("LOG_UNAVAILABLE", "No hay crash reports en crash-reports/.");
  }
  return reports[0].path;
}

function resolveLogPath(input: DiagnoseServerRequest): string {
  if (input.logPath) return input.logPath;
  return input.logSource === "crash-report" ? CRASH_REPORTS_DIR : DEFAULT_LATEST_LOG;
}

async function performDiagnosis(input: DiagnoseServerRequest, signal: AbortSignal) {
  const session = await openSftpReadTransport(input.connection, signal);
  try {
    const logPath =
      input.logSource === "crash-report" && !input.logPath
        ? await resolveCrashReportPath(session.transport)
        : resolveLogPath(input);

    const snapshotStore = createServerSnapshotStore();
    const changeHistory = await snapshotStore.getChangeHistory(REMOTE_SERVER_INSTANCE_ID);
    const recentChanges = getRecentServerChanges(changeHistory, {
      serverId: REMOTE_SERVER_INSTANCE_ID,
      limit: 50,
    });

    const report = await diagnoseRemoteServer(
      session.transport,
      REMOTE_SERVER_INSTANCE_ID,
      logPath,
      recentChanges
    );

    if (input.deploymentId) {
      report.correlatedDeploymentId = input.deploymentId;
    }

    return { report, logPath };
  } finally {
    session.close();
  }
}

export type ServerDiagnosisResult = Awaited<ReturnType<typeof diagnoseServer>>;

/** Read remote logs and run deterministic SAGE server diagnosis (SRV-5). */
export async function diagnoseServer(input: DiagnoseServerRequest, signal: AbortSignal) {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    return await performDiagnosis(input, signal);
  } finally {
    release();
  }
}
