import React, { memo, useState, useCallback } from "react";
import { ChevronLeft, X, Loader2, Download, CheckCircle2, Info, FileText, ListTree, ChevronDown, ChevronUp, ExternalLink, Package } from "lucide-react";
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
  gameVersion: string;
  projectType: string;
  onClose:     () => void;
  onDownload:  (mod: ModHit, version: VersionEntry) => void;
  onDownloadDependency?: (dependency: any) => void;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersion, projectType, onClose, onDownload, onDownloadDependency,
}: FomoVersionOverlayProps) {
  const [activeTab, setActiveTab] = useState<"description" | "versions" | "dependencies">("versions");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [depDownloading, setDepDownloading] = useState<string | null>(null);

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
        `https://api.modrinth.com/v2/project/${depId}/version?game_versions=["${gameVersion}"]${loadersParam}`
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
  }, [loader, gameVersion, onDownload]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${mod.title}`}
      className="absolute inset-0 z-[60] flex flex-col backdrop-blur-xl animate-fade-in"
      style={{ background: "color-mix(in srgb, var(--color-background) 80%, transparent)" }}
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
      <div className="px-5 py-4 flex items-center gap-4 border-b" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border" style={{ background: "var(--color-hover)", borderColor: COLORS.borderStrong }}>
          {mod.iconUrl && <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-headline text-base truncate" style={{ color: COLORS.foreground }}>{mod.title}</p>
          <p className="font-caption text-xs" style={{ color: COLORS.muted }}>
            por {mod.author} • {loader} • {gameVersion}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openExternal(mod.url)}
          className="p-2.5 rounded-xl border transition-colors hover:bg-white/10"
          style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border, color: COLORS.foreground }}
        >
          <ExternalLink className="w-4.5 h-4.5 opacity-60" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-2 gap-1 border-b shrink-0" style={{ borderColor: COLORS.border }}>
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
                const isCompatible = v.gameVersions.includes(gameVersion) && (v.loaders.includes(loader) || projectType !== "mod");
                
                return (
                  <div 
                    key={v.id}
                    className={`rounded-2xl border transition-all ${!isCompatible ? "opacity-60" : ""}`}
                    style={{ 
                      background: expandedVersion === v.id ? "var(--color-hover)" : "var(--color-secondary-bg)",
                      borderColor: expandedVersion === v.id ? COLORS.borderStrong : COLORS.border
                    }}
                  >
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-headline text-sm truncate" style={{ color: COLORS.foreground }}>{v.name || v.versionNumber}</p>
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
                              {v.gameVersions.map(gv => (
                                <span key={gv} className={`text-[0.6rem] px-1.5 py-0.5 rounded border ${gv === gameVersion ? "opacity-100" : "opacity-40"}`}
                                  style={{ background: gv === gameVersion ? "var(--color-accent-bg)" : "var(--color-secondary-bg)", borderColor: gv === gameVersion ? "var(--color-accent-border)" : COLORS.border, color: gv === gameVersion ? COLORS.gold : COLORS.muted }}
                                >
                                  {gv}
                                </span>
                              ))}
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
});

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${active ? "border-b-2" : "opacity-40 hover:opacity-100"}`}
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
