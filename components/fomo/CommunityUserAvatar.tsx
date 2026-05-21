"use client";

import React from "react";
import { openCommunityUserProfile } from "./communityActions";

interface CommunityUserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
  /** Si false, solo muestra el avatar (sin botón). El padre maneja el clic. */
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const sizeClasses = {
  sm: "w-9 h-9 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export function CommunityUserAvatar({
  username,
  avatarUrl,
  color,
  size = "md",
  className = "",
  title,
  interactive = true,
  onClick,
}: CommunityUserAvatarProps) {
  const sz = sizeClasses[size];
  const inner = avatarUrl ? (
    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
  ) : (
    (username || "U").charAt(0)
  );
  const style = {
    backgroundColor: color || "var(--primary)",
    borderColor: color || "var(--primary)",
    color: color ? "#000000" : "var(--primary-foreground)",
  };
  const titleAttr = title ?? `Ver perfil de @${username}`;

  if (!interactive) {
    return (
      <span
        className={`${sz} rounded-full flex items-center justify-center font-bold uppercase border overflow-hidden shrink-0 ${className}`}
        style={style}
        title={titleAttr}
      >
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
        else openCommunityUserProfile(username);
      }}
      className={`${sz} rounded-full flex items-center justify-center font-bold uppercase border overflow-hidden shrink-0 cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 hover:scale-105 bg-transparent p-0 ${className}`}
      style={style}
      title={titleAttr}
    >
      {inner}
    </button>
  );
}
