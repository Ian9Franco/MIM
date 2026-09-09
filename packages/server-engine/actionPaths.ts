import type { ReconciliationAction } from "@mim/contracts-core/server";

/** Keep snapshot and execution paths identical, including versioned JAR renames. */
export function getActionTargetPath(action: ReconciliationAction): string {
  if (action.targetPath) return action.targetPath;
  const artifact = action.type === "remove" ? action.actual : action.desired;
  if (artifact) return `mods/${artifact.fileName}`;
  throw new Error(`Missing target path for ${action.type}: ${action.identity}`);
}

export function getReplacedSourcePath(action: ReconciliationAction): string | undefined {
  if (action.type !== "replace" || !action.actual) return undefined;
  const sourcePath = `mods/${action.actual.fileName}`;
  return sourcePath === getActionTargetPath(action) ? undefined : sourcePath;
}
