import type {
  RemoteCapability,
  RemoteServerCapabilities,
  RemoteServerTarget,
} from "./types";

export * from "./types";

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
