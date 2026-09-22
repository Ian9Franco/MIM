"use client";

import React, { memo } from "react";
import { Download, Heart } from "lucide-react";
import { formatNumber } from "@/utils/format";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { activateDiscoverCard } from "@/lib/fomo/discoverCardActivation";
import { useModCardMeta } from "@/components/fomo/discover/useModCardMeta";
import { FomoModActions } from "@/components/fomo/discover/FomoModActions";
import { FomoModStatusBadges } from "@/components/fomo/discover/FomoModStatusBadges";
import { CollectibleSurface } from "@/components/fomo/shared/CollectibleSurface";

export const FomoModGalleryCard = memo(function FomoModGalleryCard({
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
  const gallery = mod.gallery?.[0];
  const image = gallery?.thumbnailUrl || gallery?.url || meta.bannerUrl;

  return (
    <CollectibleSurface
      className={`fomo-mod-gallery group overflow-hidden rounded-2xl border ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
    <article
      className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[inherit]"
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
      <div className="relative h-36 w-full" style={{ background: meta.bannerBgColor }}>
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={meta.fallbackTexture} />
        )}
        <FomoModStatusBadges
          inDraft={inDraft}
          isUserFollowed={isUserFollowed}
          isUserFavorite={isUserFavorite}
          followedByUsers={followedByUsers}
          layout="overlay"
        />
        <FomoModActions
          mod={mod}
          primaryType={meta.primaryType}
          isBedrock={meta.isBedrock}
          isDownloading={isDownloading}
          isSelected={isSelected}
          onDownload={onDownload}
          onToggleSelect={onToggleSelect}
          variant="floating"
        />
      </div>
      <div className="flex gap-3 p-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: meta.bannerBgColor }}>
          {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold" style={{ color: "var(--fomo-text-primary)" }}>
            {mod.title}
          </h3>
          <p className="truncate text-[11px]" style={{ color: "var(--fomo-text-muted)" }}>
            by {mod.author}
          </p>
          <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--fomo-text-muted)" }}>
            {mod.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--fomo-text-muted)" }}>
            {meta.environmentLabel && <span className="fomo-mod-chip">{meta.environmentLabel}</span>}
            {meta.otherCategories.slice(0, 2).map((cat) => (
              <span key={cat} className="fomo-mod-chip">{cat}</span>
            ))}
            <span className="inline-flex items-center gap-1">
              <Download className="h-3 w-3" /> {formatNumber(mod.downloads)}
            </span>
            {meta.showFollows && (
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3" /> {formatNumber(mod.follows)}
              </span>
            )}
            {riskScore !== undefined && riskLevel && (
              <SecurityBadgeCompact riskScore={riskScore} riskLevel={riskLevel} onClick={onSecurityDetails} />
            )}
          </div>
        </div>
      </div>
    </article>
    </CollectibleSurface>
  );
});
