"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Loader2 } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import type { FomoUserSession, FomoCommunityShare } from "../../types/fomo";
import { supabase } from "../../lib/supabaseClient";
import { buildShareMetaFromMod } from "./utils";
import { readSharePriority } from "../../lib/shareMeta";

interface ModShareModalProps {
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  selectedMod: ModHit | null;
  session: FomoUserSession | null;
  userShares?: FomoCommunityShare[];
  refreshUserData?: () => void;
}

export function ModShareModal({
  showShareModal,
  setShowShareModal,
  selectedMod,
  session,
  userShares = [],
  refreshUserData,
}: ModShareModalProps) {
  const [shareComment, setShareComment] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleConfirmShare = useCallback(async () => {
    if (!selectedMod || !session?.user?.id) return;
    setIsSharing(true);
    try {
      const platform = selectedMod._source === "curseforge" ? "curseforge" : "modrinth";
      const existingShare = userShares.find(
        (f) => (f.mod_id || f.projectId || (f as any).project_id || f.id) === selectedMod.projectId
      );
      const alreadyShared = !!existingShare;
      const summaryText = buildShareMetaFromMod(selectedMod, {
        comment: shareComment.trim() || selectedMod.description || "",
        priority: existingShare?.pinned ?? readSharePriority(existingShare?.summary as string | undefined),
      });

      const request = alreadyShared
        ? supabase
            .from("favorite_mods")
            .update({
              summary: summaryText,
              name: selectedMod.title,
              icon_url: selectedMod.iconUrl || null,
            })
            .eq("profile_id", session.user.id)
            .eq("mod_id", selectedMod.projectId)
        : supabase.from("favorite_mods").insert({
            profile_id: session.user.id,
            mod_id: selectedMod.projectId,
            platform,
            name: selectedMod.title,
            icon_url: selectedMod.iconUrl || null,
            summary: summaryText,
          });

      const { error } = await request;
      if (error) throw error;
      if (refreshUserData) refreshUserData();
      setShowShareModal(false);
      setShareComment("");
    } catch (err: any) {
      alert(`Error al compartir: ${err.message}`);
    } finally {
      setIsSharing(false);
    }
  }, [selectedMod, session, shareComment, userShares, refreshUserData, setShowShareModal]);

  return (
    <AnimatePresence>
      {showShareModal && (
        <motion.div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[700] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowShareModal(false)}
        >
          <motion.div
            className="bg-card/95 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col gap-4 overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-extrabold text-white">Compartir en Comunidad</h4>
                <p className="text-[10px] text-white/40 mt-1">
                  Escribí tu reseña u opinión sobre este proyecto para la comunidad.
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-white/40 hover:text-white/70 transition-colors p-1"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={shareComment}
              onChange={(e) => setShareComment(e.target.value)}
              placeholder="Ej: ¡Este mod es increíble para automatización! Totalmente recomendado."
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/80 focus:border-orange-500/50 focus:outline-none resize-none transition-all placeholder:text-white/20"
            />

            {/* Actions */}
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 font-semibold text-xs rounded-xl py-3 transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmShare}
                disabled={isSharing}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl py-3 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compartiendo...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Compartir</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
