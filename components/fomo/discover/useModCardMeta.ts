"use client";

import { useMemo } from "react";
import {
  getBannerFallbackStyle,
  inferPrimaryProjectType,
  resolveModBannerUrl,
} from "@/lib/fomo/fomoModBanner";

const KNOWN_LOADERS = ["forge", "fabric", "neoforge", "quilt"];
const POTENTIAL_TYPES = ["datapack", "mod", "resourcepack", "shader", "textura", "modpack"];

export type ModCardMeta = {
  categories: string[];
  isCF: boolean;
  isBedrock: boolean;
  isFabricOnly: boolean;
  onModrinth: boolean;
  onCurseForge: boolean;
  isOnBoth: boolean;
  isExclusive: boolean;
  sortedTypes: string[];
  modLoaders: string[];
  otherCategories: string[];
  bannerUrl?: string;
  primaryType: string;
  bannerBgColor: string;
  fallbackTexture: Record<string, string>;
  /** CurseForge search hits do not include follows or dates. */
  showFollows: boolean;
  showUpdated: boolean;
  environmentLabel: string | null;
};

function normalizeCategory(c: unknown): string {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") {
    const rec = c as { name?: string; slug?: string };
    if (typeof rec.name === "string") return rec.name;
    if (typeof rec.slug === "string") return rec.slug;
  }
  return "";
}

export function environmentLabelFor(mod: {
  client_side?: string;
  server_side?: string;
}): string | null {
  const client = mod.client_side;
  const server = mod.server_side;
  if (!client && !server) return null;
  const clientOk = client === "required" || client === "optional";
  const serverOk = server === "required" || server === "optional";
  if (clientOk && serverOk) return "Client or server";
  if (clientOk) return "Client";
  if (serverOk) return "Server";
  return null;
}

export function useModCardMeta(mod: any): ModCardMeta {
  const categories = useMemo(
    () => (mod?.categories || []).map(normalizeCategory).filter(Boolean) as string[],
    [mod?.categories],
  );

  return useMemo(() => {
    const isCF = mod?._source === "curseforge";
    const isBedrock = mod?._source === "chunk";
    const isFabricOnly = categories.includes("fabric") && !categories.includes("forge");
    const onModrinth = mod?.availability?.modrinth ?? !isCF;
    const onCurseForge = mod?.availability?.curseforge ?? isCF;
    const isOnBoth = onModrinth && onCurseForge;

    const foundTypes = new Set<string>();
    if (mod?.projectType) {
      const pt = String(mod.projectType).toLowerCase();
      if (pt === "resourcepack") foundTypes.add("textura");
      else foundTypes.add(pt);
    }
    categories.forEach((c) => {
      const lc = c.toLowerCase();
      if (POTENTIAL_TYPES.includes(lc)) {
        if (lc === "resourcepack") foundTypes.add("textura");
        else foundTypes.add(lc);
      }
    });

    const sortedTypes = Array.from(foundTypes).sort((a, b) => {
      if (a === "datapack") return -1;
      if (b === "datapack") return 1;
      if (a === "modpack") return -1;
      if (b === "modpack") return 1;
      if (a === "mod") return -1;
      if (b === "mod") return 1;
      return a.localeCompare(b);
    });

    const modLoaders = categories.filter((c) => KNOWN_LOADERS.includes(c.toLowerCase()));
    const otherCategories = categories
      .filter(
        (c) =>
          !KNOWN_LOADERS.includes(c.toLowerCase()) &&
          !POTENTIAL_TYPES.includes(c.toLowerCase()) &&
          c.toLowerCase() !== "resourcepack",
      )
      .slice(0, 2);

    const primaryType = sortedTypes[0] || inferPrimaryProjectType(mod || {});
    const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(primaryType);
    const updated = mod?.dateModified || mod?.dateCreated;

    return {
      categories,
      isCF,
      isBedrock,
      isFabricOnly,
      onModrinth,
      onCurseForge,
      isOnBoth,
      isExclusive: !isOnBoth,
      sortedTypes,
      modLoaders,
      otherCategories,
      bannerUrl: resolveModBannerUrl(mod || {}),
      primaryType,
      bannerBgColor,
      fallbackTexture,
      showFollows: !isCF && typeof mod?.follows === "number",
      showUpdated: !isCF && typeof updated === "string" && updated.length > 0,
      environmentLabel: environmentLabelFor(mod || {}),
    };
  }, [mod, categories]);
}
