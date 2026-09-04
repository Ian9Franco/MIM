"use client";

import React from "react";
import { motion } from "framer-motion";
import { UserCheck, ChevronRight } from "lucide-react";
import { handleHorizontalWheel } from "./utils";

interface ProfileFollowedAuthorsSectionProps {
  userFollowedAuthors: any[];
  onSearchAuthor?: (name: string, platform: string) => void;
}

export function ProfileFollowedAuthorsSection({
  userFollowedAuthors,
  onSearchAuthor,
}: ProfileFollowedAuthorsSectionProps) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="flex flex-col gap-3"
    >
      <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
        <UserCheck className="w-4 h-4 text-blue-400" /> Autores Seguidos
      </h3>
      {userFollowedAuthors.length > 0 ? (
        <div
          onWheel={handleHorizontalWheel}
          className="grid grid-flow-col grid-rows-3 auto-cols-[minmax(150px,180px)] gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 snap-x snap-mandatory scrollbar-none touch-auto overscroll-x-contain"
        >
          {userFollowedAuthors.map((a) => (
            <div
              key={a.id}
              onClick={() => onSearchAuthor && onSearchAuthor(a.author_name, a.platform || "modrinth")}
              className={`bg-surface/80 border border-border rounded-xl p-3 min-h-[96px] flex flex-col items-center justify-center gap-2 text-center snap-start ${
                onSearchAuthor ? "cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {a.icon_url ? (
                  <img src={a.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blue-400 text-[10px] font-bold uppercase">
                    {a.author_name?.substring(0, 2)}
                  </span>
                )}
              </div>
              <div className="w-full min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{a.author_name}</h4>
                <p className="text-[9px] text-white/35 mt-0.5 capitalize">{a.platform}</p>
              </div>
              {onSearchAuthor ? (
                <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-blue-400/50 shrink-0" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
          <p className="text-xs text-white/40">No seguís a ningún autor todavía.</p>
        </div>
      )}
    </motion.section>
  );
}
