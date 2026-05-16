import { EnhancedModMeta, UNKNOWN } from "./types";
import { normalizeVersion } from "./Utils";

export function parseFabricModJson(content: string, loader: string): Partial<EnhancedModMeta> {
  try {
    const json = JSON.parse(content);
    return {
      modId: json.id || json.schema?.["mod-id"] || UNKNOWN,
      modName: json.name || UNKNOWN,
      modVersion: normalizeVersion(json.version) || UNKNOWN,
      loader,
      author: json.authors?.[0]?.name || json.author || UNKNOWN,
      description: json.description,
      website: json.contact?.homepage,
      dependencies: json.depends ? Object.entries(json.depends).map(([id, v]) => ({
        modId: id, version: typeof v === 'string' ? v : (v as any).version, type: "required" as const
      })) : undefined
    };
  } catch { return {}; }
}

export function parseForgeToml(content: string, isNeo: boolean): Partial<EnhancedModMeta> {
  const result: Partial<EnhancedModMeta> = { loader: isNeo ? "neoforge" : "forge" };
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
  } catch { return result; }
}

export function parseMcModInfo(content: string): Partial<EnhancedModMeta> {
  try {
    const json = JSON.parse(content);
    const mod = Array.isArray(json) ? json[0] : json.modList ? json.modList[0] : json;
    return {
      modId: mod.modid || UNKNOWN, modName: mod.name || UNKNOWN,
      modVersion: normalizeVersion(mod.version) || UNKNOWN,
      author: mod.authorList?.[0] || mod.author, loader: "forge"
    };
  } catch { return {}; }
}
