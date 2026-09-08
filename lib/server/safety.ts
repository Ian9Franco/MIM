export type ServerRuntimeStatus =
  | "online"
  | "offline"
  | "starting"
  | "stopping"
  | "unknown";

export type RemoteMutationOperation = "write" | "remove" | "move";

export interface RemoteMutationSafetyInput {
  path: string;
  operation: RemoteMutationOperation;
  serverStatus: ServerRuntimeStatus;
  snapshotAvailable: boolean;
}

export interface RemoteMutationSafetyResult {
  allowed: boolean;
  reasons: string[];
  requiresSnapshot: boolean;
  requiresOfflineServer: boolean;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

/**
 * World/NBT paths where concurrent writes can corrupt persisted state.
 * This intentionally errs on the side of blocking until a later operation has
 * a stronger provider-specific safety proof.
 */
export function isSensitiveWorldPath(path: string): boolean {
  const normalized = normalizePath(path);
  return (
    normalized.endsWith("/level.dat") ||
    normalized.endsWith("/level.dat_old") ||
    normalized.includes("/region/") ||
    normalized.includes("/playerdata/") ||
    normalized.includes("/poi/") ||
    normalized.includes("/entities/")
  );
}

/** Pure preflight policy. It performs no remote operation. */
export function evaluateRemoteMutationSafety(
  input: RemoteMutationSafetyInput
): RemoteMutationSafetyResult {
  const reasons: string[] = [];
  const sensitive = isSensitiveWorldPath(input.path);
  const destructive = input.operation === "remove" || input.operation === "move";
  const requiresSnapshot = sensitive || destructive;
  const requiresOfflineServer = sensitive;

  if (requiresSnapshot && !input.snapshotAvailable) {
    reasons.push("A verified snapshot is required before this mutation");
  }

  if (requiresOfflineServer && input.serverStatus !== "offline") {
    reasons.push("Sensitive world data may only be mutated while the server is offline");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    requiresSnapshot,
    requiresOfflineServer,
  };
}
