"use client";

import React, { useState } from "react";
import {
  Club,
  UserRound,
  TvMinimalPlay,
  Puzzle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
} from "lucide-react";
import { CommunityUserAvatar } from "./CommunityUserAvatar";
import { openCommunityUserProfile } from "./communityActions";
import { searchProjectInFomo } from "@/lib/fomoProjectNavigation";
import type { CommunityClubMember } from "@/lib/clubTypes";
import { youtubeChannelLabel } from "@/lib/clubService";

interface CommunityClubCardProps {
  member: CommunityClubMember;
  typeFilter: string;
  compact?: boolean;
  defaultExpanded?: boolean;
}

export function CommunityClubCard({
  member,
  typeFilter,
  compact = true,
  defaultExpanded = false,
}: CommunityClubCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { club } = member;

  const mods =
    typeFilter === "all"
      ? club.mods
      : club.mods.filter((m) => (m.projectType || "mod") === typeFilter);

  const previewMods = mods.slice(0, compact && !expanded ? 2 : 6);
  const previewAuthors = club.authors.slice(0, compact && !expanded ? 2 : 5);
  const previewChannels = club.youtubeChannels.slice(0, compact && !expanded ? 2 : 4);

  const totalItems =
    mods.length + club.authors.length + club.youtubeChannels.length;

  const accent = member.color || "var(--color-primary)";

  const openInDiscover = (m: (typeof mods)[0]) => {
    searchProjectInFomo({
      query: m.title,
      projectId: m.projectId,
      platform: m.platform,
      projectType: m.projectType,
    });
  };

  return (
    <article
      className={`group flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${
        compact ? "min-h-0" : ""
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => openCommunityUserProfile(member.username)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openCommunityUserProfile(member.username);
        }}
        className="relative flex items-center gap-2.5 p-3 border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors"
      >
        <div
          className="absolute inset-x-0 top-0 h-px opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
        <CommunityUserAvatar
          username={member.username}
          avatarUrl={member.avatar_url}
          color={member.color}
          size="sm"
          interactive={false}
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-white block truncate group-hover:text-primary transition-colors">
            @{member.username}
          </span>
          <span className="text-[9px] text-white/45 flex items-center gap-1 mt-0.5">
            <Club className="w-3 h-3 text-primary shrink-0" />
            {totalItems === 0 ? "Club vacío" : `${totalItems} en el club`}
          </span>
        </div>
        {compact && totalItems > 4 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 cursor-pointer border border-white/10"
            title={expanded ? "Menos" : "Más"}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <div
        className={`p-3 space-y-3 text-[10px] ${compact && !expanded ? "max-h-[148px] overflow-hidden" : "max-h-[220px] overflow-y-auto scrollbar-thin"}`}
      >
        {previewAuthors.length > 0 && (
          <section>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
              <UserRound className="w-3 h-3 text-primary/70" /> Autores
              <span className="text-white/25 font-bold normal-case">({club.authors.length})</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {previewAuthors.map((a) => (
                <span
                  key={a.name}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/85 truncate max-w-full"
                >
                  {a.name}
                </span>
              ))}
              {!expanded && club.authors.length > previewAuthors.length && (
                <span className="text-white/30 self-center">
                  +{club.authors.length - previewAuthors.length}
                </span>
              )}
            </div>
          </section>
        )}

        {previewChannels.length > 0 && (
          <section>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
              <TvMinimalPlay className="w-3 h-3 text-red-400/80" /> YouTube
              <span className="text-white/25 font-bold normal-case">
                ({club.youtubeChannels.length})
              </span>
            </p>
            <div className="flex flex-wrap gap-1">
              {previewChannels.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-200/90 hover:bg-red-500/20 inline-flex items-center gap-1 max-w-full truncate text-[9px]"
                >
                  {youtubeChannelLabel(url)}
                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                </a>
              ))}
            </div>
          </section>
        )}

        {previewMods.length > 0 && (
          <section>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
              <Puzzle className="w-3 h-3 text-primary/70" /> Proyectos
              <span className="text-white/25 font-bold normal-case">({mods.length})</span>
            </p>
            <ul className="space-y-1">
              {previewMods.map((m) => (
                <li
                  key={`${m.platform}:${m.projectId}`}
                  className="flex items-center gap-1 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInDiscover(m);
                    }}
                    className="flex-1 min-w-0 text-left flex items-center gap-2 p-1.5 cursor-pointer border-none bg-transparent"
                  >
                    {m.iconUrl ? (
                      <img
                        src={m.iconUrl}
                        alt=""
                        className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-white/5 shrink-0 ring-1 ring-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-white/90 truncate font-medium block text-[10px]">
                        {m.title}
                      </span>
                      {(m.gameVersion || m.modloader) && (
                        <span className="flex flex-wrap gap-1 mt-0.5">
                          {m.gameVersion && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-black/25 text-white/50">
                              {m.gameVersion}
                            </span>
                          )}
                          {m.modloader && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-primary/15 text-primary/90 uppercase">
                              {m.modloader}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInDiscover(m);
                    }}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 cursor-pointer border-none shrink-0"
                    title="Buscar en Explorar (todas las versiones y plataformas)"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {totalItems === 0 && (
          <p className="text-white/35 text-center py-3 text-[10px]">Sin seguidos publicados aún.</p>
        )}
      </div>
    </article>
  );
}
