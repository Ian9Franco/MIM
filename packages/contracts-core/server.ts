/**
 * Pure Domain Contracts: Server Manager & Remote Infrastructure
 *
 * Capabilities, transport abstractions, reconciliation, preflight,
 * and durable snapshot contracts.
 */

import type { InstanceManifest, InstanceManifestDiff, ModArtifact } from "./instances";

// ==========================================
// Remote File Transport & Capabilities
// ==========================================

export interface RemoteFileEntry {
  path: string;
  name: string;
  kind: "file" | "directory";
  size?: number;
  modifiedAt?: string;
}

export interface ReadOnlyFileTransport {
  list(remotePath: string): Promise<RemoteFileEntry[]>;
  read(remotePath: string): Promise<Uint8Array>;
  stat?(remotePath: string): Promise<RemoteFileEntry | null>;
}

export interface WritableFileTransport extends ReadOnlyFileTransport {
  write(remotePath: string, content: Uint8Array): Promise<void>;
  remove(remotePath: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  mkdir?(remotePath: string): Promise<void>;
}

export type FileTransport = ReadOnlyFileTransport | WritableFileTransport;

export interface ProcessControl {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  status(): Promise<"online" | "offline" | "starting" | "stopping" | "unknown">;
}

export interface CommandChannel {
  execute(command: string): Promise<{ output?: string; accepted: boolean }>;
}

export interface ServerTelemetrySnapshot {
  capturedAt: string;
  playersOnline?: number;
  maxPlayers?: number;
  tps?: number;
  mspt?: number;
  heapUsedMb?: number;
  heapMaxMb?: number;
}

export interface TelemetrySource {
  snapshot(): Promise<ServerTelemetrySnapshot>;
}

export interface RemoteServerCapabilities {
  files?: FileTransport;
  process?: ProcessControl;
  commands?: CommandChannel;
  telemetry?: TelemetrySource;
}

export type RemoteCapability = keyof RemoteServerCapabilities;

export interface RemoteServerTarget {
  id: string;
  displayName: string;
  capabilities: RemoteServerCapabilities;
  manifest?: InstanceManifest;
}

// ==========================================
// SFTP Connection & Discovery
// ==========================================

export type SftpAuthMethod =
  | { type: "password"; password: string }
  | { type: "privateKey"; privateKey: string; passphrase?: string };

export interface SftpConnectionConfig {
  host: string;
  port?: number;
  username: string;
  auth: SftpAuthMethod;
  rootPath?: string;
  knownHostFingerprint?: string;
  timeoutMs?: number;
  maxConcurrentReads?: number;
}

export interface RemoteDiscoveryOptions {
  rootPath?: string;
  modsDir?: string;
  scanServerProperties?: boolean;
  signal?: AbortSignal;
}

export interface RemoteServerDiscoveryResult {
  manifest: InstanceManifest;
  serverProperties?: Record<string, string>;
  discoveredAt: string;
  durationMs: number;
  totalJarFiles: number;
}

// ==========================================
// Reconciliation Plan
// ==========================================

export type ReconciliationActionType =
  | "install"
  | "remove"
  | "replace"
  | "sync-config"
  | "manual-review";

export interface ReconciliationAction {
  type: ReconciliationActionType;
  identity: string;
  targetPath?: string;
  desired?: ModArtifact;
  actual?: ModArtifact;
  reason: string;
  destructive: boolean;
}

export interface ReconciliationPlan {
  desiredInstanceId: string;
  actualInstanceId: string;
  actions: ReconciliationAction[];
  blocked: boolean;
  blockReasons: string[];
  requiresSnapshot: boolean;
  planFingerprint?: string;
}

// ==========================================
// Preflight Validation
// ==========================================

export type PreflightCheckStatus = "pass" | "warn" | "fail";

export interface PreflightCheckResult {
  name: string;
  status: PreflightCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServerPreflightReport {
  overallStatus: "ready" | "blocked" | "warning";
  timestamp: string;
  desiredInstanceId: string;
  actualInstanceId: string;
  checks: PreflightCheckResult[];
  blockReasons: string[];
  warnings: string[];
  plan: ReconciliationPlan;
  observedManifestFingerprint: string;
}

export interface ServerAuditSummary {
  correct: number;
  missingFromServer: number;
  extraOnServer: number;
  updatesRequired: number;
  duplicateIdentities: number;
  environmentMismatches: number;
  validationErrors: number;
  validationWarnings: number;
}

// ==========================================
// Durable Snapshots & Journal
// ==========================================

export type SnapshotEntryAction = "existed" | "created";
export type SnapshotStatus = "active" | "restored" | "discarded";

export interface SnapshotEntry {
  relativePath: string;
  action: SnapshotEntryAction;
  originalSha256?: string;
  backupBlob?: Uint8Array;
  sizeBytes?: number;
}

export interface ServerSnapshot {
  snapshotId: string;
  serverId: string;
  operationId: string;
  createdAt: string;
  status: SnapshotStatus;
  observedManifestFingerprint: string;
  desiredManifestFingerprint: string;
  entries: SnapshotEntry[];
  metadata?: Record<string, string | number | boolean | null>;
}

export type ServerChangeType =
  | "reconciliation-planned"
  | "mod-installed"
  | "mod-removed"
  | "mod-replaced"
  | "config-updated"
  | "server-started"
  | "server-stopped"
  | "server-restarted"
  | "snapshot-created"
  | "rollback-applied"
  | "crash-detected";

export interface ServerChangeRecord {
  id: string;
  serverId: string;
  type: ServerChangeType;
  timestamp: string;
  reconciliationId?: string;
  artifactBefore?: ModArtifact;
  artifactAfter?: ModArtifact;
  path?: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface MutationSafetyResult {
  safe: boolean;
  reasons: string[];
}

// ==========================================
// SRV-4: Deployment & Rollback Execution
// ==========================================

export type DeploymentExecutionState =
  | "idle"
  | "preflight"
  | "snapshotting"
  | "staging"
  | "applying"
  | "verifying"
  | "completed"
  | "rolling-back"
  | "rolled-back"
  | "recovery-required"
  | "failed";

export interface DeploymentStepResult {
  step: string;
  success: boolean;
  durationMs: number;
  message?: string;
  error?: string;
}

export interface DeploymentExecutionOptions {
  stagingDir?: string;
  force?: boolean;
  autoRollbackOnError?: boolean;
  verifyHashes?: boolean;
  signal?: AbortSignal;
}

export interface DeploymentReport {
  deploymentId: string;
  serverId: string;
  status: DeploymentExecutionState;
  startedAt: string;
  completedAt?: string;
  snapshotId?: string;
  steps: DeploymentStepResult[];
  appliedActions: number;
  rolledBackActions: number;
  error?: string;
}

export interface RollbackResult {
  rollbackId: string;
  snapshotId: string;
  serverId: string;
  success: boolean;
  restoredEntries: number;
  deletedEntries: number;
  failedEntries: { path: string; error: string }[];
  durationMs: number;
  requiresManualRecovery: boolean;
}

// ==========================================
// SRV-5: Remote SAGE Diagnostic System
// ==========================================

export type ServerCrashCategory =
  | "mod_incompatibility"
  | "missing_dependency"
  | "ticking_entity"
  | "ticking_block"
  | "mixin_injection_failure"
  | "class_not_found"
  | "java_version_mismatch"
  | "out_of_memory"
  | "corrupted_save"
  | "unknown";

export interface RemoteLogEntry {
  timestamp?: string;
  level: "INFO" | "WARN" | "ERROR" | "FATAL" | "DEBUG";
  thread?: string;
  logger?: string;
  message: string;
}

export interface ServerSageIncidentReport {
  incidentId: string;
  serverId: string;
  analyzedAt: string;
  category: ServerCrashCategory;
  culpritMods: string[];
  rootCause: string;
  recommendedAction: string;
  correlatedDeploymentId?: string;
  correlatedChanges?: ServerChangeRecord[];
  stackTraceSnippet?: string;
  rawLogSnippet?: string;
}

// ==========================================
// SRV-6: Server Administration, RCON & Backups
// ==========================================

export interface ServerPropertiesConfig {
  properties: Record<string, string>;
  rawComments: Record<string, string>;
  orderedKeys: string[];
}

export interface ServerPropertyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RconCommandResult {
  command: string;
  response: string;
  success: boolean;
  executedAt: string;
  durationMs: number;
}

export interface ServerBackupInfo {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  worldName?: string;
}

export interface WorldMetadataInfo {
  levelName: string;
  generatorName?: string;
  seed?: string;
  gameType?: number | string;
  difficulty?: number | string;
  hardcore?: boolean;
  versionName?: string;
  versionId?: number;
}

// ==========================================
// SRV-7: Multiplayer Client-Server Sync
// ==========================================

export interface DistributableModRequirement {
  identity: string;
  displayName: string;
  filename: string;
  sha256?: string;
  required: boolean;
  downloadUrl?: string;
  side: "client" | "both";
}

export interface DistributableServerManifest {
  schemaVersion: "1.0";
  serverId: string;
  serverName: string;
  minecraftVersion: string;
  modLoader: string;
  modLoaderVersion: string;
  exportedAt: string;
  requiredMods: DistributableModRequirement[];
  optionalMods: DistributableModRequirement[];
}

export interface ClientSyncDiffResult {
  status: "ready" | "mismatched" | "incompatible";
  missingMods: DistributableModRequirement[];
  versionMismatches: { required: DistributableModRequirement; actual: ModArtifact }[];
  clientOnlyModsPreserved: ModArtifact[];
  incompatibleLoaders?: { server: string; client: string };
  incompatibleMinecraft?: { server: string; client: string };
}

