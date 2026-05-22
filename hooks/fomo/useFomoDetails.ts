import { useState, useCallback } from "react";
import { ModHit, VersionEntry } from "@/lib/core/types";

export function useFomoDetails(
  source: string,
  loader: string,
  projectType: string,
  sinytraActive: boolean
) {
  const [selectingVersionFor, setSelectingVersionFor] = useState<ModHit | null>(null);
  const [projectVersions, setProjectVersions] = useState<VersionEntry[]>([]);
  const [versLoading, setVersLoading] = useState(false);

  const loadVersionsForMod = useCallback(
    async (modHit: ModHit) => {
      const apiSource = modHit._source === "curseforge" ? "curseforge" : "modrinth";
      const pt = modHit.projectType || projectType;
      const versRes = await fetch(
        `/api/${apiSource}/versions?projectId=${modHit.projectId}&loader=all&projectType=${pt}`
      );
      if (versRes.ok) {
        const dataV = await versRes.json();
        setProjectVersions(dataV.versions ?? []);
      } else {
        setProjectVersions([]);
      }
    },
    [projectType]
  );

  const fetchProjectAsModHit = useCallback(
    async (id: string, apiSource: "modrinth" | "curseforge"): Promise<ModHit | null> => {
      const endpoint =
        apiSource === "curseforge"
          ? `/api/curseforge/project?projectId=${id}`
          : `/api/modrinth/project?projectId=${id}`;
      const res = await fetch(endpoint);
      if (!res.ok) return null;

      const data = await res.json();

      let author = "Creador";
      if (apiSource === "modrinth" && data.members) {
        const owner =
          data.members.find((m: { role: string }) => m.role.toLowerCase() === "owner") ||
          data.members[0];
        if (owner) author = owner.username;
      } else if (apiSource === "curseforge" && data.authors) {
        author = data.authors[0]?.name || author;
      }

      let downloads = data.downloads ?? data.downloadCount ?? 0;
      if (typeof downloads !== "number" || isNaN(downloads)) {
        downloads = Number(downloads) || 0;
      }

      const rawCategories = data.categories || [];
      const normalizedCategories = Array.from(
        new Set(
          rawCategories
            .map((c: unknown) => {
              if (typeof c === "string") return c;
              if (c && typeof c === "object") {
                const o = c as { name?: string; slug?: string };
                if (typeof o.name === "string") return o.name;
                if (typeof o.slug === "string") return o.slug;
              }
              return "";
            })
            .filter(Boolean)
        )
      );

      const pt =
        data.projectType || data.project_type || (apiSource === "curseforge" ? "mod" : "mod");

      const slug =
        typeof data.slug === "string" && data.slug.length > 0 ? data.slug : String(id);

      const follows =
        typeof data.followers === "number" && !Number.isNaN(data.followers)
          ? data.followers
          : 0;

      const latestVersion =
        data.latest_version != null
          ? String(data.latest_version)
          : data.latestFilesIndexes?.[0]?.gameVersion != null
            ? String(data.latestFilesIndexes[0].gameVersion)
            : null;

      const rawDate = data.published ?? data.dateReleased ?? data.dateCreated;
      const dateCreated =
        rawDate == null || rawDate === ""
          ? ""
          : typeof rawDate === "number"
            ? new Date(rawDate).toISOString()
            : String(rawDate);

      return {
        projectId: id,
        slug,
        title: data.title || data.name || "Proyecto",
        description: data.description || data.summary || "",
        author,
        downloads,
        follows,
        latestVersion,
        iconUrl: data.iconUrl || data.icon_url || data.logo?.url || null,
        url:
          data.url ||
          (apiSource === "modrinth"
            ? `https://modrinth.com/${pt}/${id}`
            : `https://www.curseforge.com/minecraft/${pt}s/${id}`),
        categories: normalizedCategories as string[],
        dateCreated,
        _source: apiSource,
        projectType: pt,
      };
    },
    []
  );

  const handleOpenVersionSelector = useCallback(
    async (mod: ModHit) => {
      setSelectingVersionFor(mod);
      setVersLoading(true);
      try {
        await loadVersionsForMod(mod);
      } catch (e) {
        console.error(e);
      } finally {
        setVersLoading(false);
      }
    },
    [loadVersionsForMod]
  );

  const handleOpenLiveProject = useCallback(
    async (mod: ModHit) => {
      setSelectingVersionFor(mod);
      setVersLoading(true);
      try {
        const apiSource = mod._source === "curseforge" ? "curseforge" : "modrinth";
        const endpoint =
          apiSource === "curseforge"
            ? `/api/curseforge/project?projectId=${mod.projectId}`
            : `/api/modrinth/project?projectId=${mod.projectId}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();

          let author = mod.author;
          if (apiSource === "modrinth" && data.members) {
            const owner =
              data.members.find((m: { role: string }) => m.role.toLowerCase() === "owner") ||
              data.members[0];
            if (owner) author = owner.username;
          } else if (apiSource === "curseforge" && data.authors) {
            author = data.authors[0]?.name || author;
          }

          let downloads =
            data.downloads ?? data.downloadCount ?? (mod as ModHit).downloads ?? 0;
          if (typeof downloads !== "number" || isNaN(downloads)) {
            downloads = Number(downloads) || 0;
          }

          const rawCategories = data.categories || mod.categories || [];
          const normalizedCategories = Array.from(
            new Set(
              rawCategories
                .map((c: unknown) => {
                  if (typeof c === "string") return c;
                  if (c && typeof c === "object") {
                    const o = c as { name?: string; slug?: string };
                    if (typeof o.name === "string") return o.name;
                    if (typeof o.slug === "string") return o.slug;
                  }
                  return "";
                })
                .filter(Boolean)
            )
          );

          setSelectingVersionFor({
            ...mod,
            ...data,
            author,
            downloads,
            categories: normalizedCategories as string[],
          });
        }

        await loadVersionsForMod(mod);
      } catch (e) {
        console.error(e);
      } finally {
        setVersLoading(false);
      }
    },
    [loadVersionsForMod, projectType]
  );

  const handleOpenProjectById = useCallback(
    async (id: string, sourcePlatform?: string) => {
      setVersLoading(true);
      setProjectVersions([]);
      try {
        const order: ("modrinth" | "curseforge")[] =
          sourcePlatform === "curseforge"
            ? ["curseforge", "modrinth"]
            : ["modrinth", "curseforge"];

        let modHit: ModHit | null = null;
        for (const api of order) {
          modHit = await fetchProjectAsModHit(id, api);
          if (modHit) break;
        }

        if (modHit) {
          setSelectingVersionFor(modHit);
          await loadVersionsForMod(modHit);
        } else {
          setSelectingVersionFor(null);
          window.dispatchEvent(
            new CustomEvent("fomo-show-status", {
              detail: {
                text: "No se pudo abrir el proyecto en Modrinth ni CurseForge.",
                type: "error",
              },
            })
          );
        }
      } catch (e) {
        console.error(e);
        setSelectingVersionFor(null);
      } finally {
        setVersLoading(false);
      }
    },
    [fetchProjectAsModHit, loadVersionsForMod]
  );

  return {
    selectingVersionFor,
    setSelectingVersionFor,
    projectVersions,
    versLoading,
    handleOpenVersionSelector,
    handleOpenLiveProject,
    handleOpenProjectById,
  };
}
