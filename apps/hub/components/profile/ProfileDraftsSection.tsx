"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bookmark, Layers, ChevronRight, Pencil, Loader2 } from "lucide-react";

interface ProfileDraftsSectionProps {
  userDrafts: any[];
  loadingUserData: boolean;
  onCreateDraft: () => void;
  handleEnterDraftCollection: (draft: any) => void;
  onEditDraft?: (draft: any) => void;
}

export function ProfileDraftsSection({
  userDrafts,
  loadingUserData,
  onCreateDraft,
  handleEnterDraftCollection,
  onEditDraft,
}: ProfileDraftsSectionProps) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
          <Bookmark className="w-4 h-4 text-orange-500" /> Borradores Modpacks (Drafts)
        </h3>
        <button
          onClick={onCreateDraft}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
          style={{
            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          + Nuevo
        </button>
      </div>

      {loadingUserData ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
        </div>
      ) : userDrafts.length > 0 ? (
        <div className="grid gap-3">
          {userDrafts.map((draft, draftIndex) => (
            <motion.div
              key={draft.id}
              onClick={() => handleEnterDraftCollection(draft)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(draftIndex * 0.04, 0.16) }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              className="mim-profile-list-card bg-surface/80 border border-border rounded-2xl overflow-hidden cursor-pointer transition-colors hover:border-white/15"
            >
              {draft.cover_image && (
                <div className="h-20 w-full">
                  <img src={draft.cover_image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{draft.name}</h4>
                    <p className="text-[10px] text-white/40 mt-1">
                      Versión: {draft.minecraft_version} • Loader: {draft.loader}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-white/5 border border-white/[0.08] text-white/60 text-[9px] px-2 py-0.5 rounded-full">
                    {draft.visibility}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                  {onEditDraft && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditDraft(draft);
                      }}
                      className="p-1.5 rounded-lg text-white/35 hover:text-orange-300 hover:bg-white/5 transition-all active:scale-90"
                      title="Editar draft"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
          <p className="text-xs text-white/40">No tenés borradores colaborativos creados.</p>
          <button
            onClick={onCreateDraft}
            className="mt-3 text-xs font-bold text-orange-400 hover:underline"
          >
            Crear primer draft →
          </button>
        </div>
      )}
    </motion.section>
  );
}
