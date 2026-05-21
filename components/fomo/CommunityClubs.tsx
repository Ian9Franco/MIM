"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Club, RefreshCw, CloudUpload } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import {
  fetchCommunityClubs,
  syncMyClubToCloud,
} from "@/lib/clubService";
import type { CommunityClubMember } from "@/lib/clubTypes";
import { CommunityClubCard } from "./CommunityClubCard";

type ClubTypeFilter = "all" | "mod" | "textura" | "shader" | "datapack" | "modpack";

const TYPE_TABS: { id: ClubTypeFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "mod", label: "Mods" },
  { id: "textura", label: "Texturas" },
  { id: "shader", label: "Shaders" },
  { id: "datapack", label: "Datapacks" },
  { id: "modpack", label: "Modpacks" },
];

interface CommunityClubsProps {
  /** Vista de un solo usuario (perfil). */
  username?: string;
  singleUser?: boolean;
}

export function CommunityClubs({ username, singleUser = false }: CommunityClubsProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<CommunityClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ClubTypeFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCommunityClubs(user?.id);
      if (singleUser && username) {
        setMembers(list.filter((m) => m.username === username));
      } else {
        setMembers(list);
      }
    } catch (e) {
      console.error("[CommunityClubs]", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, username, singleUser]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("mim-followed-mods-changed", onChange);
    window.addEventListener("mim-followed-authors-changed", onChange);
    window.addEventListener("fomo-refresh-sharing", onChange);
    window.addEventListener("fomo-club-changed", onChange);
    return () => {
      window.removeEventListener("mim-followed-mods-changed", onChange);
      window.removeEventListener("mim-followed-authors-changed", onChange);
      window.removeEventListener("fomo-refresh-sharing", onChange);
      window.removeEventListener("fomo-club-changed", onChange);
    };
  }, [load]);

  useEffect(() => {
    if (!user?.id || singleUser) return;
    let cancelled = false;
    (async () => {
      const ok = await syncMyClubToCloud(user.id);
      if (!cancelled && ok) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, singleUser, load]);

  const filteredMembers = useMemo(() => {
    if (typeFilter === "all") return members;
    return members
      .map((m) => ({
        ...m,
        club: {
          ...m.club,
          mods: m.club.mods.filter((mod) => (mod.projectType || "mod") === typeFilter),
        },
      }))
      .filter(
        (m) =>
          m.club.mods.length > 0 ||
          m.club.authors.length > 0 ||
          m.club.youtubeChannels.length > 0
      );
  }, [members, typeFilter]);

  const handleSync = async () => {
    if (!user?.id) return;
    setSyncing(true);
    await syncMyClubToCloud(user.id);
    await load();
    setSyncing(false);
    window.dispatchEvent(
      new CustomEvent("fomo-show-status", {
        detail: { text: "Club publicado en MIM Cloud.", type: "success" },
      })
    );
  };

  if (singleUser && !loading && filteredMembers.length === 0) {
    return (
      <div className="py-8 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-2xl">
        Este usuario aún no publicó su club.
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      {!singleUser && (
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary/15 border border-primary/25">
                <Club className="w-3.5 h-3.5 text-primary" />
              </span>
              Clubs de la comunidad
            </h3>
            <p className="text-xs text-white/45 mt-1 max-w-md leading-relaxed">
              Cada usuario publica su club: proyectos y autores de Seguidos, más canales de
              YouTube para showcases.
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-all cursor-pointer disabled:opacity-50"
              title="Subir tu Seguidos + canales YouTube al perfil público"
            >
              {syncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              Publicar mi club
            </button>
          )}
        </div>
      )}

      {!singleUser && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                typeFilter === t.id
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-white/40">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
          Cargando clubs...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-white/40 text-xs">
          {user ? (
            <>
              Publicá tu club para aparecer acá junto al resto de la comunidad.
            </>
          ) : (
            <>Iniciá sesión y seguí proyectos en Seguidos.</>
          )}
        </div>
      ) : (
        <div
          className={
            singleUser
              ? "space-y-3"
              : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[min(62vh,520px)] pr-1 scrollbar-thin pb-2"
          }
        >
          {filteredMembers.map((member) => (
            <CommunityClubCard
              key={member.id}
              member={member}
              typeFilter={typeFilter}
              compact={!singleUser}
              defaultExpanded={singleUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
