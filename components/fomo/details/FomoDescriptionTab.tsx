"use client";

import React from "react";
import {
  ExternalLink,
  Images,
  Search,
  Sparkles,
  Key,
  Loader2,
  RotateCcw,
  Send,
  MessageSquare,
} from "lucide-react";
interface FomoDescriptionTabProps {
  descText: string;
  translatedBody: string | null;
  isTranslating: boolean;
  handleTranslate: () => void;
  isExplaining: boolean;
  explainedBody: string | null;
  handleExplain: (extra?: string, force?: boolean) => void;
  showGeminiKeyInput: boolean;
  setShowGeminiKeyInput: (show: boolean) => void;
  geminiKeyVal: string;
  setGeminiKeyVal: (val: string) => void;
  handleSaveGeminiKey: () => void;
  explainError: string | null;
  explanationSources: Array<{ url: string; title: string }>;
  explanationImagesAnalyzed: number;
  explanationSearchUsed: boolean;
  botPersonality: "bully" | "standard";
  handleTogglePersonality: (p: "bully" | "standard") => void;
  chatMessages: Array<{ role: string; text: string }>;
  chatInput: string;
  setChatInput: (val: string) => void;
  isChatSending: boolean;
  handleSendChatMessage: (text?: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  descriptionHtmlNode: React.ReactNode;
  explainedHtmlNode: React.ReactNode;
  renderChatMessageHtml: (text: string) => React.ReactNode;
}

export function FomoDescriptionTab({
  descText,
  translatedBody,
  isTranslating,
  handleTranslate,
  isExplaining,
  explainedBody,
  handleExplain,
  showGeminiKeyInput,
  setShowGeminiKeyInput,
  geminiKeyVal,
  setGeminiKeyVal,
  handleSaveGeminiKey,
  explainError,
  explanationSources,
  explanationImagesAnalyzed,
  explanationSearchUsed,
  botPersonality,
  handleTogglePersonality,
  chatMessages,
  chatInput,
  setChatInput,
  isChatSending,
  handleSendChatMessage,
  chatBottomRef,
  descriptionHtmlNode,
  explainedHtmlNode,
  renderChatMessageHtml,
}: FomoDescriptionTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExplain()}
            disabled={isExplaining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{
              color: "#c084fc",
              background: "rgba(192, 132, 252, 0.12)",
              borderColor: "rgba(192, 132, 252, 0.28)",
            }}
            title="Explicar e investigar este proyecto con MIM-Bot"
          >
            {isExplaining ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
            )}
            {isExplaining ? "Sintetizando..." : explainedBody ? "Original" : "MIM-Bot"}
          </button>
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || !descText.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold transition-all active:scale-95 disabled:opacity-50 text-foreground"
            style={{
              borderColor: "var(--fomo-border)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {isTranslating ? "Traduciendo..." : (translatedBody ? "Original" : "Traducir")}
          </button>
        </div>
      </div>

      {/* Gemini API Key Dialog */}
      {showGeminiKeyInput && (
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs">
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
            Para investigar y sintetizar proyectos sin servidor propio, se utiliza la API pública gratuita de Google Gemini.
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
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between gap-2">
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

      {/* Empty description prompt */}
      {!descText.trim() && !explainedBody && (
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
            {isExplaining ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
            )}
            {isExplaining ? "Sintetizando..." : "MIM-Bot"}
          </button>
        </div>
      )}

      {/* Explanation Output */}
      {explainedBody ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Card de la Explicación */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-purple-950/30 via-black/40 to-black/60 border border-purple-500/25 backdrop-blur-md shadow-xl shadow-purple-950/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs bg-gradient-to-r from-purple-300 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
                    MIM-Bot · Análisis
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExplain(undefined, true)}
                  disabled={isExplaining}
                  title="Volver a generar explicación completa con MIM-Bot"
                  className="p-1.5 rounded-lg hover:bg-purple-500/20 text-purple-300 hover:text-white transition-all active:scale-90 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isExplaining ? "animate-spin text-purple-400" : ""}`} />
                </button>
              </div>

              {/* Controles de Personalidad y Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Toggle interactivo de Personalidad */}
                <div className="inline-flex items-center p-0.5 rounded-xl bg-black/60 border border-purple-500/30 text-[10px] shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleTogglePersonality("bully")}
                    className={`px-2.5 py-1 rounded-lg transition-all font-bold flex items-center gap-1 ${
                      botPersonality === "bully"
                        ? "bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-rose-900/30 scale-[1.02]"
                        : "text-white/50 hover:text-white/80"
                    }`}
                    title="Modo Bully: Tono incisivo, satírico e irónico gamer"
                  >
                    <span>🔥</span>
                    <span>Bully</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePersonality("standard")}
                    className={`px-2.5 py-1 rounded-lg transition-all font-bold flex items-center gap-1 ${
                      botPersonality === "standard"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-900/30 scale-[1.02]"
                        : "text-white/50 hover:text-white/80"
                    }`}
                    title="Modo Estándar: Tono neutro, cordial y rigurosamente técnico"
                  >
                    <span>🛡️</span>
                    <span>Estándar</span>
                  </button>
                </div>

                {explanationImagesAnalyzed > 0 && (
                  <span className="flex items-center gap-1 text-sky-300 font-semibold text-[10px] bg-sky-500/15 px-2 py-1 rounded-lg border border-sky-400/25 shadow-sm">
                    <Images className="w-3 h-3 text-sky-400" /> {explanationImagesAnalyzed} capturas
                  </span>
                )}
                {explanationSearchUsed && (
                  <span className="flex items-center gap-1 text-emerald-300 font-semibold text-[10px] bg-emerald-500/15 px-2 py-1 rounded-lg border border-emerald-400/25 shadow-sm">
                    <Search className="w-3 h-3 text-emerald-400" /> Grounding Web
                  </span>
                )}
              </div>
            </div>

            {/* Contenido HTML de la Explicación */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 shadow-inner text-xs leading-relaxed text-white/90">
              {explainedHtmlNode}
            </div>

            {/* Fuentes de búsqueda */}
            {explanationSources.length > 0 && (
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block font-semibold">
                  Fuentes externas consultadas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {explanationSources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 text-[10px] text-white/70 hover:text-purple-200 transition-all border border-white/10 hover:border-purple-400/30"
                    >
                      <ExternalLink className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                      <span className="max-w-[180px] truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── MIM-Bot Chat (project scope) ── */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-purple-950/20 to-black/40 border border-purple-500/20 backdrop-blur-md space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-200 font-bold text-xs">
                <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <MessageSquare className="w-3 h-3" />
                </div>
                <span>Copilot de Proyecto</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-300 font-bold">Online</span>
              </div>
            </div>

            {/* Historial de mensajes */}
            {chatMessages.length > 0 && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col text-xs rounded-2xl p-3 max-w-[90%] shadow-md transition-all ${
                      msg.role === "user"
                        ? "ml-auto bg-gradient-to-r from-purple-600/40 to-indigo-600/40 text-purple-100 border border-purple-400/30 rounded-br-sm"
                        : "mr-auto bg-white/[0.04] text-white/90 border border-white/10 rounded-bl-sm backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-white/40">
                        {msg.role === "user" ? (
                          "Vos"
                        ) : (
                          <span className="text-purple-300 font-bold">MIM-Bot</span>
                        )}
                      </span>
                    </div>
                    {renderChatMessageHtml(msg.text)}
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-black/40 border border-purple-500/30 text-xs text-purple-200 w-fit animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                    <span className="text-[11px] font-medium">Sintetizando respuesta con MIM-Bot...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Chips de sugerencias rápidas */}
            {chatMessages.length === 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block font-semibold">
                  Consultas sugeridas:
                </span>
                <div className="flex flex-wrap gap-1.5">
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
                      className="text-[10.5px] px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 hover:border-purple-400/40 text-purple-200 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm flex items-center gap-1.5 text-left"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input y botón enviar */}
            <div className="relative flex items-center gap-2 p-1 rounded-xl bg-black/60 border border-purple-500/25 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all shadow-inner">
              <input
                type="text"
                placeholder="Preguntale a MIM-Bot sobre este mod..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                disabled={isChatSending}
                className="flex-1 bg-transparent border-0 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isChatSending}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all active:scale-90 disabled:opacity-30 shrink-0 shadow-md shadow-purple-600/30"
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
      ) : (
        descriptionHtmlNode
      )}
    </div>
  );
}
