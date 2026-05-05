import { useState, useCallback, useEffect, useRef } from "react";
import type { ModHit, VersionEntry } from "@/lib/types";
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
  const [gameVersion, setGameVersion] = useState(defaultGameVersion);
  const [projectType, setProjectType] = useState("mod");
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [mods, setMods] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [selectingVersionFor, setSelectingVersionFor] = useState<ModHit | null>(null);
  const [projectVersions, setProjectVersions] = useState<VersionEntry[]>([]);
  const [versLoading, setVersLoading] = useState(false);
  
  // Estado para el modal de dependencias
  const [dependencyPrompt, setDependencyPrompt] = useState<DependencyPrompt | null>(null);
  
  // Estado para el modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{ file: any; onConfirm: () => void } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    setSourceError("");
    const q = typeof overrideQuery === "string" ? overrideQuery : query;
    try {
      const params = new URLSearchParams({
        loader,
        gameVersion,
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
        if (res.status === 503 && errorData.error?.includes("CURSEFORGE_API_KEY")) {
          setSourceError("Error en la API (falta CURSEFORGE_API_KEY)");
        } else if (res.status === 401) {
          setSourceError(`Error de autenticación: ${errorData.error || "API key inválida"}`);
        } else if (res.status === 429) {
          setSourceError("Rate limit excedido - intentá más tarde");
        } else {
          setSourceError(`Error: ${errorData.error || errorData.message || res.statusText}`);
        }
        throw new Error("Search failed");
      }
      const data = await res.json();
      setMods(data.mods ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      console.error("[useFomoDiscover] Error fetching mods:", err);
    }
    setLoading(false);
  }, [source, loader, gameVersion, projectType, sortOrder, query, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refetch(), 400);
  }, [refetch]);

  const handleDownload = useCallback(async (mod: ModHit, version?: VersionEntry) => {
    // Check if mod already exists in library or is already being downloaded
    if (downloading[mod.projectId]) return;

    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(`Descargando ${mod.title}...`, "info");
    try {
      let activeVersion = version;
      let downloadUrl = version?.primaryFile?.url;
      let filename    = version?.primaryFile?.filename;
      let hashes      = version?.primaryFile?.hashes;

      if (!downloadUrl) {
        // Fetch latest version if not provided
        const vParams = new URLSearchParams({ projectId: mod.projectId, loader, gameVersion, projectType });
        const vRes = await fetch(`/api/modrinth/versions?${vParams}`);
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
  }, [loader, gameVersion, projectType, showStatus]);

  // Función auxiliar para ejecutar la descarga
  const executeDownload = useCallback(async (
    mod: ModHit, 
    downloadUrl: string, 
    filename: string, 
    hashes?: Record<string, string>,
    depsToDownload?: PendingDependency[]
  ) => {
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(`Descargando ${mod.title}...`, "info");
    
    try {
      const dlRes = await fetch("/api/modrinth/download", {
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
              author: "Modrinth",
              downloads: 0,
              follows: 0,
              latestVersion: null,
              categories: [],
              dateCreated: "",
              url: dep.url || `https://modrinth.com/project/${dep.slug || dep.projectId}`,
              projectType: dep.projectType || "mod",
              _source: "modrinth",
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
  }, [loader, gameVersion, projectType, showStatus, downloading, handleDownload]);

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
    setSelectingVersionFor(mod);
    setVersLoading(true);
    setProjectVersions([]);
    try {
      const params = new URLSearchParams({ projectId: mod.projectId, gameVersion, loader, projectType });
      
      // Fetch versions and project details in parallel
      const [vRes, pRes] = await Promise.all([
        fetch(`/api/modrinth/versions?${params}`),
        fetch(`/api/modrinth/project?projectId=${mod.projectId}`)
      ]);

      if (vRes.ok) {
        const data = await vRes.json();
        setProjectVersions(data.versions ?? []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setSelectingVersionFor(prev => prev ? { ...prev, body: pData.body } : null);
      }
    } catch (err) {
      console.error("[useFomoDiscover] Error fetching details:", err);
    }
    setVersLoading(false);
  }, [gameVersion, loader, projectType]);

  // Función para confirmar descarga con dependencias
  const confirmDownloadWithDeps = useCallback((includeDeps: boolean) => {
    if (!dependencyPrompt) return;
    
    const { mod, dependencies, downloadUrl, filename, hashes } = dependencyPrompt;
    setDependencyPrompt(null);
    
    if (includeDeps && dependencies.length > 0) {
      executeDownload(mod, downloadUrl, filename, hashes, dependencies);
    } else {
      executeDownload(mod, downloadUrl, filename, hashes);
    }
  }, [dependencyPrompt, executeDownload]);

  return {
    source, setSource, sourceError,
    loader, setLoader,
    gameVersion, setGameVersion,
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
  };
}
