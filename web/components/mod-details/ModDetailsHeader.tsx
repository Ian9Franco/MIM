"use client";

import React from "react";
import { motion, type DragControls } from "framer-motion";
import {
  X,
  ArrowLeft,
  Layers,
  ExternalLink,
  Globe,
  CircleFadingPlus,
  Heart,
  Volume2,
  VolumeX,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { CollectibleSurface } from "../CollectibleSurface";
import { DefaultModIcon } from "../DefaultModIcon";
import type { ModHit } from "../SpotlightMarquees";
import type {
  FomoModDetails,
  ModStackItem,
  FomoUserSession,
  FomoFollowedAuthor,
} from "../../types/fomo";

interface ModDetailsHeaderProps {
  selectedMod: ModHit;
  selectedModDetails: FomoModDetails | null;
  isReadingTab: boolean;
  bannerUrl?: string;
  bannerBgColor: string;
  fallbackTexture: React.CSSProperties;
  dragControls: DragControls;
  muted: boolean;
  handleToggleMute: (e: React.MouseEvent) => void;
  closeWithSound: () => void;
  modStack: ModStackItem[];
  activeStackIndex: number;
  handleGoBackInStack: () => void;
  handleSwitchStackIndex: (i: number) => void;
  session: FomoUserSession | null;
  communitySharedByMe: boolean;
  handleShareClick: () => void;
  isFavorited: boolean;
  onToggleFavorite: (mod: ModHit) => void;
  projectPlatformUrl: string;
  onSearchAuthor?: (name: string, platform: string) => void;
  onSearchMod?: (title: string) => void;
  userFollowedAuthors?: FomoFollowedAuthor[];
  onToggleFollowAuthor?: (authorName: string, authorUrl?: string, iconUrl?: string, platform?: string) => void;
}

export function ModDetailsHeader({
  selectedMod,
  selectedModDetails,
  isReadingTab,
  bannerUrl,
  bannerBgColor,
  fallbackTexture,
  dragControls,
  muted,
  handleToggleMute,
  closeWithSound,
  modStack,
  activeStackIndex,
  handleGoBackInStack,
  handleSwitchStackIndex,
  session,
  communitySharedByMe,
  handleShareClick,
  isFavorited,
  onToggleFavorite,
  projectPlatformUrl,
  onSearchAuthor,
  onSearchMod,
  userFollowedAuthors = [],
  onToggleFollowAuthor,
}: ModDetailsHeaderProps) {
  const authorName = selectedMod?.author || "";
  const authorPlatform = selectedMod?._source || "modrinth";
  const isFollowingAuthor = !!authorName && userFollowedAuthors.some(
    (a) =>
      ((a as Record<string, unknown>).author_name === authorName || a.name === authorName) &&
      a.platform === authorPlatform
  );

  return (
    <div
      className={`relative overflow-hidden border-b border-white/[0.06] shrink-0 select-none ${
        isReadingTab ? "px-4 pt-2 pb-3" : "px-6 pt-3 pb-5"
      }`}
    >
      {/* Banner Image or Fallback */}
      <div
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        style={{ backgroundColor: bannerBgColor }}
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="w-full h-full object-cover opacity-60 scale-105 transition-opacity duration-700"
            style={{ filter: "brightness(0.75)" }}
          />
        ) : (
          <div className="absolute inset-0 opacity-15" style={fallbackTexture} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
      </div>

      {/* Drag handle container */}
      <div
        className="relative z-30 w-full pt-1.5 pb-3.5 cursor-grab active:cursor-grabbing flex justify-center touch-none"
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
      >
        <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={handleToggleMute}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={muted ? "Activar audio" : "Silenciar audio"}
        className="absolute right-14 top-4 z-40 bg-black/35 hover:bg-black/50 border border-white/15 rounded-full p-1.5 text-white/70 active:scale-95 flex items-center justify-center transition-all"
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>

      {/* Close Button */}
      <button
        onClick={closeWithSound}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Cerrar detalles"
        className="absolute right-5 top-4 z-40 bg-black/35 hover:bg-black/50 border border-white/15 rounded-full p-1.5 text-white/70 active:scale-95 flex items-center justify-center transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Stack breadcrumb */}
      {modStack.length > 1 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/[0.06] mb-3"
        >
          <button
            onClick={handleGoBackInStack}
            className="p-1.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-white/70 active:scale-95 transition-all flex items-center justify-center shrink-0"
            title="Volver"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {modStack.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSwitchStackIndex(idx)}
                className={`relative overflow-hidden px-2.5 py-1 rounded-lg text-[9px] font-bold transition-colors whitespace-nowrap border ${
                  activeStackIndex === idx
                    ? "text-orange-400 border-orange-500/30"
                    : "bg-black/40 text-white/50 hover:text-white/80 border-white/10"
                }`}
              >
                {activeStackIndex === idx && (
                  <motion.span
                    layoutId="mod-stack-selection"
                    className="absolute inset-0 bg-orange-500/15"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">
                  {item.mod.title.length > 15 ? `${item.mod.title.slice(0, 12)}...` : item.mod.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mod info */}
      <CollectibleSurface key={`${selectedMod._source}:${selectedMod.projectId}`} project={`${selectedMod._source || "modrinth"}:${selectedMod.projectId}`} detail className="relative z-10">
        {!isReadingTab && bannerUrl && (
          <div data-collectible-art className="relative h-24 sm:h-28 overflow-hidden rounded-xl mb-3 bg-surface">
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer"
              onError={e => { e.currentTarget.style.display = "none"; }} />
            <span className="absolute bottom-2 right-2 z-10 rounded-md bg-black/70 px-2 py-1 text-[9px] text-white capitalize">
              {selectedMod._source || "modrinth"} · {selectedMod.projectType || "mod"}
            </span>
          </div>
        )}
        <div className={`flex ${isReadingTab ? "gap-3" : "gap-4"}`}>
        <div
          className={`${
            isReadingTab ? "w-12 h-12" : "w-16 h-16"
          } rounded-xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg backdrop-blur-md`}
        >
          {selectedModDetails?.icon_url || selectedModDetails?.iconUrl || selectedMod.iconUrl ? (
            <>
              <img
                src={selectedModDetails?.icon_url || selectedModDetails?.iconUrl || selectedMod.iconUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const sibling = e.currentTarget.nextSibling as HTMLElement;
                  if (sibling) sibling.style.display = "block";
                }}
              />
              <div className="hidden w-full h-full">
                <DefaultModIcon platform={selectedMod._source} />
              </div>
            </>
          ) : (
            <DefaultModIcon platform={selectedMod._source} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-semibold">
            Detalles del Proyecto
          </span>
          <h3
            className={`${
              isReadingTab ? "text-[13px]" : "text-sm"
            } font-bold text-white mt-0.5 pr-6 leading-tight drop-shadow-md`}
          >
            {selectedMod.title}
          </h3>
          <p
            className={`${
              isReadingTab ? "text-[9px] mt-0.5" : "text-[10px] mt-1"
            } text-white/40 flex flex-wrap items-center gap-x-2 gap-y-0.5`}
          >
            <span>Autor: </span>
            {onSearchAuthor && selectedMod.author && selectedMod.author !== "Comunidad" ? (
              <button
                onClick={() => onSearchAuthor(selectedMod.author, selectedMod._source || "modrinth")}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-orange-400 hover:underline hover:text-orange-300 font-bold transition-all text-left inline-block"
              >
                {selectedMod.author}
              </button>
            ) : (
              <span className="text-white/60">{selectedMod.author || "Comunidad"}</span>
            )}
            {selectedModDetails?.organization_info && (
              <>
                <span className="text-white/20">|</span>
                <span>Org: </span>
                <button
                  onClick={() =>
                    onSearchAuthor &&
                    onSearchAuthor(
                      `organization:${selectedModDetails.organization_info?.slug}`,
                      selectedMod._source || "modrinth"
                    )
                  }
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-orange-400 hover:underline hover:text-orange-300 font-bold transition-all text-left inline-block"
                >
                  {selectedModDetails.organization_info?.name}
                </button>
              </>
            )}
          </p>
        </div>
        </div>
      </CollectibleSurface>

      {/* Actions row: Share, Favorite, Follow and External Platform link */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className={`relative z-10 flex flex-col ${isReadingTab ? "gap-1 mt-2" : "gap-1.5 mt-4"}`}
      >
        {session && (
          <div className="flex gap-2">
            {/* Share button */}
            <button
              onClick={handleShareClick}
              className={`flex-1 flex items-center justify-center gap-1.5 ${
                isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"
              } font-black uppercase tracking-wider transition-all border ${
                communitySharedByMe
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                  : "bg-black/40 border border-white/10 text-white/80 hover:bg-black/60 hover:text-white"
              }`}
              title={communitySharedByMe ? "Ya compartido en la Comunidad" : "Compartir en la Comunidad"}
              type="button"
            >
              {communitySharedByMe ? (
                <Globe className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CircleFadingPlus className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{communitySharedByMe ? "Compartido" : "Compartir"}</span>
            </button>

            {/* Favorite button */}
            <button
              onClick={() => onToggleFavorite(selectedMod)}
              className={`flex-1 flex items-center justify-center gap-1.5 ${
                isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"
              } font-black uppercase tracking-wider transition-all border ${
                isFavorited
                  ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                  : "bg-black/40 border border-white/10 text-white/80 hover:bg-black/60 hover:text-white"
              }`}
              type="button"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-red-400 text-red-400" : ""}`} />
              <span>{isFavorited ? "Guardado" : "Favorito"}</span>
            </button>
          </div>
        )}

        {/* Platform link & Compare button */}
        <div className="flex gap-2">
          <a
            href={projectPlatformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 flex items-center justify-center gap-1.5 ${
              isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"
            } font-bold uppercase tracking-wider transition-all border bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20`}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Ver en {selectedMod?._source === "curseforge" ? "CurseForge" : "Modrinth"}</span>
          </a>

          {onSearchMod && (
            <button
              onClick={() => {
                onSearchMod(selectedMod.title);
                closeWithSound();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 ${
                isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"
              } font-bold uppercase tracking-wider transition-all border bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white`}
              type="button"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Comparar (Ambos)</span>
            </button>
          )}
        </div>

        {/* Follow Author (visible to logged-in users) */}
        {session && onToggleFollowAuthor && authorName && authorName !== "Comunidad" && (
          <button
            onClick={() =>
              onToggleFollowAuthor(
                authorName,
                `https://modrinth.com/user/${authorName}`,
                undefined,
                authorPlatform
              )
            }
            className={`w-full flex items-center justify-center gap-1.5 ${
              isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"
            } font-bold uppercase tracking-wider transition-all border ${
              isFollowingAuthor
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                : "bg-black/25 border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-black/40"
            }`}
            type="button"
          >
            {isFollowingAuthor ? (
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isFollowingAuthor ? `Siguiendo a ${authorName}` : `Seguir a ${authorName}`}</span>
          </button>
        )}

        {/* Follow Organization (visible to logged-in users if org exists) */}
        {session && onToggleFollowAuthor && selectedModDetails?.organization_info && (
          (() => {
            const orgSlug = selectedModDetails.organization_info.slug;
            const orgName = selectedModDetails.organization_info.name;
            const orgIcon = selectedModDetails.organization_info.icon_url;
            const followedKey = `organization:${orgSlug}`;
            const isFollowingOrg = userFollowedAuthors.some(
              (a) => a.author_name === followedKey && a.platform === authorPlatform
            );
            const orgUrl = `https://modrinth.com/organization/${orgSlug}`;

            return (
              <button
                onClick={() => onToggleFollowAuthor(followedKey, orgUrl, orgIcon, authorPlatform)}
                className={`w-full flex items-center justify-center gap-1.5 ${
                  isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"
                } font-bold uppercase tracking-wider transition-all border ${
                  isFollowingOrg
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    : "bg-black/25 border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-black/40"
                }`}
                type="button"
              >
                {isFollowingOrg ? (
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{isFollowingOrg ? `Siguiendo a ${orgName}` : `Seguir a ${orgName}`}</span>
              </button>
            );
          })()
        )}
      </div>
    </div>
  );
}
