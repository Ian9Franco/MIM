import type {
  RemoteCapability,
  RemoteServerCapabilities,
  RemoteServerTarget,
} from "@mim/contracts-core/server";

export * from "@mim/contracts-core/server";

export function getMissingCapabilities(
  target: RemoteServerTarget,
  required: RemoteCapability[]
): RemoteCapability[] {
  return required.filter((cap) => !target.capabilities[cap]);
}

export function hasRequiredCapabilities(
  target: RemoteServerTarget,
  required: RemoteCapability[]
): boolean {
  return getMissingCapabilities(target, required).length === 0;
}

export function describeServerCapabilities(capabilities: RemoteServerCapabilities): string[] {
  const active: string[] = [];
  if (capabilities.files) active.push("files");
  if (capabilities.process) active.push("process");
  if (capabilities.commands) active.push("commands");
  if (capabilities.telemetry) active.push("telemetry");
  return active;
}

/**
 * Type guard verifying that a remote server target supports a requested capability.
 */
export function hasRemoteCapability<K extends RemoteCapability>(
  target: RemoteServerTarget,
  capability: K
): target is RemoteServerTarget & {
  capabilities: RemoteServerCapabilities & Required<Pick<RemoteServerCapabilities, K>>;
} {
  return target.capabilities[capability] !== undefined;
}
