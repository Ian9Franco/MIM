"use client";

import React from "react";
import { FlaskConical, Heart, Users } from "lucide-react";

type Sharer = { username?: string; color?: string | null; avatar_url?: string | null };

export function FomoModStatusBadges({
  inDraft,
  isUserFollowed,
  isUserFavorite,
  followedByUsers = [],
  layout = "inline",
}: {
  inDraft?: boolean;
  isUserFollowed?: boolean;
  isUserFavorite?: boolean;
  followedByUsers?: Sharer[];
  layout?: "inline" | "overlay";
}) {
  const userTracks = isUserFollowed || isUserFavorite;
  const hasCommunity = followedByUsers.length > 0;
  if (!inDraft && !userTracks && !hasCommunity) return null;

  const favoriteLabel = isUserFollowed ? "Seguido" : "Favorito";
  const primarySharer = followedByUsers[0]?.username;
  const sharerLabel =
    followedByUsers.length > 1
      ? `Favorito de @${primarySharer} +${followedByUsers.length - 1}`
      : primarySharer
        ? `Favorito de @${primarySharer}`
        : "Favorito en comunidad";

  const base =
    layout === "overlay"
      ? "absolute top-2 left-2 z-20 flex flex-wrap items-center gap-1"
      : "flex flex-wrap items-center gap-1";

  return (
    <div className={base}>
      {inDraft && (
        <span
          className="fomo-mod-status-badge fomo-mod-status-badge--draft inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
          title="En tu draft activo"
        >
          <FlaskConical className="h-3 w-3" />
          Draft
        </span>
      )}
      {userTracks && (
        <span
          className="fomo-mod-status-badge fomo-mod-status-badge--follow inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
          title={isUserFollowed ? "Lo seguís en Seguidos" : "En tus favoritos de comunidad"}
        >
          <Heart className="h-3 w-3 fill-current" />
          {favoriteLabel}
        </span>
      )}
      {hasCommunity && (
        <span
          className="fomo-mod-status-badge fomo-mod-status-badge--community inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wide normal-case"
          title={`Favorito de ${followedByUsers.map((u) => `@${u.username}`).join(", ")}`}
        >
          {primarySharer ? (
            <span
              className="h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-white/20"
              style={{ backgroundColor: followedByUsers[0].color || "var(--color-primary)" }}
            >
              {followedByUsers[0].avatar_url ? (
                <img src={followedByUsers[0].avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[6px] text-white">
                  {primarySharer.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
          ) : (
            <Users className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{sharerLabel}</span>
        </span>
      )}
    </div>
  );
}
