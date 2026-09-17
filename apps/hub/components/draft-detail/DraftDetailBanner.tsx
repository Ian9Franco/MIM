"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil } from "lucide-react";

interface DraftDetailBannerProps {
  draft: {
    name?: string;
    cover_image?: string | null;
    minecraft_version?: string;
    loader?: string;
    visibility?: string;
    description?: string;
  };
  activeItemsCount: number;
  creatorUsername: string | null;
  isOwner?: boolean;
  onBack: () => void;
  onOpenEditMetadata?: () => void;
  onToggleVisibility?: () => void;
}

export function DraftDetailBanner({
  draft,
  activeItemsCount,
  creatorUsername,
  isOwner,
  onBack,
  onOpenEditMetadata,
  onToggleVisibility,
}: DraftDetailBannerProps) {
  const isPublic = draft?.visibility === "public";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-4 shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] shadow-[0_16px_38px_rgba(0,0,0,0.24)]"
      style={{ minHeight: draft?.cover_image ? 140 : 110 }}
    >
      {draft?.cover_image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={draft.cover_image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 30%, #000) 0%, #0c0c0c 100%)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

      <div className="relative z-20 flex flex-col gap-4 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="pointer-events-auto z-20 flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur-md transition-all hover:bg-black/70 active:scale-95"
          >
            <ArrowLeft className="h-3 w-3" />
            Volver
          </button>
          {onOpenEditMetadata && (
            <button
              type="button"
              onClick={onOpenEditMetadata}
              className="pointer-events-auto z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-black/50 p-2 font-mono text-[9px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white active:scale-95"
              title="Editar configuración del draft"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 px-1 pb-1">
          <div className="min-w-0">
            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400">Draft Modpack</p>
            <h2 className="mt-0.5 text-sm font-black leading-tight text-white drop-shadow-md">{draft?.name}</h2>
            <p className="mt-0.5 text-[10px] text-white/50">
              {draft?.minecraft_version} · {draft?.loader}
              {creatorUsername && ` · por @${creatorUsername}`}
            </p>
            {draft?.description && (
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/55">{draft.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {isOwner && (onToggleVisibility || onOpenEditMetadata) ? (
              <button
                type="button"
                onClick={() => {
                  if (onToggleVisibility) onToggleVisibility();
                  else onOpenEditMetadata?.();
                }}
                className={`pointer-events-auto z-20 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${
                  isPublic
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/40"
                }`}
              >
                {isPublic ? "Público" : "Privado"}
              </button>
            ) : (
              <span
                className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${
                  isPublic
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/40"
                }`}
              >
                {isPublic ? "Público" : "Privado"}
              </span>
            )}
            <span className="font-mono text-[9px] text-white/40">{activeItemsCount} ítems</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
