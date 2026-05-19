import React from "react";
import { Search, ExternalLink, Trash2, ArrowRight, Download, Loader2, Package, UserCheck, Heart } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { openExternal } from "@/utils/format";

// ── Helper ──────────────────────────────────────────────────────────────────

const getGradientByName = (name: string) => {
  const gradients = ["from-pink-500 to-red-500", "from-purple-500 to-blue-500", "from-blue-500 to-teal-500", "from-emerald-500 to-cyan-500", "from-amber-500 to-red-500"];
  if (!name) return gradients[0];
  let sum = 0; for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return gradients[sum % gradients.length];
};

// ── FollowedProjectCard ─────────────────────────────────────────────────────

export function FollowedProjectCard({ mod, updateInfo, isRecent, isDownloading, onOpenVersions, onDownloadMod, onSearchProject, onUnfollow }: any) {
  return (
    <div onClick={() => onOpenVersions?.(mod)} className={`group relative rounded-2xl border p-4 flex flex-col justify-between transition-all cursor-pointer ${updateInfo ? "border-emerald-500/30 bg-emerald-500/5 shadow-lg" : "bg-foreground/5 border-foreground/10 hover:border-foreground/20 shadow-sm"}`}>
      <div className="flex gap-4 items-start min-w-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${getGradientByName(mod.title)}`}>{mod.title.charAt(0)}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-headline text-sm font-bold truncate text-white">{mod.title}</h4>
            {updateInfo && <span className="animate-pulse px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 uppercase">UPDATE!</span>}
            {isRecent && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">RECIENTE</span>}
          </div>
          <p className="text-[10px] text-white/40 truncate">por {mod.author}</p>
        </div>
      </div>
      {updateInfo && (
        <div className="mt-3.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
          <div className="min-w-0"><p className="text-[9px] uppercase tracking-wider text-emerald-400 font-black">Nueva Versión</p><p className="text-[11px] text-white font-bold truncate">v{updateInfo.latestVersion}</p></div>
          <button onClick={() => onDownloadMod?.({ ...mod, projectId: `collection:${mod.projectId}` })} disabled={isDownloading} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 transition-all">{isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}<span>Descargar</span></button>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <span className="text-[8px] tracking-widest font-bold uppercase opacity-30 text-white">{mod._source || "MODRINTH"}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onSearchProject?.(mod.title)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><Search className="w-3.5 h-3.5" /></button>
          <button onClick={() => onOpenVersions?.(mod)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><ArrowRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => openExternal(mod.url)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><ExternalLink className="w-3.5 h-3.5" /></button>
          <button onClick={() => onUnfollow(mod.projectId)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

// ── FollowedAuthorCard ───────────────────────────────────────────────────────

export function FollowedAuthorCard({ author, icons = [], onSearch, onUnfollow }: any) {
  const authorName = typeof author === "string" ? author : author?.name || "Autor Desconocido";
  const [currentIconIdx, setCurrentIconIdx] = React.useState(0);
  
  React.useEffect(() => {
    if (icons.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIconIdx(prev => (prev + 1) % icons.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [icons.length]);

  return (
    <div className="group relative rounded-2xl border border-foreground/10 bg-foreground/5 p-4 flex items-center justify-between transition-all hover:bg-foreground/10 shadow-sm">
      <div className="flex items-center gap-4 relative z-10 min-w-0 pr-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {icons.length > 0 ? (
            <img src={icons[currentIconIdx]} alt="" className="w-full h-full object-cover transition-opacity duration-500" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${getGradientByName(authorName)}`}>{authorName.charAt(0)}</div>
          )}
        </div>
        <div className="min-w-0"><p className="font-headline text-sm font-bold truncate text-white">{authorName}</p><p className="text-[10px] text-white/40">Creador de Minecraft</p></div>
      </div>
      <div className="flex items-center gap-1 relative z-10">
        <button onClick={() => onSearch(authorName)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Search className="w-4 h-4" /></button>
        <button onClick={() => openExternal(`https://modrinth.com/user/${authorName}`)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><ExternalLink className="w-4 h-4" /></button>
        <button onClick={() => onUnfollow(authorName)} className="p-2 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
