"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Heart, Search, ExternalLink, Trash2, ArrowRight, Sparkles, FolderHeart, UserCheck, Package, RefreshCw, Loader2, Download, AlertCircle } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { openExternal } from "@/utils/format";
import type { ModHit } from "@/lib/types";

interface FomoFollowedAuthorsProps {
  onSearchAuthor: (author: string) => void;
  onOpenVersions?: (mod: ModHit) => void;
  onDownloadMod?: (mod: ModHit) => Promise<void>;
  downloading?: Record<string, boolean>;
}

export function FomoFollowedAuthors({ 
  onSearchAuthor, 
  onOpenVersions, 
  onDownloadMod, 
  downloading = {} 
}: FomoFollowedAuthorsProps) {
  const [subTab, setSubTab] = useState<"projects" | "authors">("projects");
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [followedMods, setFollowedMods] = useState<ModHit[]>([]);
  const [modrinthStatus, setModrinthStatus] = useState<Record<string, any>>({});
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);

  // Load followed authors, mods, and modrinthStatus from localStorage & listen to reactive change events
  useEffect(() => {
    const loadState = () => {
      try {
        const authors = localStorage.getItem("mim_followed_authors");
        if (authors) setFollowedAuthors(JSON.parse(authors));
        else setFollowedAuthors([]);

        const mods = localStorage.getItem("mim_followed_mods");
        if (mods) setFollowedMods(JSON.parse(mods));
        else setFollowedMods([]);

        const status = localStorage.getItem("mim_modrinth_status");
        if (status) setModrinthStatus(JSON.parse(status));
      } catch (e) {
        console.error("Error loading followed state in FomoFollowedAuthors:", e);
      }
    };

    loadState();

    const handleAuthorsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) setFollowedAuthors(customEvent.detail);
    };

    const handleModsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<ModHit[]>;
      if (customEvent.detail) setFollowedMods(customEvent.detail);
    };

    const handleStatusChanged = (e: Event) => {
      const customEvent = e as CustomEvent<Record<string, any>>;
      if (customEvent.detail) setModrinthStatus(customEvent.detail);
    };

    window.addEventListener("mim-followed-authors-changed", handleAuthorsChanged);
    window.addEventListener("mim-followed-mods-changed", handleModsChanged);
    window.addEventListener("mim-modrinth-status-changed", handleStatusChanged);

    return () => {
      window.removeEventListener("mim-followed-authors-changed", handleAuthorsChanged);
      window.removeEventListener("mim-followed-mods-changed", handleModsChanged);
      window.removeEventListener("mim-modrinth-status-changed", handleStatusChanged);
    };
  }, []);

  const handleUnfollowAuthor = useCallback((author: string) => {
    let current: string[] = [];
    try {
      const stored = localStorage.getItem("mim_followed_authors");
      if (stored) current = JSON.parse(stored);
    } catch {}

    const next = current.filter((a) => a !== author);
    setFollowedAuthors(next);

    try {
      localStorage.setItem("mim_followed_authors", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
    } catch (e) {
      console.error("Error unfollowing author storage/events:", e);
    }
  }, []);

  const handleUnfollowMod = useCallback((projectId: string) => {
    let current: any[] = [];
    try {
      const stored = localStorage.getItem("mim_followed_mods");
      if (stored) current = JSON.parse(stored);
    } catch {}

    const next = current.filter((m) => m.projectId !== projectId);
    setFollowedMods(next);

    try {
      localStorage.setItem("mim_followed_mods", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
    } catch (e) {
      console.error("Error unfollowing mod storage/events:", e);
    }
  }, []);

  // Compute a beautiful looking stable gradient color-pair based on string hashes
  const getGradientByName = (name: string) => {
    const gradients = [
      "from-pink-500 via-rose-500 to-red-500",
      "from-purple-500 via-indigo-500 to-blue-500",
      "from-blue-500 via-cyan-500 to-teal-500",
      "from-emerald-500 via-teal-500 to-cyan-500",
      "from-amber-500 via-orange-500 to-red-500",
      "from-fuchsia-500 via-purple-500 to-pink-500",
      "from-violet-500 via-fuchsia-500 to-rose-500"
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  // Check if a mod has an update available
  const getModUpdateInfo = useCallback((projectId: string) => {
    const statusKey = `collection:${projectId}`;
    const s = modrinthStatus[statusKey];
    if (s && s.status === "update_available" && s.latestVersion) {
      return s;
    }
    return null;
  }, [modrinthStatus]);

  // Filter mods that have updates if toggled
  const filteredMods = React.useMemo(() => {
    if (showOnlyWithUpdates) {
      return followedMods.filter((m) => !!getModUpdateInfo(m.projectId));
    }
    return followedMods;
  }, [followedMods, showOnlyWithUpdates, getModUpdateInfo]);

  const isDemoActive = followedMods.some(m => m.projectId === "v1B5aG6q");

  const handleLoadDemoData = () => {
    const demoAuthors = ["Jerry_the_Modder", "Mine_Designer", "el_notorious"];
    const demoMods: ModHit[] = [
      {
        projectId: "v1B5aG6q",
        title: "Essential HUD",
        slug: "essential-hud",
        author: "Jerry_the_Modder",
        description: "A beautifully customized head-up display for modern Minecraft clients.",
        url: "https://modrinth.com/mod/essential-hud",
        downloads: 14520,
        follows: 342,
        _source: "modrinth",
        projectType: "mod",
        iconUrl: null,
        latestVersion: "2.3.0",
        categories: ["hud"],
        dateCreated: "2026-05-13T14:00:00Z"
      },
      {
        projectId: "a3F8hL9w",
        title: "Glowstone Lanterns",
        slug: "glowstone-lanterns",
        author: "Mine_Designer",
        description: "Dynamic atmospheric lights that glow in the dark with full colored shadows.",
        url: "https://modrinth.com/mod/glowstone-lanterns",
        downloads: 8930,
        follows: 120,
        _source: "modrinth",
        projectType: "mod",
        iconUrl: null,
        latestVersion: "1.1.0",
        categories: ["decoration"],
        dateCreated: "2026-05-13T14:00:00Z"
      }
    ];
    const demoStatus = {
      ...modrinthStatus,
      "collection:v1B5aG6q": {
        status: "update_available",
        latestVersion: "2.4.0",
        downloadUrl: "https://cdn.modrinth.com/data/v1B5aG6q/versions/2.4.0/essential-hud-2.4.0.jar",
        title: "Essential HUD",
        slug: "essential-hud"
      },
      "collection:a3F8hL9w": {
        status: "update_available",
        latestVersion: "1.1.2",
        downloadUrl: "https://cdn.modrinth.com/data/a3F8hL9w/versions/1.1.2/glowstone-lanterns-1.1.2.jar",
        title: "Glowstone Lanterns",
        slug: "glowstone-lanterns"
      }
    };

    localStorage.setItem("mim_followed_authors", JSON.stringify(demoAuthors));
    localStorage.setItem("mim_followed_mods", JSON.stringify(demoMods));
    localStorage.setItem("mim_modrinth_status", JSON.stringify(demoStatus));

    setFollowedAuthors(demoAuthors);
    setFollowedMods(demoMods);
    setModrinthStatus(demoStatus);

    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: demoAuthors }));
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: demoMods }));
    window.dispatchEvent(new CustomEvent("mim-modrinth-status-changed", { detail: demoStatus }));
  };

  const handleClearDemoData = () => {
    localStorage.removeItem("mim_followed_authors");
    localStorage.removeItem("mim_followed_mods");
    
    const nextStatus = { ...modrinthStatus };
    delete nextStatus["collection:v1B5aG6q"];
    delete nextStatus["collection:a3F8hL9w"];
    localStorage.setItem("mim_modrinth_status", JSON.stringify(nextStatus));

    setFollowedAuthors([]);
    setFollowedMods([]);
    setModrinthStatus(nextStatus);

    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: [] }));
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: [] }));
    window.dispatchEvent(new CustomEvent("mim-modrinth-status-changed", { detail: nextStatus }));
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full animate-fade-in">
      
      {/* Tab Header Selector */}
      <div className="px-6 pt-5 pb-3 border-b flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
        
        {/* Toggle Switches */}
        <div className="flex p-1 rounded-2xl gap-1 border border-[var(--color-border)]" style={{ background: "var(--color-background)" }}>
          <button
            type="button"
            onClick={() => setSubTab("projects")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              subTab === "projects" 
                ? "bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] shadow-sm" 
                : "opacity-60 hover:opacity-100 text-[var(--color-foreground)] border-transparent"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Proyectos ({followedMods.length})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSubTab("authors")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              subTab === "authors" 
                ? "bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] shadow-sm" 
                : "opacity-60 hover:opacity-100 text-[var(--color-foreground)] border-transparent"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Autores ({followedAuthors.length})</span>
          </button>
        </div>

        {/* Extra Filters / Info / Demo Reset */}
        <div className="flex items-center gap-2">
          {isDemoActive && (
            <button
              onClick={handleClearDemoData}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/20 hover:bg-rose-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Limpiar Datos Demo</span>
            </button>
          )}

          {subTab === "projects" && followedMods.length > 0 && (
            <button
              onClick={() => setShowOnlyWithUpdates(!showOnlyWithUpdates)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
                showOnlyWithUpdates
                  ? "bg-[color-mix(in_srgb,var(--color-emerald)_15%,transparent)] text-[var(--color-emerald)] border-[color-mix(in_srgb,var(--color-emerald)_20%,transparent)] shadow-sm"
                  : "bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] border-[var(--color-border)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] text-[var(--color-foreground)] opacity-80"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${showOnlyWithUpdates ? "animate-spin-slow" : ""}`} />
              <span>Solo con Actualización</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Panel Content Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        {/* PROJECTS TAB */}
        {subTab === "projects" && (
          <>
            {followedMods.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center animate-fade-in">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-3xl w-24 h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
                  <div className="relative w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center animate-bounce duration-3000">
                    <FolderHeart className="w-10 h-10 text-rose-500" />
                  </div>
                </div>
                <h3 className="font-headline text-lg mb-2" style={{ color: COLORS.foreground }}>No sigues ningún mod</h3>
                <p className="font-body text-xs max-w-sm mb-6 opacity-60 leading-relaxed">
                  Sigue tus proyectos y mods favoritos usando el corazón en el panel de detalles para tenerlos controlados y listos para actualizar.
                </p>
                <button
                  type="button"
                  onClick={handleLoadDemoData}
                  className="px-5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:scale-105 active:scale-95 transition-all text-xs font-bold flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>Probar con Datos Demo</span>
                </button>
              </div>
            ) : filteredMods.length === 0 && showOnlyWithUpdates ? (
              <div className="py-20 text-center flex flex-col items-center justify-center opacity-60 animate-fade-in">
                <Package className="w-12 h-12 text-zinc-500 mb-4" />
                <p className="font-subhead text-sm text-white font-bold">¡Todo al día!</p>
                <p className="text-xs mt-1 max-w-xs">Ninguno de tus mods seguidos tiene actualizaciones pendientes en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMods.map((mod) => {
                  const updateInfo = getModUpdateInfo(mod.projectId);
                  const isDownloading = !!downloading[`collection:${mod.projectId}`];

                  return (
                    <div
                      key={mod.projectId}
                      className={`group relative rounded-2xl border p-4 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5 ${
                        updateInfo 
                          ? "border-emerald-500/30 bg-[color-mix(in_srgb,var(--color-emerald)_8%,transparent)] shadow-[0_4px_24px_rgba(16,185,129,0.05)]" 
                          : "bg-[var(--fomo-card-bg)] border-[var(--fomo-card-border)] hover:border-[var(--fomo-card-hover-border)]"
                      }`}
                      onClick={() => onOpenVersions?.(mod)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Top row */}
                      <div className="flex gap-4 items-start min-w-0">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[color-mix(in_srgb,var(--fomo-text-primary)_10%,transparent)] border border-[var(--fomo-border)] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                          {mod.iconUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-white font-headline text-lg font-bold bg-gradient-to-br ${getGradientByName(mod.title)}`}>
                              {mod.title.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Title and metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-headline text-sm font-bold truncate text-[var(--fomo-text-primary)] max-w-[80%]" title={mod.title}>
                              {mod.title}
                            </h4>
                            {updateInfo && (
                              <span className="animate-pulse shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                                UPDATE!
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--fomo-text-subtle)] opacity-85 mt-0.5 truncate">por {mod.author}</p>
                        </div>
                      </div>

                      {/* Update banner if available */}
                      {updateInfo && (
                        <div className="mt-3.5 p-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-emerald)_10%,transparent)] border border-emerald-500/20 flex items-center justify-between gap-3 animate-fade-in relative z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-black">Nueva Versión</p>
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-100 font-bold truncate mt-0.5">v{updateInfo.latestVersion}</p>
                          </div>
                          
                          {onDownloadMod && (
                            <button
                              onClick={() => {
                                  const filename = `${mod.slug || "mod"}-${updateInfo.latestVersion}.jar`;
                                  onDownloadMod({
                                    ...mod,
                                    projectId: `collection:${mod.projectId}` // Virtual prefix for download path matching
                                  });
                                }}
                              disabled={isDownloading}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-bold text-[10px] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 shrink-0"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              <span>{isDownloading ? "Bajando" : "Descargar"}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Bottom action row */}
                      <div className="mt-4 pt-3 border-t border-[var(--fomo-border)] flex items-center justify-between gap-4 relative z-10" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[8px] tracking-widest font-bold uppercase text-[var(--fomo-text-subtle)] opacity-70">
                          {mod._source || "MODRINTH"}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenVersions?.(mod)}
                            className="p-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--fomo-text-primary)_8%,transparent)] text-[var(--fomo-text-muted)] hover:text-[var(--fomo-text-primary)] transition-colors"
                            title="Ver versiones del mod"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openExternal(mod.url)}
                            className="p-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--fomo-text-primary)_8%,transparent)] text-[var(--fomo-text-muted)] hover:text-[var(--fomo-text-primary)] transition-colors"
                            title="Abrir página oficial"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUnfollowMod(mod.projectId)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 text-[var(--fomo-text-subtle)] hover:text-rose-500 transition-colors"
                            title="Dejar de seguir mod"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* AUTHORS TAB */}
        {subTab === "authors" && (
          <>
            {followedAuthors.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center animate-fade-in">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-pink-500/10 rounded-full blur-3xl w-24 h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
                  <div className="relative w-20 h-20 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center animate-bounce duration-3000">
                    <Heart className="w-10 h-10 text-pink-500 fill-pink-500/25" />
                  </div>
                </div>
                <h3 className="font-headline text-lg mb-2" style={{ color: COLORS.foreground }}>Aún no sigues a ningún autor</h3>
                <p className="font-body text-xs max-w-sm mb-6 opacity-60 leading-relaxed">
                  Sigue a creadores desde los detalles de cualquier proyecto para verlos aquí y descubrir sus últimas novedades al instante.
                </p>
                <button
                  type="button"
                  onClick={handleLoadDemoData}
                  className="px-5 py-2.5 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 hover:scale-105 active:scale-95 transition-all text-xs font-bold flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Probar con Datos Demo</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {followedAuthors.map((author) => (
                  <div
                    key={author}
                    className="group relative rounded-2xl border p-4 flex items-center justify-between transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5"
                    style={{
                      background: "var(--fomo-card-bg, rgba(255, 255, 255, 0.02))",
                      borderColor: "var(--fomo-border, rgba(255, 255, 255, 0.05))"
                    }}
                  >
                    {/* Glowing effect inside card */}
                    <div className="absolute inset-0 rounded-2xl bg-pink-500/2 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-4 relative z-10 min-w-0 pr-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getGradientByName(author)} flex items-center justify-center text-white font-headline text-base font-bold uppercase shadow-md shrink-0`}>
                        {author.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-headline text-sm font-bold truncate text-[var(--fomo-text-primary)]">
                          {author}
                        </p>
                        <p className="text-[10px] text-[var(--fomo-text-subtle)] opacity-85 mt-0.5">Creador de Minecraft</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 relative z-10 shrink-0">
                      <button
                        onClick={() => onSearchAuthor(author)}
                        className="p-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--fomo-text-primary)_8%,transparent)] text-[var(--fomo-text-muted)] hover:text-[var(--fomo-text-primary)] transition-all"
                        title={`Buscar mods de ${author}`}
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openExternal(`https://modrinth.com/user/${author}`)}
                        className="p-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--fomo-text-primary)_8%,transparent)] text-[var(--fomo-text-muted)] hover:text-[var(--fomo-text-primary)] transition-all"
                        title={`Ver perfil de ${author}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUnfollowAuthor(author)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-[var(--fomo-text-subtle)] hover:text-rose-500 transition-all"
                        title={`Dejar de seguir a ${author}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
