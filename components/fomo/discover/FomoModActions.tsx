"use client";

import React from "react";
import { ListTree, Download, Loader2, FlaskConical, FlaskConicalOff, ExternalLink } from "lucide-react";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";

type FomoModActionsProps = {
  mod: any;
  primaryType: string;
  isBedrock: boolean;
  isDownloading?: boolean;
  isSelected?: boolean;
  onDownload?: (mod: any) => void;
  onToggleSelect?: (mod: any) => void;
  variant?: "floating" | "inline";
};

export function FomoModActions({
  mod,
  primaryType,
  isBedrock,
  isDownloading,
  isSelected,
  onDownload,
  onToggleSelect,
  variant = "floating",
}: FomoModActionsProps) {
  const { isProjectInDraft } = useActiveDraft();
  const projectId = mod.id || mod.slug || mod.projectId;
  const inDraft = isProjectInDraft(projectId);
  const circle = variant === "floating";

  const btn = circle
    ? "fomo-action-btn w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-md transition-all shadow-xl hover:scale-110 active:scale-95"
    : "fomo-action-btn w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:scale-105 active:scale-95";

  return (
    <div
      className={
        circle
          ? "absolute top-3 right-3 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2.5 group-hover:translate-y-0"
          : "flex items-center gap-1 shrink-0"
      }
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(mod);
          }}
          className={`${btn} ${
            isSelected
              ? "bg-primary border-primary text-white"
              : "fomo-action-btn--list bg-black/60 border-white/20 text-white hover:bg-black/80"
          }`}
          title={isSelected ? "Quitar de la lista" : "Añadir a la lista"}
        >
          <ListTree className="w-4 h-4" />
        </button>
      )}
      {inDraft ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("fomo-remove-from-draft", { detail: { projectId } }),
            );
          }}
          className={`${btn} bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white`}
          title="Quitar del Draft Activo"
        >
          <FlaskConicalOff className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("fomo-open-add-to-draft", {
                detail: {
                  projectId,
                  platform: mod._source || "modrinth",
                  title: mod.title,
                  contentType: primaryType === "textura" ? "resourcepack" : primaryType,
                },
              }),
            );
          }}
          className={`${btn} bg-black/60 border-white/20 text-white hover:bg-primary hover:border-primary`}
          title="Añadir a Draft"
        >
          <FlaskConical className="w-4 h-4" />
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(mod);
          }}
          disabled={isDownloading}
          className={`${btn} fomo-action-btn--download ${
            isBedrock
              ? "bg-[#00CC44]/80 border-[#00CC44] text-white hover:bg-[#00CC44]"
              : "bg-emerald-500/90 border-emerald-400 text-white hover:bg-emerald-500"
          }`}
          title={isBedrock ? "Ver en Minecraft Marketplace" : "Descargar"}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isBedrock ? (
            <ExternalLink className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
