"use client";

import React, { memo } from "react";
import { Download, Heart, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatNumber, openExternal } from "@/utils/format";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { ModrinthIcon, CurseForgeIcon, BedrockIcon } from "@/components/fomo/parts/FomoPlatformIcons";
import { activateDiscoverCard } from "@/lib/fomo/discoverCardActivation";
import { useModCardMeta } from "@/components/fomo/discover/useModCardMeta";
import { FomoModActions } from "@/components/fomo/discover/FomoModActions";
import { FomoModStatusBadges } from "@/components/fomo/discover/FomoModStatusBadges";

function loaderSrc(loader: string): string {
  const l = loader.toLowerCase();
  if (l === "forge") return "/modloaders/forge.png";
  if (l === "fabric") return "/modloaders/fabric.png";
  if (l === "neoforge") return "/modloaders/neo.png";
  if (l === "quilt") return "/modloaders/quilt.png";
  return "";
}

export const FomoModRow = memo(function FomoModRow({
  mod,
  isDownloading,
  onDownload,
  onOpenVersions,
  isSelected,
  onToggleSelect,
  followedByUsers = [],
  inDraft = false,
  isUserFollowed = false,
  isUserFavorite = false,
  detailsOpenForThisMod = false,
  riskScore,
  riskLevel,
  onSecurityDetails,
}: any) {
  const meta = useModCardMeta(mod);
  const updated = mod.dateModified || mod.dateCreated;
  let ago = "";
  if (meta.showUpdated && updated) {
    try {
      ago = formatDistanceToNow(new Date(updated), { addSuffix: true, locale: es });
    } catch {
      ago = "";
    }
  }

  return (
    <article
      className={`group fomo-mod-row flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-3 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={(event) =>
        activateDiscoverCard({
          clickDetail: event.detail,
          detailsOpenForThisMod,
          isSelected: !!isSelected,
          openDetails: () => onOpenVersions(mod),
          toggleSelect: onToggleSelect ? () => onToggleSelect(mod) : undefined,
        })
      }
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ background: meta.bannerBgColor }}>
        {mod.iconUrl ? (
          <img src={mod.iconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={meta.fallbackTexture} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <FomoModStatusBadges
          inDraft={inDraft}
          isUserFollowed={isUserFollowed}
          isUserFavorite={isUserFavorite}
          followedByUsers={followedByUsers}
          layout="inline"
        />
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold" style={{ color: "var(--fomo-text-primary)" }}>
            {mod.title}
          </h3>
          <span className="text-xs" style={{ color: "var(--fomo-text-muted)" }}>
            by {mod.author}
          </span>
          <button
            type="button"
            className="opacity-50 hover:opacity-100"
            title="Abrir en la web"
            onClick={(e) => {
              e.stopPropagation();
              openExternal(mod.url);
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <span className="inline-flex items-center gap-1">
            {meta.isBedrock ? <BedrockIcon /> : meta.isOnBoth ? (
              <>
                <ModrinthIcon />
                <CurseForgeIcon />
              </>
            ) : meta.isCF ? (
              <CurseForgeIcon />
            ) : (
              <ModrinthIcon />
            )}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--fomo-text-muted)" }}>
          {mod.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {meta.environmentLabel && (
            <span className="fomo-mod-chip">{meta.environmentLabel}</span>
          )}
          {meta.otherCategories.map((cat) => (
            <span key={cat} className="fomo-mod-chip">{cat}</span>
          ))}
          {meta.modLoaders.map((loader) => {
            const src = loaderSrc(loader);
            return src ? (
              <img key={loader} src={src} alt={loader} title={loader} className="h-4 w-4 object-contain" />
            ) : null;
          })}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-[11px]" style={{ color: "var(--fomo-text-muted)" }}>
        <span className="inline-flex items-center gap-1">
          <Download className="h-3.5 w-3.5" /> {formatNumber(mod.downloads)}
        </span>
        {meta.showFollows && (
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {formatNumber(mod.follows)}
          </span>
        )}
        {ago && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {ago}
          </span>
        )}
        {riskScore !== undefined && riskLevel && (
          <SecurityBadgeCompact riskScore={riskScore} riskLevel={riskLevel} onClick={onSecurityDetails} />
        )}
        <FomoModActions
          mod={mod}
          primaryType={meta.primaryType}
          isBedrock={meta.isBedrock}
          isDownloading={isDownloading}
          isSelected={isSelected}
          onDownload={onDownload}
          onToggleSelect={onToggleSelect}
          variant="inline"
        />
      </div>
    </article>
  );
});
