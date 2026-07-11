"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, MessageSquare, Play, Share2, Users, Pin } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { MiembrosSkeleton } from "../FomoSkeletons";
import { supabase } from "../../lib/supabaseClient";
import { CommunityHeader, type CommunitySection } from "../community/CommunityShell";
import { CommunityRankings } from "../community/CommunityRankings";
import { CommunityPublicProfile } from "../community/CommunityPublicProfile";
import { CommunityFeedSkeleton, formatCommunityDate, formatTimeAgo, parseShareMeta } from "../community/communityUtils";

interface ComunidadTabProps {
  rankings: ModHit[];
  loadingRankings: boolean;
  handleOpenModDetails: (mod: ModHit) => void;
  session: any;
  onSearchAuthor?: (name: string, platform: string) => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SHARES_PAGE_SIZE = 12;

function updateKey(source: string | undefined, projectId: string) {
  return `${source || "modrinth"}:${projectId}`;
}

async function fetchProjectUpdatedAt(source: string | undefined, projectId: string) {
  if (!projectId || projectId.startsWith("youtube:")) return null;
  const url = source === "curseforge"
    ? `/api/curseforge/project?projectId=${encodeURIComponent(projectId)}`
    : `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  return source === "curseforge" ? data.details?.updated_at || data.details?.dateModified : data.updated_at || data.published;
}

/** Comunidad orchestrates data and delegates each visual surface to a focused component. */
export function ComunidadTab({ rankings, loadingRankings, handleOpenModDetails, onSearchAuthor }: ComunidadTabProps) {
  const [section, setSection] = useState<CommunitySection>("compartidos");
  const [profileView, setProfileView] = useState<"list" | "profile">("list");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [sharesPage, setSharesPage] = useState(0);
  const [hasNextSharesPage, setHasNextSharesPage] = useState(false);
  const sharePageCache = useRef(new Map<number, { items: any[]; hasNext: boolean }>());
  const [recentUpdates, setRecentUpdates] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [publicData, setPublicData] = useState({ favorites: [] as any[], authors: [] as any[], drafts: [] as any[], channels: [] as string[], shares: [] as any[] });
  const [loadingPublic, setLoadingPublic] = useState(false);

  useEffect(() => {
    if (section !== "compartidos") return;
    const cached = sharePageCache.current.get(sharesPage);
    if (cached) {
      setShares(cached.items);
      setHasNextSharesPage(cached.hasNext);
      return;
    }
    setLoadingShares(true);
    const from = sharesPage * SHARES_PAGE_SIZE;
    // Requesting one extra row tells us if a next page exists without a full-table count.
    supabase.from("favorite_mods").select(`id, mod_id, platform, name, icon_url, summary, pinned, created_at, profile:profiles(id, username, avatar_url, color)`).order("pinned", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).range(from, from + SHARES_PAGE_SIZE)
      .then(({ data, error }) => {
        if (error) console.error("Error loading shares feed:", error);
        const rows = data || [];
        const pageData = { items: rows.slice(0, SHARES_PAGE_SIZE), hasNext: rows.length > SHARES_PAGE_SIZE };
        sharePageCache.current.set(sharesPage, pageData);
        setShares(pageData.items);
        setHasNextSharesPage(pageData.hasNext);
        setLoadingShares(false);
      });
  }, [section, sharesPage]);

  useEffect(() => {
    if (section !== "miembros" || profiles.length) return;
    setLoadingProfiles(true);
    supabase.from("profiles").select("id, username, avatar_url, banner_url, color, created_at, banner_meta").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setProfiles(data || []); setLoadingProfiles(false); });
  }, [section, profiles.length]);

  useEffect(() => {
    let cancelled = false;
    const projects = Array.from(new Map(shares.map((item) => {
      const projectId = item.mod_id || item.id;
      const source = item.platform || "modrinth";
      return [updateKey(source, projectId), { projectId, source }];
    })).values()).filter(({ projectId, source }) => projectId && source !== "youtube" && !String(projectId).startsWith("youtube:"));

    Promise.all(projects.map(async ({ projectId, source }) => {
      try {
        const updatedAt = await fetchProjectUpdatedAt(source, projectId);
        const time = updatedAt ? new Date(updatedAt).getTime() : 0;
        return [updateKey(source, projectId), !!time && Date.now() - time <= THIRTY_DAYS_MS] as const;
      } catch { return [updateKey(source, projectId), false] as const; }
    })).then((pairs) => { if (!cancelled) setRecentUpdates(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, [shares]);

  const openProfile = async (profile: any) => {
    if (!profile?.id) return;
    setSelectedProfile(profile);
    setProfileView("profile");
    setLoadingPublic(true);
    setPublicData({ favorites: [], authors: [], drafts: [], channels: [], shares: [] });
    const [{ data: favorites }, { data: authors }, { data: drafts }, { data: sharesData }] = await Promise.all([
      supabase.from("followed_mods").select("*").eq("profile_id", profile.id),
      supabase.from("followed_authors").select("*").eq("profile_id", profile.id),
      supabase.from("drafts").select("id, name, minecraft_version, loader, visibility, cover_image").eq("owner_id", profile.id).eq("visibility", "public"),
      supabase.from("favorite_mods").select("*").eq("profile_id", profile.id).order("pinned", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    ]);
    // Showcase preferences live in profile metadata and are already public.
    const channels = profile.banner_meta?.youtube_channels?.filter((channel: any) => channel.visible !== false).map((channel: any) => channel.name || channel.url || channel).filter(Boolean) || [];
    setPublicData({ favorites: favorites || [], authors: authors || [], drafts: drafts || [], channels, shares: sharesData || [] });
    setLoadingPublic(false);
  };

  const changeSection = (next: CommunitySection) => {
    setSection(next);
    setProfileView("list");
    setSelectedProfile(null);
  };

  return (
    <motion.div key="comunidad" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="flex min-h-0 flex-1 flex-col">
      <CommunityHeader active={section} onChange={changeSection} />
      <AnimatePresence mode="wait">
        {section === "compartidos" && <CommunityFeed key={`feed-${sharesPage}`} shares={shares} loading={loadingShares} recentUpdates={recentUpdates} page={sharesPage} hasNext={hasNextSharesPage} onPageChange={setSharesPage} onOpenProfile={openProfile} onOpenMod={handleOpenModDetails} />}
        {section === "rankings" && <motion.div key="rankings" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex min-h-0 flex-1"><CommunityRankings rankings={rankings} loading={loadingRankings} onOpen={handleOpenModDetails} /></motion.div>}
        {section === "miembros" && profileView === "list" && <MembersList key="members" profiles={profiles} loading={loadingProfiles} onOpen={openProfile} />}
        {section === "miembros" && profileView === "profile" && <CommunityPublicProfile key="profile" profile={selectedProfile} {...publicData} loading={loadingPublic} onBack={() => setProfileView("list")} onOpenMod={handleOpenModDetails} onSearchAuthor={onSearchAuthor} />}
      </AnimatePresence>
    </motion.div>
  );
}

interface FeedProps { shares: any[]; loading: boolean; recentUpdates: Record<string, boolean>; page: number; hasNext: boolean; onPageChange: (page: number) => void; onOpenProfile: (profile: any) => void; onOpenMod: (mod: ModHit) => void; }

/** The feed keeps user context first, then presents the shared media as one clear action. */
function CommunityFeed({ shares, loading, recentUpdates, page, hasNext, onPageChange, onOpenProfile, onOpenMod }: FeedProps) {
  if (loading) return <CommunityFeedSkeleton />;
  if (!shares.length) return <EmptyCommunity icon={<Share2 className="h-10 w-10" />} title="Nada compartido todavía" text="Los proyectos compartidos aparecerán acá en tiempo real." />;

  return (
    <motion.div key="community-feed" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex-1 space-y-3 overflow-y-auto pb-28 pr-1 scrollbar-none">
      <div className="flex items-end justify-between px-1 pb-1"><div><p className="text-[9px] font-mono uppercase text-white/30">Actividad reciente</p><h3 className="mt-0.5 text-xs font-bold text-white/80">Compartido por la comunidad</h3></div><span className="text-[8px] font-mono uppercase text-white/25">Más nuevos primero</span></div>
      {shares.map((item, index) => <ShareCard key={item.id} item={item} index={index} updated={!!recentUpdates[updateKey(item.platform || "modrinth", item.mod_id || item.id)]} onOpenProfile={onOpenProfile} onOpenMod={onOpenMod} />)}
      <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-white/[0.07] bg-surface/90 p-1.5 shadow-[0_-10px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <button type="button" disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[9px] font-bold text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-20"><ChevronLeft className="h-3.5 w-3.5" />Recientes</button>
        <span className="font-mono text-[8px] uppercase text-white/30">Página {page + 1}</span>
        <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[9px] font-bold text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-20">Anteriores<ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  );
}

function ShareCard({ item, index, updated, onOpenProfile, onOpenMod }: { item: any; index: number; updated: boolean; onOpenProfile: (profile: any) => void; onOpenMod: (mod: ModHit) => void }) {
  const meta = parseShareMeta(item.summary);
  const projectId = item.mod_id || item.id;
  const projectType = meta.projectType || "mod";
  const isYoutube = item.platform === "youtube" || projectType.startsWith("youtube-");
  const userColor = item.profile?.color || "var(--color-primary)";
  const videoUrl = meta.videoUrl || (meta.embeddedVideoId ? `https://www.youtube.com/watch?v=${meta.embeddedVideoId}` : "");
  // share.pinned = true → pinned via DB column (source of truth).
  // share.pinned = null/undefined → old row, fall back to summary blob.
  // share.pinned = false → explicitly NOT pinned.
  const isPinned: boolean = item.pinned === true ? true
    : item.pinned == null ? (meta.priority ?? false)
    : false;
  const mod: ModHit = { projectId, title: item.name || "Proyecto", description: meta.comment || "", iconUrl: item.icon_url || null, author: "Comunidad", projectType, categories: [item.platform || "modrinth"], url: item.platform === "curseforge" ? `https://www.curseforge.com/minecraft/mc-mods/${projectId}` : `https://modrinth.com/${projectType}/${projectId}`, _source: item.platform || "modrinth" };
  const playVideo = () => meta.embeddedVideoId && window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: meta.embeddedVideoId } }));

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18) }}
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-surface/78 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.24)] ${
        isPinned
          ? "border-amber-400/60 shadow-[0_0_22px_rgba(251,191,36,0.18)] hover:border-amber-400/80"
          : updated && !isYoutube
            ? "border-amber-300/70 shadow-[0_0_20px_rgba(251,191,36,0.22)] hover:border-white/15"
            : "border-white/[0.08] hover:border-white/15"
      }`}
    >
      {isPinned && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-amber-400">
          <Pin className="h-2.5 w-2.5 fill-current" /> Fijada
        </span>
      )}
      <span className={`absolute inset-y-4 left-0 w-px transition-colors ${isPinned ? "bg-amber-400/50" : "bg-white/10 group-hover:bg-[var(--color-primary)]"}`} />
      <button type="button" onClick={() => onOpenProfile(item.profile)} className="flex w-fit items-center gap-2.5 text-left">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border bg-surface text-xs font-bold uppercase shadow-md transition-transform group-hover:scale-105" style={{ borderColor: userColor }}>{item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span style={{ color: userColor }}>{item.profile?.username?.slice(0, 2) || "U"}</span>}</div>
        <div>
          <span className="block text-[11px] font-bold text-white">@{item.profile?.username || "Usuario"}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[8px] text-white/35">
            <Clock className="h-2.5 w-2.5" />{formatTimeAgo(item.created_at)}
          </span>
        </div>
      </button>

      {meta.comment && <div className="flex gap-2 rounded-xl border border-white/[0.045] bg-black/15 p-3 text-[11px] text-white/70"><MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-primary)" }} /><p className="line-clamp-4 whitespace-pre-wrap leading-relaxed">{meta.comment}</p></div>}

      {isYoutube ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
          {(meta.thumbnail || item.icon_url) && <button type="button" onClick={playVideo} className="group/video relative block aspect-video w-full overflow-hidden bg-black/40"><img src={meta.thumbnail || item.icon_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover/video:scale-[1.025]" referrerPolicy="no-referrer" />{meta.embeddedVideoId && <span className="absolute inset-0 flex items-center justify-center bg-black/15"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-orange-600/90 text-white shadow-xl transition-transform group-hover/video:scale-110"><Play className="h-4 w-4 fill-current" /></span></span>}</button>}
          <div className="p-3"><h4 className="text-xs font-bold leading-snug text-white">{item.name}</h4><div className="mt-2 flex gap-2">{meta.embeddedVideoId && <button type="button" onClick={playVideo} className="flex items-center gap-1 rounded-lg border border-orange-500/25 bg-orange-600/15 px-2.5 py-1.5 text-[9px] font-bold text-orange-300"><Play className="h-3 w-3 fill-current" />Reproducir</button>}{videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-bold text-white/60"><ExternalLink className="h-3 w-3" />YouTube</a>}</div></div>
        </div>
      ) : (
        <button type="button" onClick={() => onOpenMod(mod)} className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 text-left transition-all hover:bg-white/[0.07] active:scale-[0.99]">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-surface">{item.icon_url ? <img src={item.icon_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold uppercase text-white/35">{item.name?.slice(0, 2)}</span>}</div><div className="min-w-0"><h4 className="truncate text-xs font-bold text-white">{item.name}</h4><div className="mt-1 flex items-center gap-1.5"><span className={`rounded border px-1.5 py-0.5 text-[7px] font-black uppercase ${item.platform === "curseforge" ? "border-orange-500/20 bg-orange-600/15 text-orange-400" : "border-emerald-500/20 bg-emerald-600/15 text-emerald-400"}`}>{item.platform === "curseforge" ? "CurseForge" : "Modrinth"}</span>{meta.modloader && <span className="text-[8px] font-mono uppercase text-white/35">{meta.modloader}</span>}{meta.gameVersion && <span className="text-[8px] font-mono text-white/35">{meta.gameVersion}</span>}</div></div></div><ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
        </button>
      )}

    </motion.article>
  );
}

function MembersList({ profiles, loading, onOpen }: { profiles: any[]; loading: boolean; onOpen: (profile: any) => void }) {
  return <motion.div key="members-list" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex-1 space-y-2 overflow-y-auto pb-28 scrollbar-none">{loading ? <MiembrosSkeleton /> : !profiles.length ? <EmptyCommunity icon={<Users className="h-10 w-10" />} title="Sin miembros" text="Todavía no hay perfiles públicos." /> : <><div className="flex items-end justify-between px-1 pb-1"><div><p className="text-[9px] font-mono uppercase text-white/30">Directorio</p><h3 className="mt-0.5 text-xs font-bold text-white/80">Personas del hub</h3></div><span className="text-[9px] font-mono text-white/25">{profiles.length} miembros</span></div>{profiles.map((profile, index) => <motion.button key={profile.id} type="button" onClick={() => onOpen(profile)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.2) }} whileHover={{ x: 3 }} whileTap={{ scale: 0.985 }} className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/78 p-3.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.04]"><span className="absolute inset-y-3 left-0 w-px opacity-70" style={{ background: profile.color || "var(--color-primary)" }} /><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-lg transition-transform group-hover:scale-105" style={{ borderColor: profile.color || "rgba(255,255,255,.08)", boxShadow: `0 6px 18px ${profile.color || "#000"}22` }}>{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-black uppercase" style={{ color: profile.color || "var(--color-primary)" }}>{(profile.username || "?").slice(0, 2)}</span>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">@{profile.username || "usuario"}</p><p className="mt-0.5 text-[9px] text-white/35">Miembro desde {formatCommunityDate(profile.created_at)}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-white/20" /></motion.button>)}</>}</motion.div>;
}

function EmptyCommunity({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-white/15">{icon}<h3 className="mt-3 text-sm font-bold text-white">{title}</h3><p className="mt-1 max-w-xs text-[10px] text-white/35">{text}</p></div>;
}
