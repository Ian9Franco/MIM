import React from "react";
import { Search, ExternalLink, Trash2, ArrowRight, Download, Loader2, Globe } from "lucide-react";
import { openExternal } from "@/utils/format";
import { FomoModBannerStrip } from "@/components/fomo/discover/FomoModBannerStrip";
import { inferPrimaryProjectType, resolveModBannerUrl } from "@/lib/fomo/fomoModBanner";

// ── Helper ──────────────────────────────────────────────────────────────────

const getGradientByName = (name: string) => {
  const gradients = ["from-pink-500 to-red-500", "from-purple-500 to-blue-500", "from-blue-500 to-teal-500", "from-emerald-500 to-cyan-500", "from-amber-500 to-red-500"];
  if (!name) return gradients[0];
  let sum = 0; for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return gradients[sum % gradients.length];
};

// ── FollowedProjectCard ─────────────────────────────────────────────────────

export function FollowedProjectCard({ mod, updateInfo, isRecent, isDownloading, onOpenVersions, onDownloadMod, onSearchProject, onUnfollow, onShare, isSharedByMe, sharedByOthers, currentUserColor }: any) {
  const [isModern, setIsModern] = React.useState(false);
  React.useEffect(() => {
    const update = () => setIsModern(document.documentElement.getAttribute("data-theme") === "modern");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const bannerUrl = resolveModBannerUrl(mod);
  const projectType = inferPrimaryProjectType(mod);

  return (
    <div onClick={() => onOpenVersions?.(mod)} className={`group relative rounded-2xl border overflow-hidden flex flex-col transition-all cursor-pointer ${updateInfo ? "border-emerald-500/30 bg-emerald-500/5 shadow-lg" : "bg-foreground/5 border-foreground/10 hover:border-foreground/20 shadow-sm"}`}>
      <FomoModBannerStrip
        bannerUrl={bannerUrl}
        projectId={mod.projectId}
        platform={mod._source}
        projectType={projectType}
        heightClass="h-24"
        fetchIfMissing={!bannerUrl}
      />
      <div className="p-4 flex flex-col justify-between flex-1">
      <div className="flex gap-4 items-start min-w-0 -mt-8 relative z-10">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ring-2 ring-black/40 shadow-lg">
          {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${getGradientByName(mod.title)}`}>{mod.title.charAt(0)}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-headline text-sm font-bold truncate text-white">{mod.title}</h4>
            {updateInfo && <span className="animate-pulse px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 uppercase">UPDATE!</span>}
            {isRecent && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">RECIENTE</span>}
          </div>
          <p className="text-[10px] text-white/40 truncate">por {mod.author}</p>
          
          {sharedByOthers && sharedByOthers.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
              <span className="text-[9px] text-white/40">Compartido por:</span>
              {sharedByOthers.map((o: any) => (
                <button
                  key={o.username}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("fomo-open-community-user", {
                        detail: { username: o.username },
                      })
                    );
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/10 text-[9px] text-white transition-all cursor-pointer"
                  title={`Ver perfil de @${o.username}`}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-background font-bold uppercase shrink-0 overflow-hidden" style={{ backgroundColor: o.color || 'var(--primary)' }}>
                    {o.avatar_url ? <img src={o.avatar_url} alt="" className="w-full h-full object-cover" /> : o.username.charAt(0)}
                  </div>
                  <span style={{ color: o.color || 'inherit' }}>@{o.username}</span>
                </button>
              ))}
            </div>
          )}
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
          <button 
            onClick={() => onShare?.(mod)} 
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all border"
            style={isSharedByMe ? {
              backgroundColor: currentUserColor ? `${currentUserColor}22` : 'rgba(249, 115, 22, 0.2)',
              color: currentUserColor || '#f97316',
              border: `1px solid ${currentUserColor ? `${currentUserColor}44` : 'rgba(249, 115, 22, 0.3)'}`
            } : isModern ? {
              color: 'rgba(0,0,0,0.5)',
              borderColor: 'rgba(0,0,0,0.15)',
              background: 'rgba(0,0,0,0.06)'
            } : {
              color: 'rgba(255, 255, 255, 0.4)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              background: 'rgba(255,255,255,0.05)'
            }}
            title={isSharedByMe ? "Ya compartido por ti" : "Compartir en Comunidad"}
          >
            <Globe className="w-3 h-3" />
            <span>{isSharedByMe ? "Compartido" : "Compartir"}</span>
          </button>
          <button onClick={() => onSearchProject?.(mod.title, mod.projectType, mod._source || "all", "all", null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><Search className="w-3.5 h-3.5" /></button>
          <button onClick={() => onOpenVersions?.(mod)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><ArrowRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => openExternal(mod.url)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><ExternalLink className="w-3.5 h-3.5" /></button>
          <button onClick={() => onUnfollow(mod.projectId)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── FollowedAuthorCard ───────────────────────────────────────────────────────

export function FollowedAuthorCard({ author, icons = [], onSearch, onUnfollow, onShare, isSharedByMe, sharedByOthers, currentUserColor }: any) {
  const authorName = typeof author === "string" ? author : author?.name || "Autor Desconocido";
  const [currentIconIdx, setCurrentIconIdx] = React.useState(0);
  const [isModern, setIsModern] = React.useState(false);
  React.useEffect(() => {
    const update = () => setIsModern(document.documentElement.getAttribute("data-theme") === "modern");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  
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
        <div className="min-w-0">
          <p className="font-headline text-sm font-bold truncate text-white">{authorName}</p>
          <p className="text-[10px] text-white/40">Creador de Minecraft</p>
          
          {sharedByOthers && sharedByOthers.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
              <span className="text-[8px] text-white/40">Compartido por:</span>
              {sharedByOthers.map((o: any) => (
                <button
                  key={o.username}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("fomo-open-community-user", {
                        detail: { username: o.username },
                      })
                    );
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/10 text-[8px] text-white transition-all cursor-pointer"
                  title={`Ver perfil de @${o.username}`}
                >
                  <div className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] text-background font-bold uppercase shrink-0 overflow-hidden" style={{ backgroundColor: o.color || 'var(--primary)' }}>
                    {o.avatar_url ? <img src={o.avatar_url} alt="" className="w-full h-full object-cover" /> : o.username.charAt(0)}
                  </div>
                  <span style={{ color: o.color || 'inherit' }}>@{o.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 relative z-10">
        <button 
          onClick={() => onShare?.({ id: authorName, name: authorName, icon_url: icons[currentIconIdx] || null, isAuthor: true })} 
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all border"
          style={isSharedByMe ? {
            backgroundColor: currentUserColor ? `${currentUserColor}22` : 'rgba(249, 115, 22, 0.2)',
            color: currentUserColor || '#f97316',
            border: `1px solid ${currentUserColor ? `${currentUserColor}44` : 'rgba(249, 115, 22, 0.3)'}`
          } : isModern ? {
            color: 'rgba(0,0,0,0.5)',
            borderColor: 'rgba(0,0,0,0.15)',
            background: 'rgba(0,0,0,0.06)'
          } : {
            color: 'rgba(255, 255, 255, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            background: 'rgba(255,255,255,0.05)'
          }}
          title={isSharedByMe ? "Ya compartido por ti" : "Compartir Creador en Comunidad"}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{isSharedByMe ? "Compartido" : "Compartir"}</span>
        </button>
        <button onClick={() => onSearch(authorName)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><Search className="w-4 h-4" /></button>
        <button onClick={() => openExternal(`https://modrinth.com/user/${authorName}`)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><ExternalLink className="w-4 h-4" /></button>
        <button onClick={() => onUnfollow(authorName)} className="p-2 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
