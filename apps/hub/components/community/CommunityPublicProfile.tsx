"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ChevronRight, Heart, Layers, Tv2, UserCheck, Share2, Play, Pin, UserPlus } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { PublicProfileSkeleton } from "../FomoSkeletons";
import { formatCommunityDate, parseShareMeta } from "./communityUtils";

export interface PublicProfileData {
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  color?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface PublicProfileFavorite {
  id: string;
  mod_id?: string;
  name?: string;
  icon_url?: string;
  platform?: string;
  [key: string]: unknown;
}

export interface PublicProfileAuthor {
  id: string;
  author_name: string;
  icon_url?: string;
  platform?: string;
  [key: string]: unknown;
}

export interface PublicProfileDraft {
  id: string;
  name: string;
  minecraft_version?: string;
  loader?: string;
  [key: string]: unknown;
}

export interface PublicProfileShare {
  id: string;
  mod_id?: string;
  project_id?: string;
  name?: string;
  summary?: string;
  icon_url?: string;
  platform?: string;
  pinned?: boolean | null;
  created_at?: string;
  [key: string]: unknown;
}

interface CommunityPublicProfileProps {
  profile: PublicProfileData | null;
  favorites: PublicProfileFavorite[];
  authors: PublicProfileAuthor[];
  drafts: PublicProfileDraft[];
  channels: string[];
  shares?: PublicProfileShare[];
  loading: boolean;
  onBack: () => void;
  onOpenMod: (mod: ModHit) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  affinity?: { favorites: number; creators: number };
  isCurrentUser?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

/** Full public profile is isolated so ComunidadTab remains an orchestration component. */
export function CommunityPublicProfile({ profile, favorites, authors, drafts, channels, shares = [], loading, onBack, onOpenMod, onSearchAuthor, affinity, isCurrentUser, isFollowing, onToggleFollow }: CommunityPublicProfileProps) {
  const accent = profile?.color || "var(--color-primary)";
  return (
    <motion.div key="profile-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 overflow-y-auto pb-28 scrollbar-none">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-[10px] font-bold text-white/45 transition-colors hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a miembros
      </button>

      <div className="mb-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/80 shadow-[0_16px_38px_rgba(0,0,0,0.22)]">
        <div className="relative h-24 w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}35 0%, #0c0c0c 100%)` }}>
          {profile?.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        </div>
        <div className="relative px-4 pb-4">
          <div className="relative z-10 -mt-7 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 bg-surface shadow-xl" style={{ borderColor: accent }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-black uppercase" style={{ color: accent }}>{(profile?.username || "?").slice(0, 2)}</span>}
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div><h3 className="text-sm font-black text-white">@{profile?.username || "usuario"}</h3><p className="mt-0.5 flex items-center gap-1 text-[9px] text-white/35"><Calendar className="h-3 w-3" /> Miembro desde {formatCommunityDate(profile?.created_at)}</p><p className="mt-1 text-[8px] text-white/45">{affinity?.favorites || 0} favoritos y {affinity?.creators || 0} creadores en común</p></div>
            {!isCurrentUser && onToggleFollow && <button type="button" aria-pressed={isFollowing} onClick={onToggleFollow} className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[9px] font-bold ${isFollowing ? "mim-control-3d-active border-blue-500/25 bg-blue-500/12 text-blue-400" : "mim-control-3d border-border text-white/60"}`}><UserPlus className="h-3.5 w-3.5" />{isFollowing ? "Siguiendo" : "Seguir"}</button>}
          </div>
        </div>
      </div>

      {loading ? <PublicProfileSkeleton /> : (
        <div className="flex flex-col gap-5">
          {(() => {
            const sortedShares = [...shares].sort((a, b) => {
              // Prefer the real DB column; fall back to the summary blob for older rows.
              const parsePri = (row: PublicProfileShare) => {
                // pinned = true means explicitly pinned via DB. pinned = false means explicitly NOT pinned.
                // Only fall back to blob parsing when the column is null/undefined (pre-migration rows).
                if (row.pinned === true) return true;
                if (row.pinned === false) return false;
                const s = row.summary;
                if (!s) return false;
                const tr = String(s).trim();
                if (tr.startsWith("{")) {
                  try { return !!JSON.parse(tr).priority; } catch { return false; }
                }
                const match = tr.match(/<!--mim:([\s\S]*?)-->/);
                if (match?.[1]) {
                  try { return !!JSON.parse(match[1]).priority; } catch { return false; }
                }
                return false;
              };
              const aPriority = parsePri(a);
              const bPriority = parsePri(b);
              if (aPriority !== bPriority) {
                return bPriority ? 1 : -1;
              }
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            return (
              <ProfileSection icon={<Share2 className="h-3.5 w-3.5" />} title="Recomendados (Compartidos)" count={sortedShares.length} color="text-amber-500" empty="No tiene recomendaciones públicas." layout="horizontal" horizontalMaxClass="max-h-52">
                {sortedShares.map((share) => (
                  <ShareProfileCard key={share.id} share={share} onOpenMod={onOpenMod} />
                ))}
              </ProfileSection>
            );
          })()}

          <ProfileSection icon={<Layers className="h-3.5 w-3.5" />} title="Modpacks públicos" count={drafts.length} color="text-emerald-400" empty="No tiene drafts públicos.">
            {drafts.map((draft) => <InfoRow key={draft.id} icon={<Layers className="h-4 w-4 text-emerald-400" />} title={draft.name} meta={`${draft.minecraft_version} · ${draft.loader}`} />)}
          </ProfileSection>

          <ProfileSection icon={<Heart className="h-3.5 w-3.5" />} title="Proyectos favoritos" count={favorites.length} color="text-red-400" empty="No tiene proyectos favoritos públicos." layout="horizontal">
            {favorites.map((favorite) => (
              <button
                key={favorite.id}
                type="button"
                onClick={() => onOpenMod({
                  projectId: favorite.mod_id || favorite.id,
                  title: favorite.name || "",
                  description: "",
                  iconUrl: favorite.icon_url,
                  author: "",
                  projectType: "mod",
                  categories: [],
                  url: favorite.platform === "curseforge"
                    ? `https://www.curseforge.com/minecraft/mc-mods/${favorite.mod_id || favorite.id}`
                    : `https://modrinth.com/mod/${favorite.mod_id || favorite.id}`,
                  _source: favorite.platform || "modrinth",
                })}
                className="flex w-[112px] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 text-center transition-all hover:border-white/15 hover:bg-white/[0.045] active:scale-[0.985]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04]">
                  {favorite.icon_url ? (
                    <img src={favorite.icon_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold uppercase text-white/35">{favorite.name?.slice(0, 2)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-white">{favorite.name}</p>
                  <p className="mt-1 text-[8px] capitalize text-white/35">{favorite.platform}</p>
                </div>
              </button>
            ))}
          </ProfileSection>

          <ProfileSection icon={<UserCheck className="h-3.5 w-3.5" />} title="Autores seguidos" count={authors.length} color="text-blue-400" empty="No sigue a ningún autor todavía." layout="horizontal">
            {authors.map((author) => (
              <button
                key={author.id}
                type="button"
                disabled={!onSearchAuthor}
                onClick={() => onSearchAuthor?.(author.author_name, author.platform || "modrinth")}
                className="flex w-[112px] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 text-center transition-all enabled:hover:border-white/15 enabled:hover:bg-white/[0.045] enabled:active:scale-[0.985] disabled:opacity-60"
              >
                <SquareAvatar src={author.icon_url} fallback={author.author_name} round />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-white">{author.author_name}</p>
                  <p className="mt-1 text-[8px] capitalize text-white/35">{author.platform}</p>
                </div>
              </button>
            ))}
          </ProfileSection>

          {!!channels.length && (
            <ProfileSection icon={<Tv2 className="h-3.5 w-3.5" />} title="Canales de showcase" count={channels.length} color="text-rose-400" empty="" layout="horizontal">
              {channels.map((channel, index) => (
                <div
                  key={`${channel}-${index}`}
                  className="flex w-[148px] shrink-0 snap-start items-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"
                >
                  <p className="truncate font-mono text-[11px] text-white/65">{channel}</p>
                </div>
              ))}
            </ProfileSection>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ShareProfileCard({ share, onOpenMod }: { share: PublicProfileShare; onOpenMod: (mod: ModHit) => void }) {
  const meta = parseShareMeta(share.summary);
  const isYoutube = share.platform === "youtube" || meta.projectType?.startsWith("youtube-");
  const isPriority = share.pinned === true ? true : share.pinned == null ? !!meta.priority : false;
  const projectId = share.mod_id || share.project_id || share.id;
  const platform = share.platform || "modrinth";
  const playVideo = () => meta.embeddedVideoId && window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: meta.embeddedVideoId } }));
  const openMod = () => onOpenMod({
    projectId,
    title: share.name || "",
    description: meta.comment || "",
    iconUrl: share.icon_url,
    author: "",
    projectType: meta.projectType || "mod",
    categories: [],
    url: platform === "curseforge"
      ? `https://www.curseforge.com/minecraft/mc-mods/${projectId}`
      : `https://modrinth.com/${meta.projectType || "mod"}/${projectId}`,
    _source: platform,
  });

  return (
    <button
      type="button"
      onClick={() => (isYoutube && meta.embeddedVideoId ? playVideo() : openMod())}
      className={`flex w-[248px] shrink-0 snap-start flex-col gap-2 rounded-xl border bg-white/[0.025] p-3 text-left transition-all active:scale-[0.985] ${
        isPriority
          ? "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.20)] hover:border-amber-400/80"
          : "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.045]"
      }`}
    >
      <div className="flex items-center gap-3">
        <SquareAvatar src={share.icon_url} fallback={share.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{share.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] capitalize text-white/35">
            <span>{platform}</span>
            {isPriority && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider text-amber-400">
                <Pin className="h-2.5 w-2.5 fill-current" /> Fijado
              </span>
            )}
          </p>
        </div>
        {isYoutube && meta.embeddedVideoId ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600/20 text-orange-400">
            <Play className="h-3 w-3 fill-current ml-0.5" />
          </span>
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
        )}
      </div>
      {meta.comment && (
        <p className="line-clamp-3 border-t border-white/[0.04] pt-2 text-[10px] leading-relaxed text-white/60">
          {meta.comment}
        </p>
      )}
    </button>
  );
}

function ProfileSection({
  icon,
  title,
  count,
  color,
  empty,
  children,
  layout = "vertical",
  horizontalMaxClass = "max-h-40",
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  empty: string;
  children?: React.ReactNode;
  layout?: "vertical" | "horizontal";
  horizontalMaxClass?: string;
}) {
  const isHorizontal = layout === "horizontal";

  return (
    <section className={`flex flex-col gap-2 ${isHorizontal ? horizontalMaxClass : ""}`}>
      <div className="flex items-center gap-2 px-1">
        <span className={color}>{icon}</span>
        <h4 className="text-xs font-bold text-white/80">{title}</h4>
        <span className="ml-auto rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-white/35">{count}</span>
        {isHorizontal && count > 0 && (
          <span className="text-[7px] font-mono uppercase text-white/25">Deslizá →</span>
        )}
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.07] p-4 text-center">
          <p className="text-[10px] text-white/30">{empty}</p>
        </div>
      ) : isHorizontal ? (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-0.5 pb-1 pr-2 scrollbar-none">
          {children}
        </div>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </section>
  );
}

function InfoRow({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">{icon}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{title}</p><p className="mt-0.5 text-[9px] text-white/35">{meta}</p></div></div>;
}

function SquareAvatar({ src, fallback, round = false }: { src?: string; fallback?: string; round?: boolean }) {
  return <div className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border border-white/[0.07] bg-white/[0.04] ${round ? "rounded-full" : "rounded-lg"}`}>{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-[9px] font-bold uppercase text-white/35">{fallback?.slice(0, 2)}</span>}</div>;
}
