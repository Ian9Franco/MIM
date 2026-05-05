import React, { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X, Loader2, Download, CheckCircle2, Info, FileText, ListTree, ChevronDown, ChevronUp, ExternalLink, Package, Globe, Laptop, Server, Calendar, HardDrive, Box } from "lucide-react";
import { formatSize, openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { markdownToHtml } from "@/utils/markdown";
import type { ModHit, VersionEntry } from "@/lib/types";

interface FomoVersionOverlayProps {
  mod:         ModHit;
  versions:    VersionEntry[];
  loading:     boolean;
  downloading: boolean;
  loader:      string;
  gameVersions: string[];
  projectType: string;
  onClose:     () => void;
  onDownload:  (mod: ModHit, version: VersionEntry) => void;
  onDownloadDependency?: (dependency: any) => void;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersions, projectType, onClose, onDownload, onDownloadDependency,
}: FomoVersionOverlayProps) {
  const [activeTab, setActiveTab] = useState<"description" | "versions" | "dependencies">("versions");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [depDownloading, setDepDownloading] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findTarget = () => {
      const el = document.getElementById("fomo-details-sidebar-portal");
      if (el) {
        setPortalTarget(el);
        return true;
      }
      return false;
    };

    if (findTarget()) return;

    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (findTarget() || count >= 10) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, []);

  const handleDownloadDependency = useCallback(async (depId: string, depTitle: string) => {
    setDepDownloading(depId);
    try {
      // 1. Fetch dependency project to get slug and type
      const projRes = await fetch(`https://api.modrinth.com/v2/project/${depId}`);
      if (!projRes.ok) throw new Error("No se pudo obtener el proyecto de la dependencia");
      const projData = await projRes.json();

      const depMod: ModHit = {
        projectId: projData.id,
        slug: projData.slug,
        title: projData.title,
        description: projData.description,
        iconUrl: projData.icon_url,
        author: "Unknown",
        downloads: projData.downloads,
        follows: projData.followers,
        latestVersion: null,
        categories: projData.categories,
        dateCreated: projData.published,
        url: `https://modrinth.com/project/${projData.slug}`,
        projectType: projData.project_type,
        _source: "modrinth"
      };

      // 2. Fetch compatible versions
      const loadersParam = depMod.projectType === "mod" ? `&loaders=["${loader}"]` : "";
      const versionsRes = await fetch(
        `https://api.modrinth.com/v2/project/${depId}/version?game_versions=["${gameVersions[0] || "1.20.1"}"]${loadersParam}`
      );
      if (!versionsRes.ok) throw new Error("No se encontraron versiones compatibles");
      
      const depVersions = await versionsRes.json();
      if (!depVersions || depVersions.length === 0) throw new Error("No hay versiones compatibles");

      const primaryFileRaw = depVersions[0].files.find((f: any) => f.primary) || depVersions[0].files[0];

      // 3. Download the latest one
      onDownload(depMod, {
        id:            depVersions[0].id,
        versionNumber: depVersions[0].version_number,
        name:          depVersions[0].name,
        changelog:     depVersions[0].changelog || "",
        datePublished: depVersions[0].date_published,
        versionType:   depVersions[0].version_type,
        loaders:       depVersions[0].loaders,
        gameVersions:  depVersions[0].game_versions,
        downloads:     depVersions[0].downloads || 0,
        dependencies:  depVersions[0].dependencies || [],
        primaryFile: primaryFileRaw ? {
          url:      primaryFileRaw.url,
          filename: primaryFileRaw.filename,
          primary:  primaryFileRaw.primary || false,
          size:     primaryFileRaw.size || 0,
          hashes:   primaryFileRaw.hashes || {},
        } : null,
      });
    } catch (err) {
      console.error("Error downloading dependency:", err);
      alert(err instanceof Error ? err.message : "Error al descargar la dependencia");
    } finally {
      setDepDownloading(null);
    }
  }, [loader, gameVersions, onDownload]);

  // Extract all unique dependencies from all versions to show in the Dependencies tab
  const allDependencies = Array.from(new Set(versions.flatMap(v => v.dependencies || []).map(d => d.projectId)))
    .map(id => {
      const dep = versions.flatMap(v => v.dependencies || []).find(d => d.projectId === id);
      return dep!;
    });

  const requiredDeps = allDependencies.filter(d => d.dependencyType === "required");
  const optionalDeps = allDependencies.filter(d => d.dependencyType === "optional");
  const descriptionHtml = mod.body?.trim()
    ? markdownToHtml(mod.body)
    : mod.description?.trim()
    ? markdownToHtml(mod.description)
    : "El autor no ha proporcionado una descripción detallada.";

  const handleDescriptionClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a[data-external-link='true']") as HTMLAnchorElement | null;
    if (!anchor?.href) return;
    event.preventDefault();
    openExternal(anchor.href);
  }, []);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${mod.title}`}
      className="flex-1 flex flex-col min-h-0 animate-fade-in text-foreground"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-white/10" style={{ color: COLORS.foreground }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-headline text-lg" style={{ color: COLORS.foreground }}>Detalles del Proyecto</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ color: COLORS.foreground }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mod summary */}
      <div className="px-5 py-5 flex flex-col gap-5 border-b" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border shadow-sm" style={{ background: "var(--color-hover)", borderColor: COLORS.borderStrong }}>
            {mod.iconUrl && <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-lg truncate" style={{ color: COLORS.foreground }}>{mod.title}</p>
            <p className="font-caption text-xs mt-0.5" style={{ color: COLORS.muted }}>
              por <span className="text-primary/80 font-bold">{mod.author}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => openExternal(mod.url)}
            className="p-3 rounded-xl border transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
            style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border, color: COLORS.foreground }}
          >
            <ExternalLink className="w-5 h-5 opacity-60" />
          </button>
        </div>

        {/* New: Quick Metadata Grid */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px] p-2.5 rounded-xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest mb-1.5 opacity-40">Entorno</p>
            <div className="flex flex-wrap gap-1.5">
              <EnvironmentBadge type={mod.client_side || "unknown"} label="Cliente" icon={<Laptop className="w-3 h-3" />} />
              <EnvironmentBadge type={mod.server_side || "unknown"} label="Servidor" icon={<Server className="w-3 h-3" />} />
            </div>
          </div>

          <div className="flex-1 min-w-[110px] p-2.5 rounded-xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest mb-1.5 opacity-40">Plataformas</p>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(versions.flatMap(v => v.loaders))).map(l => (
                <span key={l} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[0.65rem] font-bold border border-primary/20 uppercase">{l}</span>
              ))}
            </div>
          </div>

          <div className="w-full p-2.5 rounded-xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest mb-1.5 opacity-40">Versiones Disponibles</p>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
              {Array.from(new Set(versions.flatMap(v => v.gameVersions)))
                .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
                .slice(0, 16)
                .map(gv => (
                  <span key={gv} className={`px-1.5 py-0.5 rounded text-[0.6rem] font-medium border ${
                    gv === "1.20.1" || gv === "1.21.1" 
                      ? "bg-primary/20 text-primary border-primary/30 font-bold" 
                      : "bg-white/5 text-white/40 border-white/5"
                  }`}>{gv}</span>
                ))
              }
              {new Set(versions.flatMap(v => v.gameVersions)).size > 16 && <span className="text-[0.6rem] text-white/20 self-center">...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-2 gap-1 border-b shrink-0 overflow-x-auto custom-scrollbar" style={{ borderColor: COLORS.border }}>
        <TabButton 
          active={activeTab === "versions"} 
          onClick={() => setActiveTab("versions")} 
          icon={<ListTree className="w-3.5 h-3.5" />}
          label="Versiones"
        />
        <TabButton 
          active={activeTab === "dependencies"} 
          onClick={() => setActiveTab("dependencies")} 
          icon={<Package className="w-3.5 h-3.5" />}
          label={`Dependencias (${allDependencies.length})`}
        />
        <TabButton 
          active={activeTab === "description"} 
          onClick={() => setActiveTab("description")} 
          icon={<FileText className="w-3.5 h-3.5" />}
          label="Descripción"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {activeTab === "description" ? (
          <div className="space-y-4">
            {loading && !mod.body ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin opacity-30" />
              </div>
            ) : (
              <div 
                className="text-sm font-body break-words"
                style={{ lineHeight: "1.7", color: COLORS.foreground }}
                onClick={handleDescriptionClick}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}
          </div>
        ) : activeTab === "dependencies" ? (
          <div className="space-y-6">
            {allDependencies.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-subhead text-sm text-white/60">No se encontraron dependencias</p>
              </div>
            ) : (
              <>
                {requiredDeps.length > 0 && (
                  <div>
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-red-400 mb-3 px-1">Requeridas</h4>
                    <div className="grid gap-2">
                      {requiredDeps.map(dep => (
                        <div key={dep.projectId} className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/10" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</p>
                            <p className="text-[0.6rem] mt-0.5" style={{ color: COLORS.muted }}>ID: {dep.projectId}</p>
                          </div>
                          <button
                            onClick={() => handleDownloadDependency(dep.projectId, dep.title || dep.projectId)}
                            disabled={!!depDownloading}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30"
                          >
                            {depDownloading === dep.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {optionalDeps.length > 0 && (
                  <div>
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-primary mb-3 px-1">Opcionales</h4>
                    <div className="grid gap-2">
                      {optionalDeps.map(dep => (
                        <div key={dep.projectId} className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/10" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</p>
                            <p className="text-[0.6rem] mt-0.5" style={{ color: COLORS.muted }}>ID: {dep.projectId}</p>
                          </div>
                          <button
                            onClick={() => handleDownloadDependency(dep.projectId, dep.title || dep.projectId)}
                            disabled={!!depDownloading}
                            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30"
                          >
                            {depDownloading === dep.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {loading && versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin opacity-30" />
                <p className="text-xs font-medium text-white/40">Buscando versiones...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-20">
                <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-subhead text-sm text-white/60">No hay versiones compatibles</p>
              </div>
            ) : (
              versions.map((v) => {
                const isCompatible = v.gameVersions.some(gv => gameVersions.includes(gv)) && (v.loaders.includes(loader) || projectType !== "mod");
                const isMainVersion = v.gameVersions.some(gv => gv === "1.20.1" || gv === "1.21.1");
                
                return (
                  <div 
                    key={v.id}
                    className={`rounded-2xl border transition-all ${!isCompatible ? "opacity-60" : ""} ${isMainVersion ? "ring-1 ring-primary/30" : ""}`}
                    style={{ 
                      background: isMainVersion ? "rgba(187,150,228,0.05)" : (expandedVersion === v.id ? "var(--color-hover)" : "var(--color-secondary-bg)"),
                      borderColor: isMainVersion ? COLORS.primary : (expandedVersion === v.id ? COLORS.borderStrong : COLORS.border)
                    }}
                  >
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-headline text-sm truncate" style={{ color: COLORS.foreground }}>{v.name || v.versionNumber}</p>
                          {isMainVersion && (
                            <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase bg-primary text-white">Main</span>
                          )}
                          {v.versionType === "release" ? (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          ) : (
                            <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 uppercase">{v.versionType}</span>
                          )}
                          {!isCompatible && (
                            <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase">Incompatible</span>
                          )}
                        </div>
                        <p className="text-[0.65rem] mt-1" style={{ color: COLORS.muted }}>
                          {new Date(v.datePublished).toLocaleDateString()} • {formatSize(v.primaryFile?.size ?? 0)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {v.gameVersions.slice(0, 6).map(gv => (
                            <span key={gv} 
                              className={`text-[0.55rem] px-1.5 py-0.5 rounded border ${
                                gv === "1.20.1" || gv === "1.21.1" 
                                  ? "bg-primary/20 text-primary border-primary/30 font-bold" 
                                  : (gameVersions.includes(gv) ? "bg-white/10 text-white/90 border-white/20" : "bg-black/10 text-white/40 border-white/5")
                              }`}
                            >
                              {gv}
                            </span>
                          ))}
                          {v.gameVersions.length > 6 && <span className="text-[0.55rem] text-white/30">+{v.gameVersions.length - 6}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDownload(mod, v); }}
                          disabled={downloading}
                          className={`p-2 rounded-xl transition-colors ${isCompatible ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-white/5 text-white/20 hover:bg-white/10"}`}
                        >
                          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                        {expandedVersion === v.id ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
                      </div>
                    </div>

                    {expandedVersion === v.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Changelog */}
                        <div>
                          <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Changelog</p>
                          <div className="text-xs leading-relaxed whitespace-pre-wrap p-3 rounded-lg border max-h-40 overflow-y-auto custom-scrollbar"
                            style={{ background: "rgba(0,0,0,0.05)", borderColor: COLORS.border, color: COLORS.foreground }}
                          >
                            {v.changelog?.trim() ? v.changelog : "El autor no ha proporcionado un historial de cambios detallado."}
                          </div>
                        </div>

                        {/* Dependencies */}
                        {v.dependencies && v.dependencies.length > 0 && (
                          <div>
                            <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Dependencias</p>
                            <div className="flex flex-col gap-1.5">
                              {v.dependencies.map((dep) => (
                                <div 
                                  key={dep.projectId}
                                  className="flex items-center justify-between px-3 py-2 rounded-xl border"
                                  style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: dep.dependencyType === "required" ? COLORS.red : COLORS.primary }} />
                                    <span className="text-xs font-medium" style={{ color: COLORS.foreground }}>{dep.title}</span>
                                  </div>
                                  <span className="text-[0.6rem] uppercase tracking-widest opacity-30 font-bold">
                                    {dep.dependencyType === "required" ? "Requerido" : "Opcional"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meta */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <p className="text-[0.6rem] font-bold uppercase" style={{ color: COLORS.muted }}>Loaders</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {v.loaders.map(l => <span key={l} className="text-[0.6rem] px-1.5 py-0.5 rounded border" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border, color: COLORS.muted }}>{l}</span>)}
                            </div>
                          </div>
                          <div>
                            <p className="text-[0.6rem] font-bold uppercase" style={{ color: COLORS.muted }}>Versiones de Juego</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {v.gameVersions.map(gv => {
                                const isActive = gameVersions.includes(gv);
                                return (
                                  <span key={gv} className={`text-[0.6rem] px-1.5 py-0.5 rounded border ${isActive ? "opacity-100 font-bold" : "opacity-40"}`}
                                    style={{ 
                                      background: isActive ? "var(--color-accent-bg)" : "var(--color-secondary-bg)", 
                                      borderColor: isActive ? "var(--color-accent-border)" : COLORS.border, 
                                      color: isActive ? COLORS.gold : COLORS.muted 
                                    }}
                                  >
                                    {gv}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (portalTarget) {
    return createPortal(content, portalTarget);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${mod.title}`}
      className="absolute inset-0 z-[60] flex flex-col backdrop-blur-xl animate-fade-in"
      style={{ background: "color-mix(in srgb, var(--color-background) 80%, transparent)" }}
    >
      {content}
    </div>
  );
});

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 shrink-0 ${active ? "border-b-2" : "opacity-40 hover:opacity-100"}`}
      style={{ 
        background: active ? "var(--color-secondary-bg)" : "transparent",
        borderColor: COLORS.primary,
        color: active ? COLORS.primary : COLORS.muted
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function EnvironmentBadge({ type, label, icon }: { type: string, label: string, icon: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    required: COLORS.emerald,
    optional: COLORS.gold,
    unsupported: COLORS.red,
    unknown: COLORS.muted
  };
  
  const bgMap: Record<string, string> = {
    required: "rgba(102,200,160,0.15)",
    optional: "rgba(255,184,0,0.1)",
    unsupported: "rgba(239,68,68,0.1)",
    unknown: "rgba(255,255,255,0.05)"
  };

  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[0.6rem] font-bold"
      style={{ background: bgMap[type] || bgMap.unknown, borderColor: (colorMap[type] || colorMap.unknown) + "33", color: colorMap[type] || colorMap.unknown }}
      title={`${label}: ${type}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
