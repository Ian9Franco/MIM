"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Flame, X, ChevronLeft, ChevronRight, ExternalLink,
  Download, Loader2, Filter, RefreshCw, Search,
  Library, List, CheckCircle2, AlertCircle, Info, ChevronDown,
  Zap, Box, LayoutTemplate
} from "lucide-react";

import type { ModHit, CollectionEntry, PresetEntry, VersionEntry } from "./types";
import { formatNumber, formatSize, openExternal } from "./utils";
import { FomoCollections } from "./FomoCollections";
import { FomoPresets } from "./FomoPresets";

interface FomoSidebarProps {
  open: boolean;
  onClose: () => void;
  defaultLoader?: string;
  defaultVersion?: string;
}

const LOADERS = ["forge", "neoforge", "fabric", "quilt"];
const VERSIONS = ["1.21.4", "1.21.1", "1.21", "1.20.1", "1.20", "1.19.4", "1.19.2", "1.18.2", "1.16.5"];
const PROJECT_TYPES = [
  { value: "mod", label: "Mods" },
  { value: "resourcepack", label: "Resourcepacks" },
  { value: "datapack", label: "Datapacks" },
  { value: "shader", label: "Shaders" },
];
const SORT_OPTIONS = [
  { value: "relevance", label: "Ô¡É Relevancia" },
  { value: "newest",    label: "­ƒåò Nuevos" },
  { value: "updated",   label: "­ƒöä Actualizados" },
];


