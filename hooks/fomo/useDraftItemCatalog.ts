"use client";

import { useEffect, useMemo, useState } from "react";

export type DraftCatalogEntry = {
  title?: string;
  slug?: string;
  url?: string;
  tags: string[];
  versions: { id: string; name: string; gameVersions: string[]; loaders: string[] }[];
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "name" in item) return String((item as { name?: string }).name || "");
      return "";
    })
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function loadProjectCatalog(source: string, projectId: string): Promise<DraftCatalogEntry> {
  const platform = source === "curseforge" ? "curseforge" : "modrinth";
  const projectUrl = `/api/${platform}/project?projectId=${encodeURIComponent(projectId)}`;
  const versionsUrl = `/api/${platform}/versions?projectId=${encodeURIComponent(projectId)}`;
  const [projectRes, versionsRes] = await Promise.all([
    fetch(projectUrl),
    fetch(versionsUrl),
  ]);
  const tags: string[] = [];
  let title = "";
  let slug = "";
  let url: string | undefined;
  if (projectRes.ok) {
    const data = await projectRes.json();
    const project = data.mod || data;
    title = String(project.title || project.name || "").trim();
    slug = String(project.slug || "").trim();
    const projectType = String(project.project_type || project.projectType || "mod");
    const website = project.links && typeof project.links === "object"
      ? String((project.links as { websiteUrl?: string }).websiteUrl || "").trim()
      : "";
    url = platform === "modrinth"
      ? (slug ? `https://modrinth.com/${projectType}/${slug}` : undefined)
      : (website || (slug ? `https://www.curseforge.com/minecraft/mc-mods/${slug}` : undefined));
    tags.push(...asStringArray(project.categories));
    tags.push(...asStringArray(project.additionalCategories));
  }
  const versions: DraftCatalogEntry["versions"] = [];
  if (versionsRes.ok) {
    const data = await versionsRes.json();
    for (const version of data.versions || []) {
      versions.push({
        id: String(version.id),
        name: String(version.name || version.versionNumber || version.id),
        gameVersions: asStringArray(version.gameVersions),
        loaders: asStringArray(version.loaders),
      });
    }
  }
  return {
    title: title || undefined,
    slug: slug || undefined,
    url,
    tags: [...new Set(tags.map((tag) => tag.toLowerCase()))],
    versions,
  };
}

export function useDraftItemCatalog(
  items: Array<{ project_id?: string; projectId?: string; source?: string }>,
  enabled: boolean,
) {
  const [catalog, setCatalog] = useState<Record<string, DraftCatalogEntry>>({});
  const [loading, setLoading] = useState(false);
  const fingerprint = useMemo(
    () => items.map((item) => `${item.source || "modrinth"}::${item.project_id || item.projectId}`).join("|"),
    [items],
  );

  useEffect(() => {
    if (!enabled || !fingerprint) return;
    let cancelled = false;
    const keys = [...new Set(fingerprint.split("|").filter(Boolean))];
    setLoading(true);
    (async () => {
      const next: Record<string, DraftCatalogEntry> = {};
      const concurrency = 3;
      for (let i = 0; i < keys.length; i += concurrency) {
        const batch = keys.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (key) => {
            const [source, ...rest] = key.split("::");
            const projectId = rest.join("::");
            next[key] = await loadProjectCatalog(source, projectId);
          }),
        );
        if (cancelled) return;
      }
      if (!cancelled) {
        setCatalog(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, fingerprint]);

  return { catalog, loading };
}
