import React, { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Loader2, Download, CheckCircle2, Info, FileText, ListTree, ChevronDown, ChevronUp, ExternalLink, Package, Laptop, Server, Languages, Heart, Search } from "lucide-react";
import { formatSize, openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { markdownToHtml, formatCurseForgeHtml } from "@/utils/markdown";
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
  onSearchProject?: (title: string) => void;
  onSearchAuthor?: (author: string) => void;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersions, projectType, onClose, onDownload, onSearchProject, onSearchAuthor,
}: FomoVersionOverlayProps) {
  const [activeTab, setActiveTab] = useState<"description" | "versions" | "dependencies">("versions");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [depDownloading, setDepDownloading] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [depSearchQuery, setDepSearchQuery] = useState("");
  const [requiredPage, setRequiredPage] = useState(1);
  const [embeddedPage, setEmbeddedPage] = useState(1);
  const [optionalPage, setOptionalPage] = useState(1);

  useEffect(() => {
    setRequiredPage(1);
    setEmbeddedPage(1);
    setOptionalPage(1);
  }, [depSearchQuery]);

  // Reiniciar traducción al cambiar de mod
  useEffect(() => {
    setTranslatedBody(null);
    setIsTranslating(false);
  }, [mod.projectId]);

  // Extract all unique game versions from the mod versions list
  const allGameVersions = React.useMemo(() => {
    return Array.from(new Set(versions.flatMap(v => v.gameVersions || [])))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [versions]);

  // Try to find if active project version is compatible, and set as default filter. Otherwise, default to showing all (null)
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string | null>(() => {
    return gameVersions.find(gv => allGameVersions.includes(gv)) || null;
  });

  // Followed authors and projects sync logic
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [followedMods, setFollowedMods] = useState<any[]>([]);

  useEffect(() => {
    const loadFollowed = () => {
      try {
        const storedAuthors = localStorage.getItem("mim_followed_authors");
        if (storedAuthors) setFollowedAuthors(JSON.parse(storedAuthors));
        const storedMods = localStorage.getItem("mim_followed_mods");
        if (storedMods) setFollowedMods(JSON.parse(storedMods));
      } catch (e) {
        console.error("Error loading followed authors/mods:", e);
      }
    };

    loadFollowed();

    window.addEventListener("mim-followed-authors-changed", loadFollowed);
    window.addEventListener("mim-followed-mods-changed", loadFollowed);
    return () => {
      window.removeEventListener("mim-followed-authors-changed", loadFollowed);
      window.removeEventListener("mim-followed-mods-changed", loadFollowed);
    };
  }, []);

  const toggleFollowAuthor = useCallback((author: string) => {
    let current: string[] = [];
    try {
      const stored = localStorage.getItem("mim_followed_authors");
      if (stored) current = JSON.parse(stored);
    } catch {}

    const next = current.includes(author)
      ? current.filter((a) => a !== author)
      : [...current, author];

    setFollowedAuthors(next);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mim_followed_authors", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
      } catch (e) {
        console.error("Error updating followed authors storage/events:", e);
      }
    }
  }, []);

  const isFollowingAuthor = useCallback((author: string) => {
    return followedAuthors.includes(author);
  }, [followedAuthors]);

  const toggleFollowMod = useCallback((m: ModHit) => {
    let current: any[] = [];
    try {
      const stored = localStorage.getItem("mim_followed_mods");
      if (stored) current = JSON.parse(stored);
    } catch {}

    const exists = current.some((x) => x.projectId === m.projectId);
    const next = exists
      ? current.filter((x) => x.projectId !== m.projectId)
      : [...current, m];

    setFollowedMods(next);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mim_followed_mods", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
      } catch (e) {
        console.error("Error updating followed mods storage/events:", e);
      }
    }
  }, []);

  const isFollowingMod = useCallback((projectId: string) => {
    return followedMods.some((x) => x.projectId === projectId);
  }, [followedMods]);

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

      const primaryFileRaw = depVersions[0].files.find((f: { primary?: boolean }) => f.primary) || depVersions[0].files[0];

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
      console.error(`Error downloading dependency ${depTitle}:`, err);
      alert(err instanceof Error ? err.message : `Error al descargar la dependencia ${depTitle}`);
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
  const incompatibleDeps = allDependencies.filter(d => d.dependencyType === "incompatible");
  const embeddedDeps = allDependencies.filter(d => d.dependencyType === "embedded");

  // Filter dependencies by search query
  const filteredRequiredDeps = requiredDeps.filter(d => 
    (d.title || d.projectId).toLowerCase().includes(depSearchQuery.toLowerCase()) || 
    d.projectId.toLowerCase().includes(depSearchQuery.toLowerCase())
  );
  
  const filteredOptionalDeps = optionalDeps.filter(d => 
    (d.title || d.projectId).toLowerCase().includes(depSearchQuery.toLowerCase()) || 
    d.projectId.toLowerCase().includes(depSearchQuery.toLowerCase())
  );
  
  const filteredEmbeddedDeps = embeddedDeps.filter(d => 
    (d.title || d.projectId).toLowerCase().includes(depSearchQuery.toLowerCase()) || 
    d.projectId.toLowerCase().includes(depSearchQuery.toLowerCase())
  );

  const ITEMS_PER_PAGE = 20;

  // Calculate total pages for each category
  const totalRequiredPages = Math.ceil(filteredRequiredDeps.length / ITEMS_PER_PAGE);
  const totalOptionalPages = Math.ceil(filteredOptionalDeps.length / ITEMS_PER_PAGE);
  const totalEmbeddedPages = Math.ceil(filteredEmbeddedDeps.length / ITEMS_PER_PAGE);

  // Slice arrays to display only the current page's elements
  const displayedRequiredDeps = filteredRequiredDeps.slice(
    (requiredPage - 1) * ITEMS_PER_PAGE,
    requiredPage * ITEMS_PER_PAGE
  );
  
  const displayedOptionalDeps = filteredOptionalDeps.slice(
    (optionalPage - 1) * ITEMS_PER_PAGE,
    optionalPage * ITEMS_PER_PAGE
  );
  
  const displayedEmbeddedDeps = filteredEmbeddedDeps.slice(
    (embeddedPage - 1) * ITEMS_PER_PAGE,
    embeddedPage * ITEMS_PER_PAGE
  );

  const handleTranslate = async () => {
    if (!mod.body || isTranslating) return;
    
    if (translatedBody) {
      setTranslatedBody(null);
      return;
    }

    setIsTranslating(true);
    try {
      // 1. Limpiar HTML/Markdown y extraer texto útil
      let text = mod.body;

      // Convertir enlaces markdown [Texto](URL) a solo "Texto" para no enviarle links a la API
      text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
      // Eliminar imágenes markdown ![Alt](URL)
      text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "");

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = text;
      
      // Reemplazar enlaces HTML <a> con su texto interno para no perder palabras críticas de la oración
      tempDiv.querySelectorAll("a").forEach(el => {
        const txt = el.textContent || "";
        el.replaceWith(txt);
      });

      // Eliminar imágenes HTML, scripts, estilos, código que no aportan a la traducción
      tempDiv.querySelectorAll("img, script, style, code").forEach(el => el.remove());
      
      const fullText = tempDiv.innerText.trim();
      if (!fullText) throw new Error("No hay texto para traducir");

      // 2. Dividir en tandas de 450 caracteres (seguridad ante el límite de 500 de MyMemory)
      const chunks = fullText.match(/.{1,450}(\s|$)/g) || [fullText];
      const translatedChunks: string[] = [];

      // Aumentamos a un máximo de 15 tandas para leer descripciones largas completas
      const maxChunks = chunks.slice(0, 15);

      for (let i = 0; i < maxChunks.length; i++) {
        const chunk = maxChunks[i];
        
        // Agregar un pequeño delay de 300ms a partir de la segunda tanda para que MyMemory API no nos rechace/haga throttle
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        try {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.trim())}&langpair=en|es`);
          if (res.ok) {
            const data = await res.json();
            if (data.responseData?.translatedText) {
              translatedChunks.push(data.responseData.translatedText);
            } else {
              // Fallback si la API devuelve respuesta vacía: dejamos el texto original para no perderlo
              translatedChunks.push(chunk);
            }
          } else {
            // Fallback si la petición falla: dejamos el texto original
            translatedChunks.push(chunk);
          }
        } catch (fetchErr) {
          console.error("Error fetching translation chunk:", fetchErr);
          translatedChunks.push(chunk);
        }
      }

      setTranslatedBody(translatedChunks.join(" "));
    } catch (err) {
      console.error("Error translating:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const rawDescriptionHtml = mod.body?.trim()
    ? (mod._source === "curseforge" ? formatCurseForgeHtml(mod.body) : markdownToHtml(mod.body))
    : mod.description?.trim()
    ? (mod._source === "curseforge" ? formatCurseForgeHtml(mod.description) : markdownToHtml(mod.description))
    : "El autor no ha proporcionado una descripción detallada.";

  const descriptionHtml = translatedBody 
    ? `<div class="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-4 animate-in fade-in slide-in-from-top-2">
         <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
           🌐 Traducción Automática (Beta)
         </p>
         <p class="italic opacity-90">${translatedBody}</p>
       </div>
       <div class="opacity-40 pointer-events-none grayscale scale-95 origin-top transition-all">${rawDescriptionHtml}</div>`
    : rawDescriptionHtml;

  const sortedMembers = React.useMemo(() => {
    if (!mod.members || mod.members.length === 0) return [];
    
    return [...mod.members].sort((a, b) => {
      const roleA = (a.role || "").toLowerCase();
      const roleB = (b.role || "").toLowerCase();
      
      const isOrgA = roleA === "organization";
      const isOrgB = roleB === "organization";
      
      const isLeadA = roleA === "project lead" || roleA === "owner" || roleA === "maintainer" || roleA === "creator";
      const isLeadB = roleB === "project lead" || roleB === "owner" || roleB === "maintainer" || roleB === "creator";
      
      if (isOrgA && !isOrgB) return -1;
      if (!isOrgA && isOrgB) return 1;
      if (isLeadA && !isLeadB) return -1;
      if (!isLeadA && isLeadB) return 1;
      return 0;
    });
  }, [mod.members]);

  const displayedAuthor = React.useMemo(() => {
    if (mod.members && mod.members.length > 0) {
      const org = mod.members.find(m => (m.role || "").toLowerCase() === "organization");
      if (org) return org.name || org.username;
    }
    return mod.author;
  }, [mod.members, mod.author]);

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
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--fomo-border, var(--color-border))" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-white/10" style={{ color: "var(--fomo-text-primary, var(--color-foreground))" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-headline text-lg" style={{ color: "var(--fomo-text-primary, var(--color-foreground))" }}>Detalles del Proyecto</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ color: "var(--fomo-text-primary, var(--color-foreground))" }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mod summary */}
      <div className="px-5 py-5 flex flex-col gap-5 border-b" style={{ background: "var(--fomo-secondary-bg, var(--color-secondary-bg))", borderColor: "var(--fomo-border, var(--color-border))" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border shadow-sm" style={{ background: "var(--fomo-card-bg, var(--color-hover))", borderColor: "var(--fomo-card-border, var(--color-border-strong))" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {mod.iconUrl && <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <p className="font-headline text-lg truncate" style={{ color: "var(--fomo-text-primary, var(--color-foreground))" }}>{mod.title}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-caption text-xs" style={{ color: "var(--fomo-text-subtle, var(--color-muted))" }}>
                por <span className="text-primary/80 font-bold">{displayedAuthor}</span>
              </p>
              
              {/* Follow and Profile Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleFollowAuthor(displayedAuthor)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 hover:scale-105 active:scale-95 ${
                    isFollowingAuthor(displayedAuthor)
                      ? "bg-pink-500/15 text-pink-400 border-pink-500/30 font-bold shadow-sm"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                  }`}
                  title={isFollowingAuthor(displayedAuthor) ? "Dejar de seguir creador" : "Seguir creador"}
                >
                  <Heart className={`w-2.5 h-2.5 ${isFollowingAuthor(displayedAuthor) ? "fill-pink-400 text-pink-400" : ""}`} />
                  {isFollowingAuthor(displayedAuthor) ? "Siguiendo Creador" : "Seguir Creador"}
                </button>

                <button
                  type="button"
                  onClick={() => onSearchAuthor?.(displayedAuthor)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all flex items-center gap-1 hover:scale-105 active:scale-95 shadow-sm"
                  title={`Buscar más proyectos creados por ${displayedAuthor}`}
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>Proyectos del Autor</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFollowMod(mod)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 hover:scale-105 active:scale-95 ${
                    isFollowingMod(mod.projectId)
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold shadow-sm"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                  }`}
                  title={isFollowingMod(mod.projectId) ? "Dejar de seguir mod" : "Seguir mod"}
                >
                  <Heart className={`w-2.5 h-2.5 ${isFollowingMod(mod.projectId) ? "fill-rose-400 text-rose-400" : ""}`} />
                  {isFollowingMod(mod.projectId) ? "Mod Seguido" : "Seguir Mod"}
                </button>

                <button
                  type="button"
                  onClick={() => openExternal(mod._source === "curseforge" ? `https://www.curseforge.com/members/${displayedAuthor}/projects` : `https://modrinth.com/user/${displayedAuthor}`)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 text-white/70 hover:text-white flex items-center gap-1"
                >
                  <span>Perfil</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openExternal(mod.url)}
            className="p-3 rounded-xl border transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
            style={{ background: "var(--fomo-card-bg, var(--color-secondary-bg))", borderColor: "var(--fomo-border, var(--color-border))", color: "var(--fomo-text-primary, var(--color-foreground))" }}
          >
            <ExternalLink className="w-5 h-5 opacity-60" />
          </button>
        </div>

        {/* New: Quick Metadata Grid */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-35 p-2.5 rounded-xl border flex flex-col gap-1.5" style={{ background: "var(--fomo-input-bg, rgba(255,255,255,0.03))", borderColor: "var(--fomo-input-border, rgba(255,255,255,0.05))" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest opacity-40" style={{ color: "var(--fomo-text-subtle, var(--color-foreground))" }}>Soporte de Entorno</p>
            {(() => {
              let clientSide = mod.client_side;
              let serverSide = mod.server_side;

              if (mod._source === "curseforge" && versions && versions.length > 0) {
                // Analizamos los archivos disponibles en CurseForge para identificar el entorno.
                // CurseForge etiqueta los entornos agregando "Client" o "Server" al array gameVersions de los archivos.
                const hasClientTag = versions.some(v => v.gameVersions?.includes("Client"));
                const hasServerTag = versions.some(v => v.gameVersions?.includes("Server"));
                
                if (hasClientTag && hasServerTag) {
                  clientSide = "required";
                  serverSide = "required";
                } else if (hasClientTag) {
                  clientSide = "required";
                  serverSide = "unsupported";
                } else if (hasServerTag) {
                  clientSide = "unsupported";
                  serverSide = "required";
                } else {
                  // Por defecto, si no se especifica ninguna restricción de entorno, el mod es universal (ambos)
                  clientSide = "required";
                  serverSide = "required";
                }
              }

              const env = getEnvironmentDetails(clientSide, serverSide);
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: env.color }} />
                    <span className="text-xs font-bold" style={{ color: env.color }}>{env.text}</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-relaxed mt-0.5" style={{ color: "var(--fomo-text-subtle, var(--color-muted))" }}>{env.desc}</p>
                </div>
              );
            })()}
          </div>

          <div className="flex-1 min-w-27.5 p-2.5 rounded-xl border" style={{ background: "var(--fomo-input-bg, rgba(255,255,255,0.03))", borderColor: "var(--fomo-input-border, rgba(255,255,255,0.05))" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest mb-1.5 opacity-40" style={{ color: "var(--fomo-text-subtle, var(--color-foreground))" }}>Plataformas</p>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(versions.flatMap(v => v.loaders))).map(l => (
                <span key={l} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[0.65rem] font-bold border border-primary/20 uppercase">{l}</span>
              ))}
            </div>
          </div>

          <div className="w-full p-2.5 rounded-xl border" style={{ background: "var(--fomo-input-bg, rgba(255,255,255,0.03))", borderColor: "var(--fomo-input-border, rgba(255,255,255,0.05))" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest mb-1.5 opacity-40" style={{ color: "var(--fomo-text-subtle, var(--color-foreground))" }}>Versiones Disponibles (Filtrar abajo)</p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1" role="group" aria-label="Filtro de versiones de Minecraft">
              {/* "Todas" Reset Button */}
              <button
                type="button"
                onClick={() => setSelectedVersionFilter(null)}
                className={`px-2 py-0.5 rounded text-[0.6rem] font-bold border transition-all hover:scale-105 active:scale-95 ${
                  selectedVersionFilter === null
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white/5 text-foreground/40 border-black/10 hover:bg-black/5 dark:bg-white/5 dark:text-white/40 dark:border-white/5 dark:hover:bg-white/10"
                }`}
              >
                Todas
              </button>

              {allGameVersions.slice(0, 24).map(gv => {
                const isSelected = selectedVersionFilter === gv;
                const isProjectVersion = gameVersions.includes(gv);
                
                return (
                  <button
                    key={gv}
                    type="button"
                    onClick={() => setSelectedVersionFilter(isSelected ? null : gv)}
                    className={`px-1.5 py-0.5 rounded text-[0.6rem] font-semibold border transition-all hover:scale-105 active:scale-95 ${
                      isSelected
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-sm shadow-orange-500/10 font-bold"
                        : isProjectVersion
                        ? "bg-primary/20 text-primary border-primary/30 font-medium hover:bg-primary/30"
                        : "bg-white/5 text-foreground/40 border-black/10 hover:bg-black/5 dark:bg-white/5 dark:text-white/40 dark:border-white/5 dark:hover:bg-white/10"
                    }`}
                    title={isSelected ? `Filtrando por ${gv} (haz clic para limpiar)` : `Filtrar versiones por ${gv}`}
                  >
                    {gv}
                  </button>
                );
              })}
              {allGameVersions.length > 24 && <span className="text-[0.6rem] text-white/20 self-center px-1">...</span>}
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
          label={projectType === "modpack" ? `Mods Incluidos (${allDependencies.length})` : `Dependencias (${allDependencies.length})`}
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
            {/* Creators / Team Members Section */}
            {mod.members && mod.members.length > 0 && (
              <div className="p-4 rounded-2xl border" style={{ background: "var(--fomo-secondary-bg, rgba(255,255,255,0.02))", borderColor: "var(--fomo-border, rgba(255,255,255,0.05))" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60" style={{ color: "var(--fomo-text-primary)" }}>Creadores del Proyecto</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sortedMembers.map((member: any) => {
                    const isOrg = (member.role || "").toLowerCase() === "organization";
                    const isFollowing = isFollowingAuthor(member.username);
                    
                    return (
                      <div 
                        key={member.id} 
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isOrg 
                            ? "bg-pink-500/10 border-pink-500/20" 
                            : "bg-white/2 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {member.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={member.avatarUrl} 
                              alt="" 
                              className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" 
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold uppercase shrink-0 bg-gradient-to-br ${
                              isOrg ? "from-pink-500 to-rose-600" : "from-gray-700 to-slate-800"
                            }`}>
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: "var(--fomo-text-primary)" }}>
                              {member.name}
                            </p>
                            <p className="text-[9px] opacity-60 mt-0.5 flex items-center gap-1 text-white/50">
                              {isOrg && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />}
                              {member.role || "Miembro"}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {onSearchProject && (
                            <button
                              type="button"
                              onClick={() => onSearchProject(`author:${member.username}`)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all"
                              title={`Buscar mods de ${member.name}`}
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFollowAuthor(member.username)}
                            className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${
                              isFollowing 
                                ? "text-pink-400" 
                                : "text-white/30 hover:text-white"
                            }`}
                            title={isFollowing ? `Dejar de seguir a ${member.name}` : `Seguir a ${member.name}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFollowing ? "fill-pink-400" : ""}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openExternal(mod._source === "curseforge" ? `https://www.curseforge.com/members/${member.username}/projects` : `https://modrinth.com/user/${member.username}`)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"
                            title={`Ver perfil de ${member.name}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && mod.body && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold transition-all hover:bg-white/5 disabled:opacity-50"
                style={{ borderColor: COLORS.border, color: COLORS.muted }}
              >
                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                {translatedBody ? "Ver Original" : "Traducir a Español"}
              </button>
            )}
            {loading && !mod.body ? (
              <div className="space-y-4 animate-fade-in">
                <div className="h-4 w-3/4 bg-white/5 rounded-full animate-pulse" />
                <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
                <div className="h-3 w-5/6 bg-white/5 rounded-full animate-pulse" />
                <div className="h-4 w-1/2 bg-white/5 rounded-full animate-pulse pt-4" />
                <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
                <div className="h-3 w-2/3 bg-white/5 rounded-full animate-pulse" />
              </div>
            ) : (
              <div 
                className="text-sm font-body wrap-break-word prose prose-invert prose-sm max-w-none"
                style={{ 
                  lineHeight: "1.7", 
                  color: COLORS.foreground,
                  wordBreak: "break-word"
                }}
                onClick={handleDescriptionClick}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}
          </div>
        ) : activeTab === "dependencies" ? (
          <div className="space-y-6">
            {allDependencies.length > 0 && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-black/20 border border-white/5 focus-within:border-primary/50 transition-all min-h-[46px]">
                <Search className="w-5 h-5 text-white/40 shrink-0" />
                <input
                  type="text"
                  value={depSearchQuery}
                  onChange={(e) => setDepSearchQuery(e.target.value)}
                  placeholder="Buscar dependencias o mods incluidos..."
                  className="flex-1 bg-transparent border-none outline-none! focus:outline-none! focus-visible:outline-none! ring-0! text-xs font-medium text-white placeholder:text-white/30"
                  style={{ outline: "none", boxShadow: "none" }}
                />
                {depSearchQuery && (
                  <button 
                    onClick={() => setDepSearchQuery("")} 
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {filteredRequiredDeps.length === 0 && filteredEmbeddedDeps.length === 0 && filteredOptionalDeps.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-subhead text-sm text-white/60">
                  {depSearchQuery ? "No se encontraron coincidencias" : "No se encontraron dependencias"}
                </p>
              </div>
            ) : (
              <>
                {displayedRequiredDeps.length > 0 && (
                  <div>
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-red-400 mb-3 px-1 flex items-center justify-between">
                      <span>Requeridas ({filteredRequiredDeps.length})</span>
                    </h4>
                    <div className="grid gap-2">
                      {displayedRequiredDeps.map(dep => {
                        const depUrl = dep.url || (mod._source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);
                        return (
                          <div key={dep.projectId} className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                            <div 
                              onClick={() => onSearchProject?.(dep.title || dep.projectId)}
                              className={`min-w-0 flex-1 pr-2 ${onSearchProject ? "cursor-pointer group/dep" : ""}`}
                            >
                              <p className={`text-sm font-bold truncate transition-colors ${onSearchProject ? "group-hover/dep:text-red-400" : ""}`} style={{ color: COLORS.foreground }}>
                                {dep.title || dep.projectId}
                              </p>
                              <p className="text-[0.6rem] mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                                <span>ID: {dep.projectId}</span>
                                {onSearchProject && (
                                  <span className="opacity-0 group-hover/dep:opacity-100 transition-opacity text-[0.55rem] font-bold text-red-400 flex items-center gap-0.5">
                                    • <Info className="w-2.5 h-2.5 inline" /> Buscar en Catálogo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openExternal(depUrl)}
                                className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Ver en web"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDependency(dep.projectId, dep.title || dep.projectId)}
                                disabled={!!depDownloading}
                                className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30"
                                title="Descargar versión compatible"
                              >
                                {depDownloading === dep.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalRequiredPages > 1 && (
                      <div className="flex items-center justify-between mt-3 p-2 rounded-xl bg-white/3 border border-white/5">
                        <button
                          type="button"
                          disabled={requiredPage === 1}
                          onClick={() => setRequiredPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1 text-white"
                        >
                          <ChevronLeft className="w-3 h-3" /> Anterior
                        </button>
                        <span className="text-[10px] text-white/40">
                          Pág. {requiredPage} de {totalRequiredPages}
                        </span>
                        <button
                          type="button"
                          disabled={requiredPage === totalRequiredPages}
                          onClick={() => setRequiredPage(p => Math.min(totalRequiredPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1 text-white"
                        >
                          Siguiente <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {displayedEmbeddedDeps.length > 0 && (
                  <div>
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400 mb-3 px-1 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ListTree className="w-3.5 h-3.5" />
                        Incluidos en el Modpack ({filteredEmbeddedDeps.length})
                      </span>
                    </h4>
                    <div className="grid gap-2">
                      {displayedEmbeddedDeps.map(dep => {
                        const depUrl = dep.url || (mod._source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);
                        return (
                          <div key={dep.projectId} className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                            <div 
                              onClick={() => onSearchProject?.(dep.title || dep.projectId)}
                              className={`min-w-0 flex-1 pr-2 ${onSearchProject ? "cursor-pointer group/dep" : ""}`}
                            >
                              <p className={`text-sm font-bold truncate transition-colors ${onSearchProject ? "group-hover/dep:text-emerald-400" : ""}`} style={{ color: COLORS.foreground }}>
                                {dep.title || dep.projectId}
                              </p>
                              <p className="text-[0.6rem] mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                                <span>ID: {dep.projectId}</span>
                                {onSearchProject && (
                                  <span className="opacity-0 group-hover/dep:opacity-100 transition-opacity text-[0.55rem] font-bold text-emerald-400 flex items-center gap-0.5">
                                    • <Info className="w-2.5 h-2.5 inline" /> Buscar en Catálogo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openExternal(depUrl)}
                                className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Ver en web"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDependency(dep.projectId, dep.title || dep.projectId)}
                                disabled={!!depDownloading}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-30"
                                title="Descargar versión compatible"
                              >
                                {depDownloading === dep.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalEmbeddedPages > 1 && (
                      <div className="flex items-center justify-between mt-3 p-2 rounded-xl bg-white/3 border border-white/5">
                        <button
                          type="button"
                          disabled={embeddedPage === 1}
                          onClick={() => setEmbeddedPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1 text-white"
                        >
                          <ChevronLeft className="w-3 h-3" /> Anterior
                        </button>
                        <span className="text-[10px] text-white/40">
                          Pág. {embeddedPage} de {totalEmbeddedPages}
                        </span>
                        <button
                          type="button"
                          disabled={embeddedPage === totalEmbeddedPages}
                          onClick={() => setEmbeddedPage(p => Math.min(totalEmbeddedPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1 text-white"
                        >
                          Siguiente <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {displayedOptionalDeps.length > 0 && (
                  <div>
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-primary mb-3 px-1 flex items-center justify-between">
                      <span>Opcionales ({filteredOptionalDeps.length})</span>
                    </h4>
                    <div className="grid gap-2">
                      {displayedOptionalDeps.map(dep => {
                        const depUrl = dep.url || (mod._source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);
                        return (
                          <div key={dep.projectId} className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                            <div 
                              onClick={() => onSearchProject?.(dep.title || dep.projectId)}
                              className={`min-w-0 flex-1 pr-2 ${onSearchProject ? "cursor-pointer group/dep" : ""}`}
                            >
                              <p className={`text-sm font-bold truncate transition-colors ${onSearchProject ? "group-hover/dep:text-primary" : ""}`} style={{ color: COLORS.foreground }}>
                                {dep.title || dep.projectId}
                              </p>
                              <p className="text-[0.6rem] mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                                <span>ID: {dep.projectId}</span>
                                {onSearchProject && (
                                  <span className="opacity-0 group-hover/dep:opacity-100 transition-opacity text-[0.55rem] font-bold text-primary flex items-center gap-0.5">
                                    • <Info className="w-2.5 h-2.5 inline" /> Buscar en Catálogo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openExternal(depUrl)}
                                className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Ver en web"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDependency(dep.projectId, dep.title || dep.projectId)}
                                disabled={!!depDownloading}
                                className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30"
                                title="Descargar versión compatible"
                              >
                                {depDownloading === dep.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalOptionalPages > 1 && (
                      <div className="flex items-center justify-between mt-3 p-2 rounded-xl bg-white/3 border border-white/5">
                        <button
                          type="button"
                          disabled={optionalPage === 1}
                          onClick={() => setOptionalPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1 text-white"
                        >
                          <ChevronLeft className="w-3 h-3" /> Anterior
                        </button>
                        <span className="text-[10px] text-white/40">
                          Pág. {optionalPage} de {totalOptionalPages}
                        </span>
                        <button
                          type="button"
                          disabled={optionalPage === totalOptionalPages}
                          onClick={() => setOptionalPage(p => Math.min(totalOptionalPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-1 text-white"
                        >
                          Siguiente <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {incompatibleDeps.length > 0 && (
                  <div>
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-orange-500 mb-3 px-1 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5" />
                      Incompatible con:
                    </h4>
                    <div className="grid gap-2">
                      {incompatibleDeps.map(dep => {
                        const depUrl = dep.url || (mod._source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);
                        return (
                          <div key={dep.projectId} className="flex items-center justify-between p-3 rounded-2xl border bg-orange-500/5 transition-colors hover:bg-white/5" style={{ borderColor: "rgba(249,115,22,0.2)" }}>
                            <div 
                              onClick={() => onSearchProject?.(dep.title || dep.projectId)}
                              className={`min-w-0 flex-1 pr-2 ${onSearchProject ? "cursor-pointer group/dep" : ""}`}
                            >
                              <p className={`text-sm font-bold truncate transition-colors ${onSearchProject ? "group-hover/dep:text-orange-400" : ""}`} style={{ color: COLORS.foreground }}>
                                {dep.title || dep.projectId}
                              </p>
                              <p className="text-[0.6rem] mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                                <span>ID: {dep.projectId}</span>
                                {onSearchProject && (
                                  <span className="opacity-0 group-hover/dep:opacity-100 transition-opacity text-[0.55rem] font-bold text-orange-400 flex items-center gap-0.5">
                                    • <Info className="w-2.5 h-2.5 inline" /> Buscar en Catálogo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openExternal(depUrl)}
                                className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Ver en web"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                <X className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
            ) : (() => {
              const filteredVersions = selectedVersionFilter
                ? versions.filter(v => v.gameVersions.includes(selectedVersionFilter))
                : versions;

              if (filteredVersions.length === 0) {
                return (
                  <div className="text-center py-20">
                    <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-subhead text-sm text-white/60">No hay archivos compatibles con la versión {selectedVersionFilter}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedVersionFilter(null)}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-primary/20 text-primary border border-primary/30 transition-all hover:bg-primary/30"
                    >
                      Mostrar todas las versiones
                    </button>
                  </div>
                );
              }

              return filteredVersions.map((v) => {
                const isCompatible = v.gameVersions.some(gv => gameVersions.includes(gv)) && (v.loaders.includes(loader) || projectType !== "mod");
                const isMainVersion = v.gameVersions.some(gv => gv === "1.20.1" || gv === "1.21.1");
                
                return (
                  <div 
                    key={v.id}
                    className={`rounded-2xl border transition-all ${!isCompatible ? "opacity-60" : ""} ${isMainVersion ? "ring-1 ring-primary/30" : ""}`}
                    style={{ 
                      background: isMainVersion ? "var(--fomo-secondary-bg, rgba(187,150,228,0.05))" : (expandedVersion === v.id ? "var(--fomo-pill-inactive-bg, var(--color-hover))" : "var(--fomo-card-bg, var(--color-secondary-bg))"),
                      borderColor: isMainVersion ? "var(--color-primary)" : (expandedVersion === v.id ? "var(--fomo-card-hover-border, var(--color-border-strong))" : "var(--fomo-border, var(--color-border))")
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
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ 
                                      background: dep.dependencyType === "required" ? COLORS.red : 
                                                 dep.dependencyType === "incompatible" ? "#f97316" : 
                                                 dep.dependencyType === "embedded" ? "#34d399" : COLORS.primary 
                                    }} />
                                    <span className="text-xs font-medium" style={{ color: COLORS.foreground }}>{dep.title}</span>
                                  </div>
                                  <span className="text-[0.6rem] uppercase tracking-widest opacity-30 font-bold">
                                    {dep.dependencyType === "required" ? "Requerido" : 
                                     dep.dependencyType === "incompatible" ? "Incompatible" : 
                                     dep.dependencyType === "embedded" ? "Incluido" : "Opcional"}
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
              });
            })()}
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
      className="absolute inset-0 z-60 flex flex-col backdrop-blur-xl animate-fade-in"
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
        background: active ? "var(--fomo-card-bg, var(--color-secondary-bg))" : "transparent",
        borderColor: COLORS.primary,
        color: active ? COLORS.primary : "var(--fomo-text-subtle, var(--color-muted))"
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function EnvironmentBadge({ type, label, icon }: { type: string, label: string, icon: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    required: "#10b981",
    optional: "#d97706",
    unsupported: "#ef4444",
    unknown: "var(--fomo-text-subtle, var(--color-muted))"
  };
  
  const bgMap: Record<string, string> = {
    required: "rgba(16,185,129,0.15)",
    optional: "rgba(245,158,11,0.15)",
    unsupported: "rgba(239,68,68,0.15)",
    unknown: "var(--fomo-pill-inactive-bg, rgba(255,255,255,0.05))"
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

// ── Helper: Detailed Environment Explanations ────────────────────────────────
function getEnvironmentDetails(clientSide?: string, serverSide?: string) {
  const c = clientSide || "unknown";
  const s = serverSide || "unknown";

  if (c === "required" && s === "unsupported") {
    return {
      text: "Sólo Cliente (Obligatorio)",
      desc: "Debe estar instalado exclusivamente en tu juego local. No lo agregues al servidor.",
      color: "#10b981",
    };
  }
  if (c === "optional" && s === "unsupported") {
    return {
      text: "Sólo Cliente (Opcional)",
      desc: "Mod cosmético o utilitario. Es opcional y no se requiere en el servidor.",
      color: "#34d399",
    };
  }
  if (c === "unsupported" && s === "required") {
    return {
      text: "Sólo Servidor (Obligatorio)",
      desc: "Se ejecuta únicamente en el servidor. Los clientes no necesitan tenerlo instalado.",
      color: "#ef4444",
    };
  }
  if (c === "unsupported" && s === "optional") {
    return {
      text: "Sólo Servidor (Opcional)",
      desc: "Optimización o herramienta del servidor opcional. No la instales en tu juego local.",
      color: "#f87171",
    };
  }
  if (c === "required" && s === "required") {
    return {
      text: "Cliente y Servidor (Obligatorio)",
      desc: "Debe estar instalado obligatoriamente tanto en el juego local como en el servidor.",
      color: "#3b82f6",
    };
  }
  if (c === "optional" && s === "optional") {
    return {
      text: "Cliente y Servidor (Opcional)",
      desc: "Añade ventajas si está en ambos lados, pero no es estrictamente requerido en ninguno.",
      color: "#6366f1",
    };
  }
  if (c === "required" && s === "optional") {
    return {
      text: "Cliente Obligatorio • Servidor Opcional",
      desc: "Es fundamental tenerlo en el juego local. En el servidor es opcional.",
      color: "#a855f7",
    };
  }
  if (c === "optional" && s === "required") {
    return {
      text: "Servidor Obligatorio • Cliente Opcional",
      desc: "El servidor lo exige obligatoriamente. Para el juego local es opcional.",
      color: "#ec4899",
    };
  }

  return {
    text: `Cliente: ${c.toUpperCase()} • Servidor: ${s.toUpperCase()}`,
    desc: "Revisar las especificaciones y manual de instalación oficial del creador.",
    color: "var(--fomo-text-muted, var(--color-muted))",
  };
}
