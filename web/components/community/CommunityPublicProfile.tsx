"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ChevronRight, Heart, Layers, Tv2, UserCheck, Share2, Play, Pin } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { PublicProfileSkeleton } from "../FomoSkeletons";
import { formatCommunityDate } from "./communityUtils";

interface CommunityPublicProfileProps {
  profile: any;
  favorites: any[];
  authors: any[];
  drafts: any[];
  channels: string[];
  shares?: any[];
  loading: boolean;
  onBack: () => void;
  onOpenMod: (mod: ModHit) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
}

/** Full public profile is isolated so ComunidadTab remains an orchestration component. */
export function CommunityPublicProfile({ profile, favorites, authors, drafts, channels, shares = [], loading, onBack, onOpenMod, onSearchAuthor }: CommunityPublicProfileProps) {
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
          <h3 className="mt-2 text-sm font-black text-white">@{profile?.username || "usuario"}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[9px] text-white/35"><Calendar className="h-3 w-3" /> Miembro desde {formatCommunityDate(profile?.created_at)}</p>
        </div>
      </div>

      {loading ? <PublicProfileSkeleton /> : (
        <div className="flex flex-col gap-5">
          {(() => {
            const sortedShares = [...shares].sort((a, b) => {
              // Prefer the real DB column; fall back to the summary blob for older rows.
              const parsePri = (row: any) => {
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
              <ProfileSection icon={<Share2 className="h-3.5 w-3.5" />} title="Recomendados (Compartidos)" count={sortedShares.length} color="text-amber-500" empty="No tiene recomendaciones públicas.">
                {sortedShares.map((share) => {
                  const summaryTrimmed = (share.summary || "").trim();
                  let comment = summaryTrimmed;
                  let isYoutube = share.platform === "youtube";
                  let embeddedVideoId = "";
                  if (summaryTrimmed.startsWith("{")) {
                    try {
                      const p = JSON.parse(summaryTrimmed);
                      comment = p.comment || p.description || "";
                      embeddedVideoId = p.embeddedVideoId || "";
                      if (p.projectType?.startsWith("youtube-")) isYoutube = true;
                    } catch {}
                  } else {
                    const match = summaryTrimmed.match(/<!--mim:([\s\S]*?)-->/);
                    comment = summaryTrimmed.replace(/<!--mim:([\s\S]*?)-->/, "").trim();
                    if (match?.[1]) {
                      try {
                        const p = JSON.parse(match[1]);
                        embeddedVideoId = p.embeddedVideoId || "";
                        if (p.projectType?.startsWith("youtube-")) isYoutube = true;
                      } catch {}
                    }
                  }

                  // pinned = true → DB column is the source of truth.
                  // pinned = null/undefined → pre-migration row, fall back to summary blob.
                  // pinned = false → explicitly NOT pinned, don't fall back.
                  let isPriority = false;
                  if (share.pinned === true) {
                    isPriority = true;
                  } else if (share.pinned == null) {
                    if (summaryTrimmed.startsWith("{")) {
                      try { isPriority = !!JSON.parse(summaryTrimmed).priority; } catch {}
                    } else {
                      const match = summaryTrimmed.match(/<!--mim:([\s\S]*?)-->/);
                      if (match?.[1]) { try { isPriority = !!JSON.parse(match[1]).priority; } catch {} }
                    }
                  }

                  const projectId = share.mod_id || share.project_id || share.id;
                  const playVideo = () => embeddedVideoId && window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: embeddedVideoId } }));

                  return (
                    <div key={share.id} className="relative flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <div className="flex items-center gap-3">
                        <SquareAvatar src={share.icon_url} fallback={share.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">{share.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[9px] capitalize text-white/35">
                            <span>{share.platform}</span>
                            {isPriority && (
                              <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold uppercase text-[7px] tracking-wider bg-amber-500/10 px-1 py-0.5 rounded">
                                <Pin className="h-2.5 w-2.5 fill-current" /> Fijado
                              </span>
                            )}
                          </p>
                        </div>
                        {isYoutube ? (
                          embeddedVideoId && (
                            <button type="button" onClick={playVideo} className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 active:scale-95 transition-all">
                              <Play className="h-3 w-3 fill-current ml-0.5" />
                            </button>
                          )
                        ) : (
                          <button type="button" onClick={() => onOpenMod({ projectId, title: share.name, description: "", iconUrl: share.icon_url, author: "", projectType: "mod", categories: [], url: share.platform === "curseforge" ? `https://www.curseforge.com/minecraft/mc-mods/${projectId}` : `https://modrinth.com/mod/${projectId}`, _source: share.platform || "modrinth" })} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {comment && (
                        <p className="text-[10px] text-white/60 leading-relaxed border-t border-white/[0.04] pt-2 mt-1 whitespace-pre-wrap">{comment}</p>
                      )}
                    </div>
                  );
                })}
              </ProfileSection>
            );
          })()}

          <ProfileSection icon={<Layers className="h-3.5 w-3.5" />} title="Modpacks públicos" count={drafts.length} color="text-emerald-400" empty="No tiene drafts públicos.">
            {drafts.map((draft) => <InfoRow key={draft.id} icon={<Layers className="h-4 w-4 text-emerald-400" />} title={draft.name} meta={`${draft.minecraft_version} · ${draft.loader}`} />)}
          </ProfileSection>

          <ProfileSection icon={<Heart className="h-3.5 w-3.5" />} title="Proyectos favoritos" count={favorites.length} color="text-red-400" empty="No tiene proyectos favoritos públicos.">
            {favorites.map((favorite) => (
              <button key={favorite.id} type="button" onClick={() => onOpenMod({ projectId: favorite.mod_id || favorite.id, title: favorite.name, description: "", iconUrl: favorite.icon_url, author: "", projectType: "mod", categories: [], url: `https://modrinth.com/mod/${favorite.mod_id || favorite.id}`, _source: favorite.platform || "modrinth" })} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.045] active:scale-[0.985]">
                <SquareAvatar src={favorite.icon_url} fallback={favorite.name} />
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{favorite.name}</p><p className="mt-0.5 text-[9px] capitalize text-white/35">{favorite.platform}</p></div>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20" />
              </button>
            ))}
          </ProfileSection>

          <ProfileSection icon={<UserCheck className="h-3.5 w-3.5" />} title="Autores seguidos" count={authors.length} color="text-blue-400" empty="No sigue a ningún autor todavía.">
            {authors.map((author) => (
              <button key={author.id} type="button" disabled={!onSearchAuthor} onClick={() => onSearchAuthor?.(author.author_name, author.platform || "modrinth")} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition-all enabled:hover:border-white/15 enabled:hover:bg-white/[0.045] enabled:active:scale-[0.985]">
                <SquareAvatar src={author.icon_url} fallback={author.author_name} round />
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{author.author_name}</p><p className="mt-0.5 text-[9px] capitalize text-white/35">{author.platform}</p></div>
                {onSearchAuthor && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20" />}
              </button>
            ))}
          </ProfileSection>

          {!!channels.length && <ProfileSection icon={<Tv2 className="h-3.5 w-3.5" />} title="Canales de showcase" count={channels.length} color="text-rose-400" empty="">{channels.map((channel, index) => <div key={`${channel}-${index}`} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"><p className="truncate font-mono text-xs text-white/65">{channel}</p></div>)}</ProfileSection>}
        </div>
      )}
    </motion.div>
  );
}

function ProfileSection({ icon, title, count, color, empty, children }: { icon: React.ReactNode; title: string; count: number; color: string; empty: string; children?: React.ReactNode }) {
  return <section className="flex flex-col gap-2"><div className="flex items-center gap-2 px-1"><span className={color}>{icon}</span><h4 className="text-xs font-bold text-white/80">{title}</h4><span className="ml-auto rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-white/35">{count}</span></div>{count === 0 ? <div className="rounded-xl border border-dashed border-white/[0.07] p-4 text-center"><p className="text-[10px] text-white/30">{empty}</p></div> : <div className="flex flex-col gap-2">{children}</div>}</section>;
}

function InfoRow({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">{icon}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{title}</p><p className="mt-0.5 text-[9px] text-white/35">{meta}</p></div></div>;
}

function SquareAvatar({ src, fallback, round = false }: { src?: string; fallback?: string; round?: boolean }) {
  return <div className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border border-white/[0.07] bg-white/[0.04] ${round ? "rounded-full" : "rounded-lg"}`}>{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-[9px] font-bold uppercase text-white/35">{fallback?.slice(0, 2)}</span>}</div>;
}

