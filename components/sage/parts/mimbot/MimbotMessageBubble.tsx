"use client";

import React from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { markdownToHtml } from "@/utils/markdown";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface MimbotMessageBubbleProps {
  msg: ChatMessage;
  idx: number;
  copiedIdx: number | null;
  onCopy: (text: string, idx: number) => void;
  onMessageContainerClick: (e: React.MouseEvent) => void;
  onOpenInFomo: (query: string) => void;
  suspectedMods?: string[];
}

export function MimbotMessageBubble({
  msg,
  idx,
  copiedIdx,
  onCopy,
  onMessageContainerClick,
  onOpenInFomo,
  suspectedMods = [],
}: MimbotMessageBubbleProps) {
  const extractFomoRecommendations = (text: string): Array<{ label: string; query: string }> => {
    const results: Array<{ label: string; query: string }> = [];
    const seen = new Set<string>();

    const fomoRegex = /\[([^\]]+)\]\(fomo:(?:\/\/)?([^)]+)\)/gi;
    let match;
    while ((match = fomoRegex.exec(text)) !== null) {
      const label = match[1].trim();
      const query = match[2].trim();
      const key = query.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ label, query });
      }
    }

    if (Array.isArray(suspectedMods)) {
      for (const modId of suspectedMods) {
        const cleanMod = modId.trim();
        if (cleanMod && !seen.has(cleanMod.toLowerCase()) && text.toLowerCase().includes(cleanMod.toLowerCase())) {
          seen.add(cleanMod.toLowerCase());
          results.push({ label: cleanMod, query: cleanMod });
        }
      }
    }

    return results;
  };

  return (
    <div
      className={`relative group flex flex-col text-xs rounded-2xl p-3 max-w-[90%] shadow-sm ${
        msg.role === "user"
          ? "ml-auto bg-purple-600/30 text-purple-100 border border-purple-500/30 rounded-br-sm"
          : "mr-auto bg-black/50 text-white/90 border border-white/5 rounded-bl-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono uppercase text-white/40 flex items-center gap-1.5">
          {msg.role === "user" ? (
            "Vos"
          ) : (
            <>
              <img
                src="/icon.png"
                alt=""
                className="w-3.5 h-3.5 object-contain animate-slime shrink-0"
              />
              <span className="text-purple-300 font-bold">MIM-Bot</span>
            </>
          )}
        </span>

        {/* Botón de copiar respuesta */}
        {msg.role === "model" && (
          <button
            type="button"
            onClick={() => onCopy(msg.text, idx)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
            title="Copiar respuesta al portapapeles"
            aria-label="Copiar respuesta"
          >
            {copiedIdx === idx ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      <div
        onClick={onMessageContainerClick}
        className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-1.5 break-words"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.text) }}
      />

      {/* Acciones de 1-clic para abrir en FOMO */}
      {msg.role === "model" && (() => {
        const recs = extractFomoRecommendations(msg.text);
        if (recs.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
            <span className="text-[10px] text-purple-300/70 font-mono flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-purple-400" /> Abrir en FOMO:
            </span>
            {recs.map((rec, rIdx) => (
              <button
                key={rIdx}
                type="button"
                onClick={() => onOpenInFomo(rec.query)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600/45 text-purple-200 hover:text-white border border-purple-500/40 text-[11px] font-bold transition-all active:scale-95 shadow-sm"
                title={`Buscar y abrir ${rec.label} en FOMO`}
              >
                <span>📦</span>
                <span>{rec.label}</span>
                <span className="text-[9px] opacity-70 font-mono">↗</span>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
