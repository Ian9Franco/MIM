"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteCommunityContent,
  type CommunityContentType,
} from "./communityActions";

interface CommunityDeleteButtonProps {
  type: CommunityContentType;
  id: string;
  onDeleted?: (id: string) => void;
  className?: string;
}

export function CommunityDeleteButton({
  type,
  id,
  onDeleted,
  className = "",
}: CommunityDeleteButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    const label =
      type === "favorite"
        ? "este compartido"
        : type === "video"
          ? "este showcase"
          : "este modpack";
    if (!window.confirm(`¿Eliminar ${label} de MIM Cloud? Esta acción no se puede deshacer.`)) {
      return;
    }
    setBusy(true);
    const { ok } = await deleteCommunityContent(type, id);
    if (ok) onDeleted?.(id);
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className={`p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50 ${className}`}
      title="Eliminar de MIM Cloud"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
