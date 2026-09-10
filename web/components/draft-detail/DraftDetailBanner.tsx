"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil } from "lucide-react";

interface DraftDetailBannerProps {
  draft: any;
  activeItemsCount: number;
  creatorUsername: string | null;
  onBack: () => void;
  onOpenEditMetadata?: () => void;
}

export function DraftDetailBanner({
  draft,
  activeItemsCount,
  creatorUsername,
  onBack,
  onOpenEditMetadata,
}: DraftDetailBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden mb-4 shrink-0 border border-white/[0.07] shadow-[0_16px_38px_rgba(0,0,0,0.24)]"
      style={{ minHeight: draft?.cover_image ? 130 : 80 }}
    >
      {draft?.cover_image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={draft.cover_image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 30%, #000) 0%, #0c0c0c 100%)",
          }}
        />
      )}
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Back + Edit */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-white/80 text-[10px] font-bold transition-all active:scale-95"
        >
          <ArrowLeft className="w-3 h-3" />
          Volver
        </button>
        {onOpenEditMetadata && (
          <button
            type="button"
            onClick={onOpenEditMetadata}
            className="bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-2 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider"
            title="Editar configuración del draft"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
        )}
      </div>

      {/* Draft info */}
      <div className="absolute bottom-3 left-4 right-4 z-10">
        <div className="flex items-end gap-2 justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Draft Modpack</p>
            <h2 className="text-sm font-black text-white leading-tight mt-0.5 drop-shadow-md">{draft?.name}</h2>
            <p className="text-[10px] text-white/50 mt-0.5">
              {draft?.minecraft_version} · {draft?.loader}
              {creatorUsername && ` · por @${creatorUsername}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                draft?.visibility === "public"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-white/5 text-white/40 border-white/10"
              }`}
            >
              {draft?.visibility === "public" ? "Público" : "Privado"}
            </span>
            <span className="text-[9px] text-white/40 font-mono">
              {activeItemsCount} ítems
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
