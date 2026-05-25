"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
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
import { CommunityUserAvatar } from "@/components/fomo/community/CommunityUserAvatar";
import { openCommunityUserProfile } from "@/components/fomo/community/communityActions";
import { searchAuthorInFomo, searchProjectInFomo } from "@/lib/fomo/fomoProjectNavigation";
import type { CommunityResumenMember } from "@/lib/fomo/resumenTypes";
import { youtubeChannelLabel } from "@/lib/fomo/resumenService";
import styles from "@/components/fomo/community/community-resumen.module.css";

interface CommunityResumenCardProps {
  member: CommunityResumenMember;
  typeFilter: string;
  compact?: boolean;
  defaultExpanded?: boolean;
}

export function CommunityResumenCard({
  member,
  typeFilter,
  compact = true,
  defaultExpanded = false,
}: CommunityResumenCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandedRef = useRef<HTMLDivElement | null>(null);
  const { resumen } = member;

  const mods =
    typeFilter === "all"
      ? resumen.mods
      : resumen.mods.filter((m) => (m.projectType || "mod") === typeFilter);

  const previewMods = mods.slice(0, compact && !expanded ? 2 : 6);
  const previewAuthors = resumen.authors.slice(0, compact && !expanded ? 2 : 5);
  const previewChannels = resumen.youtubeChannels.slice(0, compact && !expanded ? 2 : 4);

  const totalItems =
    mods.length + resumen.authors.length + resumen.youtubeChannels.length;

  const accent = member.color || "var(--color-primary)";

  const openInDiscover = (m: (typeof mods)[0]) => {
    // If we have a concrete projectId, open details directly; otherwise perform a search.
    if (m.projectId) {
      // lazy-import to avoid circular deps in some bundlers
      import("@/lib/fomo/fomoProjectNavigation").then((mod) => {
        mod.openProjectDetailsInFomo(m.projectId, m.platform, {
          title: m.title,
          projectType: m.projectType,
        });
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
        });
      });
      return;
    }
    searchProjectInFomo({
      query: m.title,
      projectId: m.projectId,
      platform: m.platform,
      projectType: m.projectType,
    });
  };

  useEffect(() => {
    if (!expanded) return;
    const el = expandedRef.current;
    if (!el) return;
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>("a,button,input,select,textarea,[tabindex]:not([tabindex='-1'])")
    ).filter((n) => !n.hasAttribute("disabled"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        return;
      }
      if (e.key === "Tab") {
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Inline expansion (no portal/modal) — uses `expanded` state

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`${styles.glassCard} group flex flex-col transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${
        compact ? "min-h-[120px]" : ""
      } ${expanded ? 'md:col-span-2 xl:col-span-3' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => openCommunityUserProfile(member.username)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openCommunityUserProfile(member.username);
        }}
        className={`relative flex items-center gap-2.5 p-3 border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors ${styles.glassHeader}`}
      >
        <div
          className="absolute inset-x-0 top-0 h-px opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
        <span className={styles.liquidAccent} aria-hidden />
        <CommunityUserAvatar
          username={member.username}
          avatarUrl={member.avatar_url}
          color={member.color}
          size={compact ? "md" : "lg"}
          interactive={false}
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold text-white block truncate group-hover:text-primary transition-colors">
            @{member.username}
          </span>
          <span title="Resumen = intereses — todo lo que sigas irá al resumen" className="text-[10px] text-white/45 flex items-center gap-1 mt-0.5">
            <Club className="w-3 h-3 text-primary shrink-0" />
            {totalItems === 0 ? "Resumen vacío" : `${totalItems} en el resumen`}
          </span>
        </div>
        {compact && totalItems > 4 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((s) => !s);
            }}
            className={`${styles.expandButton} p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/6 cursor-pointer border border-white/10 flex items-center gap-2`}
            title={expanded ? "Cerrar" : "Ver más"}
          >
            <span className="text-xs">{expanded ? 'Cerrar' : 'Ver'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div
        className={`p-3 space-y-3 text-sm ${compact && !expanded ? "max-h-[148px] overflow-hidden" : "max-h-[220px] overflow-y-auto scrollbar-thin"} ${styles.glassBody}`}
      >
        {previewAuthors.length > 0 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
              <UserRound className="w-3 h-3 text-primary/70" /> Autores
              <span className="text-white/25 font-bold normal-case">({resumen.authors.length})</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {previewAuthors.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  title={`Buscar proyectos de ${a.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    searchAuthorInFomo(a.name);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-white/90 truncate max-w-full hover:bg-white/20 transition-colors"
                >
                  {a.name}
                </button>
              ))}
              {!expanded && resumen.authors.length > previewAuthors.length && (
                <span className="text-white/30 self-center">
                  +{resumen.authors.length - previewAuthors.length}
                </span>
              )}
            </div>
          </section>
        )}

        {previewChannels.length > 0 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
              <TvMinimalPlay className="w-3 h-3 text-red-400/80" /> YouTube
              <span className="text-white/25 font-bold normal-case">
                ({resumen.youtubeChannels.length})
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
                  className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-200/90 hover:bg-red-500/20 inline-flex items-center gap-1 max-w-full truncate text-[10px]"
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
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
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
                        className={`${compact ? 'w-9 h-9' : 'w-7 h-7'} rounded-lg object-cover shrink-0 ring-1 ring-white/10`}
                      />
                    ) : (
                      <div className={`${compact ? 'w-9 h-9' : 'w-7 h-7'} rounded-lg bg-white/5 shrink-0 ring-1 ring-white/10`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-white/90 truncate font-medium block text-[11px]">
                        {m.title}
                      </span>
                      {(m.gameVersion || m.modloader) && (
                        <span className="flex flex-wrap gap-1 mt-0.5">
                          {m.gameVersion && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-black/25 text-white/50">
                              {m.gameVersion}
                            </span>
                          )}
                          {m.modloader && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-primary/15 text-primary/90 uppercase">
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
      {/* Inline expanded content — shown when `expanded` is true (no portal) */}
      {expanded && (
        <motion.div
          ref={expandedRef as any}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`${styles.inlineExpanded} p-3 border-t border-white/5`}
        >
          <div className="space-y-4">
            {resumen.authors.length > 0 && (
              <section>
                <p className="text-[12px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-primary/70" /> Autores <span className="text-white/25 font-bold normal-case">({resumen.authors.length})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {resumen.authors.map((a) => (
                    <button
                      key={a.name}
                      type="button"
                      title={`Buscar proyectos de ${a.name}`}
                      onClick={() => searchAuthorInFomo(a.name)}
                      className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-white/90 hover:bg-white/20 transition-colors"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {resumen.youtubeChannels.length > 0 && (
              <section>
                <p className="text-[12px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
                  <TvMinimalPlay className="w-4 h-4 text-red-400/80" /> YouTube <span className="text-white/25 font-bold normal-case">({resumen.youtubeChannels.length})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {resumen.youtubeChannels.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-200/90 hover:bg-red-500/20">{youtubeChannelLabel(url)}</a>
                  ))}
                </div>
              </section>
            )}

            {resumen.mods.length > 0 && (
              <section>
                <p className="text-[12px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-primary/70" /> Proyectos <span className="text-white/25 font-bold normal-case">({resumen.mods.length})</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {resumen.mods.map((m) => (
                    <div key={`${m.platform}:${m.projectId}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/3">
                      {m.iconUrl ? (
                        <img src={m.iconUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 ring-1 ring-white/10" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 shrink-0 ring-1 ring-white/10" />
                      )}
                      <div className="min-w-0">
                        <div className="text-white/90 font-bold truncate">{m.title}</div>
                        <div className="text-[12px] text-white/50 mt-0.5">{m.gameVersion ?? ''} {m.modloader ? ` · ${m.modloader}` : ''}</div>
                      </div>
                      <button onClick={() => openInDiscover(m)} className="ml-auto px-2 py-1 rounded bg-primary/15 text-primary">Abrir</button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.div>
      )}
    </motion.article>
  );
}

