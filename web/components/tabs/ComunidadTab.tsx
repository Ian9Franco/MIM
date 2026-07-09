"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ChevronRight, Trophy, Users, ArrowLeft, Heart, UserCheck,
  Calendar, Layers, BookOpen, Tv2, Share2, MessageSquare, Clock, Trash2,
} from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { supabase } from "../../lib/supabaseClient";
import { RankingsSkeleton, MiembrosSkeleton, PublicProfileSkeleton } from "../FomoSkeletons";

interface ComunidadTabProps {
  rankings: ModHit[];
  loadingRankings: boolean;
  handleOpenModDetails: (mod: ModHit) => void;
  session: any;
  onSearchAuthor?: (name: string, platform: string) => void;
}

type ComunidadView = "list" | "profile";

/**
 * ComunidadTab — Rankings comunitarios + directorio de perfiles de usuarios.
 * Permite ver el perfil público de cualquier miembro: favoritos, autores seguidos,
 * canales de showcase, drafts creados, avatar, banner y fecha de registro.
 */
export function ComunidadTab({ rankings, loadingRankings, handleOpenModDetails, session, onSearchAuthor }: ComunidadTabProps) {
  const [subTab, setSubTab] = useState<"compartidos" | "rankings" | "miembros">("compartidos");
  const [view, setView] = useState<ComunidadView>("list");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Shares Feed state
  const [sharesFeed, setSharesFeed] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Profile list state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Selected user public data
  const [pubFavorites, setPubFavorites] = useState<any[]>([]);
  const [pubAuthors, setPubAuthors] = useState<any[]>([]);
  const [pubDrafts, setPubDrafts] = useState<any[]>([]);
  const [pubChannels, setPubChannels] = useState<string[]>([]);
  const [loadingPub, setLoadingPub] = useState(false);

  /** Load all public profiles on mount or when switching to Miembros sub-tab */
  useEffect(() => {
    if (subTab !== "miembros") return;
    if (profiles.length > 0) return;
    setLoadingProfiles(true);
    supabase
      .from("profiles")
      .select("id, username, avatar_url, banner_url, color, created_at, banner_meta")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setProfiles(data || []);
        setLoadingProfiles(false);
      });
  }, [subTab]);

  const loadSharesFeed = async () => {
    try {
      setLoadingShares(true);
      const { data, error } = await supabase
        .from("favorite_mods")
        .select(`
          id,
          mod_id,
          platform,
          name,
          icon_url,
          summary,
          created_at,
          profile:profiles(id, username, avatar_url, color)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setSharesFeed(data || []);
    } catch (err) {
      console.error("Error loading shares feed:", err);
    } finally {
      setLoadingShares(false);
    }
  };

  useEffect(() => {
    if (subTab === "compartidos") {
      void loadSharesFeed();
    }
  }, [subTab]);

  /** Load public data for a selected profile */
  const openProfile = async (prof: any) => {
    setSelectedProfile(prof);
    setView("profile");
    setPubFavorites([]);
    setPubAuthors([]);
    setPubDrafts([]);
    setPubChannels([]);
    setLoadingPub(true);

    const [{ data: favs }, { data: authors }, { data: drafts }] = await Promise.all([
      supabase.from("followed_mods").select("*").eq("profile_id", prof.id),
      supabase.from("followed_authors").select("*").eq("profile_id", prof.id),
      supabase
        .from("drafts")
        .select("id, name, minecraft_version, loader, visibility, cover_image")
        .eq("owner_id", prof.id)
        .eq("visibility", "public"),
    ]);

    setPubFavorites(favs || []);
    setPubAuthors(authors || []);
    setPubDrafts(drafts || []);

    // Extract showcase channels from banner_meta if present
    const channels: string[] = prof.banner_meta?.youtube_channels
      ?.filter((c: any) => c.visible !== false)
      ?.map((c: any) => c.name || c.url || c)
      ?.filter(Boolean) || [];
    setPubChannels(channels);
    setLoadingPub(false);
  };

  const backToList = () => {
    setView("list");
    setSelectedProfile(null);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("es-AR", { year: "numeric", month: "long" });
  };

  return (
    <motion.div
      key="comunidad"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Header */}
      <div
        className="border-l-2 rounded-r-lg p-3 mb-4 shrink-0"
        style={{
          background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
          borderColor: "var(--color-primary)",
        }}
      >
        <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>
          Comunidad
        </p>
        <h2 className="text-xs font-semibold text-white/90 mt-1">
          Rankings, miembros y perfiles públicos de la comunidad MIM.
        </h2>
      </div>

      {/* Sub-tab pills */}
      <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: "compartidos", label: "Compartidos", icon: Share2 },
          { id: "rankings", label: "Rankings", icon: Trophy },
          { id: "miembros", label: "Miembros", icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setSubTab(id as any); setView("list"); setSelectedProfile(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
              subTab === id
                ? "text-white border-white/20 bg-white/10"
                : "text-white/45 border-white/[0.06] bg-transparent hover:border-white/10"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Compartidos ── */}
      {subTab === "compartidos" && view === "list" && (
        <>
          {loadingShares ? (
            <SharesSkeleton />
          ) : sharesFeed.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-4 pb-28 pr-1 scrollbar-none">
              {sharesFeed.map((item) => {
                const meta = parseShareMeta(item.summary);
                const projectId = item.mod_id || item.project_id || item.id;
                const projectType = meta.projectType || "mod";
                const modHit: ModHit = {
                  projectId,
                  title: item.name || "Mod",
                  description: meta.comment || "",
                  iconUrl: item.icon_url || null,
                  author: "Comunidad",
                  projectType,
                  categories: [item.platform || "modrinth"],
                  url: item.platform === "curseforge"
                    ? `https://www.curseforge.com/minecraft/mc-mods/${projectId}`
                    : `https://modrinth.com/${projectType}/${projectId}`,
                  _source: item.platform || "modrinth",
                };

                const userColor = item.profile?.color || "#F05A28";
                const userInitial = item.profile?.username?.substring(0, 2) || "U";

                return (
                  <div
                    key={item.id}
                    className="bg-surface/85 border border-white/[0.08] rounded-3xl p-4 flex flex-col gap-3.5 hover:border-white/15 transition-all shadow-md"
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => openProfile(item.profile)}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <div
                          className="w-8 h-8 rounded-xl bg-surface border flex items-center justify-center text-xs font-bold uppercase overflow-hidden transition-all group-hover:scale-105"
                          style={{ borderColor: userColor }}
                        >
                          {item.profile?.avatar_url ? (
                            <img src={item.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span style={{ color: userColor }}>{userInitial}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-white group-hover:text-amber-400 transition-colors">
                            @{item.profile?.username || "Usuario"}
                          </span>
                          <span className="text-[8px] text-white/35 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 animate-pulse" />
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Speech Bubble Comment */}
                    {meta.comment && (
                      <div className="bg-white/[0.02] border-l-2 border-amber-500/50 rounded-r-xl rounded-bl-xl p-3 text-xs text-white/80 italic flex gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500/50 shrink-0 mt-0.5" />
                        <p className="line-clamp-4 leading-relaxed whitespace-pre-wrap">{meta.comment}</p>
                      </div>
                    )}

                    {/* Mod Item Card */}
                    <div
                      onClick={() => handleOpenModDetails(modHit)}
                      className="bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-2xl p-3 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-surface border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                          {item.icon_url ? (
                            <img src={item.icon_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-white/40 text-xs font-bold uppercase">{item.name?.substring(0, 2)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm ${
                              item.platform === "curseforge" ? "bg-orange-600/20 text-orange-400 border border-orange-500/20" : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {item.platform === "curseforge" ? "CurseForge" : "Modrinth"}
                            </span>
                            {meta.modloader && (
                              <span className="text-[8px] font-mono text-white/40 uppercase">{meta.modloader}</span>
                            )}
                            {meta.gameVersion && (
                              <span className="text-[8px] font-mono text-white/40">{meta.gameVersion}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
              <Share2 className="w-12 h-12 text-white/20 mb-4 animate-bounce" />
              <h2 className="text-sm font-semibold text-white">Sin mods compartidos</h2>
              <p className="text-xs text-white/40 max-w-xs mt-2">
                Los mods compartidos por la comunidad aparecerán aquí en tiempo real con sus comentarios.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Rankings ── */}
      {subTab === "rankings" && (
        <>
          {loadingRankings ? (
            <RankingsSkeleton />
          ) : rankings.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-3 pb-28 pr-1 scrollbar-none">
              {rankings.map((mod, i) => (
                <div
                  key={mod.projectId}
                  onClick={() => handleOpenModDetails(mod)}
                  className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-white/10"
                >
                  <div className="w-6 text-center font-mono font-black text-sm text-purple-400/80">#{i + 1}</div>
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {mod.iconUrl ? (
                      <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                    <p className="text-[9px] text-white/40 mt-0.5 capitalize">{mod._source}</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                    {mod.downloads} {mod.downloads === 1 ? "voto" : "votos"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
              <Trophy className="w-12 h-12 text-purple-400 mb-4 opacity-50" />
              <h2 className="text-sm font-semibold text-white">Sin rankings</h2>
              <p className="text-xs text-white/40 mt-1">No hay votos registrados todavía.</p>
            </div>
          )}
        </>
      )}

      {/* ── Miembros ── */}
      {subTab === "miembros" && (
        <AnimatePresence mode="wait">
          {view === "list" ? (
            /* ─ Profile list ─ */
            <motion.div
              key="members-list"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex-1 overflow-y-auto pb-28 scrollbar-none space-y-3"
            >
              {loadingProfiles ? (
                <MiembrosSkeleton />
              ) : profiles.length === 0 ? (
                <div className="text-center p-8">
                  <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-xs text-white/40">No hay miembros registrados aún.</p>
                </div>
              ) : (
                profiles.map((prof) => (
                  <div
                    key={prof.id}
                    onClick={() => openProfile(prof)}
                    className="bg-surface/80 border border-border hover:border-white/10 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border"
                      style={{ borderColor: prof.color || "rgba(255,255,255,0.08)" }}
                    >
                      {prof.avatar_url ? (
                        <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black uppercase" style={{ color: prof.color || "var(--color-primary)" }}>
                          {(prof.username || "?").substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">@{prof.username || "usuario"}</p>
                      <p className="text-[9px] text-white/35 mt-0.5">
                        Miembro desde {formatDate(prof.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            /* ─ Public Profile Detail ─ */
            <motion.div
              key="profile-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-y-auto pb-28 scrollbar-none"
            >
              {/* Back button */}
              <button
                onClick={backToList}
                className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a miembros
              </button>

              {/* Profile card */}
              <div className="bg-surface/90 border border-border rounded-2xl overflow-hidden mb-5">
                {/* Banner */}
                <div className="h-24 w-full relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${selectedProfile?.color || "var(--color-primary)"}33 0%, #0c0c0c 100%)` }}
                >
                  {selectedProfile?.banner_url && (
                    <img src={selectedProfile.banner_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="px-4 pb-4 pt-0 relative">
                  <div
                    className="w-14 h-14 rounded-xl border-2 flex items-center justify-center overflow-hidden -mt-7 shadow-lg z-10 relative bg-surface"
                    style={{ borderColor: selectedProfile?.color || "rgba(255,255,255,0.1)" }}
                  >
                    {selectedProfile?.avatar_url ? (
                      <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black uppercase" style={{ color: selectedProfile?.color || "var(--color-primary)" }}>
                        {(selectedProfile?.username || "?").substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-white mt-2">@{selectedProfile?.username || "usuario"}</h3>
                  <p className="text-[10px] text-white/35 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Miembro desde {formatDate(selectedProfile?.created_at)}
                  </p>
                </div>
              </div>

              {loadingPub ? (
                <PublicProfileSkeleton />
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Public Drafts */}
                  <ProfileSection
                    icon={<Layers className="w-3.5 h-3.5" />}
                    title="Modpacks Públicos"
                    count={pubDrafts.length}
                    color="text-emerald-400"
                    empty="No tiene drafts públicos."
                  >
                    {pubDrafts.map((d) => (
                      <div key={d.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{d.name}</p>
                          <p className="text-[9px] text-white/35 mt-0.5">{d.minecraft_version} · {d.loader}</p>
                        </div>
                      </div>
                    ))}
                  </ProfileSection>

                  {/* Favorite mods */}
                  <ProfileSection
                    icon={<Heart className="w-3.5 h-3.5" />}
                    title="Proyectos Favoritos"
                    count={pubFavorites.length}
                    color="text-red-400"
                    empty="No tiene proyectos favoritos públicos."
                  >
                    {pubFavorites.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => handleOpenModDetails({
                          projectId: f.mod_id || f.id,
                          title: f.name,
                          description: "",
                          iconUrl: f.icon_url,
                          author: "",
                          projectType: "mod",
                          categories: [],
                          url: `https://modrinth.com/mod/${f.mod_id || f.id}`,
                          _source: f.platform || "modrinth",
                        })}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] hover:border-white/10 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden shrink-0">
                          {f.icon_url
                            ? <img src={f.icon_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[9px] font-bold uppercase text-white/40">{f.name?.substring(0, 2)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{f.name}</p>
                          <p className="text-[9px] text-white/35 mt-0.5 capitalize">{f.platform}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 ml-auto" />
                      </div>
                    ))}
                  </ProfileSection>

                  {/* Followed authors */}
                  <ProfileSection
                    icon={<UserCheck className="w-3.5 h-3.5" />}
                    title="Autores Seguidos"
                    count={pubAuthors.length}
                    color="text-blue-400"
                    empty="No sigue a ningún autor todavía."
                  >
                    {pubAuthors.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => onSearchAuthor && onSearchAuthor(a.author_name, a.platform || "modrinth")}
                        className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 ${
                          onSearchAuthor ? "cursor-pointer hover:border-white/20 active:scale-[0.98] transition-all" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                          {a.icon_url
                            ? <img src={a.icon_url} alt="" className="w-full h-full object-cover rounded-full" />
                            : <span className="text-[9px] font-bold text-blue-400">{a.author_name?.substring(0, 2)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{a.author_name}</p>
                          <p className="text-[9px] text-white/35 mt-0.5 capitalize">{a.platform}</p>
                        </div>
                        {onSearchAuthor && <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 ml-auto" />}
                      </div>
                    ))}
                  </ProfileSection>

                  {/* Showcase channels */}
                  {pubChannels.length > 0 && (
                    <ProfileSection
                      icon={<Tv2 className="w-3.5 h-3.5" />}
                      title="Canales de Showcase"
                      count={pubChannels.length}
                      color="text-rose-400"
                      empty=""
                    >
                      {pubChannels.map((ch, idx) => (
                        <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
                          <p className="text-xs text-white/70 truncate font-mono">{ch}</p>
                        </div>
                      ))}
                    </ProfileSection>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

/** Reusable collapsible section for the public profile view */
function ProfileSection({
  icon, title, count, color, empty, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className={color}>{icon}</span>
        <h4 className="text-xs font-bold text-white/80">{title}</h4>
        <span className="ml-auto text-[9px] font-mono text-white/30">{count}</span>
      </div>
      {count === 0 ? (
        <div className="bg-white/[0.01] border border-dashed border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-[10px] text-white/35">{empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </div>
  );
}

function parseShareMeta(summary?: string | null): { comment: string; gameVersion?: string; modloader?: string; projectType?: string } {
  if (!summary) return { comment: "" };
  const trimmed = summary.trim();

  // 1. Try old JSON format
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        comment: parsed.comment || parsed.description || "",
        gameVersion: parsed.gameVersion,
        modloader: parsed.modloader,
        projectType: parsed.projectType || "mod",
      };
    } catch {}
  }

  // 2. Try new HTML comment format
  const META_RE = /<!--mim:([\s\S]*?)-->/;
  const match = trimmed.match(META_RE);
  const comment = trimmed.replace(META_RE, "").trim();

  if (match && match[1]) {
    try {
      const meta = JSON.parse(match[1]);
      return {
        comment,
        gameVersion: meta.gameVersion,
        modloader: meta.modloader,
        projectType: meta.projectType || "mod",
      };
    } catch {}
  }

  // Fallback: entire summary is the comment
  return { comment: trimmed };
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "ahora mismo";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function SharesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface/60 border border-white/[0.06] rounded-3xl p-4 animate-pulse flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="flex-grow flex flex-col gap-1.5">
              <div className="w-24 h-3 bg-white/10 rounded" />
              <div className="w-16 h-2 bg-white/5 rounded" />
            </div>
          </div>
          <div className="h-10 bg-white/5 rounded-2xl" />
          <div className="h-12 bg-white/10 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
