import React from "react";
import { ExternalLink, Heart, HeartCrack, Layers, Sparkles, Database, Archive, LayoutGrid, Puzzle, Glasses, CircleFadingPlus, Globe, X, FlaskConical, FlaskConicalOff, Package, Workflow, Loader2 } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";
import { buildShareMetaFromMod } from "@/lib/fomo/communityShareMeta";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";
import { communityTypeToBannerType, getBannerFallbackStyle, inferPrimaryProjectType } from "@/lib/fomo/fomoModBanner";
import { openExternal } from "@/utils/format";

export function ModHeader({ mod, bannerUrl, bannerProjectType, onSearchAuthor, onSearchMod, followedAuthors, followedMods, toggleFollowAuthor, toggleFollowMod, selectedProjectType, onSelectProjectType, communitySharers = [], communitySharedByMe = false, currentUserCommunityColor = null }: any) {
  const [currentTheme, setCurrentTheme] = React.useState("official");
  const { isProjectInDraft } = useActiveDraft();
  
  React.useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const getProjectTypeIcon = (type: string, categories: string[] = []) => {
    const t = type.toLowerCase();
    const cats = categories.map((c: any) => {
      if (typeof c === "string") return c.toLowerCase();
      if (c && typeof c === "object") {
        if (typeof c.name === "string") return c.name.toLowerCase();
        if (typeof c.slug === "string") return c.slug.toLowerCase();
      }
      return "";
    }).filter(Boolean);
    
    if (t === "resourcepack") return <Layers className="w-3.5 h-3.5" />;
    if (t === "shader") return <Glasses className="w-3.5 h-3.5" />;
    if (t === "modpack") return <Archive className="w-3.5 h-3.5" />;
    if (t === "datapack") return <Database className="w-3.5 h-3.5" />;
    if (t === "mod") return <Puzzle className="w-3.5 h-3.5" />;
    return <LayoutGrid className="w-3.5 h-3.5" />;
  };

  const isModern = currentTheme === "modern";
  const projectType = (mod.projectType || "").toLowerCase();
  const bannerType = communityTypeToBannerType(
    bannerProjectType || selectedProjectType || inferPrimaryProjectType(mod)
  );
  const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(bannerType);

  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareComment, setShareComment] = React.useState("");
  const [isSharing, setIsSharing] = React.useState(false);

  const handleShareClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Tenés que iniciar sesión en la pestaña Comunidad para compartir.", type: "error" }
      }));
      return;
    }
    if (communitySharedByMe) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Este proyecto ya está compartido desde tu cuenta.", type: "info" }
      }));
      return;
    }
    setShowShareModal(true);
  };

  const sharersToShow: { username: string; color?: string | null; avatar_url?: string | null }[] =
    Array.isArray(communitySharers) && communitySharers.length > 0
      ? communitySharers.filter((u: any) => u?.username)
      : mod.sharingInfo?.profiles?.username
        ? [{
            username: mod.sharingInfo.profiles.username,
            color: mod.sharingInfo.profiles?.color,
            avatar_url: mod.sharingInfo.profiles?.avatar_url,
          }]
        : [];
  const confirmShare = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      if (!user) return;
      
      const summaryText = buildShareMetaFromMod(mod, {
        comment: shareComment.trim() || mod.description || "",
      });
      const platform = mod._source === "curseforge" ? "curseforge" : "modrinth";
      const { error } = await supabase.from("favorite_mods").insert({
        profile_id: user.id,
        mod_id: mod.projectId,
        platform,
        name: mod.title,
        icon_url: mod.iconUrl || null,
        summary: summaryText,
      });

      if (error) {
        if (error.code === "23505") {
          window.dispatchEvent(new CustomEvent("fomo-show-status", {
            detail: { text: "Este proyecto ya está en tus compartidos de comunidad.", type: "info" }
          }));
          setShowShareModal(false);
          setShareComment("");
          return;
        }
        throw error;
      }

      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "¡Compartido en la Comunidad exitosamente!", type: "success" }
      }));
      window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));
      setShowShareModal(false);
      setShareComment("");
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al compartir en la comunidad.", type: "error" }
      }));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="px-5 py-6 border-b relative overflow-hidden group/header" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
      {/* Banner */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ backgroundColor: bannerBgColor }}>
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="fomo-details-banner-img w-full h-full object-cover scale-110 animate-fade-in duration-1000"
            style={{ filter: "var(--fomo-banner-filter)", opacity: "var(--fomo-banner-image-opacity)" }}
          />
        ) : (
          <div className="absolute inset-0 fomo-details-banner-pattern" style={{ ...fallbackTexture, opacity: "var(--fomo-banner-pattern-opacity)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "var(--fomo-banner-overlay)" }} />
      </div>

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
              
              {sharersToShow.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 ml-1">
                  <span className="text-[8px] uppercase tracking-wider text-white/50 shrink-0">Compartido por:</span>
                  {sharersToShow.map((info: { username: string; color?: string | null; avatar_url?: string | null }, idx: number) => (
                    <button
                      key={`${info.username}-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("fomo-community-apply-filter", { detail: { username: info.username, type: "mods" } }));
                        window.dispatchEvent(new CustomEvent("fomo-switch-tab", { detail: { tab: "community" } }));
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border backdrop-blur-md bg-black/60 text-[9px] font-bold text-white hover:scale-[1.02] hover:bg-black/80 transition-all cursor-pointer shadow-sm"
                      style={{ borderColor: info.color || "rgba(255,255,255,0.1)" }}
                      title={`Ver @${info.username} en la comunidad`}
                    >
                      <div className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] uppercase overflow-hidden shrink-0 border border-white/10" style={{ backgroundColor: info.color || "var(--primary)", color: info.color ? "#000000" : "var(--primary-foreground)" }}>
                        {info.avatar_url ? <img src={info.avatar_url} alt="" className="w-full h-full object-cover" /> : (info.username || "U").charAt(0)}
                      </div>
                      <span style={{ color: info.color || "var(--primary)" }}>@{info.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {mod.categories?.map((c: any) => {
                if (typeof c === "string") return c.toLowerCase();
                if (c && typeof c === "object") {
                  if (typeof c.name === "string") return c.name.toLowerCase();
                  if (typeof c.slug === "string") return c.slug.toLowerCase();
                }
                return "";
              }).includes("datapack") && (
                <button 
                  onClick={() => onSelectProjectType?.("datapack")}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black border uppercase tracking-widest backdrop-blur-xl transition-colors ${
                    selectedProjectType === "datapack" 
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                  }`}
                >
                  <Database className="w-3 h-3" /> DATAPACK
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
              className={`flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${followedAuthors.some((a: any) => a?.name === mod.author) ? "bg-amber-500/40 backdrop-blur-md text-amber-300 border border-amber-500/50 hover:bg-amber-500/50" : isModern ? "bg-slate-200/50 border border-slate-300 text-slate-500 hover:text-slate-700" : "bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/60 hover:text-white"}`}
            >
              {followedAuthors.some((a: any) => a?.name === mod.author) ? <HeartCrack className="w-3.5 h-3.5 fill-current" /> : <Heart className="w-3.5 h-3.5" />} {followedAuthors.some((a: any) => a?.name === mod.author) ? "Dejar de Seguir" : "Seguir Autor"}
            </button>
            <button 
              onClick={() => onSearchMod?.(mod.title)} 
              className={`flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isModern ? "bg-slate-200/50 border border-slate-300 text-slate-700 hover:bg-slate-200" : "bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/60 hover:text-white"}`}
            >
              <Workflow className="w-3.5 h-3.5" /> Comparar
            </button>
            <button 
              onClick={() => toggleFollowMod(mod)} 
              className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black transition-all ${followedMods.some((m: any) => m.projectId === mod.projectId) ? "bg-amber-500/40 backdrop-blur-md text-amber-300 border border-amber-500/50 hover:bg-amber-500/50" : isModern ? "bg-slate-200/50 border border-slate-300 text-slate-500 hover:text-slate-700" : "bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/60 hover:text-white"}`}
            >
               {followedMods.some((m: any) => m.projectId === mod.projectId) ? <HeartCrack className="w-3.5 h-3.5 mr-1.5 fill-current" /> : <Heart className="w-3.5 h-3.5 mr-1.5" />} {followedMods.some((m: any) => m.projectId === mod.projectId) ? "Quitar Favorito" : "Favorito"}
            </button>
            {isProjectInDraft(mod.projectId || mod.id || mod.slug) ? (
              <button 
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("fomo-remove-from-draft", { detail: { projectId: mod.projectId || mod.id || mod.slug } })); }} 
                className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black transition-all bg-red-500/40 backdrop-blur-md border border-red-500/50 text-red-200 hover:bg-red-500/60`}
                title="Quitar del Draft Activo"
              >
                 <FlaskConicalOff className="w-3.5 h-3.5 mr-1.5" /> Draft
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("fomo-open-add-to-draft", { detail: { projectId: mod.projectId || mod.id || mod.slug, platform: mod._source || "modrinth", title: mod.title } })); }} 
                className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black transition-all ${isModern ? "bg-slate-200/50 border border-slate-300 text-slate-500 hover:text-primary" : "bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/60 hover:text-primary"}`}
                title="Añadir a Draft Activo"
              >
                 <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Draft
              </button>
            )}
            <button 
              onClick={handleShareClick}
              className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black transition-all ${communitySharedByMe ? "" : "bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/60 hover:text-white"}`}
              style={communitySharedByMe ? { backgroundColor: currentUserCommunityColor ? `${currentUserCommunityColor}66` : "rgba(249, 115, 22, 0.4)", backdropFilter: "blur(12px)", color: "#fff", border: `1px solid ${currentUserCommunityColor ? `${currentUserCommunityColor}88` : "rgba(249, 115, 22, 0.5)"}` } : undefined}
              title={communitySharedByMe ? "Ya lo compartiste en Comunidad" : "Compartir en Comunidad"}
              type="button"
            >
              {communitySharedByMe ? <Globe className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <CircleFadingPlus className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
              {communitySharedByMe ? "Compartido" : "Compartir"}
            </button>
            
            {mod._source === "modrinth" && (
              <button 
                onClick={async () => {
                  try {
                    await fetch("/api/modrinth/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_project", collectionId: "followed-projects", projectId: mod.projectId }) });
                    const btn = document.getElementById(`mr-btn-${mod.projectId}`);
                    if (btn) { btn.style.background = "rgba(16,185,129,0.4)"; btn.style.backdropFilter = "blur(12px)"; btn.style.color = "#fff"; btn.style.borderColor = "rgba(16,185,129,0.6)"; btn.innerText = "Agregado!"; }
                  } catch {}
                }} 
                id={`mr-btn-${mod.projectId}`}
                className={`flex items-center justify-center h-7 px-3 rounded-lg text-[10px] font-black transition-all bg-black/40 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/60 hover:text-white`}
              >
                 <Database className="w-3.5 h-3.5 mr-1.5" /> Modrinth
              </button>
            )}
          </div>
        </div>
        <button onClick={() => openExternal(mod.url)} className="p-3 rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all active:scale-95 group shrink-0">
          <ExternalLink className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareModal(false)}>
          <div className="bg-[var(--fomo-bg)] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-zoom-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2"><CircleFadingPlus className="w-4 h-4 text-primary" /> Compartir Proyecto</h3>
              <button onClick={() => setShowShareModal(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-white/60">¿Querés agregar un comentario u opinión opcional sobre <strong>{mod.title}</strong>?</p>
              <textarea 
                value={shareComment}
                onChange={e => setShareComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmShare(); } }}
                placeholder="Escribe algo interesante... (Enter para enviar, Shift+Enter para nueva línea)"
                className="w-full h-20 bg-black/20 border rounded-xl p-3 text-xs text-white placeholder-white/30 resize-none focus:outline-none transition-colors custom-scrollbar"
                style={{ borderColor: "rgba(255,255,255,0.1)", outline: "none" }}
                autoFocus
              />
            </div>
            <div className="p-3 border-t border-white/5 bg-white/5 flex items-center justify-end gap-2">
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all" disabled={isSharing}>Cancelar</button>
              <button onClick={confirmShare} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50" disabled={isSharing}>
                {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CircleFadingPlus className="w-3.5 h-3.5" />} {isSharing ? "Compartiendo..." : "Compartir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
