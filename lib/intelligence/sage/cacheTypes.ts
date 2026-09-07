export interface SageActionableItem {
  id: string;
  label: string;
  action: "disable_mod" | "update_mod" | "install_dependency" | "optimize_jvm";
  modId?: string;
  targetFile?: string;
  url?: string;
}

export interface SageEliminationCandidate {
  modId: string;
  confidence: number;
  reason: string;
  hasDirectMixinCollision: boolean;
  isMissingDependency: boolean;
}

export interface SageCacheEntry {
  signature: string;
  timestamp: number;
  loader: string;
  mcVersion: string;
  culprit: string;
  suspects: string[];
  severity: "critical" | "warning" | "info";
  summary: string;
  mimbotExplanation: string;
  personality: "bully" | "standard";
  solutions: string[];
  actionableFixes: SageActionableItem[];
  eliminationTree: SageEliminationCandidate[];
  sources?: string[];
}

export type SageCacheStore = Record<string, SageCacheEntry>;
