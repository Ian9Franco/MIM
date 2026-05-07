/**
 * @fileoverview SageSidebar – Systematic Analyzer for Glitches & Exceptions (SAGE)
 * Displays a slide-out drawer on the left side to paste logs/crashes or
 * read them directly from the active project's game folder, performing
 * smart diagnostic scanning.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  X, Activity, Terminal, AlertTriangle, CheckCircle2, FileText, 
  FileWarning, Copy, Check, RefreshCw, Cpu, AlertOctagon, 
  ChevronRight, BookOpen, Loader2, ArrowRight, ShieldAlert, CheckSquare, ListRestart,
  Edit3, Clock, Trash2
} from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { analyzeMinecraftLog, type SageAnalysisResult } from "@/utils/sageAnalyzer";
import type { Project } from "@/lib/types";
import { SageAnalysisView } from "./SageAnalysisView";
import { SageDeleteModal } from "./SageDeleteModal";

export interface SageSidebarProps {
  open: boolean;
  onClose: () => void;
  activeProject: Project | null;
}

export interface LocalLogFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
  type: "log" | "crash";
}

export function SageSidebar({ open, onClose, activeProject }: SageSidebarProps) {
  const [mode, setMode] = useState<"crash" | "latest-log" | "paste">("crash");
  const [rawLog, setRawLog] = useState("");
  
  // Independent Analysis states to prevent tab switches from clearing analysis results
  const [crashAnalysis, setCrashAnalysis] = useState<SageAnalysisResult | null>(null);
  const [logAnalysis, setLogAnalysis] = useState<SageAnalysisResult | null>(null);
  const [pasteAnalysis, setPasteAnalysis] = useState<SageAnalysisResult | null>(null);
  
  const [selectedCrashFile, setSelectedCrashFile] = useState<LocalLogFile | null>(null);
  const [latestLogFile, setLatestLogFile] = useState<LocalLogFile | null>(null);
  const [lastLogAnalysisTime, setLastLogAnalysisTime] = useState<Date | null>(null);

  // Local files states
  const [localFiles, setLocalFiles] = useState<LocalLogFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [analysizing, setAnalyzing] = useState(false);
  const [deletingFilePath, setDeletingFilePath] = useState<string | null>(null);
  const [fileToDeletePending, setFileToDeletePending] = useState<LocalLogFile | null>(null);

  const requestDeleteFile = (file: LocalLogFile, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFileToDeletePending(file);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDeletePending || !activeProject) return;
    
    const file = fileToDeletePending;
    setDeletingFilePath(file.path);
    setFileToDeletePending(null);

    try {
      const res = await fetch(
        `/api/project/logs?project=${activeProject.name}&version=${activeProject.version}&file=${encodeURIComponent(file.path)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setLocalFiles(prev => prev.filter(f => f.path !== file.path));
        if (selectedCrashFile?.path === file.path) {
          setSelectedCrashFile(null);
          setCrashAnalysis(null);
        }
      } else {
        const errData = await res.json();
        alert(`Error al eliminar: ${errData.error || "Error desconocido"}`);
      }
    } catch (err) {
      console.error("[SAGE] Error deleting file:", err);
      alert("Error al eliminar el archivo.");
    } finally {
      setDeletingFilePath(null);
    }
  };

  // Fetch project files
  const fetchLocalFiles = useCallback(async () => {
    if (!activeProject) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/project/logs?project=${activeProject.name}&version=${activeProject.version}`);
      if (res.ok) {
        const data = await res.json();
        setLocalFiles(data.files || []);
      }
    } catch (e) {
      console.error("[SAGE] Error fetching local files:", e);
    }
    setLoadingFiles(false);
  }, [activeProject]);

  // Load local files when opening sidebar
  useEffect(() => {
    if (open) {
      if (activeProject) {
        fetchLocalFiles();
        setMode("crash"); // Default to crash tab if project active
      } else {
        setMode("paste");
      }
    }
  }, [open, activeProject, fetchLocalFiles]);

  const handleLoadAndAnalyze = async (file: LocalLogFile) => {
    if (!activeProject) return;
    setReadingFile(true);
    try {
      const res = await fetch(
        `/api/project/logs?project=${activeProject.name}&version=${activeProject.version}&file=${encodeURIComponent(file.path)}`
      );
      if (res.ok) {
        const data = await res.json();
        const content = data.content || "";
        const result = analyzeMinecraftLog(content);
        
        if (file.type === "crash") {
          setCrashAnalysis(result);
        } else {
          setLogAnalysis(result);
          setLastLogAnalysisTime(new Date());
        }
      }
    } catch (e) {
      console.error("[SAGE] Error reading and analyzing file:", e);
    }
    setReadingFile(false);
  };

  // Auto-selection of files
  useEffect(() => {
    if (!open || localFiles.length === 0) return;

    if (mode === "crash") {
      const crashFiles = localFiles.filter(f => f.type === "crash");
      if (crashFiles.length > 0) {
        // Seleccionar el crash más reciente por defecto si no hay ninguno seleccionado
        const defaultFile = crashFiles[0];
        if (!selectedCrashFile || !crashFiles.some(f => f.path === selectedCrashFile.path)) {
          setSelectedCrashFile(defaultFile);
          handleLoadAndAnalyze(defaultFile);
        }
      } else {
        setCrashAnalysis(null);
        setSelectedCrashFile(null);
      }
    } else if (mode === "latest-log") {
      const logFile = localFiles.find(f => f.path === "logs/latest.log") || 
                      localFiles.find(f => f.path === "global:logs/latest.log");
      if (logFile) {
        setLatestLogFile(logFile);
        if (!logAnalysis) {
          handleLoadAndAnalyze(logFile);
        }
      } else {
        setLogAnalysis(null);
        setLatestLogFile(null);
      }
    }
  }, [localFiles, mode, open]);

  // Watcher dedicado para latest.log: re-analiza automáticamente cada 10 minutos
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (open && activeProject && mode === "latest-log") {
      const reloadAndAnalyzeLog = async () => {
        try {
          const res = await fetch(`/api/project/logs?project=${activeProject.name}&version=${activeProject.version}`);
          if (res.ok) {
            const data = await res.json();
            const files: LocalLogFile[] = data.files || [];
            setLocalFiles(files);
            
            const logFile = files.find(f => f.path === "logs/latest.log") || 
                            files.find(f => f.path === "global:logs/latest.log");
            if (logFile) {
              setLatestLogFile(logFile);
              const readRes = await fetch(
                `/api/project/logs?project=${activeProject.name}&version=${activeProject.version}&file=${encodeURIComponent(logFile.path)}`
              );
              if (readRes.ok) {
                const readData = await readRes.json();
                const result = analyzeMinecraftLog(readData.content || "");
                setLogAnalysis(result);
                setLastLogAnalysisTime(new Date());
              }
            }
          }
        } catch (e) {
          console.error("[SAGE] Error in automatic latest.log poller:", e);
        }
      };

      // Establecer poller cada 10 minutos (10 * 60 * 1000 milisegundos)
      intervalId = setInterval(reloadAndAnalyzeLog, 10 * 60 * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [open, activeProject, mode]);

  const handleAnalyzeText = (textToAnalyze: string) => {
    setAnalyzing(true);
    // Simular un micro-delay para dar sensación de procesamiento complejo
    setTimeout(() => {
      const res = analyzeMinecraftLog(textToAnalyze);
      setPasteAnalysis(res);
      setAnalyzing(false);
    }, 600);
  };

  const handleCopySolution = (solution: string, index: number) => {
    navigator.clipboard.writeText(solution);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAutoFix = (fix: any) => {
    if (typeof window !== "undefined") {
      // Close SAGE sidebar
      onClose();
      // Wait for slide-out animation, then open FOMO and trigger search
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("fomo-search-and-open", { 
          detail: { query: fix.dependencyId || fix.modId } 
        }));
      }, 400);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };


  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-md transition-opacity duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* SAGE Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Diagnóstico SAGE"
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-all duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] border-r ${
          open ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{
          width: "550px",
          maxWidth: "92vw",
          background: "color-mix(in srgb, var(--color-card) 95%, transparent)",
          borderColor: "var(--color-border)",
          backdropFilter: "blur(30px)",
          borderRadius: "0 2rem 2rem 0",
        }}
      >
        {/* Unified Premium Header */}
        <div 
          className="relative flex items-center justify-between px-6 py-4 border-b shrink-0" 
          style={{ background: "rgba(255, 255, 255, 0.01)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group shadow-inner">
              <div className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold tracking-tight bg-gradient-to-r from-white via-white to-indigo-300 bg-clip-text text-transparent leading-none">
                SAGE
              </h2>
              <p className="font-label text-[8px] opacity-40 mt-1 tracking-[0.12em] uppercase font-bold text-indigo-200">
                Systematic Analyzer for Glitches & Exceptions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/15 hover:scale-105 active:scale-95"
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Only if there is an active project) */}
        {activeProject ? (
          <div className="px-6 pt-4 shrink-0 flex gap-1.5">
            <button
              onClick={() => setMode("crash")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-label text-[10px] font-bold transition-all border ${
                mode === "crash"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/70"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Crashes
            </button>
            <button
              onClick={() => setMode("latest-log")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-label text-[10px] font-bold transition-all border ${
                mode === "latest-log"
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/70"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Latest Log
            </button>
            <button
              onClick={() => setMode("paste")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-label text-[10px] font-bold transition-all border ${
                mode === "paste"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/70"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Manual
            </button>
          </div>
        ) : (
          <div className="px-6 pt-4 shrink-0">
            <div className="p-3 rounded-xl border border-white/5 bg-white/2 text-[10px] text-foreground/40 text-center leading-relaxed">
              Selecciona un proyecto de MIM para poder leer sus logs de forma automática.
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* ──────────────── MODO 1: CRASH REPORTS ──────────────── */}
              {mode === "crash" && (
                <div className="space-y-6 animate-fade-in">
                  {readingFile && (
                    <div className="h-64 rounded-2xl border border-rose-500/10 bg-rose-500/2 flex flex-col items-center justify-center gap-4 animate-pulse">
                      <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground/80">SAGE está leyendo el crash-report...</p>
                        <p className="text-[10px] text-foreground/40 mt-1">Estructurando trazas, causas y dependencias</p>
                      </div>
                    </div>
                  )}

                  {!readingFile && !selectedCrashFile && (
                    <div className="p-8 border border-white/5 rounded-2xl bg-white/2 text-center flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400/80 animate-bounce" />
                      <div>
                        <h3 className="text-xs font-bold text-foreground/80">¡Cero Caídas de Juego Detectadas!</h3>
                        <p className="text-[10px] text-foreground/30 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                          No se han encontrado archivos en la carpeta de <code className="bg-white/5 px-1 py-0.5 rounded">crash-reports</code> de este proyecto ni globales en .minecraft. ¡Tu juego está corriendo de forma impecable!
                        </p>
                      </div>
                    </div>
                  )}

                  {!readingFile && selectedCrashFile && crashAnalysis && (
                    <div className="space-y-6">
                      {/* Visualización del crash actual */}
                      <div className="p-3.5 rounded-xl border border-rose-500/15 bg-rose-500/3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ShieldAlert className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-rose-300 font-mono truncate block">
                              {selectedCrashFile.name.replace(" (Instancia del Proyecto)", "").replace(" (Global .minecraft)", "")}
                            </span>
                            <span className="text-[9px] text-foreground/30 block mt-0.5">
                              Peso: {formatSize(selectedCrashFile.size)} • {new Date(selectedCrashFile.mtime).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => requestDeleteFile(selectedCrashFile, e)}
                            disabled={deletingFilePath === selectedCrashFile.path}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 active:scale-90"
                            title="Eliminar este reporte de crash"
                          >
                            {deletingFilePath === selectedCrashFile.path ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400 pointer-events-none" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                            )}
                          </button>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-1.5 rounded-md shrink-0">
                            Crash Activo
                          </span>
                        </div>
                      </div>

                      <SageAnalysisView analysis={crashAnalysis} onAutoFix={handleAutoFix} />
                    </div>
                  )}

                  {/* Historial de Crashes Anteriores */}
                  {localFiles.filter(f => f.type === "crash").length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Historial de Caídas de Juego (Crashes)</h4>
                      <div className="flex flex-col gap-2">
                        {localFiles.filter(f => f.type === "crash").map((file) => {
                          const isActive = selectedCrashFile?.path === file.path;
                          return (
                            <div
                              key={file.path}
                              onClick={() => {
                                setSelectedCrashFile(file);
                                handleLoadAndAnalyze(file);
                              }}
                              className={`w-full cursor-pointer text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 group hover:scale-[1.005] ${
                                isActive
                                  ? "bg-rose-500/5 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                                  : "bg-white/1 border-white/5 text-foreground/50 hover:bg-white/5 hover:border-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <ShieldAlert className={`w-4 h-4 shrink-0 ${isActive ? "text-rose-400" : "text-foreground/25"}`} />
                                <div className="min-w-0">
                                  <p className={`text-xs font-bold truncate ${isActive ? "text-rose-300" : "text-foreground/70"}`}>
                                    {file.name.replace(" (Instancia del Proyecto)", "").replace(" (Global .minecraft)", "")}
                                  </p>
                                  <div className="flex gap-2 text-[10px] text-foreground/30 mt-1 font-mono">
                                    <span>{formatSize(file.size)}</span>
                                    <span>•</span>
                                    <span>{new Date(file.mtime).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={(e) => requestDeleteFile(file, e)}
                                  disabled={deletingFilePath === file.path}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-rose-500/10 border border-transparent hover:border-rose-500/25 text-foreground/20 hover:text-rose-400 active:scale-90"
                                  title="Eliminar reporte de crash"
                                >
                                  {deletingFilePath === file.path ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400 pointer-events-none" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                                  )}
                                </button>
                                <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isActive ? "text-rose-400" : "text-foreground/20"}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────── MODO 2: LATEST LOG (MONITOREO EN VIVO) ──────────────── */}
              {mode === "latest-log" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Watcher Badge Header */}
                  <div className="p-4 rounded-2xl border border-indigo-500/10 bg-indigo-500/2 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-indigo-200 truncate">Watcher Activo: latest.log</h4>
                        <p className="text-[10px] text-foreground/40 leading-relaxed flex items-center gap-1.5 font-mono truncate">
                          <Clock className="w-3 h-3 shrink-0 animate-spin" style={{ animationDuration: "10s" }} />
                          Auto-recarga: 10m
                          {lastLogAnalysisTime && (
                            <span>• {lastLogAnalysisTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={readingFile}
                      onClick={() => latestLogFile && handleLoadAndAnalyze(latestLogFile)}
                      className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-indigo-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${readingFile ? "animate-spin" : ""}`} />
                      Re-analizar
                    </button>
                  </div>

                  {readingFile && (
                    <div className="h-64 rounded-2xl border border-indigo-500/10 bg-indigo-500/2 flex flex-col items-center justify-center gap-4 animate-pulse">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground/80">SAGE está analizando latest.log...</p>
                        <p className="text-[10px] text-foreground/40 mt-1">Leyendo del disco duro e identificando colisiones</p>
                      </div>
                    </div>
                  )}

                  {!readingFile && !latestLogFile && (
                    <div className="p-8 border border-white/5 rounded-2xl bg-white/2 text-center flex flex-col items-center justify-center gap-3">
                      <FileWarning className="w-8 h-8 text-foreground/20" />
                      <div>
                        <p className="text-xs font-bold text-foreground/60">latest.log No Encontrado</p>
                        <p className="text-[10px] text-foreground/30 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                          Inicia Minecraft en este proyecto para que se genere el primer archivo de bitácora `latest.log`.
                        </p>
                      </div>
                    </div>
                  )}

                  {!readingFile && latestLogFile && logAnalysis && (
                    <div className="space-y-6">
                      {/* Si el análisis de log falló en encontrar reglas/errores (success === false, log LIMPIO!) */}
                      {!logAnalysis.success ? (
                        <div className="p-8 border border-emerald-500/10 rounded-2xl bg-emerald-500/2 text-center flex flex-col items-center justify-center gap-4 shadow-lg shadow-emerald-500/2 animate-fade-up">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
                            <CheckCircle2 className="w-8 h-8 relative" />
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-sm font-bold text-emerald-300">¡Log de Minecraft Sano y Salvo!</h3>
                            <p className="text-xs text-foreground/50 max-w-[320px] mx-auto leading-relaxed">
                              SAGE analizó el archivo <code className="text-indigo-300 font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{latestLogFile.name.replace(" (Instancia del Proyecto)", "").replace(" (Global .minecraft)", "")}</code> de punta a punta y no detectó duplicados, dependencias faltantes ni excepciones conocidas. Tu juego está en óptimo estado técnico.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <SageAnalysisView analysis={logAnalysis} onAutoFix={handleAutoFix} />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────── MODO 3: ANALIZAR TEXTO MANUAL ──────────────── */}
              {mode === "paste" && (
                <div className="space-y-6 animate-fade-in">
                  {!pasteAnalysis && !analysizing && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Local Heuristic Engine Notice */}
                      <div className="p-4 rounded-2xl border border-indigo-500/10 bg-indigo-500/2 flex gap-3 items-start shadow-sm">
                        <Cpu className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0 animate-pulse" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-indigo-200">Heurística Local SAGE Engine v1.0</h4>
                          <p className="text-[10px] text-foreground/50 leading-relaxed">
                            SAGE ejecuta un analizador de trazas de Java estructurado 100% en local. Sin llamadas a servidores, sin latencia, sin costo de tokens y con precisión absoluta libre de alucinaciones.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/40">Reporte o Log en Crudo</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.readText().then(text => setRawLog(text)).catch(() => {});
                          }}
                          className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          Pegar del Portapapeles
                        </button>
                      </div>

                      <textarea
                        value={rawLog}
                        onChange={(e) => setRawLog(e.target.value)}
                        placeholder="Pega el stack trace del crash-report o las últimas líneas del latest.log aquí..."
                        className="w-full h-64 p-4 rounded-2xl border font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500/50 resize-none custom-scrollbar"
                        style={{
                          background: "rgba(0, 0, 0, 0.25)",
                          borderColor: "var(--color-border)",
                          color: "color-mix(in srgb, var(--color-foreground) 85%, transparent)",
                        }}
                      />

                      <button
                        disabled={!rawLog.trim()}
                        onClick={() => handleAnalyzeText(rawLog)}
                        className="w-full py-3.5 rounded-xl font-bold font-headline text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] shadow-lg shadow-indigo-600/20"
                      >
                        <Activity className="w-4 h-4" />
                        Analizar Reporte de Crash
                      </button>
                    </div>
                  )}

                  {analysizing && (
                    <div className="h-64 rounded-2xl border border-indigo-500/10 bg-indigo-500/2 flex flex-col items-center justify-center gap-4 animate-pulse">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground/80">SAGE está analizando la traza...</p>
                        <p className="text-[10px] text-foreground/40 mt-1">Escanenado hilos de Java, Mixins y librerías</p>
                      </div>
                    </div>
                  )}

                  {pasteAnalysis && !analysizing && (
                    <div className="space-y-6 animate-fade-up">
                      <SageAnalysisView analysis={pasteAnalysis} onAutoFix={handleAutoFix} />
                      
                      {/* Reset analysis button */}
                      <button
                        onClick={() => {
                          setPasteAnalysis(null);
                          setRawLog("");
                        }}
                        className="w-full py-3.5 rounded-xl font-bold font-headline text-xs tracking-wider uppercase flex items-center justify-center gap-2 border border-white/5 hover:bg-white/5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 text-foreground/40 hover:text-foreground/80 mt-4 bg-white/1"
                      >
                        <ListRestart className="w-4 h-4" />
                        Analizar Otro Reporte / Limpiar
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
      </aside>

      <SageDeleteModal 
        file={fileToDeletePending}
        onClose={() => setFileToDeletePending(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
