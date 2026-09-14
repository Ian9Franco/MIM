"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronRight,
  FlaskConical,
  Heart,
  Layers,
  LogOut,
  Share2,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";
import { mimDB } from "@/lib/storage/indexeddb";
import type { SharedFavorite } from "./CommunityModPool";

interface CommunityProfileTabProps {
  userId: string;
  profile: {
    username?: string;
    avatar_url?: string | null;
    banner_url?: string | null;
    color?: string | null;
    banner_meta?: { zoom?: number; x?: number; y?: number; blur?: number } | null;
  } | null;
  email?: string;
  isModern: boolean;
  ownShares: SharedFavorite[];
  onEditProfile: () => void;
  onSignOut: () => void;
  onOpenProjectDetails?: (id: string, platform?: string) => void;
  onGoToDrafts: () => void;
  onGoToPool: () => void;
}

function StatCard({
  label,
  count,
  icon: Icon,
  tone,
  onClick,
  isModern,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  onClick?: () => void;
  isModern: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-1 py-2.5 text-center transition-transform active:translate-y-px ${
        isModern ? "border-border bg-card" : "border-white/8 bg-white/3"
      }`}
    >
      <span className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <strong className={`block text-sm leading-none ${isModern ? "text-foreground" : "text-white"}`}>{count}</strong>
      <span className={`mt-1 block truncate text-[8px] font-semibold ${isModern ? "text-muted-foreground" : "text-white/45"}`}>
        {label}
      </span>
    </button>
  );
}

export function CommunityProfileTab({
  userId,
  profile,
  email,
  isModern,
  ownShares,
  onEditProfile,
  onSignOut,
  onOpenProjectDetails,
  onGoToDrafts,
  onGoToPool,
}: CommunityProfileTabProps) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [followedAuthors, setFollowedAuthors] = useState<any[]>([]);
  const [privateFavorites, setPrivateFavorites] = useState<any[]>([]);

  const bannerMeta = profile?.banner_meta ?? { zoom: 1, x: 0, y: 0, blur: 0 };

  useEffect(() => {
    const load = async () => {
      const [ownedRes, memberRes, favsRes] = await Promise.all([
        supabase
          .from("drafts")
          .select("id, name, description, updated_at, cover_image, loader, minecraft_version, visibility, profiles!drafts_owner_id_fkey(username)")
          .eq("owner_id", userId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("draft_members")
          .select("drafts(id, name, description, updated_at, cover_image, loader, minecraft_version, visibility)")
          .eq("user_id", userId),
        supabase.from("favorite_mods").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
      ]);

      const owned = ownedRes.data || [];
      const member = (memberRes.data || []).map((m: any) => m.drafts).filter(Boolean);
      const map = new Map<string, any>();
      [...owned, ...member].forEach((d) => map.set(d.id, d));
      setDrafts(Array.from(map.values()));
      setPrivateFavorites(favsRes.data || []);

      try {
        const authors = await mimDB.getAllFollowedAuthors();
        setFollowedAuthors(authors || []);
      } catch {
        setFollowedAuthors([]);
      }
    };
    load();
  }, [userId]);

  const latestDraft = useMemo(() => drafts[0] ?? null, [drafts]);

  const textMuted = isModern ? "text-muted-foreground" : "text-white/50";
  const textMain = isModern ? "text-foreground" : "text-white";
  const borderCls = isModern ? "border-border" : "border-white/8";

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-8 space-y-6">
      {/* Banner header */}
      <div className={`relative shrink-0 flex flex-col justify-end p-6 pb-6 overflow-hidden min-h-36 rounded-2xl border ${borderCls}`}>
        {profile?.banner_url ? (
          <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
            <img
              src={profile.banner_url}
              alt=""
              className="w-full h-full object-cover"
              style={{
                objectPosition: `calc(50% + ${bannerMeta.x}px) calc(50% + ${bannerMeta.y}px)`,
                transform: `scale(${bannerMeta.zoom})`,
                filter: `blur(${bannerMeta.blur}px)`,
              }}
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 z-0 rounded-2xl"
            style={{
              background: `radial-gradient(ellipse 120% 100% at 80% 0%, ${profile?.color || "var(--color-primary)"}55, transparent 65%), linear-gradient(135deg, color-mix(in srgb, ${profile?.color || "var(--color-primary)"} 28%, #0a0a12), #0a0a12 70%)`,
            }}
          />
        )}
        <div
          className="absolute inset-0 z-0 opacity-60 mix-blend-screen rounded-2xl"
          style={{
            background: `radial-gradient(circle at top right, ${profile?.color || "var(--color-primary)"}70, transparent 70%)`,
          }}
        />
        <div className={`absolute inset-0 z-0 rounded-2xl ${isModern ? "bg-white/20" : "bg-black/30"}`} />

        <div className="relative z-10 flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onEditProfile} className="relative group cursor-pointer border-none bg-transparent p-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl overflow-hidden border-2"
                style={{
                  backgroundColor: profile?.color || "var(--color-primary)",
                  borderColor: isModern ? "var(--color-border)" : "rgba(255,255,255,0.15)",
                  color: "var(--color-background)",
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (profile?.username || "U").charAt(0).toUpperCase()
                )}
              </div>
            </button>
            <div>
              <h4 className={`text-xl font-black tracking-tight drop-shadow-md ${textMain}`}>
                {profile?.username || "Perfil"}
              </h4>
              {email && <p className={`text-xs font-medium drop-shadow-sm ${isModern ? "text-muted-foreground" : "text-white/80"}`}>{email}</p>}
              <button
                type="button"
                onClick={onEditProfile}
                className="mt-1 text-[10px] font-black text-primary hover:underline uppercase cursor-pointer bg-transparent border-none p-0"
              >
                Editar perfil
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${isModern ? "border-destructive/20 text-destructive bg-destructive/10" : "border-red-500/20 text-red-400 bg-red-500/10"}`}
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <nav aria-label="Resumen del perfil" className="grid grid-cols-4 gap-1.5">
        <StatCard label="Drafts" count={drafts.length} icon={Bookmark} tone="text-orange-400 bg-orange-500/10" onClick={onGoToDrafts} isModern={isModern} />
        <StatCard label="Favoritos" count={privateFavorites.length} icon={Heart} tone="text-rose-400 bg-rose-500/10" isModern={isModern} />
        <StatCard label="Compartidos" count={ownShares.length} icon={Share2} tone="text-amber-400 bg-amber-500/10" onClick={onGoToPool} isModern={isModern} />
        <StatCard label="Creadores" count={followedAuthors.length} icon={UserCheck} tone="text-blue-400 bg-blue-500/10" isModern={isModern} />
      </nav>

      {/* Continue draft */}
      {latestDraft && (
        <section>
          <p className={`text-[8px] font-mono font-bold uppercase ${textMuted}`}>Continuar trabajando</p>
          <button
            type="button"
            onClick={onGoToDrafts}
            className={`mt-2 w-full overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 ${borderCls}`}
          >
            <div className="relative h-28 overflow-hidden bg-white/4">
              {latestDraft.cover_image ? (
                <img src={latestDraft.cover_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Layers className="h-9 w-9 opacity-20" />
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[7px] font-black uppercase text-white/75">
                Retomar
              </span>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-sm font-black ${textMain}`}>{latestDraft.name}</h3>
                <p className={`mt-1 text-[9px] ${textMuted}`}>
                  {latestDraft.minecraft_version ?? "Versión libre"} · {latestDraft.loader ?? "Loader libre"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 opacity-30" />
            </div>
          </button>
        </section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <section id="profile-drafts">
          <div className="flex items-end justify-between mb-2">
            <h3 className={`text-xs font-black ${textMain}`}>Borradores</h3>
            <button type="button" onClick={onGoToDrafts} className="text-[9px] font-bold text-primary">
              Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {drafts.slice(0, 3).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={onGoToDrafts}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${borderCls} ${isModern ? "bg-card" : "bg-white/3"}`}
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                  {d.cover_image ? <img src={d.cover_image} alt="" className="h-full w-full object-cover" /> : <FlaskConical className="h-4 w-4 opacity-30" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-bold ${textMain}`}>{d.name}</p>
                  <p className={`mt-1 text-[8px] ${textMuted}`}>{d.visibility ?? "private"}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Compartidos propios */}
      {ownShares.length > 0 && (
        <section id="profile-shares">
          <h3 className={`text-xs font-black mb-2 ${textMain}`}>Compartidos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ownShares.slice(0, 4).map((fav) => (
              <button
                key={fav.id}
                type="button"
                onClick={() => onOpenProjectDetails?.(fav.mod_id, fav.platform)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${borderCls} ${isModern ? "bg-card" : "bg-white/3"}`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {fav.icon_url ? <img src={fav.icon_url} alt="" className="h-full w-full object-cover" /> : <Share2 className="h-4 w-4 m-auto opacity-30" />}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-[11px] font-bold ${textMain}`}>{fav.name}</p>
                  <p className={`text-[8px] capitalize ${textMuted}`}>{fav.platform}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Creadores seguidos */}
      {followedAuthors.length > 0 && (
        <section id="profile-creators">
          <h3 className={`text-xs font-black mb-2 ${textMain}`}>Creadores seguidos</h3>
          <div className="grid grid-cols-2 gap-2">
            {followedAuthors.slice(0, 6).map((a: any, idx) => (
              <div
                key={a.id ?? idx}
                className={`flex min-w-0 items-center gap-2 rounded-2xl border p-3 ${borderCls} ${isModern ? "bg-card" : "bg-white/3"}`}
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-[9px] font-black uppercase opacity-50">
                  {String(a.author_name ?? a.name ?? "AU").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-[10px] font-bold ${textMain}`}>{a.author_name ?? a.name ?? "Autor"}</p>
                  <p className={`text-[7px] uppercase ${textMuted}`}>{a.platform ?? "modrinth"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
