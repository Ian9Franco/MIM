"use client";

import React from "react";
import { Trash2 } from "lucide-react";

interface MimbotChatHistoryControlsProps {
  enabled: boolean;
  hasMessages: boolean;
  onClearHistory: () => void;
}

export function MimbotChatHistoryControls({
  enabled,
  hasMessages,
  onClearHistory,
}: MimbotChatHistoryControlsProps) {
  if (!enabled || !hasMessages) return null;

  return (
    <button
      type="button"
      onClick={onClearHistory}
      title="Borrar historial guardado de este crash"
      aria-label="Borrar historial de conversación de este crash"
      className="p-1 rounded hover:bg-rose-500/20 text-rose-300/70 hover:text-rose-200 transition-all active:scale-95"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  );
}
