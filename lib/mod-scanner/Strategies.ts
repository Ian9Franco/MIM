import { EnhancedModMeta, UNKNOWN } from "./types";
import { normalizeVersion } from "./Utils";

function parseFabricEnvironment(environment: unknown): Pick<EnhancedModMeta, "environment" | "clientSide" | "serverSide"> {
  if (environment === "client") {
    return { environment: "client", clientSide: "required", serverSide: "unsupported" };
  }
  if (environment === "server") {
    return { environment: "server", clientSide: "unsupported", serverSide: "required" };
  }
  if (environment === "*") {
    return { environment: "both", clientSide: "optional", serverSide: "optional" };
  }
  return { environment: "unknown", clientSide: "unknown", serverSide: "unknown" };
}

function dependencyEntries(
  value: unknown,
  type: "required" | "optional" | "incompatible"
): NonNullable<EnhancedModMeta["dependencies"]> {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([id, versionValue]) => ({
    modId: id,
    version:
      typeof versionValue === "string"
        ? versionValue
        : typeof versionValue === "object" && versionValue !== null && "version" in versionValue
          ? String((versionValue as { version?: unknown }).version ?? "") || undefined
          : undefined,
    type,
  }));
}

export function parseFabricModJson(content: string, loader: string): Partial<EnhancedModMeta> {
  try {
    const json = JSON.parse(content);
    const dependencies = [
      ...dependencyEntries(json.depends, "required"),
      ...dependencyEntries(json.recommends, "optional"),
      ...dependencyEntries(json.suggests, "optional"),
      ...dependencyEntries(json.conflicts, "incompatible"),
      ...dependencyEntries(json.breaks, "incompatible"),
    ];
    const incompatibleIds = dependencies
      .filter((dependency) => dependency.type === "incompatible")
      .map((dependency) => dependency.modId);
    const firstAuthor = Array.isArray(json.authors) ? json.authors[0] : undefined;

    return {
      modId: json.id || json.schema?.["mod-id"] || UNKNOWN,
      modName: json.name || UNKNOWN,
      modVersion: normalizeVersion(json.version) || UNKNOWN,
      loader,
      author:
        typeof firstAuthor === "string"
          ? firstAuthor
          : firstAuthor?.name || json.author || UNKNOWN,
      description: json.description,
      website: json.contact?.homepage,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      conflicts: incompatibleIds.length > 0 ? incompatibleIds : undefined,
      providedIds: Array.isArray(json.provides)
        ? json.provides.filter((value: unknown): value is string => typeof value === "string")
        : undefined,
      ...parseFabricEnvironment(json.environment),
    };
  } catch {
    return {};
  }
}

export function parseForgeToml(content: string, isNeo: boolean): Partial<EnhancedModMeta> {
  const result: Partial<EnhancedModMeta> = {
    loader: isNeo ? "neoforge" : "forge",
    environment: "unknown",
    clientSide: "unknown",
    serverSide: "unknown",
  };
  try {
    const id = content.match(/^modId\s*=\s*"([^"]+)"/m);
    if (id) result.modId = id[1];
    const name = content.match(/displayName\s*=\s*"([^"]+)"/);
    if (name) result.modName = name[1];
    const ver = content.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
    if (ver) result.modVersion = normalizeVersion(ver[1]);
    const auth = content.match(/authors?\s*=\s*"([^"]+)"/i);
    if (auth) result.author = auth[1];

    // Extraction of gameVersion from dependencies
    const sections = content.split(/\[\[dependencies/i);
    for (const section of sections) {
      const isMc = section.match(/modId\s*=\s*"minecraft"/i);
      const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
      if (rangeMatch) {
        // Simple extraction for 1.x.x versions
        const gvMatch = rangeMatch[1].match(/1\.(1[6-9]|2\d)(?:\.\d+)?/);
        if (gvMatch) {
          result.gameVersion = gvMatch[0];
          if (isMc) break; // Priority to minecraft modId
        }
      }
    }

    return result;
  } catch {
    return result;
  }
}

export function parseMcModInfo(content: string): Partial<EnhancedModMeta> {
  try {
    const json = JSON.parse(content);
    const mod = Array.isArray(json) ? json[0] : json.modList ? json.modList[0] : json;
    return {
      modId: mod.modid || UNKNOWN,
      modName: mod.name || UNKNOWN,
      modVersion: normalizeVersion(mod.version) || UNKNOWN,
      author: mod.authorList?.[0] || mod.author,
      loader: "forge",
      environment: "unknown",
      clientSide: "unknown",
      serverSide: "unknown",
    };
  } catch {
    return {};
  }
}
