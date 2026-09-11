import React from "react";
import { markdownToHtml, formatCurseForgeHtml } from "../../lib/markdown";
import { encodeShareMeta } from "../../lib/shareMeta";
import type { FomoModDetails } from "../../types/fomo";
import type { ModHit } from "../SpotlightMarquees";

export const descriptionTranslationCache: Record<string, string> = {};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripHtml(value: string) {
  return value
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function textForTranslation(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|h[1-6]|blockquote|pre|ul|ol)>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[ \t]*[#>]+[ \t]*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/[ \t]{3,}/g, "  "))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function renderBodyText(body: string, source = "modrinth"): React.ReactElement {
  if (!body) return React.createElement("p", { className: "text-xs text-white/40 italic" }, "Sin descripción detallada disponible.");

  let formattedHtml = "";
  if (source === "curseforge") {
    formattedHtml = formatCurseForgeHtml(body);
  } else {
    formattedHtml = markdownToHtml(body);
  }

  return React.createElement("div", {
    className: "mim-rich-description text-xs text-white/70 leading-relaxed space-y-2.5 break-words",
    dangerouslySetInnerHTML: { __html: formattedHtml },
  });
}

export async function translateDescription(projectId: string, markdown: string): Promise<string> {
  if (descriptionTranslationCache[projectId]) {
    return descriptionTranslationCache[projectId];
  }

  const clean = textForTranslation(markdown).substring(0, 2200);
  if (!clean.trim()) return "";

  let html = "";
  try {
    const res = await fetch("/api/fomo/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const translated = data.translatedText || "";
    html = `
      <div class="mim-translation-result-only" style="color: var(--color-primary); font-size: 0.82rem; font-weight: 600; line-height: 1.65;">
        ${escapeHtml(translated.trim()).replace(/\n/g, "<br />")}
      </div>
    `;
  } catch {
    html = `
      <div class="text-xs text-white/70">
        ${escapeHtml(clean).replace(/\n/g, "<br />")}
      </div>
    `;
  }

  descriptionTranslationCache[projectId] = html;
  return html;
}

export type FomoBannerProjectType =
  | "mod"
  | "shader"
  | "textura"
  | "resourcepack"
  | "datapack"
  | "modpack"
  | "bedrock"
  | "addon";

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
  fallbackTexture: React.CSSProperties;
}

export function getBannerFallbackStyle(
  primaryType: FomoBannerProjectType | string
): BannerFallbackStyle {
  let bannerBgColor = "#18181b";
  let fallbackTexture: React.CSSProperties = {};

  if (primaryType === "datapack") {
    bannerBgColor = "#022c22";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H8v-2h12V9.5h-2V7h2V5H8v-2h12V.5h-2V-2h2v2h2v2h2v-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2.5H20zm0 0V23h20v2H20v2h12v2H20v2h12v2H20v2h12v2H20v2.5h2V42h-2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2.5H20z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
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
  } else if (primaryType === "bedrock" || primaryType === "addon") {
    bannerBgColor = "#064e3b";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300cc44' fill-opacity='0.15' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  } else {
    bannerBgColor = "#500724";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  }

  return { bannerBgColor, fallbackTexture };
}

export function releaseGlobalSheetLocks() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
  document.body.style.pointerEvents = "";
  document.body.style.touchAction = "";
  document.documentElement.style.overscrollBehavior = "";
  document.documentElement.style.pointerEvents = "";
  document.documentElement.style.touchAction = "";
}

export const KNOWN_LOADERS = ["forge", "fabric", "neoforge", "quilt"] as const;

export const VERSION_PLATFORM_LABELS: Record<string, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
  datapack: "Datapack",
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  mod: "Mod",
  resourcepack: "Textura",
  textura: "Textura",
  shader: "Shader",
  datapack: "Datapack",
  modpack: "Modpack",
};

