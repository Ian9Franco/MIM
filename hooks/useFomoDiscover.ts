import { useMemo, useCallback } from "react";
import { ModHit, VersionEntry } from "@/lib/types";
import { SORT_OPTIONS } from "../constants/app";
import { useFomoFilters } from "./fomo/useFomoFilters";
import { useFomoSearch } from "./fomo/useFomoSearch";
import { useFomoDownload } from "./fomo/useFomoDownload";
import { useFomoSelection } from "./fomo/useFomoSelection";
import { useFomoDetails } from "./fomo/useFomoDetails";

export function useFomoDiscover(defaultLoader: string, defaultGameVersion: string, showStatus: any) {
  const filters = useFomoFilters(defaultLoader, defaultGameVersion);
  const search = useFomoSearch(filters);
  const download = useFomoDownload(showStatus, filters.loader, filters.gameVersions);
  const selection = useFomoSelection();
  const details = useFomoDetails(filters.source, filters.loader, filters.projectType, filters.sinytraActive);

  const handleDownload = useCallback(async (mod: ModHit, version?: VersionEntry) => {
    let url = version?.primaryFile?.url || (mod as any).downloadUrl || mod.url;
    let filename = version?.primaryFile?.filename || mod.title;
    let targetVer = version;

    // Si la URL es una página web, si el autor bloqueó la distribución o si no tenemos metadatos de versión (para dependencias)
    // También capturamos cualquier URL de página de proyecto de Modrinth (no solo /mod/, sino /resourcepack/, /shader/, etc.)
    const isMrProjectPage = url ? /modrinth\.com\/(mod|resourcepack|shader|datapack|modpack)\//.test(url) : false;
    if (mod.allowModDistribution === false || !url || !targetVer || isMrProjectPage || url.includes("curseforge.com")) {
      showStatus("Obteniendo metadatos de la versión...", "info");
      let allFetchedVersions: any[] = [];
      try {
        const apiSource = mod._source === "curseforge" ? "curseforge" : "modrinth";
        const res = await fetch(`/api/${apiSource}/versions?projectId=${mod.projectId}&loader=${filters.loader}&projectType=${mod.projectType || filters.projectType}&gameVersion=${filters.gameVersions?.[0] || ""}`);
        if (res.ok) {
          const data = await res.json();
          allFetchedVersions = data.versions || [];
          const firstVer = allFetchedVersions[0];
          if (firstVer?.primaryFile?.url) {
            targetVer = firstVer;
            url = firstVer.primaryFile.url;
            filename = firstVer.primaryFile.filename;
          }
        }
      } catch (e) {
        console.error(e);
      }
      // Agregar todas las deps requeridas de TODAS las versiones al targetVer si éste no las tiene
      if (targetVer && allFetchedVersions.length > 0) {
        const allDepsMap = new Map<string, any>();
        allFetchedVersions.forEach(v => {
          (v.dependencies || []).forEach((d: any) => {
            if (!allDepsMap.has(d.projectId)) allDepsMap.set(d.projectId, d);
          });
        });
        if (allDepsMap.size > 0 && (!targetVer.dependencies || targetVer.dependencies.length === 0)) {
          (targetVer as any).dependencies = Array.from(allDepsMap.values());
        }
      }
    }

    // Fallback inteligente a Modrinth si seguimos sin URL de descarga directa
    if (mod._source === "curseforge" && (!url || url.includes("curseforge.com/minecraft"))) {
      showStatus("Buscando alternativa en Modrinth...", "info");
      try {
        const searchRes = await fetch(`/api/modrinth/discover?q=${encodeURIComponent(mod.title)}&loader=${filters.loader}`);
        if (searchRes.ok) {
          const sData = await searchRes.json();
          const mrMod = sData.mods?.find((m: any) => m.title.toLowerCase() === mod.title.toLowerCase() || m.slug.toLowerCase() === mod.slug.toLowerCase() || m.title.toLowerCase().includes(mod.title.toLowerCase()));
          if (mrMod) {
            showStatus("Descargando desde Modrinth...", "info");
            const vRes = await fetch(`/api/modrinth/versions?projectId=${mrMod.projectId}&loader=${filters.loader}&gameVersion=${filters.gameVersions?.[0] || ""}`);
            if (vRes.ok) {
              const vData = await vRes.json();
              const mrVer = vData.versions?.[0];
              if (mrVer?.primaryFile?.url) {
                targetVer = mrVer;
                url = mrVer.primaryFile.url;
                filename = mrVer.primaryFile.filename;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Modrinth fallback failed", err);
      }
    }

    if (filters.projectType === "datapack" && filename.toLowerCase().endsWith(".jar")) {
      filename = filename.slice(0, -4) + ".zip";
    } else if (!/\.(jar|zip|mrpack)$/i.test(filename)) {
      const pType = filters.projectType || mod.projectType || (mod as any).project_type || "mod";
      const ext = pType === "mod" ? ".jar" : pType === "modpack" ? ".mrpack" : ".zip";
      filename = `${filename}${ext}`;
    }

    if (url && !url.includes("curseforge.com/minecraft") && !/modrinth\.com\/(mod|resourcepack|shader|datapack|modpack)\//.test(url)) {
      // Verificar si hay dependencias requeridas en este o cualquier versión del proyecto
      const requiredDeps = targetVer?.dependencies?.filter(d => d.dependencyType === "required") || [];
      if (requiredDeps.length > 0) {
        download.setDependencyPrompt({
          mod,
          version: targetVer!,
          dependencies: requiredDeps as any,
          downloadUrl: url,
          filename,
          hashes: targetVer?.primaryFile?.hashes
        });
        return;
      }
      await download.executeDownload(mod, url, filename, targetVer?.primaryFile?.hashes, undefined, filters.projectType);
    } else {
      showStatus("El autor no permite descargas de terceros. Haz clic en el icono externo para ir a su web.", "warning");
    }
  }, [download, showStatus, filters.projectType, filters.loader, filters.gameVersions]);

  const confirmDownloadWithDeps = useCallback(async (include: boolean) => {
    if (!download.dependencyPrompt) return;
    let { mod, downloadUrl, filename, dependencies } = download.dependencyPrompt;
    if (!/\.(jar|zip|mrpack)$/i.test(filename)) {
      const pType = mod.projectType || (mod as any).project_type || filters.projectType || "mod";
      const ext = pType === "mod" ? ".jar" : pType === "modpack" ? ".mrpack" : ".zip";
      filename = `${filename}${ext}`;
    }
    download.setDependencyPrompt(null);
    await download.executeDownload(mod, downloadUrl, filename, undefined, undefined, filters.projectType);

    if (include && dependencies && dependencies.length > 0) {
      showStatus(`Descargando ${dependencies.length} dependencias requeridas...`, "info");
      const apiSource = mod._source === "curseforge" ? "curseforge" : "modrinth";
      for (const dep of dependencies) {
        try {
          // Si el loader actual es universal/all pero la dependencia es un mod, 
          // usamos un loader vacío o el predeterminado para que la API nos devuelva versiones válidas.
          const targetLoader = (dep.projectType === "mod" || !dep.projectType) && (filters.loader === "universal" || filters.loader === "all") 
            ? "" 
            : filters.loader;

          const res = await fetch(`/api/${apiSource}/versions?projectId=${dep.projectId}&loader=${targetLoader}&projectType=${dep.projectType || "mod"}&gameVersion=${filters.gameVersions?.[0] || ""}`);
          if (res.ok) {
            const data = await res.json();
            const firstVer = data.versions?.[0];
            if (firstVer?.primaryFile?.url) {
              const depMod: any = {
                projectId: dep.projectId,
                title: dep.title || dep.projectId,
                iconUrl: dep.iconUrl || null,
                projectType: dep.projectType || "mod",
                _source: mod._source
              };
              let depFilename = firstVer.primaryFile.filename;
              if (!/\.(jar|zip)$/i.test(depFilename)) depFilename += ".jar";
              await download.executeDownload(depMod, firstVer.primaryFile.url, depFilename, firstVer.primaryFile.hashes);
            }
          }
        } catch (e) {
          console.error("Error downloading dependency", dep.projectId, e);
        }
      }
    }
  }, [download, showStatus, filters.projectType, filters.loader, filters.gameVersions]);

  const displayedMods = useMemo(() => {
    if (!filters.onlyExclusives) return search.mods;
    return search.mods.filter(m => m.availability && m.availability.modrinth !== m.availability.curseforge);
  }, [search.mods, filters.onlyExclusives]);

  return {
    ...filters,
    ...search,
    ...download,
    ...selection,
    ...details,
    mods: displayedMods,
    handleDownload,
    confirmDownloadWithDeps,
    sortOptions: SORT_OPTIONS
  };
}
