/** Banner de mods: primera imagen de galería o patrón por tipo de proyecto. */

export type FomoBannerProjectType =
  | "mod"
  | "shader"
  | "textura"
  | "resourcepack"
  | "datapack"
  | "modpack";

export function getFirstGalleryUrl(
  gallery?: (string | { url?: string } | null)[] | null
): string | undefined {
  if (!gallery?.length) return undefined;
  const first = gallery[0];
  if (!first) return undefined;
  if (typeof first === "string") return first;
  return first.url;
}

export function resolveModBannerUrl(mod: {
  gallery?: (string | { url?: string } | null)[] | null;
}): string | undefined {
  return getFirstGalleryUrl(mod.gallery);
}

const POTENTIAL_TYPES = ["datapack", "mod", "resourcepack", "shader", "textura", "modpack"];
const KNOWN_LOADERS = ["forge", "fabric", "neoforge", "quilt"];

export function inferPrimaryProjectType(mod: {
  projectType?: string;
  categories?: unknown[];
}): FomoBannerProjectType {
  const found = new Set<string>();
  if (mod.projectType) {
    const pt = mod.projectType.toLowerCase();
    if (pt === "resourcepack") found.add("textura");
    else found.add(pt);
  }
  (mod.categories || []).forEach((c) => {
    const lc =
      typeof c === "string"
        ? c.toLowerCase()
        : typeof (c as { name?: string })?.name === "string"
          ? (c as { name: string }).name.toLowerCase()
          : "";
    if (POTENTIAL_TYPES.includes(lc)) {
      if (lc === "resourcepack") found.add("textura");
      else found.add(lc);
    }
  });
  const sorted = Array.from(found).sort((a, b) => {
    if (a === "datapack") return -1;
    if (b === "datapack") return 1;
    if (a === "modpack") return -1;
    if (b === "modpack") return 1;
    if (a === "mod") return -1;
    if (b === "mod") return 1;
    return a.localeCompare(b);
  });
  const t = sorted[0] || "mod";
  if (t === "resourcepack") return "textura";
  if (
    t === "shader" ||
    t === "datapack" ||
    t === "modpack" ||
    t === "textura"
  ) {
    return t as FomoBannerProjectType;
  }
  return "mod";
}

export function communityTypeToBannerType(
  type?: string | null
): FomoBannerProjectType {
  if (!type) return "mod";
  const t = type.toLowerCase();
  if (t === "resourcepack" || t === "textura") return "textura";
  if (t === "shader" || t === "datapack" || t === "modpack") return t as FomoBannerProjectType;
  return "mod";
}

export interface BannerFallbackStyle {
  bannerBgColor: string;
  fallbackTexture: Record<string, string>;
}

export function getBannerFallbackStyle(
  primaryType: FomoBannerProjectType | string
): BannerFallbackStyle {
  let bannerBgColor = "#18181b";
  let fallbackTexture: Record<string, string> = {};

  if (primaryType === "datapack") {
    bannerBgColor = "#022c22";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H8v-2h12V9.5h-2V7h2V5H8v-2h12V.5h-2V-2h2v2h2v2h2v-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2.5H20zm0 0V23h20v2H20v2h12v2H20v2h12v2H20v2h12v2H20v2.5h2V42h-2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2.5H20z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "shader") {
    bannerBgColor = "#2e1065";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.392-5.351-2.352-10.051-6.102-13.799C11.332 2.453 6.136.634 0 0h100c-6.136.634-11.332 2.453-15.082 6.201C81.168 9.949 78.424 14.649 78.816 20h-57.632z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "textura" || primaryType === "resourcepack") {
    bannerBgColor = "#451a03";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20l20-20v20L20 40V20zM0 40l20-20v20L0 40zm0-20L20 0v20L0 20z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "modpack") {
    bannerBgColor = "#172554";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='100' viewBox='0 0 60 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M30 50L0 67.5V100l30-17.5V50zm0-50L0 17.5V50l30-17.5V0zm30 17.5L30 35v33.25l30-17.5V17.5zM30 67.5L0 85v33.25l30-17.5V67.5z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  } else {
    bannerBgColor = "#500724";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  }

  return { bannerBgColor, fallbackTexture };
}

const galleryCache = new Map<string, string>();

export function getCachedGalleryBanner(
  projectId: string,
  platform?: string
): string | undefined {
  return galleryCache.get(`${platform || "modrinth"}:${projectId}`);
}

export function setCachedGalleryBanner(
  projectId: string,
  platform: string | undefined,
  url: string
): void {
  galleryCache.set(`${platform || "modrinth"}:${projectId}`, url);
}

export async function fetchFirstGalleryUrl(
  projectId: string,
  platform?: string
): Promise<string | undefined> {
  const key = `${platform || "modrinth"}:${projectId}`;
  const cached = galleryCache.get(key);
  if (cached) return cached;
  try {
    const src = platform === "curseforge" ? "curseforge" : "modrinth";
    const r = await fetch(
      `/api/mod-gallery?projectId=${encodeURIComponent(projectId)}&source=${src}`
    );
    if (!r.ok) return undefined;
    const d = await r.json();
    const url = d.gallery?.[0]?.url as string | undefined;
    if (url) galleryCache.set(key, url);
    return url;
  } catch {
    return undefined;
  }
}
