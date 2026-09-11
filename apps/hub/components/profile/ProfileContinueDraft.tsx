"use client";

import React from "react";
import { ArrowRight, Layers } from "lucide-react";

interface ProfileContinueDraftProps {
  draft: any;
  onOpen: (draft: any) => void;
}

export function ProfileContinueDraft({ draft, onOpen }: ProfileContinueDraftProps) {
  if (!draft) return null;
  const itemCount = Array.isArray(draft.items) ? draft.items.length : Array.isArray(draft.mods) ? draft.mods.length : 0;

  return (
    <section aria-labelledby="continue-draft-title" className="overflow-hidden rounded-3xl border border-orange-500/25 bg-surface/90 shadow-lg">
      <button type="button" onClick={() => onOpen(draft)} className="group flex w-full items-stretch text-left active:scale-[.99]">
        <div className="relative w-[31%] min-w-[92px] overflow-hidden bg-orange-500/10">
          {draft.cover_image ? (
            <img src={draft.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Layers className="absolute inset-0 m-auto h-7 w-7 text-orange-400/70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/70" />
        </div>
        <div className="min-w-0 flex-1 px-4 py-3.5">
          <p id="continue-draft-title" className="text-[9px] font-black uppercase tracking-[.12em] text-orange-400">Continuar trabajando</p>
          <h3 className="mt-1 truncate text-sm font-bold text-white">{draft.name || draft.title || "Draft sin nombre"}</h3>
          <p className="mt-1 truncate text-[9px] text-white/45">
            {[draft.minecraft_version, draft.loader, itemCount ? `${itemCount} mods` : null].filter(Boolean).join(" · ") || "Listo para retomar"}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-orange-400">
            Retomar <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
    </section>
  );
}
