"use client";

import React from "react";
import { motion } from "framer-motion";
import { LogOut, MoreHorizontal, Pencil } from "lucide-react";

interface ProfileHeaderProps {
  session: any;
  profile: any;
  handleLogout: () => void;
  handleOpenEditProfile: () => void;
}

export function ProfileHeader({
  session,
  profile,
  handleLogout,
  handleOpenEditProfile,
}: ProfileHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpen]);

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.28 }}
      className="bg-surface/90 border border-border rounded-3xl overflow-hidden flex flex-col relative shadow-xl"
    >
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
        <div ref={menuRef} className="absolute right-3 top-3 z-20">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Opciones del perfil"
            aria-expanded={menuOpen}
            className="rounded-full border border-white/[0.08] bg-black/40 p-2 text-white/70 backdrop-blur-md transition-all active:scale-95"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-36 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
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
              {profile?.username?.substring(0, 2) || session?.user?.email?.substring(0, 2)}
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
            <p className="text-[10px] text-white/40 truncate mt-0.5">{session?.user?.email}</p>
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
    </motion.section>
  );
}
