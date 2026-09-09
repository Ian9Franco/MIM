/**
 * Server Configuration & Properties Administration Engine (SRV-6a)
 * Parses, validates, and serializes server.properties and config files,
 * strictly preserving comments and unmanaged custom keys.
 */

import type {
  ServerPropertiesConfig,
  ServerPropertyValidationResult,
} from "@mim/contracts-core/server";

/**
 * Parses a raw server.properties string into structured representation.
 */
export function parseServerProperties(rawContent: string): ServerPropertiesConfig {
  const lines = rawContent.split(/\r?\n/);
  const properties: Record<string, string> = {};
  const rawComments: Record<string, string> = {};
  const orderedKeys: string[] = [];

  let currentCommentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("#") || trimmed.startsWith("!")) {
      currentCommentBlock.push(line);
      continue;
    }

    if (!trimmed) {
      currentCommentBlock.push(line);
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex !== -1) {
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();

      properties[key] = value;
      orderedKeys.push(key);

      if (currentCommentBlock.length > 0) {
        rawComments[key] = currentCommentBlock.join("\n");
        currentCommentBlock = [];
      }
    }
  }

  // Trailing comments if any
  if (currentCommentBlock.length > 0) {
    rawComments["__trailing__"] = currentCommentBlock.join("\n");
  }

  return {
    properties,
    rawComments,
    orderedKeys,
  };
}

/**
 * Serializes a structured ServerPropertiesConfig back to standard Minecraft server.properties format.
 */
export function serializeServerProperties(config: ServerPropertiesConfig): string {
  const lines: string[] = [];

  for (const key of config.orderedKeys) {
    if (config.rawComments[key]) {
      lines.push(config.rawComments[key]);
    }
    const val = config.properties[key] !== undefined ? config.properties[key] : "";
    lines.push(`${key}=${val}`);
  }

  // Add any new keys that were not in original orderedKeys
  for (const [key, val] of Object.entries(config.properties)) {
    if (!config.orderedKeys.includes(key)) {
      lines.push(`${key}=${val}`);
    }
  }

  if (config.rawComments["__trailing__"]) {
    lines.push(config.rawComments["__trailing__"]);
  }

  return lines.join("\n") + "\n";
}

/**
 * Validates server.properties values against Minecraft constraints and security best practices.
 */
export function validateServerProperties(properties: Record<string, string>): ServerPropertyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Port validation
  if (properties["server-port"]) {
    const port = parseInt(properties["server-port"], 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`Invalid server-port: '${properties["server-port"]}'. Must be between 1 and 65535.`);
    }
  }

  // 2. Max players validation
  if (properties["max-players"]) {
    const maxPlayers = parseInt(properties["max-players"], 10);
    if (isNaN(maxPlayers) || maxPlayers < 1) {
      errors.push(`Invalid max-players: '${properties["max-players"]}'. Must be a positive integer.`);
    }
  }

  // 3. View distance validation
  if (properties["view-distance"]) {
    const viewDist = parseInt(properties["view-distance"], 10);
    if (isNaN(viewDist) || viewDist < 2 || viewDist > 32) {
      warnings.push(`view-distance '${properties["view-distance"]}' outside recommended range (2 to 32).`);
    }
  }

  // 4. Online mode security check
  if (properties["online-mode"] === "false") {
    warnings.push("online-mode is set to 'false'. Server will allow unauthenticated (cracked) players.");
  }

  // 5. RCON validation
  if (properties["enable-rcon"] === "true") {
    if (!properties["rcon.password"] || properties["rcon.password"].trim() === "") {
      errors.push("RCON is enabled (enable-rcon=true) but 'rcon.password' is empty.");
    }
    if (properties["rcon.port"]) {
      const rconPort = parseInt(properties["rcon.port"], 10);
      if (isNaN(rconPort) || rconPort < 1 || rconPort > 65535) {
        errors.push(`Invalid rcon.port: '${properties["rcon.port"]}'. Must be between 1 and 65535.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Safely updates properties in a ServerPropertiesConfig, preserving unmanaged keys and comment blocks.
 */
export function updateServerProperties(
  config: ServerPropertiesConfig,
  updates: Record<string, string>
): ServerPropertiesConfig {
  const newProps = { ...config.properties, ...updates };
  const newOrderedKeys = [...config.orderedKeys];

  for (const key of Object.keys(updates)) {
    if (!newOrderedKeys.includes(key)) {
      newOrderedKeys.push(key);
    }
  }

  return {
    properties: newProps,
    rawComments: { ...config.rawComments },
    orderedKeys: newOrderedKeys,
  };
}
