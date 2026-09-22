"use client";

import React from "react";
import { Film, Newspaper, TvMinimalPlay } from "lucide-react";
import type { ShowcaseContentType, ShowcaseOverviewItem } from "./showcaseOverviewTypes";
import { formatRelativeDate } from "./showcaseOverviewTypes";

const TYPE_META: Record<
  ShowcaseContentType,
  { label: string; icon: React.ReactNode; accent: string }
> = {
  video: {
    label: "Video",
    icon: <TvMinimalPlay className="w-3 h-3" />,
    accent: "bg-red-500/15 text-red-400 border-red-500/25",
  },
  short: {
    label: "Short",
    icon: <Film className="w-3 h-3" />,
    accent: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  },
  post: {
    label: "Post",
    icon: <Newspaper className="w-3 h-3" />,
    accent: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  },
};

interface ShowcaseCompactCardProps {
  item: ShowcaseOverviewItem;
  isModern?: boolean;
  variant?: "row" | "block";
  onClick?: () => void;
}

export function ShowcaseCompactCard({ item, isModern = false, variant = "row", onClick }: ShowcaseCompactCardProps) {
  const meta = TYPE_META[item.type];
  const isBlock = variant === "block";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group ${
        isBlock ? "flex flex-col overflow-hidden p-0" : "flex items-center gap-3 p-2.5"
      } ${
        isModern
          ? "bg-white border-slate-200 hover:border-primary/30"
          : "bg-white/3 border-white/8 hover:border-primary/25 hover:bg-white/5"
      }`}
    >
      <div
        className={`${isBlock ? "w-full aspect-video" : "w-16 h-11 shrink-0"} rounded-lg overflow-hidden border ${
          isBlock ? "rounded-b-none border-0" : ""
        } ${
          isModern ? "border-slate-200 bg-slate-100" : "border-white/10 bg-black/30"
        }`}
      >
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-40">
            {meta.icon}
          </div>
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isBlock ? "p-3" : ""}`}>
        <p
          className={`text-xs font-semibold ${isBlock ? "line-clamp-2" : "truncate"} transition-colors ${
            isModern ? "text-slate-800 group-hover:text-primary" : "text-white/90 group-hover:text-white"
          }`}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.accent}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          <span className={`text-[10px] ${isModern ? "text-slate-500" : "text-white/40"}`}>
            {formatRelativeDate(item.publishedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}
