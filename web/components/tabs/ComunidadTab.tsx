"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Heart, MessageSquare, Play, Search, Share2, ThumbsUp, Users, Pin, UserPlus, UserRound } from "lucide-react";
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
  userFavorites: any[];
  userFollowedAuthors: any[];
  onToggleFavorite: (mod: ModHit) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SHARES_PAGE_SIZE = 12;

function updateKey(source: string | undefined, projectId: string) {
  return `${source || "modrinth"}:${projectId}`;
}

function isMissingPinnedColumnError(error: any) {
  const message = String(error?.message || error?.details || "");
  return error?.code === "42703" || error?.code === "PGRST204" || /\bpinned\b/i.test(message);
}

function isSharePinned(row: any) {
  if (row?.pinned === true) return true;
  if (row?.pinned === false) return false;
  return !!parseShareMeta(row?.summary).priority;
}

function sortSharesByPinned(rows: any[]) {
  return [...rows].sort((a, b) => {
    const priorityOrder = Number(isSharePinned(b)) - Number(isSharePinned(a));
    if (priorityOrder) return priorityOrder;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

async function loadCommunitySharesPage(page: number) {
  const from = page * SHARES_PAGE_SIZE;
  const to = from + SHARES_PAGE_SIZE;
  const query = supabase
    .from("favorite_mods")
    .select(`id, mod_id, platform, name, icon_url, summary, pinned, created_at, profile:profiles(id, username, avatar_url, color)`)
    .eq("pinned", true)
    .order("pinned", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error } = await query;
  if (!error) {
    const sorted = sortSharesByPinned(data || []);
    return { items: sorted.slice(0, SHARES_PAGE_SIZE), hasNext: sorted.length > SHARES_PAGE_SIZE };
  }
  if (!isMissingPinnedColumnError(error)) throw error;

  const fallback = await supabase
    .from("favorite_mods")
    .select(`id, mod_id, platform, name, icon_url, summary, created_at, profile:profiles(id, username, avatar_url, color)`)
    .order("created_at", { ascending: false })
    .range(0, 240);

  if (fallback.error) throw fallback.error;
  const sorted = sortSharesByPinned((fallback.data || []).filter(isSharePinned));
  return { items: sorted.slice(from, to), hasNext: sorted.length > to };
}

async function loadProfileShares(profileId: string) {
  const withPinned = await supabase
    .from("favorite_mods")
    .select("*")
    .eq("profile_id", profileId)
    .order("pinned", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!withPinned.error) return sortSharesByPinned(withPinned.data || []);
  if (!isMissingPinnedColumnError(withPinned.error)) throw withPinned.error;

  const fallback = await supabase
    .from("favorite_mods")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (fallback.error) throw fallback.error;
  return sortSharesByPinned(fallback.data || []);
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
export function ComunidadTab({ rankings, loadingRankings, handleOpenModDetails, session, userFavorites, userFollowedAuthors, onToggleFavorite, onSearchAuthor }: ComunidadTabProps) {
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
  const [communityMetrics, setCommunityMetrics] = useState({ members: 0, recommendations: 0, featured: 0 });
  const [creatorIds, setCreatorIds] = useState<Set<string>>(new Set());
  const [affinity, setAffinity] = useState<Record<string, { favorites: number; creators: number }>>({});
  const [followedProfileIds, setFollowedProfileIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Record<string, { count: number; mine: boolean }>>({});

  useEffect(() => {
    if (section !== "compartidos") return;
    const cached = sharePageCache.current.get(sharesPage);
    if (cached) {
      setShares(cached.items);
      setHasNextSharesPage(cached.hasNext);
      return;
    }
    setLoadingShares(true);
    // Requesting one extra row tells us if a next page exists without a full-table count.
    loadCommunitySharesPage(sharesPage)
      .then((pageData) => {
        sharePageCache.current.set(sharesPage, pageData);
        setShares(pageData.items);
        setHasNextSharesPage(pageData.hasNext);
      })
      .catch((error) => {
        console.error("Error loading shares feed:", error);
        setShares([]);
        setHasNextSharesPage(false);
      })
      .finally(() => {
        setLoadingShares(false);
      });
  }, [section, sharesPage]);

  useEffect(() => {
    if (section !== "miembros" || profiles.length) return;
    setLoadingProfiles(true);
    supabase.from("profiles").select("id, username, avatar_url, banner_url, color, created_at, updated_at, banner_meta").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setProfiles(data || []); setLoadingProfiles(false); });
  }, [section, profiles.length]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("favorite_mods").select("id", { count: "exact", head: true }),
      supabase.from("favorite_mods").select("id", { count: "exact", head: true }).eq("pinned", true),
    ]).then(([members, recommendations, featured]) => setCommunityMetrics({
      members: members.count || 0,
      recommendations: recommendations.count || 0,
      featured: featured.count || 0,
    }));
  }, []);

  useEffect(() => {
    if (section !== "miembros") return;
    const myFavoriteKeys = new Set(userFavorites.map((item) => `${item.platform || item.source || "modrinth"}:${item.mod_id || item.project_id || item.projectId || item.id}`));
    const myAuthorKeys = new Set(userFollowedAuthors.map((item) => `${item.platform || "modrinth"}:${item.author_name || item.name}`));
    Promise.all([
      supabase.from("drafts").select("owner_id").eq("visibility", "public"),
      supabase.from("followed_mods").select("profile_id, mod_id, platform"),
      supabase.from("followed_authors").select("profile_id, author_name, platform"),
    ]).then(([draftRows, favoriteRows, authorRows]) => {
      setCreatorIds(new Set((draftRows.data || []).map((row: any) => row.owner_id)));
      const next: Record<string, { favorites: number; creators: number }> = {};
      (favoriteRows.data || []).forEach((row: any) => {
        next[row.profile_id] ||= { favorites: 0, creators: 0 };
        if (myFavoriteKeys.has(`${row.platform || "modrinth"}:${row.mod_id}`)) next[row.profile_id].favorites++;
      });
      (authorRows.data || []).forEach((row: any) => {
        next[row.profile_id] ||= { favorites: 0, creators: 0 };
        if (myAuthorKeys.has(`${row.platform || "modrinth"}:${row.author_name}`)) next[row.profile_id].creators++;
      });
      setAffinity(next);
    });
  }, [section, userFavorites, userFollowedAuthors]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("followed_profiles").select("followed_id").eq("follower_id", session.user.id)
      .then(({ data }) => setFollowedProfileIds(new Set((data || []).map((row: any) => row.followed_id))));
  }, [session?.user?.id]);

  useEffect(() => {
    const shareIds = shares.map((item) => item.id).filter(Boolean);
    if (!shareIds.length) return;
    supabase.from("community_reactions").select("share_id, profile_id").in("share_id", shareIds)
      .then(({ data }) => {
        const next: Record<string, { count: number; mine: boolean }> = {};
        (data || []).forEach((row: any) => {
          next[row.share_id] ||= { count: 0, mine: false };
          next[row.share_id].count++;
          if (row.profile_id === session?.user?.id) next[row.share_id].mine = true;
        });
        setReactions(next);
      });
  }, [session?.user?.id, shares]);

  const toggleProfileFollow = async (profileId: string) => {
    if (!session?.user?.id || profileId === session.user.id) return;
    const following = followedProfileIds.has(profileId);
    setFollowedProfileIds((current) => { const next = new Set(current); following ? next.delete(profileId) : next.add(profileId); return next; });
    const request = following
      ? supabase.from("followed_profiles").delete().eq("follower_id", session.user.id).eq("followed_id", profileId)
      : supabase.from("followed_profiles").insert({ follower_id: session.user.id, followed_id: profileId });
    const { error } = await request;
    if (error) setFollowedProfileIds((current) => { const next = new Set(current); following ? next.add(profileId) : next.delete(profileId); return next; });
  };

  const toggleReaction = async (shareId: string) => {
    if (!session?.user?.id) return;
    const current = reactions[shareId] || { count: 0, mine: false };
    setReactions((state) => ({ ...state, [shareId]: { mine: !current.mine, count: Math.max(0, current.count + (current.mine ? -1 : 1)) } }));
    const request = current.mine
      ? supabase.from("community_reactions").delete().eq("profile_id", session.user.id).eq("share_id", shareId).eq("reaction", "like")
      : supabase.from("community_reactions").insert({ profile_id: session.user.id, share_id: shareId, reaction: "like" });
    const { error } = await request;
    if (error) setReactions((state) => ({ ...state, [shareId]: current }));
  };

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
    const [{ data: favorites }, { data: authors }, { data: drafts }, sharesData] = await Promise.all([
      supabase.from("followed_mods").select("*").eq("profile_id", profile.id),
      supabase.from("followed_authors").select("*").eq("profile_id", profile.id),
      supabase.from("drafts").select("id, name, minecraft_version, loader, visibility, cover_image").eq("owner_id", profile.id).eq("visibility", "public"),
      loadProfileShares(profile.id),
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
      <CommunityHeader active={section} onChange={changeSection} metrics={communityMetrics} />
      <AnimatePresence mode="wait">
        {section === "compartidos" && <CommunityFeed key={`feed-${sharesPage}`} shares={shares} loading={loadingShares} recentUpdates={recentUpdates} page={sharesPage} hasNext={hasNextSharesPage} onPageChange={setSharesPage} onOpenProfile={openProfile} onOpenMod={handleOpenModDetails} userFavorites={userFavorites} onToggleFavorite={onToggleFavorite} reactions={reactions} onToggleReaction={toggleReaction} />}
        {section === "rankings" && <motion.div key="rankings" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex min-h-0 flex-1"><CommunityRankings rankings={rankings} loading={loadingRankings} onOpen={handleOpenModDetails} /></motion.div>}
        {section === "miembros" && profileView === "list" && <MembersList key="members" profiles={profiles} loading={loadingProfiles} onOpen={openProfile} creatorIds={creatorIds} affinity={affinity} currentProfileId={session?.user?.id} followedProfileIds={followedProfileIds} onToggleFollow={toggleProfileFollow} />}
        {section === "miembros" && profileView === "profile" && <CommunityPublicProfile key="profile" profile={selectedProfile} {...publicData} loading={loadingPublic} onBack={() => setProfileView("list")} onOpenMod={handleOpenModDetails} onSearchAuthor={onSearchAuthor} affinity={affinity[selectedProfile?.id]} isCurrentUser={selectedProfile?.id === session?.user?.id} isFollowing={followedProfileIds.has(selectedProfile?.id)} onToggleFollow={() => toggleProfileFollow(selectedProfile?.id)} />}
      </AnimatePresence>
    </motion.div>
  );
}

interface FeedProps { shares: any[]; loading: boolean; recentUpdates: Record<string, boolean>; page: number; hasNext: boolean; onPageChange: (page: number) => void; onOpenProfile: (profile: any) => void; onOpenMod: (mod: ModHit) => void; userFavorites: any[]; onToggleFavorite: (mod: ModHit) => void; reactions: Record<string, { count: number; mine: boolean }>; onToggleReaction: (shareId: string) => void; }

/** The feed keeps user context first, then presents the shared media as one clear action. */
function CommunityFeed({ shares, loading, recentUpdates, page, hasNext, onPageChange, onOpenProfile, onOpenMod, userFavorites, onToggleFavorite, reactions, onToggleReaction }: FeedProps) {
  if (loading) return <CommunityFeedSkeleton />;
  if (!shares.length) return <EmptyCommunity icon={<Share2 className="h-10 w-10" />} title="Nada fijado todavía" text="Las recomendaciones marcadas con pin aparecerán acá." />;
  const featuredShares = shares.slice(0, 6);

  return (
    <motion.div key="community-feed" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex-1 space-y-5 overflow-y-auto pb-28 pr-1 scrollbar-none">
      <section aria-labelledby="community-featured-title">
        <div className="flex items-end justify-between px-1 pb-2">
          <div><p className="text-[9px] font-mono uppercase text-white/30">Selección del hub</p><h3 id="community-featured-title" className="mt-0.5 text-xs font-bold text-white/80">Destacados</h3></div>
          <span className="text-[8px] font-mono uppercase text-white/25">Deslizá →</span>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-4 pt-2 pr-10 scrollbar-none">
          {featuredShares.map((item, index) => <ShareCard key={`featured-${item.id}`} item={item} index={index} featured updated={!!recentUpdates[updateKey(item.platform || "modrinth", item.mod_id || item.id)]} onOpenProfile={onOpenProfile} onOpenMod={onOpenMod} userFavorites={userFavorites} onToggleFavorite={onToggleFavorite} reaction={reactions[item.id]} onToggleReaction={onToggleReaction} />)}
        </div>
      </section>

      <section aria-labelledby="community-activity-title" className="space-y-2.5">
        <div className="flex items-end justify-between px-1">
          <div><p className="text-[9px] font-mono uppercase text-white/30">En tiempo real</p><h3 id="community-activity-title" className="mt-0.5 text-xs font-bold text-white/80">Actividad reciente</h3></div>
          <span className="text-[8px] font-mono uppercase text-white/25">Lo último</span>
        </div>
        {shares.map((item, index) => <ShareCard key={item.id} item={item} index={index} updated={!!recentUpdates[updateKey(item.platform || "modrinth", item.mod_id || item.id)]} onOpenProfile={onOpenProfile} onOpenMod={onOpenMod} userFavorites={userFavorites} onToggleFavorite={onToggleFavorite} reaction={reactions[item.id]} onToggleReaction={onToggleReaction} />)}
      </section>
      <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-white/[0.07] bg-surface/90 p-1.5 shadow-[0_-10px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <button type="button" disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[9px] font-bold text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-20"><ChevronLeft className="h-3.5 w-3.5" />Recientes</button>
        <span className="font-mono text-[8px] uppercase text-white/30">Página {page + 1}</span>
        <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[9px] font-bold text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-20">Anteriores<ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  );
}

function ShareCard({ item, index, updated, featured = false, onOpenProfile, onOpenMod, userFavorites, onToggleFavorite, reaction, onToggleReaction }: { item: any; index: number; updated: boolean; featured?: boolean; onOpenProfile: (profile: any) => void; onOpenMod: (mod: ModHit) => void; userFavorites: any[]; onToggleFavorite: (mod: ModHit) => void; reaction?: { count: number; mine: boolean }; onToggleReaction: (shareId: string) => void }) {
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
  const isFavorited = userFavorites.some((favorite) => String(favorite.mod_id || favorite.project_id || favorite.projectId || favorite.id) === String(projectId));
  const playVideo = () => meta.embeddedVideoId && window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: meta.embeddedVideoId } }));

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18) }}
      className={`mim-community-share-card group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border bg-surface/78 p-3 transition-all hover:-translate-y-0.5 ${featured ? "w-[78vw] max-w-[286px] shrink-0 snap-start" : "w-full"} ${
        isPinned
          ? "border-amber-400/60 shadow-[0_0_22px_rgba(251,191,36,0.18)] hover:border-amber-400/80"
          : updated && !isYoutube
            ? "border-amber-300/70 shadow-[0_0_20px_rgba(251,191,36,0.22)] hover:border-white/15"
            : "border-white/[0.08] hover:border-white/15"
      }`}
    >
      {isPinned && (
        <span className="mim-control-3d-active absolute right-3 top-3 flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-amber-400">
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

      {meta.comment && <div className="flex gap-2 rounded-xl border border-white/[0.045] bg-black/15 px-2.5 py-2 text-[10px] text-white/70"><MessageSquare className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--color-primary)" }} /><p className={`${featured ? "line-clamp-2" : "line-clamp-3"} whitespace-pre-wrap leading-relaxed`}>{meta.comment}</p></div>}

      {isYoutube ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
          {(meta.thumbnail || item.icon_url) && <button type="button" onClick={playVideo} className="group/video relative block aspect-video w-full overflow-hidden bg-black/40"><img src={meta.thumbnail || item.icon_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover/video:scale-[1.025]" referrerPolicy="no-referrer" />{meta.embeddedVideoId && <span className="absolute inset-0 flex items-center justify-center bg-black/15"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-orange-600/90 text-white shadow-xl transition-transform group-hover/video:scale-110"><Play className="h-4 w-4 fill-current" /></span></span>}</button>}
          <div className="p-3"><h4 className="text-xs font-bold leading-snug text-white">{item.name}</h4><div className="mt-2 flex gap-2">{meta.embeddedVideoId && <button type="button" onClick={playVideo} className="flex items-center gap-1 rounded-lg border border-orange-500/25 bg-orange-600/15 px-2.5 py-1.5 text-[9px] font-bold text-orange-300"><Play className="h-3 w-3 fill-current" />Reproducir</button>}{videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-bold text-white/60"><ExternalLink className="h-3 w-3" />YouTube</a>}</div></div>
        </div>
      ) : (
        <div className="mim-community-project flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5 text-left">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-surface">{item.icon_url ? <img src={item.icon_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold uppercase text-white/35">{item.name?.slice(0, 2)}</span>}</div><div className="min-w-0"><h4 className="truncate text-xs font-bold text-white">{item.name}</h4><div className="mt-1 flex items-center gap-1.5"><span className={`rounded border px-1.5 py-0.5 text-[7px] font-black uppercase ${item.platform === "curseforge" ? "border-orange-500/20 bg-orange-600/15 text-orange-400" : "border-emerald-500/20 bg-emerald-600/15 text-emerald-400"}`}>{item.platform === "curseforge" ? "CurseForge" : "Modrinth"}</span>{meta.modloader && <span className="text-[8px] font-mono uppercase text-white/35">{meta.modloader}</span>}{meta.gameVersion && <span className="text-[8px] font-mono text-white/35">{meta.gameVersion}</span>}</div></div></div><ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        <button type="button" onClick={() => isYoutube ? playVideo() : onOpenMod(mod)} className="mim-control-3d flex h-8 items-center justify-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[8px] font-bold text-white/70"><ExternalLink className="h-3 w-3" />{isYoutube ? "Reproducir" : "Ver"}</button>
        {!isYoutube ? <button type="button" aria-label={isFavorited ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={isFavorited} onClick={() => onToggleFavorite(mod)} className={`flex h-8 items-center justify-center gap-1 rounded-lg border text-[8px] font-bold ${isFavorited ? "mim-control-3d-active border-rose-500/25 bg-rose-500/12 text-rose-400" : "mim-control-3d border-white/[0.08] bg-white/[0.04] text-white/70"}`}><Heart className={`h-3 w-3 ${isFavorited ? "fill-current" : ""}`} /><span className="sr-only">Favorito</span></button> : <span />}
        <button type="button" aria-label="Me gusta" aria-pressed={reaction?.mine || false} onClick={() => onToggleReaction(item.id)} className={`flex h-8 items-center justify-center gap-1 rounded-lg border text-[8px] font-bold ${reaction?.mine ? "mim-control-3d-active border-blue-500/25 bg-blue-500/12 text-blue-400" : "mim-control-3d border-white/[0.08] bg-white/[0.04] text-white/70"}`}><ThumbsUp className={`h-3 w-3 ${reaction?.mine ? "fill-current" : ""}`} />{reaction?.count || 0}</button>
        <button type="button" onClick={() => onOpenProfile(item.profile)} className="mim-control-3d flex h-8 items-center justify-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[8px] font-bold text-white/70"><UserRound className="h-3 w-3" />Perfil</button>
      </div>

    </motion.article>
  );
}

function MembersList({ profiles, loading, onOpen, creatorIds, affinity, currentProfileId, followedProfileIds, onToggleFollow }: { profiles: any[]; loading: boolean; onOpen: (profile: any) => void; creatorIds: Set<string>; affinity: Record<string, { favorites: number; creators: number }>; currentProfileId?: string; followedProfileIds: Set<string>; onToggleFollow: (profileId: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"new" | "active" | "creators">("new");
  const visibleProfiles = useMemo(() => profiles
    .filter((profile) => profile.username?.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((profile) => filter !== "creators" || creatorIds.has(profile.id))
    .sort((a, b) => new Date(filter === "active" ? b.updated_at || b.created_at : b.created_at).getTime() - new Date(filter === "active" ? a.updated_at || a.created_at : a.created_at).getTime()), [creatorIds, filter, profiles, query]);

  return <motion.div key="members-list" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex-1 space-y-3 overflow-y-auto pb-28 scrollbar-none">
    <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface/80 px-3"><Search className="h-4 w-4 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30" /></label>
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface/70 p-1">{(["new", "active", "creators"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`h-8 rounded-lg text-[9px] font-bold ${filter === value ? "mim-control-3d-active bg-orange-500/15 text-orange-400" : "text-white/40"}`}>{value === "new" ? "Nuevos" : value === "active" ? "Activos" : "Creadores"}</button>)}</div>
    {loading ? <MiembrosSkeleton /> : !visibleProfiles.length ? <EmptyCommunity icon={<Users className="h-10 w-10" />} title="Sin resultados" text="Probá otra búsqueda o filtro." /> : visibleProfiles.map((profile, index) => {
      const shared = affinity[profile.id] || { favorites: 0, creators: 0 };
      const following = followedProfileIds.has(profile.id);
      return <motion.div key={profile.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .025, .16) }} className="mim-profile-list-card flex items-center gap-3 rounded-2xl border border-border bg-surface/78 p-3">
        <button type="button" onClick={() => onOpen(profile)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-surface" style={{ borderColor: profile.color || "var(--color-border)" }}>{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-black uppercase" style={{ color: profile.color || "var(--color-primary)" }}>{(profile.username || "?").slice(0, 2)}</span>}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-white">@{profile.username || "usuario"}</p><p className="mt-1 truncate text-[8px] text-white/40">{shared.favorites} favoritos y {shared.creators} creadores en común</p>{creatorIds.has(profile.id) && <span className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-bold uppercase text-emerald-400">Creador</span>}</div></button>
        {profile.id !== currentProfileId && <button type="button" aria-label={following ? `Dejar de seguir a ${profile.username}` : `Seguir a ${profile.username}`} aria-pressed={following} onClick={() => onToggleFollow(profile.id)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${following ? "mim-control-3d-active border-blue-500/25 bg-blue-500/12 text-blue-400" : "mim-control-3d border-border text-white/45"}`}><UserPlus className="h-3.5 w-3.5" /></button>}
      </motion.div>;
    })}
  </motion.div>;
}

function EmptyCommunity({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-white/15">{icon}<h3 className="mt-3 text-sm font-bold text-white">{title}</h3><p className="mt-1 max-w-xs text-[10px] text-white/35">{text}</p></div>;
}
