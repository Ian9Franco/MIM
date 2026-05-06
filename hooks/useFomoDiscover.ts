import { useState, useCallback, useEffect, useRef } from "react";
import type { ModHit, VersionEntry } from "@/lib/types";
import { SORT_OPTIONS } from "../constants/app";
import type { SortOrder } from "../constants/app";

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
  const [source, setSource] = useState<"modrinth" | "curseforge">("modrinth");
  const [sourceError, setSourceError] = useState("");
  const [loader, setLoader] = useState(defaultLoader);
  const [gameVersions, setGameVersions] = useState<string[]>([defaultGameVersion]);
  const [projectType, setProjectType] = useState("mod");
  const [categories, setCategories] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [query, setQuery] = useState("");

  // Resetear a página 1 al cambiar cualquier filtro o búsqueda
  useEffect(() => {
    setPage(1);
  }, [loader, gameVersions, projectType, categories, environments, sortOrder, query, source]);

  // Limpiar categorías y entornos al cambiar de projectType (el reset de página ya lo hace el efecto de arriba)
  useEffect(() => {
    setCategories([]);
    setEnvironments([]);
  }, [projectType]);

  const [loading, setLoading] = useState(false);
  const [mods, setMods] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
        console.error("Error loading selected mods from localStorage", e);
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
    const q = typeof overrideQuery === "string" ? overrideQuery : query;
    try {
      // Modrinth y CurseForge ahora usan 'gameVersions' (array JSON).
      const params = new URLSearchParams({
        loader,
        gameVersions: JSON.stringify(gameVersions),
        categories: JSON.stringify(categories),
        environments: JSON.stringify(environments),
        projectType,
        page: String(page),
        pageSize: "20",
        sort: sortOrder,
        ...(q?.trim() ? { q: q.trim() } : {}),
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
        
        console.error(`[useFomoDiscover] Search failed (${res.status}):`, errorData.error || res.statusText);
        setMods([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      
      // Asegurar que los mods tengan el campo _source correcto
      const mappedMods = (data.mods ?? []).map((m: ModHit) => ({
        ...m,
        _source: m._source || source
      }));
      
      setMods(mappedMods);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);

      // --- Background Exclusivity Check ---
      // Realizamos el check de disponibilidad en la otra plataforma de forma silenciosa
      mappedMods.forEach(async (mod: ModHit) => {
        // Inicializar estado de chequeo
        setMods(prev => prev.map(m => 
          m.projectId === mod.projectId 
            ? { ...m, availability: { modrinth: mod._source === "modrinth", curseforge: mod._source === "curseforge", checking: true } } 
            : m
        ));

        try {
           const checkRes = await fetch(`/api/crosscheck?title=${encodeURIComponent(mod.title)}&slug=${encodeURIComponent(mod.slug || "")}&source=${mod._source}`);
           if (checkRes.ok) {
            const { exists } = await checkRes.json();
            setMods(prev => prev.map(m => 
              m.projectId === mod.projectId 
                ? { 
                    ...m, 
                    availability: { 
                      modrinth: mod._source === "modrinth" ? true : exists, 
                      curseforge: mod._source === "curseforge" ? true : exists,
                      checking: false 
                    } 
                  } 
                : m
            ));
          }
        } catch (err) {
          console.error(`Error cross-checking mod ${mod.title}:`, err);
          // En caso de error, quitamos el estado de checking pero mantenemos el origen actual
          setMods(prev => prev.map(m => m.projectId === mod.projectId ? { ...m, availability: { ...m.availability!, checking: false } } : m));
        }
      });
    } catch (err) {
      console.error("[useFomoDiscover] Error fetching mods:", err);
      setMods([]);
    }
    setLoading(false);
  }, [source, loader, gameVersions, categories, environments, projectType, sortOrder, query, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refetch(), 400);
  }, [refetch]);

  const handleDownload = useCallback(async (mod: ModHit, version?: VersionEntry) => {
    const modSource = mod._source || source;
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
        const vParams = new URLSearchParams({ 
          projectId: mod.projectId, 
          loader, 
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
  }, [loader, gameVersions, projectType, showStatus, source, downloading]);

  // Función auxiliar para ejecutar la descarga
  const executeDownload = useCallback(async (
    mod: ModHit, 
    downloadUrl: string, 
    filename: string, 
    hashes?: Record<string, string>,
    depsToDownload?: PendingDependency[]
  ) => {
    const modSource = mod._source || source;
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(`Descargando ${mod.title}...`, "info");
    
    try {
      const endpoint = modSource === "modrinth" ? "/api/modrinth/download" : "/api/curseforge/download";
      const dlRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl, filename, hashes }),
      });
      const dlData = await dlRes.json().catch(() => ({}));

      if (dlRes.ok) {
        if (dlData?.skipped) {
          showStatus(`${mod.title} ya existe en tu librería o en Descargas`, "info");
        } else {
          showStatus(`${mod.title} descargado con éxito`, "success");
        }
        setSelectingVersionFor(null);

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
    const modSource = mod._source || source;
    setSelectingVersionFor(mod);
    setVersLoading(true);
    setProjectVersions([]);
    try {
      const params = new URLSearchParams({ 
        projectId: mod.projectId, 
        gameVersion: gameVersions[0] || "1.20.1", 
        loader, 
        projectType 
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
          server_side: pData.server_side
        } : null);
      }
    } catch (err) {
      console.error("[useFomoDiscover] Error fetching details:", err);
    }
    setVersLoading(false);
  }, [gameVersions, loader, projectType, source]);

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

  return {
    source, setSource, sourceError,
    loader, setLoader,
    gameVersions, setGameVersions,
    categories, setCategories,
    environments, setEnvironments,
    projectType, setProjectType,
    sortOrder, setSortOrder,
    query, setQuery,
    loading, refetch,
    mods, total, page, setPage, totalPages,
    downloading, handleDownload,
    handleDownloadDependency,
    selectingVersionFor, setSelectingVersionFor,
    projectVersions, versLoading,
    handleOpenVersionSelector,
    dependencyPrompt, setDependencyPrompt,
    confirmDownloadWithDeps,
    selectedMods, toggleModSelection, clearSelection,
    sortOptions: SORT_OPTIONS
  };
}
