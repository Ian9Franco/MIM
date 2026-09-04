"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, 
  Settings2, Loader2, Key, Bot, RefreshCw, X, ChevronDown, ChevronUp,
  Cpu, Wrench
} from "lucide-react";
import { 
  analyzeWithSageMimbot, 
  chatWithSageMimbot, 
  SageMimbotDiagnosisResult, 
  SageChatMessage 
} from "@/lib/intelligence/sage/sageMimbotEngine";
import { SageAnalysisResult } from "@/utils/sageAnalyzer";

export interface SageMimbotCopilotProps {
  analysis: SageAnalysisResult;
  rawText: string;
  onAutoFix?: (action: any) => void;
  onClose?: () => void;
}

export function SageMimbotCopilot({ analysis, rawText, onAutoFix, onClose }: SageMimbotCopilotProps) {
  const [personality, setPersonality] = useState<"bully" | "standard">("bully");
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<SageMimbotDiagnosisResult | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  
  // BYOK Settings (Stored Strictly Local)
  const [provider, setProvider] = useState<"offline" | "openai" | "gemini">("offline");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("gpt-4o");

  // Chat State
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<SageChatMessage[]>([]);
  const [showEliminationTree, setShowEliminationTree] = useState<boolean>(true);

  // Load saved local BYOK keys on mount
  useEffect(() => {
    try {
      const savedProv = localStorage.getItem("mim_sage_ai_provider") as any;
      const savedKey = localStorage.getItem("mim_sage_ai_key") || "";
      const savedModel = localStorage.getItem("mim_sage_ai_model") || "";
      const savedPers = localStorage.getItem("mim_sage_personality") as any;

      if (savedProv) setProvider(savedProv);
      if (savedKey) setApiKey(savedKey);
      if (savedModel) setModel(savedModel);
      if (savedPers) setPersonality(savedPers);
    } catch {}
  }, []);

  // Run initial diagnosis when mounted or analysis changes
  useEffect(() => {
    let isCancelled = false;
    async function runDiagnosis() {
      setLoading(true);
      try {
        const res = await analyzeWithSageMimbot({
          analysis,
          rawCrashText: rawText,
          personality,
          provider,
          apiKey: apiKey || undefined,
          model: model || undefined,
        });
        if (!isCancelled) {
          setDiagnosis(res);
        }
      } catch (err) {
        console.error("Failed to run SAGE MIM-Bot diagnosis:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    runDiagnosis();
    return () => { isCancelled = true; };
  }, [analysis, rawText, personality, provider, apiKey, model]);

  const saveSettings = () => {
    try {
      localStorage.setItem("mim_sage_ai_provider", provider);
      localStorage.setItem("mim_sage_ai_key", apiKey);
      localStorage.setItem("mim_sage_ai_model", model);
      localStorage.setItem("mim_sage_personality", personality);
      setShowConfig(false);
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !diagnosis || chatLoading) return;

    const userText = chatInput.trim();
    const newMessages: SageChatMessage[] = [...chatMessages, { role: "user", text: userText }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const reply = await chatWithSageMimbot(
        diagnosis,
        newMessages,
        apiKey || undefined,
        provider !== "offline" ? provider : undefined
      );
      setChatMessages([...newMessages, { role: "model", text: reply }]);
    } catch (err) {
      setChatMessages([...newMessages, { role: "model", text: "Error de conexión al responder la consulta." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-purple-500/30 bg-black/40 backdrop-blur-xl p-5 shadow-2xl space-y-5 animate-fade-in relative overflow-hidden">
      {/* Decorative LED Glow Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-emerald-400 opacity-70" />

      {/* Header with Jumping Slime Icon */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative shadow-lg shadow-purple-500/10">
            {/* Jumping Slime Icon */}
            <img src="/icon.png" alt="MIM-Bot" className="w-5 h-5 object-contain animate-slime shrink-0" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                MIM-Bot Copilot
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-normal">
                  SAGE 3.0
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-white/50">Diagnóstico interactivo con deducción lógica y grafo FOMO</p>
          </div>
        </div>

        {/* Personality & Config Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPersonality(personality === "bully" ? "standard" : "bully")}
            className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5"
            style={{
              borderColor: personality === "bully" ? "rgba(244, 63, 94, 0.4)" : "rgba(99, 102, 241, 0.4)",
              backgroundColor: personality === "bully" ? "rgba(244, 63, 94, 0.1)" : "rgba(99, 102, 241, 0.1)",
              color: personality === "bully" ? "#fda4af" : "#c7d2fe",
            }}
            title="Cambiar tono de personalidad"
          >
            {personality === "bully" ? "🔥 Modo Bully" : "💼 Modo Ingeniero"}
          </button>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-white/70 hover:text-white transition-all"
            title="Configurar llaves de IA (BYOK)"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-white/40 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* BYOK Settings Drawer (Local Storage, Zero Vercel Leak) */}
      {showConfig && (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white/80 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              Configuración de Modelos Pro (BYOK - Bring Your Own Key)
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              100% Local y Seguro
            </span>
          </div>
          <p className="text-[11px] text-white/40">
            Tus claves se almacenan de forma local en tu máquina. Ninguna consulta ni token se envía a servidores de Vercel.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
            >
              <option value="offline">Modo Local Offline (Sin API Key)</option>
              <option value="openai">OpenAI (ChatGPT Pro / GPT-4o / o1)</option>
              <option value="gemini">Google Cloud (Gemini 1.5/2.5 Pro)</option>
            </select>

            {provider !== "offline" && (
              <>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Pegar API Key personal..."
                  className="p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === "openai" ? "gpt-4o / o3-mini" : "gemini-1.5-pro"}
                  className="p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
                />
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={saveSettings}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
            >
              Guardar en Bóveda Local
            </button>
          </div>
        </div>
      )}

      {/* Main Analysis Area */}
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <img src="/icon.png" alt="MIM-Bot" className="w-8 h-8 object-contain animate-slime" />
          </div>
          <p className="text-xs text-purple-300 font-bold uppercase tracking-wider flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            MIM-Bot analizando grafo de dependencias y stack trace...
          </p>
        </div>
      ) : diagnosis ? (
        <div className="space-y-4">
          {/* Explanation Banner with Slime Mini-Badge */}
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs leading-relaxed text-white/90 space-y-3 relative">
            <div className="flex items-center justify-between text-[10px] text-white/40 border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 font-mono text-purple-300 font-bold">
                <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                Veredicto de MIM-Bot
              </span>
              <span className="font-mono">
                {diagnosis.fromCache ? "⚡ Caché local (0 ms)" : `Motor: ${diagnosis.modelUsed}`}
              </span>
            </div>
            <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
              {diagnosis.mimbotExplanation}
            </div>
          </div>

          {/* FOMO Heuristic Elimination Tree */}
          {diagnosis.eliminationTree.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowEliminationTree(!showEliminationTree)}
                className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-all py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Árbol de Descarte Lógico (Grafo FOMO)
                </span>
                {showEliminationTree ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showEliminationTree && (
                <div className="space-y-1.5">
                  {diagnosis.eliminationTree.map((item) => (
                    <div 
                      key={item.modId} 
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-300">{item.modId}</span>
                        {item.hasDirectMixinCollision && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Mixin</span>
                        )}
                        {item.isMissingDependency && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">Falta Dep</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/40 hidden sm:inline max-w-[220px] truncate">{item.reason}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-rose-500" 
                              style={{ width: `${Math.round(item.confidence * 100)}%` }} 
                            />
                          </div>
                          <span className="font-mono text-[10px] text-white/60">{Math.round(item.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1-Click Actionable Fixes */}
          {diagnosis.actionableFixes.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Wrench className="w-3 h-3 text-emerald-400" />
                Acciones de Resolución en 1-Clic
              </h4>
              <div className="flex flex-wrap gap-2">
                {diagnosis.actionableFixes.map((fix) => (
                  <button
                    key={fix.id}
                    type="button"
                    onClick={() => onAutoFix && onAutoFix(fix)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-2 transition-all shadow-sm shadow-emerald-500/10"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {fix.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Mini-Chat */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-purple-400" />
              Preguntar a MIM-Bot sobre este error
            </h4>

            {chatMessages.length > 0 && (
              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`p-2.5 rounded-2xl text-xs ${
                      msg.role === "user" 
                        ? "bg-purple-600/20 border border-purple-500/30 text-white ml-6" 
                        : "bg-white/5 border border-white/10 text-white/90 mr-6 flex gap-2"
                    }`}
                  >
                    {msg.role !== "user" && (
                      <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0 mt-0.5" />
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 flex items-center gap-2">
                    <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime" />
                    MIM-Bot pensando la respuesta...
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="¿Puedo reemplazar este mod por otro? ¿Cómo se configura?"
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-purple-500/50 transition-all placeholder:text-white/20"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                Consultar
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
