"use client";

import React, { useEffect, useState } from "react";
import {
  communityTypeToBannerType,
  fetchFirstGalleryUrl,
  getBannerFallbackStyle,
  getCachedGalleryBanner,
  type FomoBannerProjectType,
} from "@/lib/fomo/fomoModBanner";

interface FomoModBannerStripProps {
  bannerUrl?: string | null;
  projectId?: string;
  platform?: string;
  projectType?: string;
  className?: string;
  heightClass?: string;
  fetchIfMissing?: boolean;
}

export function FomoModBannerStrip({
  bannerUrl: bannerUrlProp,
  projectId,
  platform,
  projectType = "mod",
  className = "",
  heightClass = "h-20",
  fetchIfMissing = true,
}: FomoModBannerStripProps) {
  const primaryType = communityTypeToBannerType(projectType) as FomoBannerProjectType;
  const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(primaryType);

  const [fetchedUrl, setFetchedUrl] = useState<string | undefined>(() =>
    projectId && fetchIfMissing
      ? getCachedGalleryBanner(projectId, platform)
      : undefined
  );

  useEffect(() => {
    if (!fetchIfMissing || !projectId || bannerUrlProp) return;
    const cached = getCachedGalleryBanner(projectId, platform);
    if (cached) {
      setFetchedUrl(cached);
      return;
    }
    let cancelled = false;
    fetchFirstGalleryUrl(projectId, platform).then((url) => {
      if (!cancelled && url) setFetchedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, platform, bannerUrlProp, fetchIfMissing]);

  const bannerUrl = bannerUrlProp || fetchedUrl;

  return (
    <div
      className={`relative w-full shrink-0 border-b border-white/5 overflow-hidden ${heightClass} ${className}`}
      style={{ backgroundColor: bannerBgColor }}
    >
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
        />
      ) : (
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={fallbackTexture}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
