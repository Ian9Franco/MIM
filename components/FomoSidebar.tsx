"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Flame, X, ChevronLeft, ChevronRight, ExternalLink,
  Download, Loader2, Filter, RefreshCw, Search,
  Library, List, CheckCircle2, AlertCircle, Info, ChevronDown,
  Zap, Box, LayoutTemplate
} from "lucide-react";

interface ModHit {
  projectId: string;
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  author: string;
  downloads: number;
  follows: number;
  latestVersion: string | null;
  categories: string[];
  dateCreated: string;
  url: string;
  _source?: "modrinth" | "curseforge"; // Flag interno para saber la fuente
}

interface CollectionEntry {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
}

interface PresetEntry {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
  tags: string[];
  recommendedLoader: string;
  recommendedVersion: string;
}

interface VersionEntry {
  id: string;
  versionNumber: string;
  name: string;
  versionType: "release" | "beta" | "alpha";
  gameVersions: string[];
  loaders: string[];
  datePublished: string;
  downloads: number;
  primaryFile: {
    url: string;
    filename: string;
    primary: boolean;
    size: number;
  } | null;
}

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
  { value: "relevance", label: "⭐ Relevancia" },
  { value: "newest",    label: "🆕 Nuevos" },
  { value: "updated",   label: "🔄 Actualizados" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function openExternal(url: string) {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;
  } catch {
    window.location.href = url;
  }
}

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
    try {
      const res = await fetch("/api/modrinth/collections");
      const data = await res.json();
      if (res.ok) {
        setCollections(data.collections ?? []);
      } else {
        setCollError(data.error || "Error al cargar colecciones");
      }
    } catch (err) {
      setCollError("Error de conexión");
    }
    setCollLoading(false);
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

  useEffect(() => {
    if (open) {
      if (mode === "discover") fetchMods();
      else if (mode === "collections") fetchCollections();
      else if (mode === "presets") fetchPresets();
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
        alert("No se encontró un archivo de descarga válido para este proyecto.");
      }
    } catch (err) {
      console.error("[FOMO] Download error:", err);
      alert("Error crítico durante la descarga.");
    }
    setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
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
        alert(`Sincronización completada: ${success}/${total} proyectos descargados a tu carpeta Downloads.`);
      } else {
        alert(`Error: ${data.error || "No se pudo descargar la colección"}`);
      }
    } catch (err) {
      alert("Error de conexión al descargar colección");
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
        
        // Actualizar loader y versión según el preset
        setLoader(preset.recommendedLoader);
        setGameVersion(preset.recommendedVersion);
        
        alert(`Plantilla "${preset.name}" aplicada: ${success}/${total} mods descargados.\nLoader cambiado a ${preset.recommendedLoader} ${preset.recommendedVersion}`);
      } else {
        alert(`Error: ${data.error || "No se pudo aplicar la plantilla"}`);
      }
    } catch (err) {
      alert("Error de conexión al aplicar plantilla");
    }
    setPresetDownloading(null);
  };

  // Responsive sidebar width: full on small screens, 480px on md+
  const sidebarWidth = "min(100vw, 500px)";

  const getLoaderColor = (l: string) => {
    if (l === "forge") return "#EF4444";
    if (l === "neoforge") return "#FF783C";
    if (l === "fabric") return "#66C8A0";
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: sidebarWidth,
          background: "color-mix(in srgb, var(--color-card) 97%, transparent)",
          borderRight: "1px solid var(--color-border-strong)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-5 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,100,60,0.14)", border: "1px solid rgba(255,100,60,0.3)" }}
            >
              <Flame className="w-5 h-5" style={{ color: "#FF6C3E" }} />
            </div>
            <div>
              <h2 className="font-headline text-lg leading-none" style={{ color: "var(--color-foreground)" }}>
                FOMO
              </h2>
              <p className="font-caption mt-1" style={{ color: "var(--color-muted)" }}>
                {mode === "discover" 
                  ? (source === "modrinth" ? "Novedades de Modrinth" : "Catálogo CurseForge")
                  : mode === "collections"
                  ? "Mis Colecciones de Modrinth"
                  : "Plantillas Pre-armadas"}
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

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
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
            Plantillas
          </button>
        </div>

        {/* ── Source Toggle (solo en modo discover) ──────────────────────── */}
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
        
        {/* ── Source Error Banner ───────────────────────────────────────── */}
        {sourceError && (
          <div className="mx-4 mb-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-subhead text-red-400">⚠️ {sourceError}</p>
            <p className="font-caption mt-1" style={{ color: "var(--color-muted)" }}>
              Agregá CURSEFORGE_API_KEY en tu .env.local
            </p>
          </div>
        )}

        {mode === "discover" ? (
          <>
            {/* ── Search bar ──────────────────────────────────────────────────── */}
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

            {/* ── Filters ─────────────────────────────────────────────────────── */}
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

            {/* ── Counter ─────────────────────────────────────────────────────── */}
            <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <p className="font-caption text-sm" style={{ color: "var(--color-muted)" }}>
                {loading
                  ? "Cargando..."
                  : query
                    ? `${formatNumber(total)} resultados para "${query}"`
                    : `${formatNumber(total)} ${getProjectTypeName(projectType)} · Pág. ${page} de ${totalPages}`}
              </p>
            </div>

            {/* ── Mod list ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-9 h-9 animate-spin" style={{ color: "var(--color-primary)", opacity: 0.5 }} />
                </div>
              ) : mods.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <Flame className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-subhead">Sin resultados</p>
                  <p className="font-caption mt-1">Probá otro loader, versión o búsqueda</p>
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
                            ↓ {formatNumber(mod.downloads)}
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
                                title="Descarga rápida"
                              >
                                {downloading[mod.projectId] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleOpenVersionSelector(mod)}
                                className="p-1 px-2 rounded-lg text-[0.6rem] font-bold opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1 mx-auto"
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

            {/* ── Pagination ──────────────────────────────────────────────────── */}
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
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
            {collLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-9 h-9 animate-spin" style={{ color: "#66C8A0", opacity: 0.5 }} />
                <p className="font-subhead text-sm animate-pulse" style={{ color: "var(--color-muted)" }}>Sincronizando con Modrinth...</p>
              </div>
            ) : collError ? (
              <div className="text-center py-20 px-6 rounded-3xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-60" />
                <p className="font-subhead text-red-400">Error de Autenticación</p>
                <p className="font-caption mt-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  {collError.includes("TOKEN") 
                    ? "Necesitás configurar MODRINTH_TOKEN en tu .env.local para acceder a tus colecciones privadas."
                    : collError}
                </p>
                <button 
                  onClick={fetchCollections}
                  className="mt-6 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.1)", color: "var(--color-foreground)" }}
                >
                  Reintentar
                </button>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-20 opacity-40">
                <Library className="w-12 h-12 mx-auto mb-3" />
                <p className="font-subhead">No tienes colecciones</p>
                <p className="font-caption mt-1">Sigue colecciones en Modrinth para verlas aquí</p>
              </div>
            ) : (
              collections.map((coll) => (
                <div
                  key={coll.id}
                  className="rounded-2xl p-4 transition-all duration-300 group"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      {coll.iconUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={coll.iconUrl} alt={coll.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                          <Library className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline text-base truncate" style={{ color: "var(--color-foreground)" }}>{coll.name}</h3>
                      <p className="font-caption text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{coll.projectCount} proyectos</p>
                    </div>
                    <button
                      onClick={() => handleDownloadCollection(coll)}
                      disabled={!!collDownloading}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      style={{ 
                        background: collDownloading === coll.id ? "rgba(102,200,160,0.15)" : "rgba(255,255,255,0.05)",
                        color: "#66C8A0",
                        border: "1px solid rgba(102,200,160,0.3)"
                      }}
                      title="Descargar toda la colección"
                    >
                      {collDownloading === coll.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span className="text-[0.6rem] font-bold mt-1">Sync</span>
                        </>
                      )}
                    </button>
                  </div>
                  {coll.description && (
                    <p className="font-caption text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                      {coll.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Presets Mode ─────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
            {presetsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-9 h-9 animate-spin" style={{ color: "#BB96E4", opacity: 0.5 }} />
                <p className="font-subhead text-sm animate-pulse" style={{ color: "var(--color-muted)" }}>Cargando plantillas...</p>
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-20 opacity-40">
                <LayoutTemplate className="w-12 h-12 mx-auto mb-3" />
                <p className="font-subhead">No hay plantillas disponibles</p>
                <p className="font-caption mt-1">Reintentá más tarde</p>
              </div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-2xl p-4 transition-all duration-300 group"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                      <LayoutTemplate className="w-8 h-8 opacity-40" style={{ color: "#BB96E4" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline text-base truncate" style={{ color: "var(--color-foreground)" }}>{preset.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-caption text-xs" style={{ color: "var(--color-muted)" }}>
                          {preset.projectCount} proyectos
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: "var(--color-muted)" }}>
                          {preset.recommendedLoader}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: "var(--color-muted)" }}>
                          {preset.recommendedVersion}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      disabled={!!presetDownloading}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      style={{ 
                        background: presetDownloading === preset.id ? "rgba(187,150,228,0.15)" : "rgba(255,255,255,0.05)",
                        color: "#BB96E4",
                        border: "1px solid rgba(187,150,228,0.3)"
                      }}
                      title="Aplicar plantilla (descarga todos los mods)"
                    >
                      {presetDownloading === preset.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span className="text-[0.6rem] font-bold mt-1">Aplicar</span>
                        </>
                      )}
                    </button>
                  </div>
                  {preset.description && (
                    <p className="font-caption text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                      {preset.description}
                    </p>
                  )}
                  {preset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {preset.tags.map(tag => (
                        <span
                          key={tag}
                          className="font-label text-[0.58rem] px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(187,150,228,0.12)", color: "#BB96E4" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Version Selector Overlay ───────────────────────────────────── */}
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
                <h3 className="font-headline text-lg">Elegir Versión</h3>
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
                <p className="font-caption text-xs text-white/40">Filtro: {loader} • {gameVersion}</p>
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
                  <p className="font-caption text-xs text-white/40 mt-1">Intentá cambiar la versión del juego en los filtros</p>
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
                        <span>•</span>
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
