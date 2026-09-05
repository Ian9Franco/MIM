"use client";

/**
 * SageMimbotCopilot — Asistente conversacional MIM-Bot para SAGE.
 *
 * SAGE genera el análisis heurístico determinista del crash report.
 * MIM-Bot es la IA interactiva que responde dudas técnicas adicionales
 * sobre el incidente, idéntica a la implementación de FOMO / Mod Details.
 *
 * Arquitectura modular (< 400 líneas):
 *  - Submódulos en ./mimbot (MimbotConfigModal, MimbotMessageBubble, MimbotQuickQuestions).
 *  - Copiado de respuestas y bloques de código al portapapeles.
 *  - Protección contra reinicio accidental con Undo.
 *  - Distinción de errores (429 Rate Limit vs 401 Auth).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Send, Loader2, Key, Settings2, X, RotateCcw, 
  MessageSquare, Undo2
} from "lucide-react";
import { SageAnalysisResult } from "@/utils/sageAnalyzer";
import {
  MimbotConfigModal,
  MimbotMessageBubble,
  MimbotQuickQuestions,
} from "./mimbot";
import { migrateLegacyBrowserGeminiKey } from "@/lib/core/migrateLegacyBrowserSecret";

export interface SageMimbotCopilotProps {
  analysis: SageAnalysisResult;
  rawText?: string;
  onAutoFix?: (action: any) => void;
  onClose?: () => void;
}

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
  const [hasKey, setHasKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Estado del chat
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Mecanismo de deshacer al reiniciar conversación
  const [undoMessages, setUndoMessages] = useState<ChatMessage[] | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const prevSigRef = useRef("");

  // Only retrieve configuration status. The saved credential never returns to
  // the renderer after Electron has placed it in the OS-backed secret store.
  useEffect(() => {
    migrateLegacyBrowserGeminiKey()
      .catch(() => false)
      .then(() => fetch("/api/settings"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setHasKey(Boolean(data?.apiKeysConfigured?.geminiApiKey));
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
    setUndoMessages(null);
  }, [analysis]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSending]);

  // Persist through the settings API; packaged Desktop forwards this write to
  // Electron safeStorage and responds without echoing the credential.
  const handleSaveKey = async () => {
    const clean = geminiKeyVal.trim();
    if (!clean) return;

    setIsSavingKey(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: clean }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la clave de forma segura");
      const data = await response.json();
      setHasKey(Boolean(data?.apiKeysConfigured?.geminiApiKey));
      setGeminiKeyVal("");
    } catch (e) {
      console.warn("[SageMimbotCopilot] Error al persistir key en settings:", e);
      setIsSavingKey(false);
      return;
    }

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

  // Reiniciar chat con soporte de Deshacer
  const handleResetChat = () => {
    if (chatMessages.length === 0) return;
    setUndoMessages(chatMessages);
    setChatMessages([]);
    setChatError(null);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoMessages(null);
    }, 4500);
  };

  const handleUndoReset = () => {
    if (undoMessages) {
      setChatMessages(undoMessages);
      setUndoMessages(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  // Copiar respuesta al portapapeles
  const handleCopyMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (err) {
      console.warn("[SageMimbotCopilot] Fallo al copiar al portapapeles:", err);
    }
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
      setUndoMessages(null);

      try {
        const res = await fetch("/api/sage/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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

        // 401: Falta de key o clave inválida
        if (res.status === 401 || data.error === "NO_API_KEY") {
          setShowConfig(true);
          setChatError("Clave de Gemini API inválida o expirada. Por favor configúrala de nuevo.");
          setChatMessages(chatMessages);
          return;
        }

        // 429: Rate limit o cuota de Google
        if (res.status === 429 || data.error === "RATE_LIMITED") {
          setChatMessages([
            ...newMessages,
            {
              role: "model",
              text: `⚠️ **Límite de peticiones alcanzado**: ${
                data.message ||
                "Se superó el límite de consultas por minuto (RPM) o la cuota de la API gratuita de Google. Aguardá unos segundos antes de volver a preguntar."
              }`,
            },
          ]);
          return;
        }

        if (data.reply) {
          setChatMessages([...newMessages, { role: "model", text: data.reply }]);
        } else {
          setChatMessages([
            ...newMessages,
            { role: "model", text: `Error: ${data.message || data.error || "No se obtuvo respuesta del bot."}` },
          ]);
        }
      } catch {
        setChatMessages([
          ...newMessages,
          { role: "model", text: "Error de conexión al consultar con MIM-Bot." },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [chatInput, chatMessages, isSending, hasKey, personality, analysis]
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
      {/* Header con identidad oficial de MIM-Bot */}
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
              onClick={handleResetChat}
              title="Reiniciar chat"
              aria-label="Reiniciar conversación"
              className="p-1 rounded hover:bg-purple-500/20 text-purple-300/60 hover:text-white transition-all active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle de personalidad (Bully / Estándar) */}
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
              aria-label="Seleccionar modo Bully"
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
              title="Modo Estándar: Tono neutro, estructurado e ingenieril"
              aria-label="Seleccionar modo Estándar"
            >
              🛡️ Estándar
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            aria-label="Configurar clave de Gemini API"
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
              aria-label="Cerrar asistente MIM-Bot"
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white transition-all"
              title="Cerrar MIM-Bot"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Snackbar temporal de Deshacer reinicio */}
      {undoMessages && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-xs text-purple-200 animate-in fade-in duration-200">
          <span>Conversación reiniciada.</span>
          <button
            type="button"
            onClick={handleUndoReset}
            className="flex items-center gap-1 font-bold text-purple-300 hover:text-white underline text-[11px]"
          >
            <Undo2 className="w-3 h-3" /> Deshacer
          </button>
        </div>
      )}

      {/* Panel de Configuración de API Key */}
      <MimbotConfigModal
        showConfig={showConfig}
        hasKey={hasKey}
        geminiKeyVal={geminiKeyVal}
        setGeminiKeyVal={setGeminiKeyVal}
        isSavingKey={isSavingKey}
        handleSaveKey={handleSaveKey}
        onClose={() => setShowConfig(false)}
      />

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
              <MimbotMessageBubble
                key={idx}
                msg={msg}
                idx={idx}
                copiedIdx={copiedIdx}
                onCopy={handleCopyMessage}
                onMessageContainerClick={handleMessageContainerClick}
                onOpenInFomo={handleOpenInFomo}
                suspectedMods={analysis.suspectedMods}
              />
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
          <MimbotQuickQuestions
            quickQuestions={quickQuestions}
            onSelectQuestion={(chip) => handleSend(chip)}
          />
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
            aria-label="Enviar mensaje"
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
