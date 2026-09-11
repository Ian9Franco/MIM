"use client";

import React from "react";
import { Layers, ArrowLeft, Plus } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import type { FomoModDetails, FomoUserSession } from "../../types/fomo";
import type { ModDetailsTabId } from "./ModDetailsTabs";

interface ModDetailsFooterProps {
  modalTab: ModDetailsTabId;
  setModalTab: (t: ModDetailsTabId) => void;
  isReadingTab: boolean;
  session: FomoUserSession | null;
  selectedMod: ModHit | null;
  selectedModDetails: FomoModDetails | null;
  onOpenDraftPicker: (mod: ModHit) => void;
}

export function ModDetailsFooter({
  modalTab,
  setModalTab,
  isReadingTab,
  session,
  selectedMod,
  selectedModDetails,
  onOpenDraftPicker,
}: ModDetailsFooterProps) {
  return (
    <div
      className={`flex gap-2 mt-auto border-t border-white/[0.04] shrink-0 ${
        isReadingTab ? "pt-1.5" : "pt-2"
      }`}
    >
      <button
        type="button"
        onClick={() => setModalTab(modalTab === "summary" ? "desc" : "summary")}
        className={`flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium ${
          isReadingTab ? "text-[10px] rounded-lg py-2" : "text-[11px] rounded-xl py-2.5"
        } flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]`}
      >
        {modalTab === "summary" ? (
          <>
            <Layers className="w-4 h-4" /> Ver Detalles Completos
          </>
        ) : (
          <>
            <ArrowLeft className="w-4 h-4" /> Volver al Resumen
          </>
        )}
      </button>

      {/* Add to Draft button */}
      {session && selectedMod && (
        <button
          type="button"
          onClick={() =>
            onOpenDraftPicker({
              ...selectedMod,
              projectType: selectedModDetails?.project_type || selectedMod.projectType,
              categories: selectedMod.categories || selectedModDetails?.categories || [],
              ...(selectedModDetails?.game_versions ? { game_versions: selectedModDetails.game_versions } : {}),
            } as ModHit)
          }
          className={`shrink-0 ${
            isReadingTab ? "px-2.5 py-2 rounded-lg text-[10px]" : "px-3 py-2.5 rounded-xl text-[11px]"
          } font-bold flex items-center gap-1.5 transition-all active:scale-95`}
          style={{
            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
            color: "var(--color-primary)",
          }}
          title="Agregar al Draft"
        >
          <Plus className="w-4 h-4" />
          Draft
        </button>
      )}
    </div>
  );
}
