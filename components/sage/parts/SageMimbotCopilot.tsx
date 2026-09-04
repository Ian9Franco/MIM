"use client";

/**
 * SageMimbotCopilot — Asistente conversacional MIM-Bot para SAGE.
 *
 * SAGE genera el análisis heurístico determinista del crash report.
 * MIM-Bot es la IA interactiva que responde dudas técnicas adicionales
 * sobre el incidente, idéntica a la implementación de FOMO / Mod Details.
 *
 * Persistencia de API Key:
 *  - Guarda y lee en localStorage ("mim_gemini_api_key")
 *  - Sincroniza y persiste permanentemente en /api/settings (mim-settings.json)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Send, Loader2, Key, Settings2, X, RotateCcw, 
  ExternalLink, MessageSquare, Sparkles 
} from "lucide-react";
import { SageAnalysisResult } from "@/utils/sageAnalyzer";
import { markdownToHtml } from "@/utils/markdown";

export interface SageMimbotCopilotProps {
  analysis: SageAnalysisResult;
  rawText?: string;
  onAutoFix?: (action: any) => void;
  onClose?: () => void;
}

const GEMINI_KEY_STORAGE = "mim_gemini_api_key";
const PERSONALITY_STORAGE = "mim_bot_personality";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export function SageMimbotCopilot({ analysis, onClose }: SageMimbotCopilotProps) {
  const [personality, setPersonality] = useState<"bully" | "standard">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(PERSONALITY_STORAGE);
        if (saved === "bully" || saved === "standard") return saved;
      } catch {}
    }
    return "bully";
  });

  const [showConfig, setShowConfig] = useState(false);
  const [geminiKeyVal, setGeminiKeyVal] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Estado del chat
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Tracking para resetear chat si cambia el crash
  const prevSigRef = useRef("");

  const hasKey = savedKey.trim().length > 0;

  // Cargar clave desde localStorage y sincronizar con /api/settings
  useEffect(() => {
    let localKey = "";
    try {
      localKey = localStorage.getItem(GEMINI_KEY_STORAGE) || "";
      if (localKey) {
        setSavedKey(localKey);
        setGeminiKeyVal(localKey);
      }
    } catch {}

    // Consultar settings guardados en disco
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.geminiApiKey) {
          const configKey = data.geminiApiKey.trim();
          if (configKey) {
            setSavedKey(configKey);
            setGeminiKeyVal(configKey);
            try {
              localStorage.setItem(GEMINI_KEY_STORAGE, configKey);
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  // Reset de conversación al cambiar el reporte analizado
  useEffect(() => {
    const sig = `${analysis.exceptionType}|${analysis.category}|${analysis.title}`;
    if (sig === prevSigRef.current) return;
    prevSigRef.current = sig;
    setChatMessages([]);
    setChatInput("");
    setChatError(null);
  }, [analysis]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSending]);

  // Guardar clave tanto en localStorage como en /api/settings (mim-settings.json)
  const handleSaveKey = async () => {
    const clean = geminiKeyVal.trim();
    if (!clean) return;

    setIsSavingKey(true);
    try {
      localStorage.setItem(GEMINI_KEY_STORAGE, clean);
      localStorage.setItem(PERSONALITY_STORAGE, personality);
    } catch {}

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: clean }),
      });
    } catch (e) {
      console.warn("[SageMimbotCopilot] Error al persistir key en settings:", e);
    }

    setSavedKey(clean);
    setIsSavingKey(false);
    setShowConfig(false);
    setChatError(null);
  };

  const handleTogglePersonality = (newP: "bully" | "standard") => {
    setPersonality(newP);
    try {
      localStorage.setItem(PERSONALITY_STORAGE, newP);
    } catch {}
  };

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const question = (textOverride || chatInput).trim();
      if (!question || isSending) return;

      if (!hasKey) {
        setShowConfig(true);
        return;
      }

      const newMessages: ChatMessage[] = [...chatMessages, { role: "user", text: question }];
      setChatMessages(newMessages);
      setChatInput("");
      setIsSending(true);
      setChatError(null);

      try {
        const res = await fetch("/api/sage/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-gemini-key": savedKey,
          },
          body: JSON.stringify({
            clientApiKey: savedKey,
            question,
            messages: chatMessages,
            personality,
            crashContext: {
              category: analysis.category,
              exceptionType: analysis.exceptionType,
              suspectedMods: analysis.suspectedMods,
              loader: analysis.loader,
              gameVersion: analysis.gameVersion,
              explanation: analysis.explanation,
            },
          }),
        });

        const data = await res.json();

        if (res.status === 401 || data.error === "NO_API_KEY") {
          setShowConfig(true);
          setChatError("Clave de Gemini API inválida o expirada. Por favor configúrala de nuevo.");
          setChatMessages(chatMessages);
          return;
        }

        if (data.reply) {
          setChatMessages([...newMessages, { role: "model", text: data.reply }]);
        } else {
          setChatMessages([
            ...newMessages,
            { role: "model", text: `Error: ${data.error || "No se obtuvo respuesta del bot."}` },
          ]);
        }
      } catch (err: any) {
        setChatMessages([
          ...newMessages,
          { role: "model", text: "Error de conexión al consultar con MIM-Bot." },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [chatInput, chatMessages, isSending, hasKey, savedKey, personality, analysis]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasKey) {
      setShowConfig(true);
      return;
    }
    handleSend();
  };

  const handleOpenInFomo = (query: string) => {
    if (!query) return;
    window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
    window.dispatchEvent(
      new CustomEvent("fomo-search-and-open", {
        detail: { query: query.trim() },
      })
    );
  };

  const handleMessageContainerClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-fomo-query]") as HTMLElement;
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      const query = target.getAttribute("data-fomo-query");
      if (query) {
        handleOpenInFomo(query);
      }
    }
  };

  const extractFomoRecommendations = (text: string): Array<{ label: string; query: string }> => {
    const results: Array<{ label: string; query: string }> = [];
    const seen = new Set<string>();

    // 1. Extraer links explícitos fomo:query
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

    // 2. Si no hubo links explícitos, verificar si menciona sospechosos del crash report
    if (analysis.suspectedMods && Array.isArray(analysis.suspectedMods)) {
      for (const modId of analysis.suspectedMods) {
        const cleanMod = modId.trim();
        if (cleanMod && !seen.has(cleanMod.toLowerCase()) && text.toLowerCase().includes(cleanMod.toLowerCase())) {
          seen.add(cleanMod.toLowerCase());
          results.push({ label: cleanMod, query: cleanMod });
        }
      }
    }

    return results;
  };

  // Sugerencias rápidas contextuales sobre el crash
  const quickQuestions = [
    analysis.suspectedMods?.length
      ? `¿Cómo resuelvo el conflicto con ${analysis.suspectedMods[0]}?`
      : "¿Qué causó este crash exactamente?",
    "¿Hay una versión actualizada o compatible disponible?",
    "¿Qué mod debo desactivar primero?",
    "¿Es un error de memoria o de dependencias?",
  ];

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-black/40 backdrop-blur-md p-4 space-y-3.5 shadow-xl">
      {/* Header con identidad oficial de MIM-Bot (igual que en descripción de mods) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
            <img
              src="/icon.png"
              alt=""
              className="w-4 h-4 object-contain animate-slime shrink-0"
            />
            <span>MIM-Bot</span>
            <span className="text-[9px] font-mono opacity-50 uppercase tracking-wider font-semibold">
              · Asistente de Crash
            </span>
          </span>
          {chatMessages.length > 0 && (
            <button
              type="button"
              onClick={() => setChatMessages([])}
              title="Reiniciar chat"
              className="p-1 rounded hover:bg-purple-500/20 text-purple-300/60 hover:text-white transition-all active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle de personalidad (Bully / Estándar) idéntico a FOMO */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-black/60 border border-purple-500/30 text-[9px] shadow-sm">
            <button
              type="button"
              onClick={() => handleTogglePersonality("bully")}
              className={`px-2 py-0.5 rounded transition-all font-semibold ${
                personality === "bully"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-300/70 hover:text-purple-200"
              }`}
              title="Modo Bully: Tono sarcástico, irónico y mordaz con soluciones exactas"
            >
              🔥 Bully
            </button>
            <button
              type="button"
              onClick={() => handleTogglePersonality("standard")}
              className={`px-2 py-0.5 rounded transition-all font-semibold ${
                personality === "standard"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-300/70 hover:text-purple-200"
              }`}
              title="Modo Estándar: Tono neutro, directo e ingenieril"
            >
              🛡️ Estándar
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border transition-all ${
              !hasKey
                ? "border-amber-500/50 bg-amber-500/20 text-amber-300 animate-pulse"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-purple-500/40"
            }`}
            title="Configurar Gemini API Key"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white transition-all"
              title="Cerrar MIM-Bot"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Panel de Entrada de Gemini API Key si falta o se solicita (idéntico a FOMO / Mod Details) */}
      {(showConfig || !hasKey) && (
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Clave de Gemini API Requerida
            </span>
            {hasKey && (
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-white/40 hover:text-white text-[10px]"
              >
                Cerrar
              </button>
            )}
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">
            Para consultar a MIM-Bot sobre crashes y recibir diagnósticos inteligentes, se utiliza la API gratuita de Google Gemini. Se guardará permanentemente en tus ajustes de configuración.
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
              <ExternalLink className="w-3 h-3" /> Obtener clave gratuita en Google AI Studio
            </a>
          </div>
        </div>
      )}

      {chatError && !showConfig && hasKey && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between gap-2">
          <span>{chatError}</span>
          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-white whitespace-nowrap"
          >
            Configurar Key
          </button>
        </div>
      )}

      {/* Mini-Chat Interactivo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-purple-300/80 font-semibold text-[11px]">
            <MessageSquare className="w-3 h-3 text-purple-400" />
            <span>Preguntale a MIM-Bot sobre este incidente</span>
          </div>
          {hasKey && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gemini Conectado
            </span>
          )}
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
                    : "mr-auto bg-black/50 text-white/90 border border-white/5 rounded-bl-sm"
                }`}
              >
                <span className="text-[9px] font-mono uppercase text-white/40 mb-1 flex items-center gap-1.5">
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
                <div
                  onClick={handleMessageContainerClick}
                  className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-1.5 break-words"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.text) }}
                />

                {/* Acciones de 1-clic para abrir en FOMO si MIM-Bot recomendó o mencionó mods */}
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
                          onClick={() => handleOpenInFomo(rec.query)}
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
            ))}

            {isSending && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-purple-300 w-fit">
                <img
                  src="/icon.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain animate-slime shrink-0"
                />
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>
                  {personality === "bully"
                    ? "Pensando la forreada..."
                    : "MIM-Bot analizando el crash..."}
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* Chips de sugerencias rápidas si el chat está vacío */}
        {chatMessages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {quickQuestions.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                className="px-2.5 py-1 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 hover:text-white text-[11px] border border-purple-500/20 transition-all text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Formulario de envío */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Hacé tu pregunta a MIM-Bot sobre este crash..."
            className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-purple-500/25 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || (!chatInput.trim() && hasKey)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 active:scale-95"
          >
            {!hasKey ? (
              <>
                <Key className="w-3.5 h-3.5" /> Key
              </>
            ) : isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Enviar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
