"use client";

import React from "react";
import { motion } from "framer-motion";
import { Share2, Pin, Trash2, MessageSquare, Loader2 } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import {
  parseShareMeta,
  projectUpdateKey,
  handleHorizontalWheel,
} from "./utils";

interface ProfileSharesSectionProps {
  sortedUserShares: any[];
  recentUpdates: Record<string, boolean>;
  loadingUserData: boolean;
  handleOpenModDetails: (mod: ModHit) => void;
  onUpdateSharePriority?: (projectId: string, priority: boolean) => Promise<void>;
  onRemoveShare?: (projectId: string) => Promise<void>;
}

export function ProfileSharesSection({
  sortedUserShares,
  recentUpdates,
  loadingUserData,
  handleOpenModDetails,
  onUpdateSharePriority,
  onRemoveShare,
}: ProfileSharesSectionProps) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="flex flex-col gap-3"
    >
      <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
        <Share2 className="w-4 h-4 text-amber-500" /> Mis Recomendados (Compartidos)
      </h3>
      {loadingUserData ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      ) : sortedUserShares.length > 0 ? (
        <div
          onWheel={handleHorizontalWheel}
          className="grid grid-flow-col grid-rows-1 gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 snap-x snap-mandatory scrollbar-none touch-auto overscroll-x-contain"
          style={{ gridAutoColumns: "minmax(260px, calc((100% - 1.5rem) / 3))" }}
        >
          {sortedUserShares.map((share) => {
            const meta = parseShareMeta(share.summary);
            const projectId = share.mod_id || share.project_id || share.id;
            const projectType = meta.projectType || "mod";
            const isYoutubeShare = share.platform === "youtube" || projectType.startsWith("youtube-");
            const shareSource = share.platform || "modrinth";
            const isRecentlyUpdated = !isYoutubeShare && recentUpdates[projectUpdateKey(shareSource, projectId)];
            const isPriority: boolean =
              share.pinned === true
                ? true
                : share.pinned == null
                ? !!meta.priority
                : false;

            const openShare = () => {
              if (isYoutubeShare) {
                if (meta.embeddedVideoId) {
                  window.dispatchEvent(
                    new CustomEvent("fomo-play-video", { detail: { videoId: meta.embeddedVideoId } })
                  );
                } else if (meta.videoUrl) {
                  window.open(meta.videoUrl, "_blank", "noopener,noreferrer");
                }
                return;
              }

              handleOpenModDetails({
                projectId,
                title: share.name,
                description: meta.comment || "",
                iconUrl: share.icon_url,
                author: "Comunidad",
                projectType,
                categories: [share.platform || "modrinth"],
                url:
                  share.platform === "curseforge"
                    ? `https://www.curseforge.com/minecraft/mc-mods/${projectId}`
                    : `https://modrinth.com/${projectType}/${projectId}`,
                _source: share.platform || "modrinth",
              });
            };

            return (
              <div
                key={share.id}
                className={`bg-surface/80 border rounded-2xl p-3.5 flex flex-col gap-3 hover:border-white/10 transition-all snap-start ${
                  isPriority
                    ? "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.28)]"
                    : isRecentlyUpdated
                    ? "border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    onClick={openShare}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition-all"
                  >
                    {share.icon_url ? (
                      <img src={share.icon_url} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-white/40 text-xs font-bold uppercase">
                        {share.name?.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div onClick={openShare} className="flex-1 min-w-0 cursor-pointer">
                    <h4 className="text-xs font-bold text-white truncate">{share.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm ${
                          isYoutubeShare
                            ? "bg-red-600/20 text-red-300 border border-red-500/20"
                            : share.platform === "curseforge"
                            ? "bg-orange-600/20 text-orange-400 border border-orange-500/20"
                            : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isYoutubeShare ? "YouTube" : share.platform === "curseforge" ? "CurseForge" : "Modrinth"}
                      </span>
                      {meta.modloader && (
                        <span className="text-[8px] font-mono text-white/40 uppercase">{meta.modloader}</span>
                      )}
                      {meta.gameVersion && (
                        <span className="text-[8px] font-mono text-white/40">{meta.gameVersion}</span>
                      )}
                    </div>
                  </div>
                  {onUpdateSharePriority && (
                    <button
                      type="button"
                      onClick={() => onUpdateSharePriority(share.id, !isPriority)}
                      className={`p-2 rounded-lg active:scale-95 transition-all ${
                        isPriority
                          ? "text-amber-300 bg-amber-500/15 border border-amber-500/25"
                          : "text-white/30 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent"
                      }`}
                      title={isPriority ? "Quitar de prioritarios" : "Fijar arriba"}
                      aria-label={isPriority ? `Quitar prioridad a ${share.name}` : `Dar prioridad a ${share.name}`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${isPriority ? "fill-current" : ""}`} />
                    </button>
                  )}
                  {onRemoveShare && (
                    <button
                      onClick={() => onRemoveShare(share.id)}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                      title="Eliminar compartido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {meta.comment && (
                  <div className="bg-white/[0.02] border-l border-amber-500/30 rounded-r-lg p-2.5 text-[10px] text-white/70 italic flex gap-1.5">
                    <MessageSquare className="w-3 h-3 text-amber-500/40 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 leading-relaxed">{meta.comment}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
          <p className="text-xs text-white/40">No compartiste ningún mod con la comunidad todavía.</p>
        </div>
      )}
    </motion.section>
  );
}
