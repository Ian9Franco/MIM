import React from "react";
import { ListTree, Download, ExternalLink, Loader2, CheckCircle2, ChevronDown, ChevronUp, Package, Workflow, Search, Heart } from "lucide-react";
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
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
      <div onClick={() => onSearch?.(dep.title || dep.projectId)} className={`min-w-0 flex-1 pr-2 ${onSearch ? "cursor-pointer group/dep" : ""}`}>
        <p className={`text-sm font-bold truncate transition-colors ${onSearch && typeColor ? `group-hover/dep:text-[${typeColor}]` : ""}`} style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</p>
        <p className="text-[0.6rem] mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}><span>ID: {dep.projectId}</span></p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => openExternal(depUrl)} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"><ExternalLink className="w-4 h-4" /></button>
        {onDownload && (
          <button onClick={() => onDownload(dep.projectId, dep.title || dep.projectId)} disabled={downloading} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30">
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
}

export function VersionCard({ v, mod, isCompatible, isMainVersion, expanded, onToggle, onDownload, downloading, gameVersions, activeLoader }: VersionCardProps) {
  const modLoaders = v.loaders || [v.loader];
  
  // Robust detection for non-mod projects
  const projectType = (mod.projectType || "").toLowerCase();
  const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(projectType);
  const isMod = !isNotMod && (!projectType || projectType === "mod");
  
  const isCompatibleLoader = !isMod || !activeLoader || activeLoader === "all" || activeLoader === "unknown" || modLoaders.some((l: string) => l.toLowerCase().includes(activeLoader.toLowerCase()));
  const canDownload = isCompatibleLoader;

  // Project type badge
  const typeLabel = projectType === "resourcepack" ? "TEXTURA" : projectType.toUpperCase();
  const showTypeBadge = projectType && projectType !== "mod";

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
          <div><p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Changelog</p><div className="text-xs leading-relaxed p-3 rounded-lg border max-h-40 overflow-y-auto custom-scrollbar" style={{ background: "rgba(0,0,0,0.05)", borderColor: COLORS.border, color: COLORS.foreground }}>{v.changelog?.trim() || "Sin changelog."}</div></div>
          {v.dependencies?.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Dependencias</p>
              <div className="flex flex-col gap-1.5">
                {v.dependencies.map((dep: any) => (
                  <div key={dep.projectId} className="flex items-center justify-between px-3 py-2 rounded-xl border" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                    <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full" style={{ background: dep.dependencyType === "required" ? COLORS.red : dep.dependencyType === "incompatible" ? "#f97316" : dep.dependencyType === "embedded" ? "#34d399" : COLORS.primary }} /><span className="text-xs font-medium" style={{ color: COLORS.foreground }}>{dep.title}</span></div>
                    <span className="text-[0.6rem] uppercase tracking-widest opacity-30 font-bold">{dep.dependencyType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ModHeader ───────────────────────────────────────────────────────────────

export function ModHeader({ mod, bannerUrl, onSearchAuthor, onSearchMod, followedAuthors, followedMods, toggleFollowAuthor, toggleFollowMod }: any) {
  const [currentTheme, setCurrentTheme] = React.useState("official");
  
  React.useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isModern = currentTheme === "modern";
  const projectType = (mod.projectType || "").toLowerCase();
  const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(projectType);
  const typeLabel = projectType === "resourcepack" ? "TEXTURA" : projectType.toUpperCase();
  const showTypeBadge = projectType && projectType !== "mod";

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
          {/* Noise Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          
          {/* Dynamic theme-based gradient overlay */}
          <div className="absolute inset-0" style={{ background: "var(--fomo-banner-overlay)" }} />
        </div>
      )}

      <div className="flex items-center gap-5 relative z-10">
        <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black/40 backdrop-blur-md transition-transform duration-500 group-hover/header:scale-105">
          {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Package className="w-10 h-10" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1.5">
            <p className="font-headline text-2xl truncate leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{mod.title}</p>
            {showTypeBadge && (
              <span className="px-2 py-0.5 rounded-lg bg-[var(--fomo-text-subtle)]/10 text-[var(--fomo-text-muted)] text-[9px] font-black border border-[var(--fomo-border)] uppercase tracking-widest backdrop-blur-xl shadow-2xl">
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex-1 min-w-0">
            <h2 className="font-headline text-4xl font-black tracking-tight mb-1 leading-tight" style={{ color: "var(--fomo-text-primary)" }}>
              {mod.title || mod.name}
            </h2>
            <div className="flex items-center gap-2 text-sm font-semibold opacity-80" style={{ color: "var(--fomo-text-muted)" }}>
              <span>por</span>
              <button 
                onClick={() => onSearchAuthor(mod.author)}
                className="text-primary hover:underline font-extrabold"
              >
                {mod.author}
              </button>
            </div>
          </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => onSearchAuthor?.(mod.author)}
                  className={`flex items-center justify-center gap-1.5 h-7 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md ${
                    isModern 
                      ? "bg-[#312e81] !text-white hover:bg-[#1e1b4b] shadow-[0_4px_12px_rgba(49,46,129,0.3)]" 
                      : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                  }`}
                  title="Ver todos los proyectos de este autor"
                >
                  <Search className="w-3.5 h-3.5" />
                  Ver Catálogo
                </button>
                
                <button 
                  onClick={() => onSearchMod?.(mod.title)}
                  className={`flex items-center justify-center gap-1.5 h-7 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md ${
                    isModern 
                      ? "bg-white !text-[#1e1b4b] hover:bg-slate-100 border border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)]" 
                      : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                  }`}
                  title={`Buscar "${mod.title}" en todas las plataformas para comparar versiones`}
                >
                  <Workflow className="w-3.5 h-3.5" />
                  Comparar
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <button 
              onClick={() => toggleFollowAuthor(mod.author)} 
              className={`flex items-center justify-center h-7 px-3 rounded-full text-[10px] font-bold border transition-all ${
                followedAuthors.includes(mod.author) 
                  ? "bg-pink-500/20 text-pink-400 border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.2)]" 
                  : isModern 
                    ? "bg-white/80 border-slate-200 text-slate-600 hover:bg-white shadow-sm"
                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              <Heart className={`w-3 h-3 mr-1.5 ${followedAuthors.includes(mod.author) ? "fill-current" : ""}`} />
              Autor
            </button>

            <button 
              onClick={() => toggleFollowMod(mod)} 
              className={`flex items-center justify-center h-7 px-3 rounded-full text-[10px] font-bold border transition-all ${
                followedMods.some((m: any) => m.projectId === mod.projectId) 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                  : isModern 
                    ? "bg-white/80 border-slate-200 text-slate-600 hover:bg-white shadow-sm"
                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              <Heart className={`w-3 h-3 mr-1.5 ${followedMods.some((m: any) => m.projectId === mod.projectId) ? "fill-current" : ""}`} />
              Proyecto
            </button>
          </div>

          {mod.categories && mod.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {mod.categories.slice(0, 5).map((cat: string) => (
                <span 
                  key={cat} 
                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.15em] border transition-all ${
                    isModern 
                      ? "bg-white/20 border-white/20 !text-white shadow-sm backdrop-blur-sm" 
                      : "bg-white/5 border-white/5 text-white/30"
                  }`}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => window.open(mod.url, '_blank')} className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 group shrink-0">
          <ExternalLink className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}

// ── StatsGrid ───────────────────────────────────────────────────────────────

export function StatsGrid({ mod }: { mod: any }) {
  const cs = mod.client_side || mod.clientSide;
  const ss = mod.server_side || mod.serverSide;
  const isClient = cs === "required" || cs === "optional";
  const isServer = ss === "required" || ss === "optional";
  const projectType = (mod.projectType || "").toLowerCase();
  const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(projectType);
  const isMod = !isNotMod && (!projectType || projectType === "mod");

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 min-h-[64px] text-center">
        <span className="text-[9px] uppercase tracking-[0.2em] opacity-30 font-black">Entorno</span>
        <div className="flex items-center justify-center mt-0.5">
          {isClient && isServer ? (
            <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-black border border-emerald-500/20 uppercase tracking-tighter">Universal</div>
          ) : isClient ? (
            <div className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 text-[9px] font-black border border-sky-500/20 uppercase tracking-tighter">Client Only</div>
          ) : isServer ? (
            <div className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-black border border-amber-500/20 uppercase tracking-tighter">Server Only</div>
          ) : (
            <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-black border border-emerald-500/20 uppercase tracking-tighter">{isMod ? "Desconocido" : "Universal"}</div>
          )}
        </div>
      </div>
      
      <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 min-h-[64px] text-center">
        <span className="text-[9px] uppercase tracking-[0.2em] opacity-30 font-black">Descargas</span>
        <span className="text-sm font-headline text-white">{mod.downloads >= 1000000 ? (mod.downloads / 1000000).toFixed(1) + "M" : (mod.downloads / 1000).toFixed(1) + "K"}</span>
      </div>

      <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 min-h-[64px] text-center">
        <span className="text-[9px] uppercase tracking-[0.2em] opacity-30 font-black">Follows</span>
        <span className="text-sm font-headline text-white">{mod.follows >= 1000 ? (mod.follows / 1000).toFixed(1) + "K" : mod.follows}</span>
      </div>
    </div>
  );
}
