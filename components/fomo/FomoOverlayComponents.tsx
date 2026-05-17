import React from "react";
import { ListTree, Download, ExternalLink, Loader2, CheckCircle2, ChevronDown, ChevronUp, Package, Workflow, Search, Heart, Layers, Sparkles, Database, Archive, LayoutGrid, Puzzle, Glasses } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { formatSize, openExternal } from "@/utils/format";

// ── TabButton ───────────────────────────────────────────────────────────────

export function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 shrink-0 ${active ? "border-b-2" : "opacity-40 hover:opacity-100"}`}
      style={{ 
        background: active ? "var(--fomo-card-bg, var(--color-secondary-bg))" : "transparent",
        borderColor: COLORS.primary,
        color: active ? COLORS.primary : "var(--fomo-text-subtle, var(--color-muted))"
      }}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] min-w-[18px] text-center ${active ? "bg-primary text-white" : "bg-white/10 text-white/50"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── DependencyCard ──────────────────────────────────────────────────────────

interface DependencyCardProps {
  dep: any;
  source?: string;
  onDownload?: (id: string, title: string) => void;
  downloading?: boolean;
  onSearch?: (q: string) => void;
  typeColor?: string;
}

export function DependencyCard({ dep, source, onDownload, downloading, onSearch, typeColor }: DependencyCardProps) {
  const depUrl = dep.url || (source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);

  const typeConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    required:     { label: "Requerida",    bg: "rgba(239,68,68,0.12)",   color: "#f87171",  border: "rgba(239,68,68,0.3)" },
    optional:     { label: "Opcional",     bg: "rgba(99,179,237,0.12)",  color: "#63b3ed",  border: "rgba(99,179,237,0.3)" },
    incompatible: { label: "Incompatible", bg: "rgba(249,115,22,0.12)",  color: "#fb923c",  border: "rgba(249,115,22,0.3)" },
    embedded:     { label: "Incluida",     bg: "rgba(52,211,153,0.12)",  color: "#34d399",  border: "rgba(52,211,153,0.3)" },
  };
  const tc = typeConfig[dep.dependencyType] ?? { label: dep.dependencyType, bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" };

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
      <div onClick={() => onSearch?.(dep.title || dep.projectId)} className={`min-w-0 flex-1 pr-2 ${onSearch ? "cursor-pointer group/dep" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-bold truncate transition-colors" style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</p>
          <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>
            {tc.label}
          </span>
        </div>
        <p className="text-[0.6rem] flex items-center gap-1.5" style={{ color: COLORS.muted }}><span>ID: {dep.projectId}</span></p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => openExternal(depUrl)} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"><ExternalLink className="w-4 h-4" /></button>
        {onDownload && dep.dependencyType !== "incompatible" && (
          <button onClick={() => onDownload(dep.projectId, dep.title || dep.projectId)} disabled={downloading} className="p-2 rounded-xl transition-colors disabled:opacity-30" style={{ background: tc.bg, color: tc.color }}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── VersionCard ─────────────────────────────────────────────────────────────

interface VersionCardProps {
  v: any;
  mod: any;
  isCompatible: boolean;
  isMainVersion: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDownload: (mod: any, v: any) => void;
  downloading: boolean;
  gameVersions: string[];
  activeLoader: string;
  selectedProjectType?: string;
}

export function VersionCard({ v, mod, isCompatible, isMainVersion, expanded, onToggle, onDownload, downloading, gameVersions, activeLoader, selectedProjectType }: VersionCardProps) {
  const modLoaders = v.loaders || [v.loader];
  
  // Robust detection for non-mod projects
  const pType = selectedProjectType || mod.projectType || "";
  const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(pType.toLowerCase());
  const isMod = !isNotMod && (!pType || pType.toLowerCase() === "mod");
  
  const isCompatibleLoader = !isMod || !activeLoader || activeLoader === "all" || activeLoader === "unknown" || modLoaders.some((l: string) => l.toLowerCase().includes(activeLoader.toLowerCase()));
  const canDownload = isCompatibleLoader;

  const [translatedChangelog, setTranslatedChangelog] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);

  const handleTranslateChangelog = async () => {
    if (!v.changelog || isTranslating) return;
    if (translatedChangelog) { setTranslatedChangelog(null); return; }
    setIsTranslating(true);
    try {
      const text = v.changelog.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/!\[([^\]]*)\]\([^)]*\)/g, "");
      const temp = document.createElement("div"); temp.innerHTML = text;
      const full = temp.innerText.trim();
      if (!full) throw new Error("Texto vacío");

      const lines = full.split(/\n/).filter(l => l.trim().length > 0);
      let interleavedHTML = "";

      for (const line of lines) {
        const cleanLine = line.trim();
        let translatedLine = "";
        try {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanLine)}&langpair=en|es`);
          if (res.ok) {
            const d = await res.json();
            translatedLine = d.responseData?.translatedText || cleanLine;
          } else {
            translatedLine = cleanLine;
          }
        } catch (e) {
          translatedLine = cleanLine;
        }

        interleavedHTML += `
          <div class="mb-2">
            <p class="text-white/40 text-xs">${cleanLine}</p>
            <p class="text-primary text-xs font-medium">🌐 ${translatedLine}</p>
          </div>
        `;
      }

      setTranslatedChangelog(interleavedHTML);
    } catch (e) {
      console.error("[Translate Changelog] Failed:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Project type badge
  const typeLabel = pType === "resourcepack" ? "TEXTURA" : pType.toUpperCase();
  const showTypeBadge = pType && pType !== "mod";

  return (
    <div className={`rounded-2xl border transition-all ${!isCompatible || !isCompatibleLoader ? "opacity-60" : ""} ${isMainVersion ? "ring-2 ring-primary/40" : ""}`} style={{ background: isMainVersion ? "rgba(var(--color-primary-rgb), 0.08)" : (expanded ? "var(--fomo-pill-inactive-bg, var(--color-hover))" : "var(--fomo-card-bg, var(--color-secondary-bg))"), borderColor: isMainVersion ? "var(--color-primary)" : (expanded ? "var(--fomo-card-hover-border, var(--color-border-strong))" : "var(--fomo-border, var(--color-border))") }}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-headline text-sm font-bold truncate text-white">{v.name || v.versionNumber}</p>
            {showTypeBadge && <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white/60 text-[8px] font-black border border-white/5 uppercase">{typeLabel}</span>}
            {isMainVersion && <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/30">Latest</span>}
            {v.versionType === "release" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/20 uppercase">{v.versionType}</span>}
            {!isCompatibleLoader && isMod && <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-tighter border border-red-500/20">Modloader Incorrecto</span>}
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40 text-[9px] font-bold">
               <Package className="w-3 h-3 text-primary" />
               <span>{v.gameVersions?.join(', ') || v.gameVersion}</span>
             </div>
             {modLoaders.length > 0 && isMod && (
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40 text-[9px] font-bold">
                  <Workflow className="w-3 h-3" />
                  <span className="uppercase">{modLoaders.join(', ')}</span>
                </div>
             )}
             <span className="text-[10px] opacity-30 font-medium">{new Date(v.datePublished).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(mod, v); }} 
            disabled={downloading || !canDownload} 
            className={`flex items-center gap-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isCompatible && canDownload ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95" : "bg-white/5 text-white/20 border border-white/5 hover:bg-white/10 opacity-50 cursor-not-allowed"}`}
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {!canDownload ? "Incompatible" : (isCompatible ? "Instalar" : "Bajar")}
          </button>
          <div className="p-1 rounded-full hover:bg-white/5 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>Changelog</p>
              {v.changelog && (
                <button 
                  onClick={handleTranslateChangelog} 
                  disabled={isTranslating} 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[0.65rem] font-bold hover:bg-white/5 transition-colors"
                >
                  {isTranslating ? "..." : (translatedChangelog ? "Original" : "Traducir")}
                </button>
              )}
            </div>
            <div className="text-xs leading-relaxed p-3 rounded-lg border max-h-40 overflow-y-auto custom-scrollbar" style={{ background: "rgba(0,0,0,0.05)", borderColor: COLORS.border, color: COLORS.foreground }}>
              {translatedChangelog ? (
                <div dangerouslySetInnerHTML={{ __html: translatedChangelog }} />
              ) : (
                v.changelog?.trim() || "Sin changelog."
              )}
            </div>
          </div>
          {v.dependencies?.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Dependencias</p>
              <div className="flex flex-col gap-1.5">
                {v.dependencies.map((dep: any) => {
                  const depTypeMap: Record<string, { label: string; color: string; bg: string }> = {
                    required:     { label: "Requerida",    color: "#f87171", bg: "rgba(239,68,68,0.12)" },
                    optional:     { label: "Opcional",     color: "#63b3ed", bg: "rgba(99,179,237,0.12)" },
                    incompatible: { label: "Incompatible", color: "#fb923c", bg: "rgba(249,115,22,0.12)" },
                    embedded:     { label: "Incluida",     color: "#34d399", bg: "rgba(52,211,153,0.12)" },
                  };
                  const dt = depTypeMap[dep.dependencyType] ?? { label: dep.dependencyType, color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" };
                  return (
                    <div key={dep.projectId} className="flex items-center justify-between px-3 py-2 rounded-xl border" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dt.color }} />
                        <span className="text-xs font-medium truncate" style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</span>
                      </div>
                      <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest" style={{ background: dt.bg, color: dt.color }}>{dt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ModHeader ───────────────────────────────────────────────────────────────

export function ModHeader({ mod, bannerUrl, onSearchAuthor, onSearchMod, followedAuthors, followedMods, toggleFollowAuthor, toggleFollowMod, selectedProjectType, onSelectProjectType }: any) {
  const [currentTheme, setCurrentTheme] = React.useState("official");
  
  React.useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const getProjectTypeIcon = (type: string, categories: string[] = []) => {
    const t = type.toLowerCase();
    const cats = categories.map(c => c.toLowerCase());
    
    if (t === "resourcepack") return <Layers className="w-3.5 h-3.5" />;
    if (t === "shader") return <Glasses className="w-3.5 h-3.5" />;
    if (t === "modpack") return <Archive className="w-3.5 h-3.5" />;
    if (t === "datapack") return <Database className="w-3.5 h-3.5" />;
    if (t === "mod") return <Puzzle className="w-3.5 h-3.5" />;
    return <LayoutGrid className="w-3.5 h-3.5" />;
  };

  const isModern = currentTheme === "modern";
  const projectType = (mod.projectType || "").toLowerCase();
  const typeLabel = projectType === "resourcepack" ? "TEXTURA" : projectType.toUpperCase();

  return (
    <div className="px-5 py-6 border-b relative overflow-hidden group/header" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
      {/* Cinematic Banner Background */}
      {bannerUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none animate-fade-in duration-1000">
          <img 
            src={bannerUrl} 
            alt="" 
            className="w-full h-full object-cover opacity-30 scale-110"
            style={{ filter: "var(--fomo-banner-filter)" }}
          />
          <div className="absolute inset-0" style={{ background: "var(--fomo-banner-overlay)" }} />
        </div>
      )}

      <div className="flex items-center gap-5 relative z-10">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-md transition-transform duration-500 group-hover/header:scale-105">
          {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Package className="w-10 h-10" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-headline text-lg truncate leading-tight text-white drop-shadow-md">{mod.title}</p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onSelectProjectType?.(projectType)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black border uppercase tracking-widest backdrop-blur-xl transition-colors ${
                  selectedProjectType === projectType 
                    ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)]" 
                    : "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                }`}
              >
                {getProjectTypeIcon(projectType, mod.categories)}
                {projectType === "resourcepack" ? "TEXTURA" : projectType.toUpperCase()}
              </button>
              {mod.categories?.map((c: string) => c.toLowerCase()).includes("datapack") && (
                <button 
                  onClick={() => onSelectProjectType?.("datapack")}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black border uppercase tracking-widest backdrop-blur-xl transition-colors ${
                    selectedProjectType === "datapack" 
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                  }`}
                >
                  <Database className="w-3 h-3" />
                  DATAPACK
                </button>
              )}
            </div>
          </div>
          
          <div className={`flex items-center gap-2 text-xs font-semibold mb-3 transition-opacity ${isModern ? "opacity-80" : "opacity-60"}`} style={{ color: "var(--fomo-text-muted)" }}>
            <span>por</span>
            <button onClick={() => onSearchAuthor(mod.author)} className={`font-extrabold hover:underline ${isModern ? "text-primary" : "text-primary"}`}>{mod.author || "Autor Desconocido"}</button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => toggleFollowAuthor(mod.author)} 
              className={`flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                followedAuthors.some((a: any) => a?.name === mod.author) 
                  ? "bg-amber-500/20 text-amber-500 border-amber-500/40" 
                  : isModern
                    ? "bg-slate-200/50 border border-slate-300 text-slate-500 hover:text-slate-700"
                    : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${followedAuthors.some((a: any) => a?.name === mod.author) ? "fill-current" : ""}`} /> {followedAuthors.some((a: any) => a?.name === mod.author) ? "Siguiendo" : "Seguir Autor"}
            </button>
            <button 
              onClick={() => onSearchMod?.(mod.title)} 
              className={`flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                isModern 
                  ? "bg-slate-200/50 border border-slate-300 text-slate-700 hover:bg-slate-200" 
                  : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              <Workflow className="w-3.5 h-3.5" /> Comparar
            </button>
            <button 
              onClick={() => toggleFollowMod(mod)} 
              className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black border transition-all ${
                followedMods.some((m: any) => m.projectId === mod.projectId) 
                  ? "bg-amber-500/20 text-amber-500 border-amber-500/40" 
                  : isModern
                    ? "bg-slate-200/50 border border-slate-300 text-slate-500 hover:text-slate-700"
                    : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
              }`}
            >
               <Heart className={`w-3.5 h-3.5 mr-1.5 ${followedMods.some((m: any) => m.projectId === mod.projectId) ? "fill-current" : ""}`} /> Favorito
            </button>
            
            {mod._source === "modrinth" && (
              <button 
                onClick={async () => {
                  const isFollowed = false; // We can't know for sure easily
                  try {
                    await fetch("/api/modrinth/collections", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "add_project",
                        collectionId: "followed-projects",
                        projectId: mod.projectId
                      })
                    });
                    // Visual feedback
                    const btn = document.getElementById(`mr-btn-${mod.projectId}`);
                    if (btn) {
                      btn.style.background = "rgba(16,185,129,0.2)";
                      btn.style.color = "#10b981";
                      btn.style.borderColor = "rgba(16,185,129,0.4)";
                      btn.innerText = "Agregado!";
                    }
                  } catch {}
                }} 
                id={`mr-btn-${mod.projectId}`}
                className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black border transition-all bg-white/5 border-white/10 text-white/40 hover:text-white/60`}
              >
                 <Database className="w-3.5 h-3.5 mr-1.5" /> Modrinth
              </button>
            )}
          </div>
        </div>
        <button onClick={() => openExternal(mod.url)} className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 group shrink-0">
          <ExternalLink className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}

// ── CompatibilitySection ───────────────────────────────────────────────────

export function CompatibilitySection({ mod, onSelectLoader, selectedLoader }: { mod: any, onSelectLoader?: (l: string) => void, selectedLoader?: string | null }) {
  // Intelligent Loader Detection (Modrinth & CurseForge fallback)
  const loaderSet = new Set<string>(mod.loaders || []);
  
  // If no loaders found (common in CurseForge hits), check categories
  if (loaderSet.size === 0 || (loaderSet.size === 1 && loaderSet.has("datapack"))) {
    const loaderKeywords = ["fabric", "forge", "neoforge", "quilt", "bukkit", "spigot", "paper"];
    mod.categories?.forEach((c: string) => {
      const cat = c.toLowerCase();
      loaderKeywords.forEach(k => {
        if (cat.includes(k)) loaderSet.add(k);
      });
    });
  }

  // Remove "datapack" from loaders as it's a project type
  loaderSet.delete("datapack");

  const platforms = Array.from(loaderSet).filter(p => ["fabric", "forge", "neoforge", "quilt", "bukkit", "spigot", "paper"].includes(p.toLowerCase()));

  const cs = mod.client_side || mod.clientSide;
  const ss = mod.server_side || mod.serverSide;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-3 border-y border-white/5 my-2">
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Etiquetas</h4>
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {(() => {
            const noise = ["fabric", "forge", "neoforge", "quilt", "datapack", "mod", "client", "server", "universal", "locale", "minecraft", "modded", "babric"];
            const filtered = mod.categories?.filter((c: string) => !noise.includes(c.toLowerCase())) || [];
            
            return (
              <>
                {filtered.slice(0, 6).map((cat: string) => (
                  <span key={cat} className="text-[9px] font-bold text-[var(--fomo-text-primary)] opacity-60 bg-white/5 px-1.5 py-0.5 rounded capitalize truncate max-w-[85px]">
                    {cat}
                  </span>
                ))}
                {filtered.length > 6 && <span className="text-[8px] opacity-30 font-black">+{filtered.length - 6}</span>}
                {filtered.length === 0 && <span className="text-[10px] opacity-20 italic">Sin etiquetas</span>}
              </>
            );
          })()}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Popularidad</h4>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[var(--fomo-text-primary)] flex items-center gap-1">
            <Download className="w-3 h-3 opacity-40 text-primary" />
            {Number(mod.downloads || 0) >= 1000000 ? (Number(mod.downloads || 0) / 1000000).toFixed(1) + "M" : (Number(mod.downloads || 0) / 1000).toFixed(1) + "K"}
          </span>
          <span className="text-[10px] font-bold text-[var(--fomo-text-primary)] opacity-60 flex items-center gap-1">
            <Heart className="w-3 h-3 opacity-40" />
            {mod.follows >= 1000 ? (mod.follows / 1000).toFixed(1) + "K" : mod.follows || 0}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Loaders</h4>
        <div className="flex flex-wrap gap-1">
          {platforms.length > 0 ? platforms.map((p: string) => {
            const isActive = selectedLoader?.toLowerCase() === p.toLowerCase();
            return (
              <button 
                key={p} 
                onClick={() => onSelectLoader?.(p)}
                className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all ${
                  isActive 
                    ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)] scale-110 z-10" 
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                }`}
              >
                {p}
              </button>
            );
          }) : (
            <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 text-[8px] font-black uppercase border border-white/5">Universal</span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Entorno</h4>
        <div className="flex gap-1 flex-wrap">
          {cs === "required" && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase border border-emerald-500/20">Cliente</span>}
          {ss === "required" && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase border border-emerald-500/20">Servidor</span>}
          {!cs && !ss && <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 text-[8px] font-black uppercase border border-white/5">Universal</span>}
        </div>
      </div>
    </div>
  );
}

export function StatsGrid({ mod }: { mod: any }) {
  return null; // Compacted into CompatibilitySection
}
