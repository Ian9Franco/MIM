import { useState, useCallback, useEffect, useRef } from "react";
import type { ModHit, VersionEntry } from "@/lib/types";
import { SORT_OPTIONS } from "../constants/app";
import type { SortOrder } from "../constants/app";
import { eventBus } from "@/lib/eventBus";

export interface PendingDependency {
  projectId: string;
  title: string;
  slug?: string;
  iconUrl: string | null;
  projectType: string;
  url?: string;
}

export interface DependencyPrompt {
  mod: ModHit;
  dependencies: PendingDependency[];
  version: VersionEntry;
  downloadUrl: string;
  filename: string;
  hashes?: Record<string, string>;
}

export function useFomoDiscover(defaultLoader: string, defaultGameVersion: string, showStatus: any) {
  const [source, setSource] = useState<"modrinth" | "curseforge" | "all">("modrinth");
  const [sourceError, setSourceError] = useState("");
  const [loader, setLoader] = useState(defaultLoader);
  const [gameVersions, setGameVersions] = useState<string[]>([defaultGameVersion]);
  const [projectType, setProjectType] = useState("mod");
  const [categories, setCategories] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [query, setQuery] = useState("");
  const [sinytraActive, setSinytraActive] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyExclusives, setOnlyExclusives] = useState(false);

  useEffect(() => {
    if (source === "all" && !query.startsWith("author:") && !query.startsWith("project:")) {
      setSource("modrinth");
    }
  }, [source, query]);

  // Persistence for filters and search
  useEffect(() => {
    const saved = localStorage.getItem("fomo_discover_state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.source) setSource(state.source);
        if (state.loader) setLoader(state.loader);
        if (state.gameVersions) setGameVersions(state.gameVersions);
        if (state.projectType) setProjectType(state.projectType);
        if (state.categories) setCategories(state.categories);
        if (state.environments) setEnvironments(state.environments);
        if (state.sortOrder) setSortOrder(state.sortOrder);
        if (state.query) setQuery(state.query);
        if (state.sinytraActive !== undefined) setSinytraActive(state.sinytraActive);
        if (state.page) setPage(state.page);
        if (state.onlyExclusives !== undefined) setOnlyExclusives(state.onlyExclusives);
      } catch (e) {
        console.warn("Error loading FOMO state from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    const state = { source, loader, gameVersions, projectType, categories, environments, sortOrder, query, sinytraActive, page, onlyExclusives };
    localStorage.setItem("fomo_discover_state", JSON.stringify(state));
  }, [source, loader, gameVersions, projectType, categories, environments, sortOrder, query, sinytraActive, page, onlyExclusives]);

  // Resetear a página 1 al cambiar cualquier filtro o búsqueda (EXCEPTO al cargar el estado inicial)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
    setMods([]);
    setTotal(0);
  }, [loader, gameVersions, projectType, categories, environments, sortOrder, query, source, onlyExclusives]);

  // Limpiar categorías y entornos al cambiar de projectType (el reset de página ya lo hace el efecto de arriba)
  useEffect(() => {
    setCategories([]);
    setEnvironments([]);
  }, [projectType]);

  const [loading, setLoading] = useState(false);
  const [mods, setMods] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMods, setSelectedMods] = useState<ModHit[]>([]);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [selectingVersionFor, setSelectingVersionFor] = useState<ModHit | null>(null);
  const [projectVersions, setProjectVersions] = useState<VersionEntry[]>([]);
  const [versLoading, setVersLoading] = useState(false);
  
  // Estado para el modal de dependencias
  const [dependencyPrompt, setDependencyPrompt] = useState<DependencyPrompt | null>(null);

  // Persistence for selection
  useEffect(() => {
    const saved = localStorage.getItem("fomo_selected_mods");
    if (saved) {
      try {
        setSelectedMods(JSON.parse(saved));
      } catch (e) {
        console.warn("Error loading selected mods from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("fomo_selected_mods", JSON.stringify(selectedMods));
  }, [selectedMods]);

  const toggleModSelection = useCallback((mod: ModHit) => {
    setSelectedMods(prev => {
      const exists = prev.some(m => m.projectId === mod.projectId);
      if (exists) {
        return prev.filter(m => m.projectId !== mod.projectId);
      }
      return [...prev, mod];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMods([]);
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    setSourceError("");
    const startTime = Date.now();
    const rawQ = typeof overrideQuery === "string" ? overrideQuery : query;
    const qClean = rawQ?.startsWith("project:") ? rawQ.replace("project:", "").trim() : rawQ?.trim();
    try {
      let mappedMods: ModHit[] = [];
      let totalResult = 0;
      let totalPagesResult = 0;

      if (source === "all") {
        const modLoader = (sinytraActive && (loader === "forge" || loader === "neoforge")) ? "forge,fabric" : loader;
        const curLoader = loader;

        const modParams = new URLSearchParams({
          loader: modLoader,
          gameVersions: JSON.stringify(gameVersions),
          categories: JSON.stringify(categories),
          environments: JSON.stringify(environments),
          projectType,
          page: String(page),
          pageSize: "20",
          sort: sortOrder,
          ...(qClean ? { q: qClean } : {}),
        });

        const curParams = new URLSearchParams({
          loader: curLoader,
          gameVersions: JSON.stringify(gameVersions),
          categories: JSON.stringify(categories),
          environments: JSON.stringify(environments),
          projectType,
          page: String(page),
          pageSize: "20",
          sort: sortOrder,
          ...(qClean ? { q: qClean } : {}),
        });

        const [modRes, curRes] = await Promise.allSettled([
          fetch(`/api/modrinth/discover?${modParams}`),
          fetch(`/api/curseforge/discover?${curParams}`)
        ]);

        let modData: any = { mods: [], total: 0, totalPages: 0 };
        let curData: any = { mods: [], total: 0, totalPages: 0 };

        if (modRes.status === "fulfilled" && modRes.value.ok) {
          modData = await modRes.value.json().catch(() => ({ mods: [], total: 0, totalPages: 0 }));
        } else if (modRes.status === "fulfilled" && !modRes.value.ok) {
          if (modRes.value.status === 503 || modRes.value.status === 401) {
            setSourceError(prev => prev ? `${prev} | Modrinth error` : "Modrinth API error");
          }
        }

        if (curRes.status === "fulfilled" && curRes.value.ok) {
          curData = await curRes.value.json().catch(() => ({ mods: [], total: 0, totalPages: 0 }));
        } else if (curRes.status === "fulfilled" && !curRes.value.ok) {
          if (curRes.value.status === 503 || curRes.value.status === 401) {
            setSourceError(prev => prev ? `${prev} | Falta CURSEFORGE_API_KEY` : "Falta CURSEFORGE_API_KEY");
          }
        }

        const mappedModrinth = (modData.mods ?? []).map((m: ModHit) => ({ ...m, _source: "modrinth" as const }));
        const mappedCurse = (curData.mods ?? []).map((m: ModHit) => ({ ...m, _source: "curseforge" as const }));

        const combined = [...mappedModrinth, ...mappedCurse];
        if (sortOrder === "downloads") {
          combined.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
        } else if (sortOrder === "newest" || sortOrder === "updated") {
          combined.sort((a, b) => new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime());
        } else {
          combined.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
        }

        mappedMods = combined;
        totalResult = (modData.total ?? 0) + (curData.total ?? 0);
        totalPagesResult = Math.max(modData.totalPages ?? 0, curData.totalPages ?? 0);
      } else {
        const effectiveLoader = (sinytraActive && (loader === "forge" || loader === "neoforge") && source === "modrinth")
          ? "forge,fabric"
          : loader;
        
        const params = new URLSearchParams({
          loader: effectiveLoader,
          gameVersions: JSON.stringify(gameVersions),
          categories: JSON.stringify(categories),
          environments: JSON.stringify(environments),
          projectType,
          page: String(page),
          pageSize: "20",
          sort: sortOrder,
          ...(qClean ? { q: qClean } : {}),
        });
        
        const endpoint = source === "modrinth" 
          ? `/api/modrinth/discover?${params}`
          : `/api/curseforge/discover?${params}`;
          
        const res = await fetch(endpoint);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (res.status === 503 && (errorData.error?.includes("CURSEFORGE_API_KEY") || errorData.error?.includes("configurada"))) {
            setSourceError("Error en la API (falta CURSEFORGE_API_KEY)");
          } else if (res.status === 401 || res.status === 403) {
            setSourceError(`Error de autenticación: ${errorData.error || "API key inválida"}`);
          } else if (res.status === 429) {
            setSourceError("Rate limit excedido - intentá más tarde");
          } else {
            setSourceError(`Error: ${errorData.error || errorData.message || res.statusText || "Unknown error"}`);
          }
          
          console.warn(`[useFomoDiscover] Search failed (${res.status}):`, errorData.error || res.statusText);
          setMods([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        mappedMods = (data.mods ?? []).map((m: ModHit) => ({
          ...m,
          _source: m._source || source
        }));
        totalResult = data.total ?? 0;
        totalPagesResult = data.totalPages ?? 0;
      }
      
      setMods(mappedMods);
      setTotal(totalResult);
      setTotalPages(totalPagesResult);

      // --- Background Exclusivity Check (Optimizado Batch) ---
      if (mappedMods.length > 0) {
        setMods(prev => prev.map((m: any) => 
          mappedMods.some((mapped: any) => mapped.projectId === m.projectId)
            ? { ...m, availability: { modrinth: m._source === "modrinth", curseforge: m._source === "curseforge", checking: true } }
            : m
        ));

        try {
          const batchData = mappedMods.map((mod: any) => ({
            title: mod.title,
            slug: mod.slug || undefined,
            source: mod._source
          }));

          const batchRes = await fetch('/api/crosscheck/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mods: batchData })
          });

          if (batchRes.ok) {
            const { results } = await batchRes.json();
            
            setMods(prev => prev.map((m: any) => {
              const mappedMod = mappedMods.find((mapped: any) => mapped.projectId === m.projectId);
              if (!mappedMod) return m;
              
              const key = mappedMod.title + (mappedMod.slug || "");
              const exists = results[key]?.exists || false;
              
              return {
                ...m,
                availability: {
                  modrinth: m._source === "modrinth" ? true : exists,
                  curseforge: m._source === "curseforge" ? true : exists,
                  checking: false
                }
              };
            }));
          }
        } catch (err) {
          console.warn("[useFomoDiscover] Error en batch cross-check:", err);
          setMods(prev => prev.map((m: any) => 
            mappedMods.some((mapped: any) => mapped.projectId === m.projectId)
              ? { ...m, availability: { ...m.availability!, checking: false } }
              : m
          ));
        }
      }
      
      if (qClean) {
        eventBus.emit("fomo:search", { query: qClean, source: source === "all" ? "modrinth" : source });
      }

    } catch (err) {
      console.warn("[useFomoDiscover] Error fetching mods:", err);
      setMods([]);
    }

    const elapsedTime = Date.now() - startTime;
    if (page === 1 && elapsedTime < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsedTime));
    }

    setLoading(false);
  }, [source, loader, gameVersions, categories, environments, projectType, sortOrder, query, page, sinytraActive, onlyExclusives]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refetch(), 400);
  }, [refetch]);

  const handleDownload = useCallback(async (mod: ModHit, version?: VersionEntry) => {
    const modSource = mod._source || (source === "all" ? "modrinth" : source);
    // Check if mod already exists in library or is already being downloaded
    if (downloading[mod.projectId]) return;

    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    
    // CASO ESPECIAL: Descarga bloqueada por el autor (CurseForge)
    if (mod.allowModDistribution === false) {
      showStatus(`Descarga manual requerida para ${mod.title}`, "info");
      window.open(mod.url, "_blank");
      // Dar un pequeño tiempo para que el usuario vea el mensaje antes de quitar el estado de carga
      setTimeout(() => {
        setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
      }, 1000);
      return;
    }

    showStatus(`Descargando ${mod.title}...`, "info");
    try {
      let activeVersion = version;
      let downloadUrl = version?.primaryFile?.url;
      let filename    = version?.primaryFile?.filename;
      let hashes      = version?.primaryFile?.hashes;

      if (!downloadUrl) {
        // Fetch latest version if not provided
        const isFabricOnly = mod.categories?.includes("fabric") && !mod.categories?.includes("forge");
        const modNativeLoader = (sinytraActive && isFabricOnly && modSource === "modrinth") ? "fabric" : loader;
        const vParams = new URLSearchParams({ 
          projectId: mod.projectId, 
          loader: modNativeLoader, 
          gameVersion: gameVersions[0] || "1.20.1", 
          projectType 
        });
        const endpoint = modSource === "modrinth" ? "/api/modrinth/versions" : "/api/curseforge/versions";
        const vRes = await fetch(`${endpoint}?${vParams}`);
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.versions?.length > 0) {
            activeVersion = vData.versions[0];
            downloadUrl = activeVersion?.primaryFile?.url;
            filename    = activeVersion?.primaryFile?.filename;
            hashes      = activeVersion?.primaryFile?.hashes;
          }
        }
      }

      if (downloadUrl) {
        const requiredDeps = activeVersion?.dependencies?.filter((d) => d.dependencyType === "required" && !!d.projectId) ?? [];
        
        // Si hay dependencias, mostrar el modal en lugar de window.confirm
        if (requiredDeps.length > 0) {
          setDependencyPrompt({
            mod,
            dependencies: requiredDeps.map(d => ({
              projectId: d.projectId!,
              title: d.title || d.projectId!,
              slug: d.slug,
              iconUrl: d.iconUrl ?? null,
              projectType: d.projectType || "mod",
              url: d.url,
            })),
            version: activeVersion!,
            downloadUrl: downloadUrl!,
            filename: filename!,
            hashes,
          });
          setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
          return;
        }

        // Sin dependencias: descargar directamente
        await executeDownload(mod, downloadUrl!, filename!, hashes);
      } else {
        showStatus(`No se encontró versión compatible para ${mod.title}`, "error");
        setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
      }
    } catch (err) {
      showStatus(`Error crítico al descargar ${mod.title}`, "error");
      setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
    }
  }, [loader, gameVersions, projectType, showStatus, source, downloading, sinytraActive]);

  // Función auxiliar para ejecutar la descarga
  const executeDownload = useCallback(async (
    mod: ModHit, 
    downloadUrl: string, 
    filename: string, 
    hashes?: Record<string, string>,
    depsToDownload?: PendingDependency[]
  ) => {
    const modSource = mod._source || (source === "all" ? "modrinth" : source);
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(`Descargando ${mod.title}...`, "info");
    
    try {
      const endpoint = modSource === "modrinth" ? "/api/modrinth/download" : "/api/curseforge/download";
      const dlRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: downloadUrl,
          filename,
          hashes,
          iconUrl: mod.iconUrl,
          projectId: mod.projectId,
          loader,
          gameVersion: gameVersions[0] || "1.20.1"
        }),
      });
      const dlData = await dlRes.json().catch(() => ({}));

      if (dlRes.ok) {
        if (dlData?.skipped) {
          showStatus(`${mod.title} ya existe en tu librería o en Descargas`, "info");
        } else {
          showStatus(`${mod.title} descargado con éxito`, "success");
        }
        setSelectingVersionFor(null);

        // Emitir evento de descarga exitosa
        eventBus.emit("fomo:mod-downloaded", {
          modId: mod.projectId,
          fileName: filename,
          source: modSource as any
        });

        // Descargar dependencias si las hay
        if (depsToDownload && depsToDownload.length > 0) {
          showStatus(`Descargando ${depsToDownload.length} dependencias...`, "info");
          for (const dep of depsToDownload) {
            const depMod: ModHit = {
              projectId: dep.projectId,
              slug: dep.slug || dep.projectId,
              title: dep.title || dep.projectId,
              description: "",
              iconUrl: dep.iconUrl || null,
              author: modSource === "modrinth" ? "Modrinth" : "CurseForge",
              downloads: 0,
              follows: 0,
              latestVersion: null,
              categories: [],
              dateCreated: "",
              url: dep.url || (modSource === "modrinth" 
                ? `https://modrinth.com/project/${dep.slug || dep.projectId}`
                : `https://www.curseforge.com/minecraft/mc-mods/${dep.slug || dep.projectId}`),
              projectType: dep.projectType || "mod",
              _source: modSource,
            };

            await new Promise((resolve) => setTimeout(resolve, 250));
            void handleDownload(depMod);
          }
        }
      } else {
        showStatus(dlData?.error || `Error al descargar ${mod.title}`, "error");
      }
    } catch (err) {
      showStatus(`Error al descargar ${mod.title}`, "error");
    } finally {
      setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
    }
  }, [loader, gameVersions, projectType, showStatus, source, handleDownload]);

  const handleDownloadDependency = useCallback(async (dependency: NonNullable<VersionEntry["dependencies"]>[number]) => {
    if (!dependency.projectId) {
      showStatus(`No se pudo resolver la dependencia "${dependency.title ?? "externa"}"`, "error");
      return;
    }

    await handleDownload({
      projectId: dependency.projectId,
      slug: dependency.slug ?? dependency.projectId,
      title: dependency.title ?? dependency.projectId,
      description: "",
      iconUrl: dependency.iconUrl ?? null,
      author: "Modrinth",
      downloads: 0,
      follows: 0,
      latestVersion: null,
      categories: [],
      dateCreated: "",
      url: dependency.url ?? `https://modrinth.com/project/${dependency.slug ?? dependency.projectId}`,
      projectType: dependency.projectType ?? "mod",
      _source: "modrinth",
    });
  }, [handleDownload, showStatus]);

  const handleOpenVersionSelector = useCallback(async (mod: ModHit) => {
    const modSource = mod._source || (source === "all" ? "modrinth" : source);
    setSelectingVersionFor(mod);
    setVersLoading(true);
    setProjectVersions([]);
    try {
      const isFabricOnly = mod.categories?.includes("fabric") && !mod.categories?.includes("forge");
      const modNativeLoader = (sinytraActive && isFabricOnly && modSource === "modrinth") ? "fabric" : loader;

      const actualProjectType = mod.projectType || projectType;
      const params = new URLSearchParams({ 
        projectId: mod.projectId, 
        // Eliminamos gameVersion para obtener TODAS las versiones del mod en la vista de detalles
        loader: (actualProjectType === "mod" || actualProjectType === "modpack") ? modNativeLoader : "", 
        projectType: actualProjectType 
      });
      
      // Fetch versions and project details in parallel
      const vEndpoint = modSource === "modrinth" ? "/api/modrinth/versions" : "/api/curseforge/versions";
      const pEndpoint = modSource === "modrinth" ? "/api/modrinth/project" : "/api/curseforge/project";

      const [vRes, pRes] = await Promise.all([
        fetch(`${vEndpoint}?${params}`),
        fetch(`${pEndpoint}?projectId=${mod.projectId}`)
      ]);

      if (vRes.ok) {
        const data = await vRes.json();
        setProjectVersions(data.versions ?? []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setSelectingVersionFor(prev => prev ? { 
          ...prev, 
          body: pData.body,
          client_side: pData.client_side,
          server_side: pData.server_side,
          members: pData.members || []
        } : null);
      }
    } catch (err) {
      console.warn("[useFomoDiscover] Error fetching details:", err);
    }
    setVersLoading(false);
  }, [gameVersions, loader, projectType, source, sinytraActive]);

  // Función para confirmar descarga con dependencias
  const confirmDownloadWithDeps = useCallback(async (includeDeps: boolean) => {
    if (!dependencyPrompt) return;
    
    const { mod, dependencies, downloadUrl, filename, hashes } = dependencyPrompt;
    setDependencyPrompt(null);
    
    if (includeDeps && dependencies.length > 0) {
      await executeDownload(mod, downloadUrl, filename, hashes, dependencies);
    } else {
      await executeDownload(mod, downloadUrl, filename, hashes);
    }
  }, [dependencyPrompt, executeDownload]);

  const handleOpenProjectById = useCallback(async (projectId: string, sourceOverride?: "modrinth" | "curseforge") => {
    const activeSource = sourceOverride || (source === "all" ? "modrinth" : source);
    setVersLoading(true);
    const tempMod: ModHit = {
      projectId,
      slug: projectId,
      title: "Cargando...",
      description: "",
      iconUrl: null,
      author: "",
      downloads: 0,
      follows: 0,
      latestVersion: null,
      categories: [],
      dateCreated: "",
      url: activeSource === "modrinth" ? `https://modrinth.com/project/${projectId}` : `https://www.curseforge.com/projects/${projectId}`,
      projectType: "mod",
      _source: activeSource as "modrinth" | "curseforge"
    };
    setSelectingVersionFor(tempMod);
    setProjectVersions([]);

    try {
      const pEndpoint = activeSource === "modrinth" ? "/api/modrinth/project" : "/api/curseforge/project";
      const pRes = await fetch(`${pEndpoint}?projectId=${projectId}`);
      if (!pRes.ok) throw new Error("No se pudo obtener el proyecto");
      const pData = await pRes.json();

      let fullMod: ModHit;
      if (activeSource === "modrinth") {
        fullMod = {
          projectId: pData.id || projectId,
          slug: pData.slug || projectId,
          title: pData.title || pData.name || "Sin título",
          description: pData.description || "",
          iconUrl: pData.icon_url || pData.iconUrl || null,
          author: pData.author || "Desconocido",
          downloads: pData.downloads || 0,
          follows: pData.followers || 0,
          latestVersion: null,
          categories: pData.categories || [],
          dateCreated: pData.published || pData.dateCreated || "",
          url: `https://modrinth.com/project/${pData.slug}`,
          projectType: pData.project_type || "mod",
          _source: activeSource,
          body: pData.body || "",
          client_side: pData.client_side,
          server_side: pData.server_side,
          members: pData.members || []
        };
      } else {
        const logoUrl = pData.logo?.thumbnailUrl || pData.logo?.url || null;
        const authorName = pData.authors?.[0]?.name || "Desconocido";
        const websiteUrl = pData.links?.websiteUrl || `https://www.curseforge.com/projects/${projectId}`;
        
        let cfProjectType: string = "mod";
        if (pData.classId === 12) cfProjectType = "resourcepack";
        else if (pData.classId === 6) cfProjectType = "datapack";
        else if (pData.classId === 6552) cfProjectType = "shader";
        else if (pData.classId === 4471) cfProjectType = "modpack";

        fullMod = {
          projectId: String(pData.id),
          slug: pData.slug || projectId,
          title: pData.name || "Sin título",
          description: pData.summary || "",
          iconUrl: logoUrl,
          author: authorName,
          downloads: pData.downloadCount || 0,
          follows: pData.thumbsUpCount || 0,
          latestVersion: null,
          categories: (pData.categories || []).map((c: any) => c.slug),
          dateCreated: pData.dateCreated || "",
          url: websiteUrl,
          projectType: cfProjectType,
          _source: activeSource as "modrinth" | "curseforge",
          body: pData.body || "",
          client_side: pData.client_side || "required",
          server_side: pData.server_side || "required",
          members: (pData.authors || []).map((aut: any) => ({
            id: String(aut.id || aut.name),
            username: aut.name,
            name: aut.name,
            avatarUrl: null,
            role: "Creator"
          }))
        };
      }

      setSelectingVersionFor(fullMod);

      const isFabricOnly = fullMod.categories?.includes("fabric") && !fullMod.categories?.includes("forge");
      const modNativeLoader = (sinytraActive && isFabricOnly && activeSource === "modrinth") ? "fabric" : loader;
      const actualProjectType = fullMod.projectType || projectType;

      const params = new URLSearchParams({ 
        projectId: fullMod.projectId, 
        loader: (actualProjectType === "mod" || actualProjectType === "modpack") ? modNativeLoader : "", 
        projectType: actualProjectType 
      });

      const vEndpoint = activeSource === "modrinth" ? "/api/modrinth/versions" : "/api/curseforge/versions";
      const vRes = await fetch(`${vEndpoint}?${params}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        setProjectVersions(vData.versions ?? []);
      }
    } catch (err) {
      console.warn("[useFomoDiscover] Error fetching project by id:", err);
      showStatus("No se pudo cargar la información detallada de este mod", "error");
      setSelectingVersionFor(null);
    } finally {
      setVersLoading(false);
    }
  }, [source, loader, projectType, sinytraActive, showStatus]);

  const isCheckingExclusives = mods.length > 0 && mods.some(m => !m.availability || m.availability.checking);

  const displayedMods = onlyExclusives 
    ? mods.filter(m => m.availability && !m.availability.checking && (m.availability.modrinth !== m.availability.curseforge))
    : mods;

  const displayedTotal = onlyExclusives ? displayedMods.length : total;
  const displayedTotalPages = onlyExclusives ? 1 : totalPages;

  return {
    source, setSource, sourceError,
    loader, setLoader,
    gameVersions, setGameVersions,
    categories, setCategories,
    environments, setEnvironments,
    projectType, setProjectType,
    sortOrder, setSortOrder,
    query, setQuery,
    loading: loading || (onlyExclusives && isCheckingExclusives), refetch,
    mods: displayedMods, total: displayedTotal, page, setPage, totalPages: displayedTotalPages,
    downloading, handleDownload,
    handleDownloadDependency,
    selectingVersionFor, setSelectingVersionFor,
    projectVersions, versLoading,
    handleOpenVersionSelector,
    handleOpenProjectById,
    dependencyPrompt, setDependencyPrompt,
    confirmDownloadWithDeps,
    selectedMods, toggleModSelection, clearSelection,
    sinytraActive, setSinytraActive,
    onlyExclusives, setOnlyExclusives,
    sortOptions: SORT_OPTIONS
  };
}
