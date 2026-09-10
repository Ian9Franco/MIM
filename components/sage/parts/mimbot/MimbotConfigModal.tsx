"use client";

import React from "react";
import { Key, ExternalLink, Loader2 } from "lucide-react";
import { MimbotByokTransparencyPanel } from "./MimbotByokTransparencyPanel";

interface MimbotConfigModalProps {
  showConfig: boolean;
  hasKey: boolean;
  geminiKeyVal: string;
  setGeminiKeyVal: (v: string) => void;
  isSavingKey: boolean;
  handleSaveKey: () => void;
  onClose: () => void;
}

export function MimbotConfigModal({
  showConfig,
  hasKey,
  geminiKeyVal,
  setGeminiKeyVal,
  isSavingKey,
  handleSaveKey,
  onClose,
}: MimbotConfigModalProps) {
  if (!showConfig && hasKey) return null;

  return (
    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between">
        <span className="font-bold text-purple-300 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5" /> Clave de Gemini API Requerida
        </span>
        {hasKey && (
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white text-[10px]"
          >
            Cerrar
          </button>
        )}
      </div>
      <p className="text-[11px] text-white/60 leading-relaxed">
        Para consultar a MIM-Bot sobre crashes en tiempo real, conectá tu clave de Google Gemini (BYOK).
        MIM la guarda en el almacenamiento seguro local de la app; no se envía a servidores de MIM.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={geminiKeyVal}
          onChange={(e) => setGeminiKeyVal(e.target.value)}
          placeholder="AIzaSy..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-purple-500/30 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400 font-mono"
        />
        <button
          type="button"
          onClick={handleSaveKey}
          disabled={!geminiKeyVal.trim() || isSavingKey}
          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap flex items-center gap-1"
        >
          {isSavingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar en Ajustes"}
        </button>
      </div>
      <div className="flex items-center justify-between text-[10px] pt-1">
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-purple-400 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> Obtener clave en Google AI Studio
        </a>
      </div>
      <MimbotByokTransparencyPanel compact />
    </div>
  );
}
