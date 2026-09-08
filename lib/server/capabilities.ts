import type { InstanceManifest } from "@/lib/instances/types";

export interface RemoteFileEntry {
  path: string;
  name: string;
  kind: "file" | "directory";
  size?: number;
  modifiedAt?: string;
}

export interface FileTransport {
  list(path: string): Promise<RemoteFileEntry[]>;
  read(path: string): Promise<Buffer>;
  write(path: string, content: Buffer): Promise<void>;
  remove(path: string): Promise<void>;
  move?(from: string, to: string): Promise<void>;
}

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
  /** Last observed manifest. Reading it is provider/transport specific. */
  manifest?: InstanceManifest;
}

export function hasRemoteCapability<K extends RemoteCapability>(
  target: RemoteServerTarget,
  capability: K
): target is RemoteServerTarget & {
  capabilities: RemoteServerCapabilities & Required<Pick<RemoteServerCapabilities, K>>;
} {
  return target.capabilities[capability] !== undefined;
}
