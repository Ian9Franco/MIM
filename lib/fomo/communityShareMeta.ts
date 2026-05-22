/** Metadatos embebidos en summary de favorite_mods para ordenar/filtrar en cliente. */

export type CommunityProjectType =
  | "mod"
  | "textura"
  | "shader"
  | "datapack"
  | "modpack"
  | "autor";

export interface CommunityShareMeta {
  gameVersion?: string;
  modloader?: string;
  projectType?: CommunityProjectType;
}

const META_RE = /<!--mim:([\s\S]*?)-->/;

export function encodeShareMeta(
  summary: string,
  meta: CommunityShareMeta
): string {
  const clean = stripShareMeta(summary);
  const payload = JSON.stringify(meta);
  return clean ? `${clean} <!--mim:${payload}-->` : `<!--mim:${payload}-->`;
}

export function stripShareMeta(summary?: string | null): string {
  if (!summary) return "";
  return summary.replace(META_RE, "").trim();
}

export function parseShareMeta(summary?: string | null): CommunityShareMeta {
  if (!summary) return {};
  const m = summary.match(META_RE);
  if (!m) return inferMetaFromSummary(summary);
  try {
    return { ...inferMetaFromSummary(summary), ...JSON.parse(m[1]) };
  } catch {
    return inferMetaFromSummary(summary);
  }
}

function inferMetaFromSummary(summary: string): CommunityShareMeta {
  const text = stripShareMeta(summary).toLowerCase();
  if (text === "autor de minecraft" || text.startsWith("¿querés agregar")) {
    return { projectType: "autor" };
  }
  return { projectType: "mod" };
}

const KNOWN_LOADERS = ["forge", "fabric", "neoforge", "quilt"] as const;

/** Extrae versión, loader y tipo para guardar en favorite_mods.summary. */
export function buildShareMetaFromMod(
  mod: {
    description?: string;
    summary?: string;
    categories?: unknown[];
    loader?: string;
    gameVersions?: string[];
    gameVersion?: string;
    mcVersion?: string;
    projectType?: string;
  },
  opts?: {
    comment?: string;
    gameVersion?: string;
    modloader?: string;
  }
): string {
  const cats = (mod.categories || []).map((c) =>
    typeof c === "string" ? c.toLowerCase() : ""
  );
  const modloader =
    opts?.modloader ||
    cats.find((c) => KNOWN_LOADERS.includes(c as (typeof KNOWN_LOADERS)[number])) ||
    (typeof mod.loader === "string" ? mod.loader : undefined);
  const gameVersion =
    opts?.gameVersion ||
    mod.gameVersions?.[0] ||
    mod.gameVersion ||
    mod.mcVersion ||
    undefined;
  const base =
    (opts?.comment ?? "").trim() ||
    mod.description ||
    mod.summary ||
    "";
  return encodeShareMeta(base, {
    gameVersion,
    modloader,
    projectType: inferTypeFromModHit(mod),
  });
}

export function inferTypeFromModHit(mod: {
  projectType?: string;
  categories?: unknown[];
  url?: string;
  slug?: string;
  title?: string;
}): CommunityProjectType {
  const cats = (mod.categories || []).map((c) =>
    typeof c === "string" ? c.toLowerCase() : ""
  );
  const rawUrl = (mod.url || "").toLowerCase();
  const rawSlug = (mod.slug || "").toLowerCase();
  const rawTitle = (mod.title || "").toLowerCase();

  if (cats.some((c) => c.includes("shader"))) return "shader";
  if (
    rawUrl.includes("/datapack/") ||
    rawSlug.includes("datapack") ||
    rawTitle.includes("datapack") ||
    cats.some((c) => c.includes("datapack"))
  )
    return "datapack";
  if (cats.some((c) => c.includes("resourcepack") || c === "textura"))
    return "textura";
  const pt = (mod.projectType || "").toLowerCase();
  if (pt === "shader") return "shader";
  if (pt === "datapack") return "datapack";
  if (pt === "resourcepack") return "textura";
  if (pt === "modpack") return "modpack";
  return "mod";
}

const LOADER_ORDER = ["neoforge", "forge", "fabric", "quilt"];

export function compareCommunityMods(
  a: { created_at?: string; summary?: string | null; name?: string },
  b: { created_at?: string; summary?: string | null; name?: string }
): number {
  const ma = parseShareMeta(a.summary);
  const mb = parseShareMeta(b.summary);
  const va = ma.gameVersion || "";
  const vb = mb.gameVersion || "";
  if (va !== vb) return vb.localeCompare(va, undefined, { numeric: true });
  const la =
    LOADER_ORDER.indexOf((ma.modloader || "").toLowerCase()) >= 0
      ? LOADER_ORDER.indexOf((ma.modloader || "").toLowerCase())
      : 99;
  const lb =
    LOADER_ORDER.indexOf((mb.modloader || "").toLowerCase()) >= 0
      ? LOADER_ORDER.indexOf((mb.modloader || "").toLowerCase())
      : 99;
  if (la !== lb) return la - lb;
  const ta = new Date(a.created_at || 0).getTime();
  const tb = new Date(b.created_at || 0).getTime();
  return tb - ta;
}