export const DEFAULT_VERSION_FILTERS = ["1.21.1", "1.20.1"];

export function compactNumber(value?: number | null) {
  if (!value || Number.isNaN(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return String(value);
}

export function formatPublishedDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export interface VersionRow {
  id: string;
  name: string;
  gameVersions: string[];
  loaders: string[];
  datePublished: string | null;
  downloads: number;
  versionType: string;
  changelog: string;
  changelogUrl?: string | null;
}

export function normalizeLoaderLabel(loader: string) {
  return VERSION_PLATFORM_LABELS[loader.toLowerCase()] || loader;
}

export function normalizeChannelLabel(channel: string) {
  const value = channel.toLowerCase();
  if (value === "release") return "Release";
  if (value === "beta") return "Beta";
  if (value === "alpha") return "Alpha";
  return channel;
}

export function channelPillClass(channel: string) {
  const value = channel.toLowerCase();
  if (value === "release") return "bg-emerald-500/[0.18] text-emerald-300 border-emerald-500/20";
  if (value === "beta") return "bg-amber-500/[0.18] text-amber-300 border-amber-500/20";
  if (value === "alpha") return "bg-rose-500/[0.18] text-rose-300 border-rose-500/20";
  return "bg-white/[0.07] text-white/55 border-white/[0.08]";
}

export function normalizeVersionRows(details: FomoModDetails | null | undefined): VersionRow[] {
  const rows = Array.isArray(details?.versions) ? details.versions : [];
  return rows.map((version): VersionRow => ({
    id: String(version.id || version.version_number || version.versionNumber || version.name),
    name: version.name || version.version_number || version.versionNumber || "Version",
    gameVersions: Array.isArray(version.game_versions) ? version.game_versions : Array.isArray(version.gameVersions) ? version.gameVersions : [],
    loaders: Array.isArray(version.loaders) ? version.loaders : [],
    datePublished: version.date_published || version.datePublished || null,
    downloads: version.downloads || 0,
    versionType: version.version_type || version.versionType || "release",
    changelog: version.changelog || "",
    changelogUrl: (version as Record<string, unknown>).changelog_url as string || (version as Record<string, unknown>).changelogUrl as string || null,
  }));
}

export function getAvailableLoaders(details: FomoModDetails | null | undefined) {
  const versionLoaders = normalizeVersionRows(details).flatMap((version: VersionRow) => version.loaders);
  const directLoaders = Array.isArray(details?.loaders) ? (details.loaders as string[]) : [];
  return Array.from(new Set([...directLoaders, ...versionLoaders]))
    .map((loader) => String(loader).toLowerCase())
    .filter((loader) => KNOWN_LOADERS.includes(loader as (typeof KNOWN_LOADERS)[number]));
}

export function getAvailableContentTypes(details: FomoModDetails | null | undefined, selectedMod?: ModHit | null) {
  const values = [
    selectedMod?.projectType,
    details?.project_type || details?.projectType,
    ...(Array.isArray(details?.versions) ? details.versions.flatMap((version) => version.loaders || []) : []),
  ]
    .map((value) => String(value || "").toLowerCase())
    .map((value) => value === "resource-pack" || value === "texture" ? "resourcepack" : value)
    .filter((value) => Boolean(CONTENT_TYPE_LABELS[value]));

  return Array.from(new Set(values));
}

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
    priority?: boolean;
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
    priority: opts?.priority,
  });
}

export function inferTypeFromModHit(mod: {
  projectType?: string;
  categories?: unknown[];
  url?: string;
  slug?: string;
  title?: string;
}): string {
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

export function getSheetTargetHeight(modalTab: string, hasDeps: boolean): string {
  if (modalTab === "deps") return hasDeps ? "96dvh" : "72dvh";
  if (modalTab === "versions") return "96dvh";
  if (modalTab === "gallery") return "76vh";
  if (modalTab === "desc") return "84vh";
  return "88vh";
}

