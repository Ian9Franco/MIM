"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Languages,
  Key,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Images as ImageIcon,
  Search,
  MessageSquare,
  Send,
} from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { markdownToHtml } from "../../lib/markdown";
import { renderBodyText } from "./utils";

interface ModDetailsDescTabProps {
  selectedMod: ModHit;
  descriptionBody: string;
  explainedBody: string | null;
  isExplaining: boolean;
  handleExplain: (
    customKey?: string,
    forceRefresh?: boolean,
    personalityOverride?: "bully" | "standard"
  ) => void;
  handleTogglePersonality: (p: "bully" | "standard") => void;
  botPersonality: "bully" | "standard";
  explanationSources: Array<{ title: string; url: string }>;
  explanationSearchUsed: boolean;
  explanationImagesAnalyzed: number;
  showGeminiKeyInput: boolean;
  setShowGeminiKeyInput: (show: boolean) => void;
  geminiKeyVal: string;
  setGeminiKeyVal: (val: string) => void;
  handleSaveGeminiKey: () => void;
  explainError: string | null;
  translatedBody: string | null;
  isTranslating: boolean;
  handleTranslate: () => void;
  chatMessages: Array<{ role: "user" | "model"; text: string }>;
  chatInput: string;
  setChatInput: (val: string) => void;
  isChatSending: boolean;
  handleSendChatMessage: (textToSend?: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}

export function ModDetailsDescTab({
  selectedMod,
  descriptionBody,
  explainedBody,
  isExplaining,
  handleExplain,
  handleTogglePersonality,
  botPersonality,
  explanationSources,
  explanationSearchUsed,
  explanationImagesAnalyzed,
  showGeminiKeyInput,
  setShowGeminiKeyInput,
  geminiKeyVal,
  setGeminiKeyVal,
  handleSaveGeminiKey,
  explainError,
  translatedBody,
  isTranslating,
  handleTranslate,
  chatMessages,
  chatInput,
  setChatInput,
  isChatSending,
  handleSendChatMessage,
  chatBottomRef,
}: ModDetailsDescTabProps) {
  const handleFomoLinkClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-fomo-query]") as HTMLElement;
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      const query = target.getAttribute("data-fomo-query");
      if (query) {
        window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query: query.trim() } }));
      }
    }
  };

  return (
    <motion.div
      key="desc"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3 min-h-full w-full"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 font-bold">
          Descripción
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleExplain()}
            disabled={isExplaining}
            className="px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            style={{
              color: "#c084fc",
              background: "rgba(192, 132, 252, 0.12)",
              borderColor: "rgba(192, 132, 252, 0.28)",
            }}
            title="Explicar e investigar este proyecto con Gemini 2.0 Flash y Google Search"
          >
            {isExplaining ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
            )}
            {isExplaining ? "Sintetizando..." : explainedBody ? "Original" : "MIM-Bot"}
          </button>

          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || !descriptionBody}
            className="px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            style={{
              color: "var(--color-primary)",
              background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
            }}
          >
            {isTranslating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Languages className="w-3 h-3" />
            )}
            {isTranslating ? "Traduciendo" : translatedBody ? "Original" : "Traducir"}
          </button>
        </div>
      </div>

      {/* Modal/Panel de Entrada de Gemini API Key si falta o se solicita */}
      {showGeminiKeyInput && (
        <div className="p-3 mb-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Clave de Gemini API Requerida
            </span>
            <button
              type="button"
              onClick={() => setShowGeminiKeyInput(false)}
              className="text-white/40 hover:text-white text-[10px]"
            >
              Cancelar
            </button>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">
            Para investigar y explicar proyectos sin servidor propio, se utiliza la API pública gratuita de Google Gemini.
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
              onClick={handleSaveGeminiKey}
              disabled={!geminiKeyVal.trim() || isExplaining}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
            >
              Guardar y Explicar
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Obtener clave gratuita en Google AI Studio
            </a>
          </div>
        </div>
      )}

      {explainError && !showGeminiKeyInput && (
        <div className="p-2.5 mb-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between gap-2">
          <span>{explainError}</span>
          <button
            type="button"
            onClick={() => setShowGeminiKeyInput(true)}
            className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-white whitespace-nowrap"
          >
            Configurar Key
          </button>
        </div>
      )}

      {/* Caso de Proyecto Sin Descripción: Llamado a la acción destacado */}
      {!descriptionBody && !explainedBody && (
        <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/20 text-center space-y-3 my-2">
          <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-300 mx-auto flex items-center justify-center border border-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/90">Este proyecto no incluye descripción del autor</p>
            <p className="text-[11px] text-white/50 leading-relaxed max-w-sm mx-auto">
              Gemini AI puede buscar en Google Search (GitHub, foros y wikis) para averiguar qué hace y resumírtelo en segundos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleExplain()}
            disabled={isExplaining}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExplaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isExplaining ? "Investigando en Google..." : "Investigar y Explicar con IA"}
          </button>
        </div>
      )}

      {/* Renderizado de la Explicación Generada */}
      {explainedBody ? (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/25 text-[10px] flex-wrap gap-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                <span>MIM-Bot · Análisis</span>
              </span>
              <button
                type="button"
                onClick={() => handleExplain(undefined, true)}
                disabled={isExplaining}
                title="Volver a generar explicación completa con MIM-Bot"
                className="p-1 rounded hover:bg-purple-500/20 text-purple-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className={`w-3 h-3 ${isExplaining ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Toggle interactivo de Personalidad */}
              <div className="inline-flex items-center p-0.5 rounded-md bg-black/50 border border-purple-500/30 text-[9px] shadow-sm">
                <button
                  type="button"
                  onClick={() => handleTogglePersonality("bully")}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    botPersonality === "bully"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-purple-300/70 hover:text-purple-200"
                  }`}
                  title="Modo Bully: Tono incisivo, satírico e irónico gamer"
                >
                  🔥 Bully
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePersonality("standard")}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    botPersonality === "standard"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-purple-300/70 hover:text-purple-200"
                  }`}
                  title="Modo Estándar: Tono neutro, cordial y rigurosamente técnico"
                >
                  🛡️ Estándar
                </button>
              </div>
              {explanationImagesAnalyzed > 0 && (
                <span className="flex items-center gap-1 text-sky-400 font-medium text-[9px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  <ImageIcon className="w-2.5 h-2.5" /> {explanationImagesAnalyzed} capturas
                </span>
              )}
              {explanationSearchUsed && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Search className="w-2.5 h-2.5" /> Google Search Grounding
                </span>
              )}
            </div>
          </div>

          <div
            onClick={handleFomoLinkClick}
            className="mim-rich-description text-xs text-white/80 leading-relaxed space-y-2.5 break-words bg-black/20 p-3 rounded-xl border border-white/5 cursor-pointer"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(explainedBody) }}
          />

          {explanationSources.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">
                Fuentes de Google Search consultadas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {explanationSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-white/60 hover:text-white transition-colors border border-white/5"
                  >
                    <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                    <span className="max-w-[160px] truncate">{src.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Mini-Chat Interactivo del Proyecto */}
          <div className="mt-4 pt-3.5 border-t border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Preguntale a MIM-Bot sobre este proyecto</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                <span>MIM-Bot</span>
              </span>
            </div>

            {/* Historial de mensajes */}
            {chatMessages.length > 0 && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col text-xs rounded-2xl p-3 max-w-[90%] shadow-sm ${
                      msg.role === "user"
                        ? "ml-auto bg-purple-600/30 text-purple-100 border border-purple-500/30 rounded-br-sm"
                        : "mr-auto bg-black/40 text-white/90 border border-white/5 rounded-bl-sm"
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase text-white/40 mb-1 flex items-center gap-1.5">
                      {msg.role === "user" ? (
                        "Vos"
                      ) : (
                        <>
                          <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                          <span className="text-purple-300 font-bold">MIM-Bot</span>
                        </>
                      )}
                    </span>
                    <div
                      onClick={handleFomoLinkClick}
                      className="mim-rich-description text-xs leading-relaxed space-y-1.5 break-words cursor-pointer"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.text) }}
                    />
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-black/30 border border-white/5 text-xs text-purple-300 w-fit">
                    <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Pensando la forreada...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Chips de sugerencias rápidas */}
            {chatMessages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  "¿Es compatible con Create y Sodium?",
                  "¿Tiene comandos útiles o configuración?",
                  "¿Añade nuevas dimensiones o biomas?",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChatMessage(chip)}
                    disabled={isChatSending}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/30 text-white/60 hover:text-purple-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    💡 {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input y botón enviar */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Hacé tu pregunta a MIM-Bot..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                disabled={isChatSending}
                className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isChatSending}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95 disabled:opacity-30 shrink-0 shadow-lg shadow-purple-600/20"
              >
                {isChatSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : translatedBody ? (
        <div className="mim-rich-description" dangerouslySetInnerHTML={{ __html: translatedBody }} />
      ) : (
        renderBodyText(descriptionBody, selectedMod?._source)
      )}
    </motion.div>
  );
}
