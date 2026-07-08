"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Loader2, User, Mail, Key, Bookmark, Check, Pencil, LogOut, Layers, ChevronRight, UserCheck,
} from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";

interface ProfileTabProps {
  session: any;
  profile: any;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  isRegistering: boolean;
  setIsRegistering: (v: boolean) => void;
  authLoading: boolean;
  loadingUserData: boolean;
  userDrafts: any[];
  userFavorites: any[];
  userFollowedAuthors?: any[];
  handleAuth: (e: React.FormEvent) => void;
  handleLogout: () => void;
  handleOpenEditProfile: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: (draft: any) => void;
  onCreateDraft: () => void;
  onEditDraft?: (draft: any) => void;
}

/**
 * ProfileTab — muestra login/registro o el perfil del usuario autenticado.
 * Incluye acceso a Drafts y Favoritos con click funcional.
 */
export function ProfileTab({
  session, profile, email, setEmail, password, setPassword, username,
  setUsername, isRegistering, setIsRegistering, authLoading, loadingUserData,
  userDrafts, userFavorites, userFollowedAuthors = [], handleAuth, handleLogout, handleOpenEditProfile,
  handleOpenModDetails, handleEnterDraftCollection, onCreateDraft, onEditDraft,
}: ProfileTabProps) {
  const readFavoriteMeta = (fav: any) => {
    try {
      return fav.summary?.trim?.().startsWith("{") ? JSON.parse(fav.summary) : {};
    } catch {
      return {};
    }
  };

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
    >
      {!session ? (
        /* ── Login / Register Form ── */
        <div className="my-auto bg-surface/80 border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-md font-bold text-white">FOMO Cloud Sync</h2>
            <p className="text-xs text-white/40 mt-1">
              Accedé a tus modpacks, ránkings y mods favoritos en cualquier dispositivo.
            </p>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Nombre de usuario</label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tu apodo"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Contraseña</label>
              <div className="relative">
                <Key className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRegistering ? "Registrarme" : "Iniciar Sesión"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[11px] text-orange-400 font-semibold hover:underline"
            >
              {isRegistering ? "¿Ya tenés cuenta? Iniciá sesión" : "¿No tenés cuenta? Registrate gratis"}
            </button>
          </div>
        </div>
      ) : (
        /* ── Authenticated Profile View ── */
        <div className="flex flex-col gap-6">

          {/* Profile Card */}
          <div className="bg-surface/90 border border-border rounded-3xl overflow-hidden flex flex-col relative shadow-xl">
            {/* Banner */}
            <div className="h-28 w-full relative overflow-hidden bg-gradient-to-r from-orange-600/30 to-rose-600/30 border-b border-white/[0.04]">
              {profile?.banner_url ? (
                <img src={profile.banner_url} alt="User Banner" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full opacity-60 transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${profile?.color || '#F05A28'}44 0%, var(--color-surface) 100%)` }}
                />
              )}
              <button
                onClick={handleLogout}
                className="absolute top-3 right-3 bg-black/40 hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] backdrop-blur-md rounded-full p-2 text-white/70 active:scale-95 transition-all z-10"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar & Info */}
            <div className="px-5 pb-5 pt-0 relative flex flex-col items-start">
              <div
                className="w-16 h-16 rounded-2xl bg-surface border-2 border-border flex items-center justify-center text-rose-400 text-xl font-black uppercase overflow-hidden -mt-8 shadow-lg z-10"
                style={{ borderColor: profile?.color || 'rgba(255,255,255,0.08)' }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: profile?.color || '#E11D48' }}>
                    {profile?.username?.substring(0, 2) || session.user.email.substring(0, 2)}
                  </span>
                )}
              </div>

              <div className="mt-3 w-full flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className="border text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor: `${profile?.color || '#F05A28'}15`,
                      borderColor: `${profile?.color || '#F05A28'}30`,
                      color: profile?.color || '#F05A28'
                    }}
                  >
                    FOMO Member
                  </span>
                  <h2 className="text-sm font-bold text-white truncate mt-2">@{profile?.username || "Usuario"}</h2>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{session.user.email}</p>
                </div>
                <button
                  onClick={handleOpenEditProfile}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold active:scale-95 transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              </div>
            </div>
          </div>

          {/* Drafts Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-orange-500" /> Borradores Modpacks (Drafts)
              </h3>
              <button
                onClick={onCreateDraft}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                  color: "var(--color-primary)",
                }}
              >
                + Nuevo
              </button>
            </div>

            {loadingUserData ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              </div>
            ) : userDrafts.length > 0 ? (
              <div className="grid gap-3">
                {userDrafts.map(draft => (
                  <div
                    key={draft.id}
                    onClick={() => handleEnterDraftCollection(draft)}
                    className="bg-surface/80 border border-border rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:border-white/10"
                  >
                    {draft.cover_image && (
                      <div className="h-20 w-full">
                        <img src={draft.cover_image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{draft.name}</h4>
                          <p className="text-[10px] text-white/40 mt-1">
                            Versión: {draft.minecraft_version} • Loader: {draft.loader}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-white/5 border border-white/[0.08] text-white/60 text-[9px] px-2 py-0.5 rounded-full">
                          {draft.visibility}
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/30" />
                        {onEditDraft && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditDraft(draft);
                            }}
                            className="p-1.5 rounded-lg text-white/35 hover:text-orange-300 hover:bg-white/5 transition-all active:scale-90"
                            title="Editar draft"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No tenés borradores colaborativos creados.</p>
                <button
                  onClick={onCreateDraft}
                  className="mt-3 text-xs font-bold text-orange-400 hover:underline"
                >
                  Crear primer draft →
                </button>
              </div>
            )}
          </div>

          {/* Favorites Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Mis Mods Favoritos
            </h3>
            {loadingUserData ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            ) : userFavorites.length > 0 ? (
              <div className="grid gap-3">
                {userFavorites.map(fav => {
                  const meta = readFavoriteMeta(fav);
                  const projectId = fav.mod_id || fav.project_id || fav.id;
                  const projectType = fav.project_type || meta.project_type || "mod";
                  return (
                  <div
                    key={fav.id}
                    onClick={() => handleOpenModDetails({
                      projectId,
                      title: fav.name,
                      description: fav.description || meta.description || (!fav.summary?.trim?.().startsWith("{") ? fav.summary : "") || "",
                      iconUrl: fav.icon_url,
                      author: fav.author || "Comunidad",
                      projectType,
                      categories: fav.categories || meta.categories || [],
                      url: fav.url || meta.url || `https://modrinth.com/${projectType}/${projectId}`,
                      _source: fav.platform || "modrinth",
                    })}
                    className="bg-surface/80 border border-border rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:border-white/10"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {fav.icon_url ? (
                        <img src={fav.icon_url} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-xs font-bold uppercase">{fav.name.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{fav.name}</h4>
                      <p className="text-[9px] text-white/35 mt-0.5 capitalize">{fav.platform}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No guardaste ningún mod favorito todavía.</p>
              </div>
            )}
          </div>
          {/* Autores Seguidos */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-400" /> Autores Seguidos
            </h3>
            {userFollowedAuthors.length > 0 ? (
              <div className="grid gap-3">
                {userFollowedAuthors.map(a => (
                  <div
                    key={a.id}
                    className="bg-surface/80 border border-border rounded-2xl p-3.5 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {a.icon_url ? (
                        <img src={a.icon_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-blue-400 text-[10px] font-bold uppercase">{a.author_name?.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{a.author_name}</h4>
                      <p className="text-[9px] text-white/35 mt-0.5 capitalize">{a.platform}</p>
                    </div>
                    <UserCheck className="w-3.5 h-3.5 text-blue-400/50 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No seguís a ningún autor todavía.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