export function FomoSidebar({ open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1" }: FomoSidebarProps) {
  const [mode,        setMode]        = useState<"discover" | "collections" | "presets">("discover");
  const [source,      setSource]      = useState<"modrinth" | "curseforge">("modrinth");
  const [loader,      setLoader]      = useState(defaultLoader);
  const [gameVersion, setGameVersion] = useState(defaultVersion);
  const [projectType, setProjectType] = useState("mod");
  const [sortOrder,   setSortOrder]   = useState<"relevance" | "newest" | "updated">("newest");
  const [query,       setQuery]       = useState("");
  const [page,        setPage]        = useState(1);
  const [mods,        setMods]        = useState<ModHit[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [sourceError, setSourceError] = useState<string | null>(null);
  
  // Collections state
  const [collections,    setCollections]    = useState<CollectionEntry[]>([]);
  const [collLoading,    setCollLoading]    = useState(false);
  const [collError,      setCollError]      = useState<string | null>(null);
  const [collDownloading, setCollDownloading] = useState<string | null>(null);
  const [viewingCollection, setViewingCollection] = useState<CollectionEntry | null>(null);
  const [collectionMods,    setCollectionMods]    = useState<ModHit[]>([]);
  const [collModsLoading,   setCollModsLoading]   = useState(false);
  const [collectionFilter,  setCollectionFilter]  = useState<string>("all");
  
  // Presets state
  const [presets,       setPresets]       = useState<PresetEntry[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetDownloading, setPresetDownloading] = useState<string | null>(null);
  
  // Versions state
  const [selectingVersionFor, setSelectingVersionFor] = useState<ModHit | null>(null);
  const [projectVersions,     setProjectVersions]     = useState<VersionEntry[]>([]);
  const [versLoading,         setVersLoading]         = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMods = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    setSourceError(null);
    const q = overrideQuery !== undefined ? overrideQuery : query;
    try {
      const params = new URLSearchParams({
        loader,
        gameVersion,
        projectType,
        page: String(page),
        pageSize: "20",
        sort: sortOrder,
        ...(q.trim() ? { q: q.trim() } : {}),
      });
      
      const endpoint = source === "modrinth" 
        ? `/api/modrinth/discover?${params}`
        : `/api/curseforge/discover?${params}`;
        
      const res = await fetch(endpoint);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 503 && source === "curseforge") {
          setSourceError("CURSEFORGE_API_KEY no configurada");
        }
        throw new Error(errorData.error || `Error ${res.status}`);
      }
      
      const data = await res.json();
      
      // Normalizar datos de CurseForge al formato Modrinth para UI unificada
      const normalizedMods: ModHit[] = (data.mods ?? []).map((m: any) => ({
        projectId: String(m.projectId ?? m.id),
        slug: m.slug || String(m.projectId),
        title: m.title || m.name || "Sin nombre",
        description: m.description || m.summary || "",
        iconUrl: m.iconUrl ?? null,
        author: m.author || "Desconocido",
        downloads: m.downloads ?? 0,
        follows: m.follows ?? 0,
        latestVersion: m.latestVersion ?? null,
        categories: m.categories ?? [],
        dateCreated: m.dateCreated ?? "",
        url: m.url || (source === "curseforge" 
          ? `https://www.curseforge.com/minecraft/mc-mods/${m.slug || m.projectId}`
          : `#`),
        _source: source, // Flag interno para saber la fuente
      }));
      
      setMods(normalizedMods);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      console.error("[FOMO] Error fetching mods:", err);
    }
    setLoading(false);
  }, [loader, gameVersion, projectType, page, sortOrder, query, source]);

  const fetchCollections = useCallback(async () => {
    setCollLoading(true);
    setCollError(null);
    setViewingCollection(null);
    
    let combined: CollectionEntry[] = [];
    let errorMsg = null;

    // 1. Cargar colecciones locales
    try {
      const resLocal = await fetch("/api/local-collections");
      if (resLocal.ok) {
        const data = await resLocal.json();
        combined = [...(data.collections || [])];
      }
    } catch(e) {}

    // 2. Cargar colecciones de Modrinth
    try {
      const resModrinth = await fetch("/api/modrinth/collections");
      const data = await resModrinth.json();
      if (resModrinth.ok) {
        combined = [...combined, ...(data.collections || [])];
      } else {
        errorMsg = data.error || "Error al cargar colecciones de Modrinth";
      }
    } catch (err) {
      errorMsg = "Error de conexi├│n con Modrinth";
    }

    setCollections(combined);
    
    // Solo bloqueamos la UI con un error si no tenemos NINGUNA colecci├│n (ni local ni remota)
    if (combined.length === 0 && errorMsg) {
      setCollError(errorMsg);
    }
    
    setCollLoading(false);
  }, []);

  const fetchCollectionProjects = useCallback(async (coll: CollectionEntry) => {
    setViewingCollection(coll);
    setCollModsLoading(true);
    // Para colecciones locales, los proyectos ya vienen anidados:
    if (coll.isLocal) {
      setCollectionMods(coll.projects ?? []);
      setCollModsLoading(false);
      return;
    }
    // Para Modrinth, fetcheamos los detalles del proyecto:
    try {
      const res = await fetch(`/api/modrinth/collections?collectionId=${coll.id}`);
      const data = await res.json();
      if (res.ok) {
        setCollectionMods(data.mods ?? []);
      } else {
        alert("Error al cargar proyectos de la colecci├│n");
      }
    } catch (err) {
      console.error("[FOMO] Error fetching collection projects:", err);
    }
    setCollModsLoading(false);
  }, []);

  const fetchPresets = useCallback(async () => {
    setPresetsLoading(true);
    try {
      const res = await fetch("/api/modrinth/presets");
      const data = await res.json();
      if (res.ok) {
        setPresets(data.presets ?? []);
      }
    } catch (err) {
      console.error("[FOMO] Error fetching presets:", err);
    }
    setPresetsLoading(false);
  }, []);

  const prevOpenRef = useRef(open);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open) return;

    if (mode === "discover") {
      // Si acabamos de abrir y ya hay datos, usar cach├® (no refetch)
      if (justOpened && mods.length > 0) return;
      fetchMods();
    } else if (mode === "collections") {
      if (justOpened && collections.length > 0) return;
      fetchCollections();
    } else if (mode === "presets") {
      if (justOpened && presets.length > 0) return;
      fetchPresets();
    }
  }, [open, mode, fetchMods, fetchCollections, fetchPresets, source]);

  // Debounced search
  const handleQueryChange = (v: string) => {
    const isNewSearch = query === "" && v !== "";
    setQuery(v);
    setPage(1);
    
    // Auto-switch to relevance when starting a search, 
    // unless the user clears the search, then maybe go back to newest?
    // User requested: "por default si buscamos... se pondria relevancia"
    if (isNewSearch) {
      setSortOrder("relevance");
    } else if (v === "" && sortOrder === "relevance") {
      setSortOrder("newest"); // Revert to newest when cleared
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMods(v), 500);
  };

  const handleLoaderChange  = (l: string)                  => { setLoader(l);      setPage(1); };
  const handleVersionChange = (v: string)                  => { setGameVersion(v); setPage(1); };
  const handleTypeChange    = (t: string)                  => { setProjectType(t); setPage(1); };
  const handleSortChange    = (s: "relevance" | "newest" | "updated") => { setSortOrder(s);   setPage(1); };

  const handleOpenVersionSelector = async (mod: ModHit) => {
    setSelectingVersionFor(mod);
    setVersLoading(true);
    setProjectVersions([]);
    try {
      const params = new URLSearchParams({
        projectId: mod.projectId,
        gameVersion,
        loader,
        projectType,
      });
      const res = await fetch(`/api/modrinth/versions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjectVersions(data.versions ?? []);
      }
    } catch (err) {
      console.error("[FOMO] Error fetching versions:", err);
    }
    setVersLoading(false);
  };

  const handleDownload = async (mod: ModHit, versionOverride?: VersionEntry) => {
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    try {
      let downloadUrl: string | undefined;
      let filename:    string | undefined;

      if (versionOverride) {
        downloadUrl = versionOverride.primaryFile?.url;
        filename    = versionOverride.primaryFile?.filename;
      } else {
        const fetchVersion = async (useFilters: boolean) => {
          const vParams = new URLSearchParams();
          if (useFilters) {
            if (projectType === "mod") vParams.set("loaders", JSON.stringify([loader]));
            if (projectType !== "datapack") vParams.set("game_versions", JSON.stringify([gameVersion]));
          }
          
          const vRes = await fetch(
            `https://api.modrinth.com/v2/project/${mod.slug}/version?${vParams.toString()}`,
            { headers: { "User-Agent": "MIM-App/1.0" } }
          );
          if (!vRes.ok) return [];
          return await vRes.json();
        };

        // 1. Try with filters
        let versions = await fetchVersion(true);
        
        // 2. Fallback to absolute latest if no filtered version found
        if (versions.length === 0) {
          console.log(`[FOMO] No version found with filters for ${mod.slug}, trying latest...`);
          versions = await fetchVersion(false);
        }

        if (versions.length > 0) {
          downloadUrl = versions[0].files?.find((f: any) => f.primary)?.url || versions[0].files?.[0]?.url;
          filename    = versions[0].files?.find((f: any) => f.primary)?.filename || versions[0].files?.[0]?.filename;
        }
      }

      if (downloadUrl && filename) {
        console.log(`[FOMO] Downloading: ${filename} from ${downloadUrl}`);
        const dlRes = await fetch("/api/modrinth/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: downloadUrl, filename }),
        });
        if (!dlRes.ok) {
          const err = await dlRes.json();
          alert(`Error al descargar: ${err.error}`);
        } else {
          // Success! Close selector if open
          setSelectingVersionFor(null);
        }
      } else {
        alert("No se encontr├│ un archivo de descarga v├ílido para este proyecto.");
      }
    } catch (err) {
      console.error("[FOMO] Download error:", err);
      alert("Error cr├¡tico durante la descarga.");
    }
    setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
  };

  const handleAddToCollection = async (mod: ModHit) => {
    const customColls = collections.filter(c => c.id !== "followed-projects");
    
    if (customColls.length === 0) {
      const create = window.confirm("No tienes colecciones propias. ┬┐Deseas crear una nueva colecci├│n llamada 'MIM' para guardar este mod?");
      if (!create) return;

      try {
        const res = await fetch("/api/local-collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", name: "MIM", description: "Mi colecci├│n principal" }),
        });
        if (res.ok) {
          const { collection } = await res.json();
          // Add to the newly created collection immediately
          await fetch("/api/local-collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add_project", collectionId: collection.id, project: mod }),
          });
          alert(`Colecci├│n MIM creada y '${mod.title}' a├▒adido con ├®xito.`);
          fetchCollections();
        } else {
          alert("Error al crear la colecci├│n.");
        }
      } catch (err) {
        alert("Error de red al crear colecci├│n.");
      }
      return;
    }

    const collName = prompt(
      `A qu├® colecci├│n quieres a├▒adir "${mod.title}"?\n` +
      customColls.map((c, i) => `${i + 1}. ${c.name}`).join("\n")
    );

    if (!collName) return;
    const index = parseInt(collName) - 1;
    const targetColl = customColls[index];

    if (!targetColl) {
      alert("Selecci├│n inv├ílida.");
      return;
    }

    try {
      const res = await fetch("/api/local-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_project",
          collectionId: targetColl.id,
          project: mod,
        }),
      });

      if (res.ok) {
        alert(`A├▒adido con ├®xito a ${targetColl.name}`);
        fetchCollections(); 
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      alert("Error de conexi├│n");
    }
  };

  const handleCreateCollection = async () => {
    const name = prompt("Nombre de la nueva colecci├│n:", "MIM");
    if (!name) return;
    try {
      const res = await fetch("/api/local-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, description: "Mi colecci├│n local" }),
      });
      if (res.ok) {
        fetchCollections();
      } else {
        alert("Error al crear colecci├│n");
      }
    } catch (e) {
      alert("Error de red");
    }
  };

  const handleDownloadCollection = async (coll: CollectionEntry) => {
    setCollDownloading(coll.id);
    try {
      const res = await fetch("/api/modrinth/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: coll.id,
          gameVersion,
          loader,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const total = (data.queued?.length || 0) + (data.failed?.length || 0);
        const success = data.queued?.length || 0;
        alert(`Sincronizaci├│n completada: ${success}/${total} proyectos descargados a tu carpeta Downloads.`);
      } else {
        alert(`Error: ${data.error || "No se pudo descargar la colecci├│n"}`);
      }
    } catch (err) {
      alert("Error de conexi├│n al descargar colecci├│n");
    }
    setCollDownloading(null);
  };

  const handleApplyPreset = async (preset: PresetEntry) => {
    setPresetDownloading(preset.id);
    try {
      // Aplicar el preset usando el endpoint de colecciones con el ID del preset
      const res = await fetch("/api/modrinth/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: preset.id, // Los presets usan el mismo endpoint
          gameVersion: preset.recommendedVersion,
          loader: preset.recommendedLoader,
          isPreset: true, // Flag para indicar que es un preset
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const total = (data.queued?.length || 0) + (data.failed?.length || 0);
        const success = data.queued?.length || 0;
        
        // Actualizar loader y versi├│n seg├║n el preset
        setLoader(preset.recommendedLoader);
        setGameVersion(preset.recommendedVersion);
        
        alert(`Plantilla "${preset.name}" aplicada: ${success}/${total} mods descargados.\nLoader cambiado a ${preset.recommendedLoader} ${preset.recommendedVersion}`);
      } else {
        alert(`Error: ${data.error || "No se pudo aplicar la plantilla"}`);
      }
    } catch (err) {
      alert("Error de conexi├│n al aplicar plantilla");
    }
    setPresetDownloading(null);
  };

  // Responsive sidebar width: full on small screens, 650px on md+
  const sidebarWidth = "min(100vw, 650px)";

  const getLoaderColor = (l: string) => {
    if (l === "forge") return "#3B82F6"; // Azul
    if (l === "neoforge") return "#06B6D4"; // Cyan
    if (l === "fabric") return "#8B5CF6"; // Violeta
    if (l === "quilt") return "#EC4899"; // Rosa
    return "var(--color-primary)";
  };

  const getProjectTypeName = (type: string) => {
    if (type === "resourcepack") return "packs de recursos";
    if (type === "datapack") return "datapacks";
    if (type === "shader") return "shaders";
    return "mods";
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: sidebarWidth,
          background: "linear-gradient(145deg, color-mix(in srgb, var(--color-card) 95%, transparent) 0%, color-mix(in srgb, var(--color-background) 98%, transparent) 100%)",
          borderRight: "1px solid var(--color-border)",
          backdropFilter: "blur(32px)",
        }}
      >
        {/* ÔöÇÔöÇ Header ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b shrink-0 relative overflow-hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {/* Subtle glow effect behind header */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(255,108,62,0.2) 0%, rgba(255,108,62,0.05) 100%)", border: "1px solid rgba(255,108,62,0.4)" }}
            >
              <Flame className="w-6 h-6" style={{ color: "#FF6C3E", filter: "drop-shadow(0 2px 4px rgba(255,108,62,0.4))" }} />
            </div>
            <div>
              <h2 className="font-headline text-xl leading-none tracking-tight" style={{ color: "var(--color-foreground)" }}>
                FOMO
              </h2>
              <p className="font-caption mt-1" style={{ color: "var(--color-muted)" }}>
                {mode === "discover" 
                  ? (source === "modrinth" ? "Novedades de Modrinth" : "Cat├ílogo CurseForge")
                  : mode === "collections"
                  ? "Mis Colecciones de Modrinth"
                  : "Modpacks Recomendados"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÔöÇÔöÇ Tabs ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        <div className="px-4 pt-4 pb-1 flex gap-2 shrink-0">
          <button
            onClick={() => setMode("discover")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-subhead transition-all"
            style={{
              background: mode === "discover" ? "rgba(255,108,62,0.15)" : "transparent",
              color: mode === "discover" ? "#FF6C3E" : "var(--color-muted)",
              border: mode === "discover" ? "1px solid rgba(255,108,62,0.3)" : "1px solid transparent",
            }}
          >
            <Search className="w-4 h-4" />
            Descubrir
          </button>
          <button
            onClick={() => setMode("collections")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-subhead transition-all"
            style={{
              background: mode === "collections" ? "rgba(102,200,160,0.15)" : "transparent",
              color: mode === "collections" ? "#66C8A0" : "var(--color-muted)",
              border: mode === "collections" ? "1px solid rgba(102,200,160,0.3)" : "1px solid transparent",
            }}
          >
            <Library className="w-4 h-4" />
            Mis Colecciones
          </button>
          <button
            onClick={() => setMode("presets")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-subhead transition-all"
            style={{
              background: mode === "presets" ? "rgba(187,150,228,0.15)" : "transparent",
              color: mode === "presets" ? "#BB96E4" : "var(--color-muted)",
              border: mode === "presets" ? "1px solid rgba(187,150,228,0.3)" : "1px solid transparent",
            }}
          >
            <LayoutTemplate className="w-4 h-4" />
            Modpacks
          </button>
        </div>

        {/* ÔöÇÔöÇ Source Toggle (solo en modo discover) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        {mode === "discover" && (
          <div className="px-4 pb-2 flex gap-2 shrink-0">
            <button
              onClick={() => setSource("modrinth")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-subhead transition-all"
              style={{
                background: source === "modrinth" ? "rgba(30,215,96,0.15)" : "rgba(255,255,255,0.03)",
                color: source === "modrinth" ? "#1ED760" : "var(--color-muted)",
                border: source === "modrinth" ? "1px solid rgba(30,215,96,0.3)" : "1px solid var(--color-border)",
              }}
              title="Modrinth - Descarga directa disponible"
            >
              <Zap className="w-3.5 h-3.5" />
              Modrinth
            </button>
            <button
              onClick={() => setSource("curseforge")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-subhead transition-all"
              style={{
                background: source === "curseforge" ? "rgba(239,108,0,0.15)" : "rgba(255,255,255,0.03)",
                color: source === "curseforge" ? "#EF6C00" : "var(--color-muted)",
                border: source === "curseforge" ? "1px solid rgba(239,108,0,0.3)" : "1px solid var(--color-border)",
              }}
              title="CurseForge - Discovery + links externos"
            >
              <Box className="w-3.5 h-3.5" />
              CurseForge
            </button>
          </div>
        )}
        
        {/* ÔöÇÔöÇ Source Error Banner ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        {sourceError && (
          <div className="mx-4 mb-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-subhead text-red-400">ÔÜá´©Å {sourceError}</p>
            <p className="font-caption mt-1" style={{ color: "var(--color-muted)" }}>
              Agreg├í CURSEFORGE_API_KEY en tu .env.local
            </p>
          </div>
        )}

        {mode === "discover" ? (
          <>
            {/* ÔöÇÔöÇ Search bar ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--color-border-strong)",
                }}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)"; }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-muted)" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={`Buscar ${getProjectTypeName(projectType)}...`}
                  className="flex-1 bg-transparent outline-none text-sm font-body-med"
                  style={{ color: "var(--color-foreground)" }}
                />
                {query && (
                  <button
                    onClick={() => handleQueryChange("")}
                    className="shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ÔöÇÔöÇ Filters ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            <div className="px-4 pb-3 flex flex-col gap-2.5 shrink-0 border-b" style={{ borderColor: "var(--color-border)" }}>
              
              {/* Row 1: Type + Loader + Version */}
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 shrink-0" style={{ color: "var(--color-muted)" }} />
                
                <select
                  value={projectType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="flex-1 text-sm font-subhead rounded-lg px-2 py-2 outline-none transition-colors truncate"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--color-border-strong)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {PROJECT_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value} style={{ background: "var(--color-card)" }}>
                      {pt.label}
                    </option>
                  ))}
                </select>

                {projectType === "mod" && (
                  <select
                    value={loader}
                    onChange={(e) => handleLoaderChange(e.target.value)}
                    className="flex-1 text-sm font-subhead rounded-lg px-2 py-2 outline-none transition-colors truncate"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--color-border-strong)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {LOADERS.map(l => (
                      <option key={l} value={l} style={{ background: "var(--color-card)" }}>
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </option>
                    ))}
                  </select>
                )}

                {projectType !== "datapack" && (
                  <select
                    value={gameVersion}
                    onChange={(e) => handleVersionChange(e.target.value)}
                    className="flex-1 text-sm font-subhead rounded-lg px-2 py-2 outline-none transition-colors truncate"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--color-border-strong)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {VERSIONS.map(v => (
                      <option key={v} value={v} style={{ background: "var(--color-card)" }}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => fetchMods()}
                  disabled={loading}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                  title="Actualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Row 2: Sort toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-strong)" }}>
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSortChange(opt.value as "relevance" | "newest" | "updated")}
                    className="flex-1 py-2 text-xs sm:text-sm font-subhead transition-all truncate px-1"
                    style={{
                      background: sortOrder === opt.value ? "rgba(255,108,62,0.2)" : "rgba(255,255,255,0.03)",
                      color: sortOrder === opt.value ? "#FF6C3E" : "var(--color-muted)",
                      borderRight: i < SORT_OPTIONS.length - 1 ? "1px solid var(--color-border-strong)" : "none",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ÔöÇÔöÇ Counter ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <p className="font-caption text-sm" style={{ color: "var(--color-muted)" }}>
                {loading
                  ? "Cargando..."
                  : query
                    ? `${formatNumber(total)} resultados para "${query}"`
                    : `${formatNumber(total)} ${getProjectTypeName(projectType)} ┬À P├íg. ${page} de ${totalPages}`}
              </p>
            </div>

            {/* ÔöÇÔöÇ Mod list ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-9 h-9 animate-spin" style={{ color: "var(--color-primary)", opacity: 0.5 }} />
                </div>
              ) : mods.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <Flame className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-subhead">Sin resultados</p>
                  <p className="font-caption mt-1">Prob├í otro loader, versi├│n o b├║squeda</p>
                </div>
              ) : (
                mods.map((mod) => (
                  <div
                    key={mod.projectId}
                    className="rounded-2xl p-4 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {/* Top row: icon + info + actions */}
                    <div className="flex items-start gap-3.5">
                      {/* Thumbnail */}
                      <div
                        className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--color-border)" }}
                      >
                        {mod.iconUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={mod.iconUrl}
                            alt={mod.title}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: "pixelated" }}
                            loading="lazy"
                          />
                        ) : (
                          <Flame className="w-6 h-6 opacity-25" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-subhead text-base leading-snug" style={{ color: "var(--color-foreground)" }}>
                          {mod.title}
                        </p>
                        <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>
                          by {mod.author}
                        </p>
                        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                          <span className="font-label text-[0.65rem]" style={{ color: "var(--color-muted)" }}>
                            Ôåô {formatNumber(mod.downloads)}
                          </span>
                          {mod.latestVersion && (
                            <span
                              className="font-label text-[0.62rem] px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(102,200,160,0.14)", color: "#66C8A0" }}
                            >
                              v{mod.latestVersion}
                            </span>
                          )}
                          {mod._source === "curseforge" && (
                            <span
                              className="font-label text-[0.62rem] px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(239,108,0,0.14)", color: "#EF6C00" }}
                            >
                              CurseForge
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => openExternal(mod.url)}
                          className="p-2 rounded-xl transition-all hover:bg-white/10"
                          style={{ color: "var(--color-primary)", border: "1px solid var(--color-border)" }}
                          title="Ver en Modrinth"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col gap-1">
                          {mod._source === "curseforge" ? (
                            <button
                              onClick={() => openExternal(mod.url)}
                              className="p-2 rounded-xl transition-all hover:bg-white/10"
                              style={{ color: "#EF6C00", border: "1px solid var(--color-border)" }}
                              title="Abrir en CurseForge (descarga externa)"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDownload(mod)}
                                disabled={downloading[mod.projectId]}
                                className="p-2 rounded-xl transition-all hover:bg-white/10 disabled:opacity-40"
                                style={{ color: "#66C8A0", border: "1px solid var(--color-border)" }}
                                title="Descarga r├ípida"
                              >
                                {downloading[mod.projectId] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleAddToCollection(mod)}
                                className="p-1 px-2 rounded-lg text-[0.6rem] font-bold opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                                style={{ background: "rgba(102,200,160,0.1)", color: "#66C8A0" }}
                              >
                                <Library className="w-3 h-3" />
                                + Colecci├│n
                              </button>

                              <button
                                onClick={() => handleOpenVersionSelector(mod)}
                                className="p-1 px-2 rounded-lg text-[0.6rem] font-bold opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                                style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-muted)" }}
                              >
                                <ChevronDown className="w-3 h-3" />
                                Versiones
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      className="font-caption mt-3 leading-relaxed line-clamp-3"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {mod.description}
                    </p>

                    {/* Categories */}
                    {mod.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {mod.categories.slice(0, 4).map(cat => (
                          <span
                            key={cat}
                            className="font-label text-[0.58rem] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(187,150,228,0.12)", color: "var(--color-primary)" }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* ÔöÇÔöÇ Pagination ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            <div
              className="flex items-center justify-between px-4 py-3.5 border-t shrink-0 gap-2"
              style={{ borderColor: "var(--color-border)" }}
            >
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-subhead transition-all disabled:opacity-30"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              {/* Smart page pills */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5)         p = 1 + i;
                  else if (page <= 3)          p = 1 + i;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else                         p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-9 h-9 rounded-xl text-sm font-subhead transition-all"
                      style={{
                        background: p === page ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                        color: p === page ? "#fff" : "var(--color-muted)",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-subhead transition-all disabled:opacity-30"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : mode === "collections" ? (
          <FomoCollections
            collections={collections}
            collLoading={collLoading}
            collError={collError}
            collDownloading={collDownloading}
            viewingCollection={viewingCollection}
            collectionMods={collectionMods}
            collModsLoading={collModsLoading}
            collectionFilter={collectionFilter}
            setCollectionFilter={setCollectionFilter}
            setViewingCollection={setViewingCollection}
            fetchCollections={fetchCollections}
            fetchCollectionProjects={fetchCollectionProjects}
            handleDownloadCollection={handleDownloadCollection}
            handleDownload={handleDownload}
            handleOpenVersionSelector={handleOpenVersionSelector}
            downloading={downloading}
            handleCreateCollection={handleCreateCollection}
          />
        ) : (
          /* ÔöÇÔöÇ Presets Mode ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
          <FomoPresets
            presets={presets}
            presetsLoading={presetsLoading}
            presetDownloading={presetDownloading}
            handleApplyPreset={handleApplyPreset}
          />
        )}

        {/* ÔöÇÔöÇ Version Selector Overlay ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
        {selectingVersionFor && (
          <div className="absolute inset-0 z-[60] flex flex-col bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectingVersionFor(null)}
                  className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-headline text-lg">Elegir Versi├│n</h3>
              </div>
              <button 
                onClick={() => setSelectingVersionFor(null)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 flex items-center gap-4 bg-white/5 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/20 shrink-0">
                {selectingVersionFor.iconUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selectingVersionFor.iconUrl} alt={selectingVersionFor.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-headline text-sm truncate">{selectingVersionFor.title}</p>
                <p className="font-caption text-xs text-white/40">Filtro: {loader} ÔÇó {gameVersion}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {versLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                  <p className="text-xs font-medium text-white/40">Buscando versiones...</p>
                </div>
              ) : projectVersions.length === 0 ? (
                <div className="text-center py-20">
                  <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-subhead text-sm text-white/60">No se encontraron versiones compatibles</p>
                  <p className="font-caption text-xs text-white/40 mt-1">Intent├í cambiar la versi├│n del juego en los filtros</p>
                </div>
              ) : (
                projectVersions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleDownload(selectingVersionFor, v)}
                    disabled={downloading[selectingVersionFor.projectId]}
                    className="w-full text-left rounded-2xl p-4 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-headline text-sm truncate group-hover:text-primary transition-colors">{v.name || v.versionNumber}</p>
                        {v.versionType === "release" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : (
                          <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 uppercase">
                            {v.versionType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[0.65rem] text-white/40 font-medium">
                        <span>{new Date(v.datePublished).toLocaleDateString()}</span>
                        <span>ÔÇó</span>
                        <span>{formatSize(v.primaryFile?.size || 0)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.loaders.slice(0, 3).map(l => (
                          <span key={l} className="px-1.5 py-0.5 rounded bg-white/5 text-[0.6rem] uppercase tracking-wider">{l}</span>
                        ))}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                      {downloading[selectingVersionFor.projectId] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
