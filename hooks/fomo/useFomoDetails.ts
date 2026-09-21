import { useState, useCallback, useEffect, useRef } from "react";
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

  const requestId = useRef(0);

  // Global listener to close details when clicking the backdrop
  useEffect(() => {
    const handleCloseDetails = () => {
      requestId.current += 1;
      setSelectingVersionFor(null);
      setVersLoading(false);
    };
    window.addEventListener("fomo-close-details", handleCloseDetails);
    return () => {
      requestId.current += 1;
      window.removeEventListener("fomo-close-details", handleCloseDetails);
    };
  }, []);

  const loadVersionsForMod = useCallback(
    async (modHit: ModHit, token: number) => {
      const apiSource = modHit._source === "curseforge" ? "curseforge" : "modrinth";
      const pt = modHit.projectType || projectType;
      const versRes = await fetch(
        `/api/${apiSource}/versions?projectId=${modHit.projectId}&loader=all&projectType=${pt}`
      );
      if (versRes.ok) {
        const dataV = await versRes.json();
        if (token === requestId.current) setProjectVersions(dataV.versions ?? []);
      } else if (token === requestId.current) {
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
      const token = ++requestId.current;
      setProjectVersions([]);
      setSelectingVersionFor(mod);
      setVersLoading(true);
      try {
        await loadVersionsForMod(mod, token);
      } catch (e) {
        console.error(e);
      } finally {
        if (token === requestId.current) setVersLoading(false);
      }
    },
    [loadVersionsForMod]
  );

  const handleOpenLiveProject = useCallback(
    async (mod: ModHit) => {
      const token = ++requestId.current;
      setProjectVersions([]);
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

          if (token !== requestId.current) return;
          setSelectingVersionFor({
            ...mod,
            ...data,
            author,
            downloads,
            categories: normalizedCategories as string[],
          });
        }

        await loadVersionsForMod(mod, token);
      } catch (e) {
        console.error(e);
      } finally {
        if (token === requestId.current) setVersLoading(false);
      }
    },
    [loadVersionsForMod]
  );

  const handleOpenProjectById = useCallback(
    async (id: string, sourcePlatform?: string) => {
      const token = ++requestId.current;
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

        if (token !== requestId.current) return;
        if (modHit) {
          setSelectingVersionFor(modHit);
          await loadVersionsForMod(modHit, token);
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
        if (token === requestId.current) setSelectingVersionFor(null);
      } finally {
        if (token === requestId.current) setVersLoading(false);
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
