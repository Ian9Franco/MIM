"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Flame, X, ChevronLeft, ChevronRight, ExternalLink,
  Download, Loader2, Filter, RefreshCw, Search
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

function openExternal(url: string) {
  // In Tauri webview, window.open may not work for external URLs.
  // We try window.open first; if unavailable, fall back to location.href.
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;
  } catch {
    window.location.href = url;
  }
}

export function FomoSidebar({ open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1" }: FomoSidebarProps) {
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMods = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
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
      const res = await fetch(`/api/modrinth/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMods(data.mods ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch (_) {}
    setLoading(false);
  }, [loader, gameVersion, projectType, page, sortOrder, query]);

  useEffect(() => {
    if (open) fetchMods();
  }, [open, fetchMods]);

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

  const handleDownload = async (mod: ModHit) => {
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    try {
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
        const downloadUrl = versions[0].files?.[0]?.url;
        const filename    = versions[0].files?.[0]?.filename;
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
          }
        } else {
          alert("No se encontró un archivo de descarga válido para este proyecto.");
        }
      } else {
        alert("No se encontraron versiones disponibles para este proyecto en Modrinth.");
      }
    } catch (err) {
      console.error("[FOMO] Download error:", err);
      alert("Error crítico durante la descarga. Revisá la consola.");
    }
    setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
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
                Novedades de Modrinth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2 shrink-0">
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
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
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
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
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
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {/* Open in Modrinth — uses window.open for Tauri compat */}
                    <button
                      onClick={() => openExternal(mod.url)}
                      className="p-2 rounded-xl transition-all hover:bg-white/10"
                      style={{ color: "var(--color-primary)", border: "1px solid var(--color-border)" }}
                      title="Ver en Modrinth"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(mod)}
                      disabled={downloading[mod.projectId]}
                      className="p-2 rounded-xl transition-all hover:bg-white/10 disabled:opacity-40"
                      style={{ color: "#66C8A0", border: "1px solid var(--color-border)" }}
                      title="Descargar a Descargas"
                    >
                      {downloading[mod.projectId] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
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
            onMouseEnter={(e) => { if (!loading && page > 1) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
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
            onMouseEnter={(e) => { if (!loading && page < totalPages) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
