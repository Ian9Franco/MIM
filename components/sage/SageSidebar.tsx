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
  Edit3, Clock, Trash2, ShieldCheck, ShieldX, ShieldBan, ScanSearch, Package, Layers,
  Heart, MapPin, Sparkles, User, HelpCircle, AlertCircle
} from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { analyzeMinecraftLog, type SageAnalysisResult } from "@/utils/sageAnalyzer";
import type { Project } from "@/lib/types";
import { SageAnalysisView } from "./SageAnalysisView";
import { SageDeleteModal } from "./SageDeleteModal";
import { eventBus } from "@/lib/eventBus";

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
  date?: string;
}

export function SageSidebar({ open, onClose, activeProject }: SageSidebarProps) {
  const [mode, setMode] = useState<"crash" | "latest-log" | "paste" | "security" | "player-rescue">("security");

  // Persistence for mode
  useEffect(() => {
    const saved = localStorage.getItem("sage_mode");
    if (saved) setMode(saved as any);
  }, []);

  useEffect(() => {
    localStorage.setItem("sage_mode", mode);
  }, [mode]);

  // ── Player Rescue (Rescate de Jugador) state ──
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [rescuingPlayer, setRescuingPlayer] = useState(false);
  const [resetCoords, setResetCoords] = useState(true);
  const [clearInventory, setClearInventory] = useState(false);
  const [changeDimension, setChangeDimension] = useState(true);
  const [newCoords, setNewCoords] = useState<[number, number, number]>([0, 80, 0]);
  const [newDimension, setNewDimension] = useState("minecraft:overworld");
  const [rescueLogs, setRescueLogs] = useState<string[]>([]);
  const [rescueSuccess, setRescueSuccess] = useState(false);

  const fetchPlayersList = useCallback(async () => {
    if (!activeProject) return;
    setLoadingPlayers(true);
    setSelectedPlayer(null);
    setRescueSuccess(false);
    setRescueLogs([]);
    try {
      const res = await fetch(`/api/sage/player-rescue?project=${activeProject.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingPlayers(false);
  }, [activeProject]);

  const handlePlayerRescue = async () => {
    if (!selectedPlayer) return;
    setRescuingPlayer(true);
    setRescueLogs([]);
    setRescueSuccess(false);
    try {
      const res = await fetch("/api/sage/player-rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: selectedPlayer.filePath,
          resetCoords,
          clearInventory,
          newCoords,
          changeDimension,
          newDimension
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRescueLogs(data.logs || ["Jugador rescatado correctamente."]);
          // Recargar lista para ver nuevas coordenadas o inventario vacío
          fetchPlayersList();
          eventBus.emit("sage:player-rescued", {
            playerId: selectedPlayer.fileName.replace(".dat", ""),
            playerName: selectedPlayer.isHost ? "Host/Singleplayer" : selectedPlayer.fileName.replace(".dat", ""),
            rescueType: clearInventory ? "inventory" : changeDimension ? "dimension" : "position",
            success: true,
            backupCreated: data.backupCreated ?? true
          });
        } else {
          setRescueLogs([`Error: ${data.error || "No se pudo rescatar al jugador"}`]);
          eventBus.emit("sage:player-rescued", {
            playerId: selectedPlayer.fileName.replace(".dat", ""),
            playerName: selectedPlayer.isHost ? "Host/Singleplayer" : selectedPlayer.fileName.replace(".dat", ""),
            rescueType: clearInventory ? "inventory" : changeDimension ? "dimension" : "position",
            success: false,
            backupCreated: false
          });
        }
      } else {
        const data = await res.json();
        setRescueLogs([`Error: ${data.error || "No se pudo contactar el servidor"}`]);
      }
    } catch (e: any) {
      setRescueLogs([`Error: ${e.message}`]);
    }
    setRescuingPlayer(false);
  };

  useEffect(() => {
    if (open && activeProject && mode === "player-rescue") {
      fetchPlayersList();
    }
  }, [open, activeProject, mode, fetchPlayersList]);

  // ── Security Scanner state ────────────────────────────────────────────────
  type ScanEntry = {
    fileName: string;
    filePath: string;
    type: "jar" | "zip";
    assetType: string;
  };
  type ScanResultEntry = ScanEntry & {
    result: {
      riskScore: number;
      riskLevel: "clean" | "caution" | "suspicious" | "critical";
      virusTotal?: { maliciousCount: number; totalEngineCount: number; detailsUrl?: string } | null;
      summary: string;
      sha256?: string;
    };
  };
  const [secScannable,  setSecScannable]  = useState<ScanEntry[]>([]);
  const [secResults,   setSecResults]    = useState<ScanResultEntry[]>([]);
  const [secScanning,  setSecScanning]   = useState(false);
  const [secLoading,   setSecLoading]    = useState(false);
  const [secError,     setSecError]      = useState<string | null>(null);
  const [secScanned,   setSecScanned]    = useState(false);

  const fetchScannable = useCallback(async () => {
    if (!activeProject) return;
    setSecLoading(true);
    setSecError(null);
    try {
      const res = await fetch(
        `/api/security/scan?project=${activeProject.name}&version=${activeProject.version}&loader=${activeProject.loader}`
      );
      const data = await res.json();
      if (data.success) setSecScannable(data.scannable || []);
      else setSecError(data.error || "Error listando archivos");
    } catch (e) {
      setSecError("No se pudo contactar el servidor");
    }
    setSecLoading(false);
  }, [activeProject]);

  const runSecurityScan = useCallback(async () => {
    if (!activeProject || secScannable.length === 0) return;
    setSecScanning(true);
    setSecError(null);
    try {
      const res = await fetch("/api/security/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePaths: secScannable.map(s => s.filePath) }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        const merged: ScanResultEntry[] = (data.results as any[])
          .map((r: any) => {
            const entry = secScannable.find(s => s.filePath === r.filePath);
            if (!entry) return null;
            return {
              ...entry,
              result: {
                riskScore: r.riskScore ?? 0,
                riskLevel: r.riskLevel ?? "clean",
                virusTotal: r.virusTotal,
                summary: r.summary ?? "Análisis completado.",
                sha256: r.sha256 || r.sha1,
              }
            } as ScanResultEntry;
          })
          .filter((x): x is ScanResultEntry => x != null);
        setSecResults(merged);
        setSecScanned(true);
      } else {
        setSecError(data.error || "Error durante el scan");
      }
    } catch (e) {
      setSecError("Error de conexión al ejecutar el scan");
    }
    setSecScanning(false);
  }, [activeProject, secScannable]);

  // Fetch and auto-run security scan when opening SAGE on the security tab
  useEffect(() => {
    if (open && activeProject && mode === "security" && !secScanned && !secScanning && !secLoading) {
      const autoScan = async () => {
        setSecLoading(true);
        setSecError(null);
        try {
          // 1. Fetch scannable files
          const res = await fetch(
            `/api/security/scan?project=${activeProject.name}&version=${activeProject.version}&loader=${activeProject.loader}`
          );
          const data = await res.json();
          if (data.success && data.scannable) {
            setSecScannable(data.scannable);
            
            // If we have scannable files, run the scan automatically!
            if (data.scannable.length > 0) {
              setSecScanning(true);
              const scanRes = await fetch("/api/security/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filePaths: data.scannable.map((s: any) => s.filePath) }),
              });
              const scanData = await scanRes.json();
              if (scanData.success && scanData.results) {
                const merged: ScanResultEntry[] = (scanData.results as any[])
                  .map((r: any) => {
                    const entry = data.scannable.find((s: any) => s.filePath === r.filePath);
                    if (!entry) return null;
                    return {
                      ...entry,
                      result: {
                        riskScore: r.riskScore ?? 0,
                        riskLevel: r.riskLevel ?? "clean",
                        virusTotal: r.virusTotal,
                        summary: r.summary ?? "Análisis completado.",
                        sha256: r.sha256 || r.sha1,
                      }
                    } as ScanResultEntry;
                  })
                  .filter((x): x is ScanResultEntry => x != null);
                setSecResults(merged);
                setSecScanned(true);
              } else {
                setSecError(scanData.error || "Error durante el scan automático");
              }
              setSecScanning(false);
            } else {
              setSecScanned(true); // scannable is empty, scanning complete
            }
          } else {
            setSecError(data.error || "Error listando archivos para scan automático");
          }
        } catch (e) {
          setSecError("Error de conexión al ejecutar el scan automático");
        }
        setSecLoading(false);
      };
      autoScan();
    }
  }, [open, activeProject, mode, secScanned, secScanning, secLoading]);
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
  const [pathsExist, setPathsExist] = useState<{
    project: boolean;
    minecraft: boolean;
    projectLogs: boolean;
    projectCrashes: boolean;
  }>({
    project: true,
    minecraft: true,
    projectLogs: true,
    projectCrashes: true,
  });
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [analysizing, setAnalyzing] = useState(false);
  const [deletingFilePath, setDeletingFilePath] = useState<string | null>(null);
  const [fileToDeletePending, setFileToDeletePending] = useState<LocalLogFile[] | any>(null);

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
        setPathsExist({
          project: data.projectPathExists ?? true,
          minecraft: data.minecraftPathExists ?? true,
          projectLogs: data.projectLogsExists ?? true,
          projectCrashes: data.projectCrashesExists ?? true,
        });
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
        setMode("security"); // Default to security scanner tab if project active
        setSecScanned(false);
        setSecResults([]);
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

        eventBus.emit("sage:analysis-completed", {
          type: file.type,
          success: true,
          category: result.rule || "unknown"
        });
      } else {
        eventBus.emit("sage:analysis-completed", {
          type: file.type,
          success: false,
          category: "http-error"
        });
      }
    } catch (e) {
      console.error("[SAGE] Error reading and analyzing file:", e);
    }
    setReadingFile(false);
  };

  // Auto-selection of files
  useEffect(() => {
    if (!open || localFiles.length === 0) return;

    // Determinamos la fecha de la sesión actual
    const logFile = localFiles.find(f => f.path === "logs/latest.log") || 
                    localFiles.find(f => f.path === "global:logs/latest.log");
    const sessionDate = logFile?.date || new Date().toISOString().split("T")[0];

    if (mode === "crash") {
      const crashFiles = localFiles.filter(f => f.type === "crash");
      if (crashFiles.length > 0) {
        // Priorizar crashes activos (mismo día que el log)
        const activeCrashes = crashFiles.filter(f => f.date === sessionDate);
        const defaultFile = activeCrashes.length > 0 ? activeCrashes[0] : crashFiles[0];

        if (!selectedCrashFile || !crashFiles.some(f => f.path === selectedCrashFile.path)) {
          setSelectedCrashFile(defaultFile);
          handleLoadAndAnalyze(defaultFile);
        }
      } else {
        setCrashAnalysis(null);
        setSelectedCrashFile(null);
      }
    } else if (mode === "latest-log") {
      const logFileObj = localFiles.find(f => f.path === "logs/latest.log") || 
                         localFiles.find(f => f.path === "global:logs/latest.log");
      if (logFileObj) {
        setLatestLogFile(logFileObj);
        if (!logAnalysis) {
          handleLoadAndAnalyze(logFileObj);
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

                eventBus.emit("sage:analysis-completed", {
                  type: "log",
                  success: true,
                  category: result.rule || "clean"
                });
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
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-r ${
          open ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{
          width: "1100px",
          maxWidth: "92vw",
          background: "var(--glass-bg)",
          borderColor: "var(--glass-border)",
          backdropFilter: "var(--liquid-blur)",
          borderRadius: "0 2rem 2rem 0",
          boxShadow: "var(--shadow-drop)",
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
              onClick={() => {
                setMode("security");
                if (secScannable.length === 0 && !secLoading) fetchScannable();
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-label text-[10px] font-bold transition-all border ${
                mode === "security"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/70"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Scanner
            </button>
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
            <button
              onClick={() => setMode("player-rescue")}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-label text-[10px] font-bold transition-all border ${
                mode === "player-rescue"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/70"
              }`}
            >
              <Heart className="w-4 h-4" />
              Rescate
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

              {/* ──────────────── MODO: SECURITY SCANNER ──────────────── */}
              {mode === "security" && (
                <div className="space-y-5 animate-fade-in">

                  {/* Header */}
                  <div className="p-4 rounded-2xl border flex items-center justify-between gap-4"
                    style={{ background: "rgba(16,185,129,0.04)", borderColor: "rgba(16,185,129,0.15)" }}>
                    <div>
                      <p className="text-xs font-headline font-bold text-emerald-400">Scanner de Seguridad</p>
                      <p className="text-[10px] text-foreground/40 mt-0.5 leading-relaxed">
                        Análisis de bytecode + reputación VirusTotal para todos los archivos del proyecto.
                      </p>
                    </div>
                    <button
                      onClick={secScanned ? () => { setSecScanned(false); setSecResults([]); fetchScannable(); } : runSecurityScan}
                      disabled={secScanning || secLoading || secScannable.length === 0}
                      className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-headline font-bold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {secScanning
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Escaneando...</>
                        : secScanned
                        ? <><RefreshCw className="w-3.5 h-3.5" /> Re-escanear</>
                        : <><ScanSearch className="w-3.5 h-3.5" /> Escanear ({secScannable.length})</>}
                    </button>
                  </div>

                  {/* Loading / Error states */}
                  {secLoading && (
                    <div className="py-8 flex flex-col items-center gap-3 text-foreground/40">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <p className="text-xs">Listando archivos del proyecto...</p>
                    </div>
                  )}
                  {secError && (
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400">
                      ⚠️ {secError}
                    </div>
                  )}

                  {/* Scanning progress indicator */}
                  {secScanning && (
                    <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center gap-4">
                      <div className="relative">
                        <ShieldCheck className="w-10 h-10 text-emerald-400/30" />
                        <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin absolute inset-0 m-auto" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-emerald-300">Escaneando {secScannable.length} archivos...</p>
                        <p className="text-[10px] text-foreground/40 mt-1">Analizando bytecode + consultando VirusTotal</p>
                      </div>
                    </div>
                  )}

                  {/* Pre-scan file list */}
                  {!secScanning && !secScanned && !secLoading && secScannable.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/30 mb-3">
                        {secScannable.length} archivo(s) para escanear
                      </p>
                      {(["mod", "resourcepack", "shader", "datapack"] as const).map(assetType => {
                        const group = secScannable.filter(s => s.assetType === assetType);
                        if (group.length === 0) return null;
                        const labelMap = { mod: "Mods", resourcepack: "Resource Packs", shader: "Shaders", datapack: "Datapacks" };
                        const colorMap = { mod: "indigo", resourcepack: "cyan", shader: "purple", datapack: "amber" };
                        const color = colorMap[assetType];
                        return (
                          <div key={assetType} className={`p-3 rounded-xl border border-${color}-500/15 bg-${color}-500/5`}>
                            <p className={`text-[9px] font-black uppercase tracking-widest text-${color}-400 mb-2`}>
                              {labelMap[assetType]} ({group.length})
                            </p>
                            <div className="space-y-1">
                              {group.map(f => (
                                <div key={f.filePath} className="text-[10px] text-foreground/50 font-mono truncate">{f.fileName}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Scan results */}
                  {!secScanning && secScanned && secResults.length > 0 && (() => {
                    const critical  = secResults.filter(r => r.result.riskLevel === "critical");
                    const suspicious = secResults.filter(r => r.result.riskLevel === "suspicious");
                    const caution   = secResults.filter(r => r.result.riskLevel === "caution");
                    const clean     = secResults.filter(r => r.result.riskLevel === "clean");
                    const vtChecked = secResults.filter(r => r.result.virusTotal != null);
                    return (
                      <div className="space-y-5">
                        {/* Summary row */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "Limpios",    count: clean.length,     color: "emerald", icon: <ShieldCheck className="w-4 h-4" /> },
                            { label: "Precaución", count: caution.length,   color: "amber",   icon: <ShieldAlert className="w-4 h-4" /> },
                            { label: "Sospechosos",count: suspicious.length, color: "orange",  icon: <ShieldBan className="w-4 h-4" /> },
                            { label: "Críticos",   count: critical.length,  color: "red",     icon: <ShieldX className="w-4 h-4" /> },
                          ].map(({ label, count, color, icon }) => (
                            <div key={label} className={`p-2.5 rounded-xl border border-${color}-500/20 bg-${color}-500/8 text-center`}>
                              <div className={`flex justify-center mb-1 text-${color}-400`}>{icon}</div>
                              <div className={`text-lg font-black text-${color}-400`}>{count}</div>
                              <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* VirusTotal badge */}
                        {vtChecked.length > 0 && (
                          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-blue-500/20 bg-blue-500/5">
                            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                            <p className="text-[10px] text-blue-300">
                              <strong>{vtChecked.length}</strong> archivo(s) verificados por VirusTotal
                            </p>
                          </div>
                        )}

                        {/* Per-file results — critical + suspicious first */}
                        {[...critical, ...suspicious, ...caution, ...clean].map(entry => {
                          const { riskLevel, riskScore, virusTotal, summary } = entry.result;
                          const isBad  = riskLevel === "critical" || riskLevel === "suspicious";
                          const colors = {
                            clean:      { bg: "rgba(16,185,129,0.05)",  border: "rgba(16,185,129,0.15)",  text: "#34d399", badge: "#059669" },
                            caution:    { bg: "rgba(245,158,11,0.05)",  border: "rgba(245,158,11,0.15)",  text: "#fbbf24", badge: "#d97706" },
                            suspicious: { bg: "rgba(249,115,22,0.07)",  border: "rgba(249,115,22,0.2)",   text: "#fb923c", badge: "#ea580c" },
                            critical:   { bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)",    text: "#f87171", badge: "#dc2626" },
                          }[riskLevel];
                          const assetIcons: Record<string,React.ReactNode> = {
                            mod:         <Layers className="w-3.5 h-3.5" />,
                            resourcepack: <Package className="w-3.5 h-3.5" />,
                            shader:      <Cpu className="w-3.5 h-3.5" />,
                            datapack:    <FileText className="w-3.5 h-3.5" />,
                          };
                          return (
                            <div key={entry.filePath}
                              className="p-3.5 rounded-2xl border space-y-2"
                              style={{ background: colors.bg, borderColor: colors.border }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="shrink-0" style={{ color: colors.text }}>
                                    {assetIcons[entry.assetType] ?? <FileText className="w-3.5 h-3.5" />}
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-foreground/80 truncate">{entry.fileName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    style={{ background: colors.badge + "22", color: colors.text, border: `1px solid ${colors.border}` }}>
                                    {riskScore}/100
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                                    style={{ background: colors.badge }}>
                                    {riskLevel === "clean" ? "LIMPIO" : riskLevel === "caution" ? "PRECAUCIÓN" : riskLevel === "suspicious" ? "SOSPECHOSO" : "CRÍTICO"}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[10px] text-foreground/50 leading-relaxed">{summary}</p>

                              {/* VirusTotal result */}
                              {virusTotal != null ? (
                                virusTotal.maliciousCount > 0 ? (
                                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <ShieldX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span className="text-[10px] text-red-300 font-bold">
                                      VirusTotal: {virusTotal.maliciousCount}/{virusTotal.totalEngineCount} motores detectaron amenaza
                                    </span>
                                    {virusTotal.detailsUrl && (
                                      <a href={virusTotal.detailsUrl} target="_blank" rel="noreferrer"
                                        className="ml-auto text-[9px] text-red-400 hover:text-red-300 underline shrink-0">
                                        Ver reporte
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="text-[10px] text-emerald-300">
                                      VirusTotal: 0/{virusTotal.totalEngineCount} — Limpio ✓
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/3 border border-white/8">
                                  <ShieldAlert className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                                  <span className="text-[10px] text-foreground/30">VirusTotal: sin API key configurada</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {!secScanning && !secLoading && !secError && secScannable.length === 0 && (
                    <div className="py-10 flex flex-col items-center gap-3 text-foreground/30">
                      <ShieldCheck className="w-10 h-10 text-emerald-400/30" />
                      <p className="text-xs text-center">No se encontraron archivos escaneables en este proyecto.</p>
                    </div>
                  )}
                </div>
              )}

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
                    !pathsExist.projectCrashes && !pathsExist.minecraft ? (
                      <div className="p-8 border border-amber-500/10 rounded-2xl bg-amber-500/2 text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner relative">
                          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-sm" />
                          <FileWarning className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-bold text-amber-300">Entorno de Juego No Detectado</h3>
                          <p className="text-[10px] text-foreground/40 max-w-[320px] mx-auto leading-relaxed">
                            No se localizó la carpeta de Minecraft (<code className="bg-white/5 px-1 rounded">.minecraft</code>) ni carpetas locales de logs de este proyecto en esta máquina. 
                          </p>
                          <p className="text-[10px] text-foreground/30 max-w-[320px] mx-auto leading-relaxed">
                            Si no tienes el juego instalado aquí, puedes usar la pestaña de <strong className="text-amber-400/80">Manual</strong> para pegar y analizar cualquier reporte de crash de forma directa.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border border-white/5 rounded-2xl bg-white/2 text-center flex flex-col items-center justify-center gap-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400/80 animate-bounce" />
                        <div>
                          <h3 className="text-xs font-bold text-foreground/80">¡Cero Caídas de Juego Detectadas!</h3>
                          <p className="text-[10px] text-foreground/30 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                            No se han encontrado archivos en la carpeta de <code className="bg-white/5 px-1 py-0.5 rounded">crash-reports</code> de este proyecto ni globales en .minecraft. ¡Tu juego está corriendo de forma impecable!
                          </p>
                        </div>
                      </div>
                    )
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
                  {localFiles.filter(f => f.type === "crash").length > 0 && (() => {
                    const logFile = localFiles.find(f => f.path === "logs/latest.log") || 
                                    localFiles.find(f => f.path === "global:logs/latest.log");
                    const sessionDate = logFile?.date || new Date().toISOString().split("T")[0];
                    
                    const crashFiles = localFiles.filter(f => f.type === "crash");
                    const activeCrashes = crashFiles.filter(f => f.date === sessionDate);
                    const historyCrashes = crashFiles.filter(f => f.date !== sessionDate);

                    return (
                      <div className="space-y-6 pt-2">
                        {/* SECCIÓN: CRASHES ACTIVOS */}
                        {activeCrashes.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-rose-400 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              Crashes de la Sesión Actual
                            </h4>
                            <div className="flex flex-col gap-2">
                              {activeCrashes.map((file) => {
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
                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                        : "bg-white/3 border-white/10 text-foreground/70 hover:bg-white/5 hover:border-rose-500/20"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <ShieldAlert className={`w-4 h-4 shrink-0 ${isActive ? "text-rose-400" : "text-rose-400/50"}`} />
                                      <div className="min-w-0">
                                        <p className={`text-xs font-bold truncate ${isActive ? "text-rose-300" : "text-foreground/80"}`}>
                                          {file.name.replace(" (Instancia del Proyecto)", "").replace(" (Global .minecraft)", "")}
                                        </p>
                                        <div className="flex gap-2 text-[9px] text-foreground/40 mt-1 font-mono">
                                          <span>{formatSize(file.size)}</span>
                                          <span>•</span>
                                          <span>Hoy, {new Date(file.mtime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
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
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
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

                        {/* SECCIÓN: HISTORIAL */}
                        {historyCrashes.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/30 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              Historial de Caídas Anteriores
                            </h4>
                            <div className="flex flex-col gap-2">
                              {historyCrashes.map((file) => {
                                const isActive = selectedCrashFile?.path === file.path;
                                return (
                                  <div
                                    key={file.path}
                                    onClick={() => {
                                      setSelectedCrashFile(file);
                                      handleLoadAndAnalyze(file);
                                    }}
                                    className={`w-full cursor-pointer text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-4 group hover:scale-[1.002] ${
                                      isActive
                                        ? "bg-white/10 border-white/20 text-white shadow-inner"
                                        : "bg-white/1 border-white/5 text-foreground/40 hover:bg-white/2 hover:border-white/10"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Clock className={`w-4 h-4 shrink-0 ${isActive ? "text-foreground/60" : "text-foreground/20"}`} />
                                      <div className="min-w-0">
                                        <p className={`text-[11px] font-medium truncate ${isActive ? "text-foreground/90" : "text-foreground/60"}`}>
                                          {file.name.replace(" (Instancia del Proyecto)", "").replace(" (Global .minecraft)", "")}
                                        </p>
                                        <div className="flex gap-2 text-[9px] text-foreground/30 mt-0.5 font-mono">
                                          <span>{formatSize(file.size)}</span>
                                          <span>•</span>
                                          <span>{new Date(file.mtime).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={(e) => requestDeleteFile(file, e)}
                                        disabled={deletingFilePath === file.path}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 border border-transparent hover:border-white/20 text-foreground/20 hover:text-rose-400 active:scale-90"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                      <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isActive ? "text-foreground/40" : "text-foreground/15"}`} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                    !pathsExist.projectLogs && !pathsExist.minecraft ? (
                      <div className="p-8 border border-amber-500/10 rounded-2xl bg-amber-500/2 text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner relative">
                          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-sm" />
                          <FileWarning className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-bold text-amber-300">Entorno de Juego No Detectado</h3>
                          <p className="text-[10px] text-foreground/40 max-w-[320px] mx-auto leading-relaxed">
                            No se localizó la carpeta de Minecraft (<code className="bg-white/5 px-1 rounded">.minecraft</code>) ni carpetas locales de logs de este proyecto en esta máquina.
                          </p>
                          <p className="text-[10px] text-foreground/30 max-w-[320px] mx-auto leading-relaxed">
                            Utiliza la pestaña de <strong className="text-amber-400/80">Manual</strong> para pegar y analizar cualquier archivo de log directamente.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border border-white/5 rounded-2xl bg-white/2 text-center flex flex-col items-center justify-center gap-3">
                        <FileWarning className="w-8 h-8 text-foreground/20" />
                        <div>
                          <p className="text-xs font-bold text-foreground/60">latest.log No Encontrado</p>
                          <p className="text-[10px] text-foreground/30 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                            Inicia Minecraft en este proyecto para que se genere el primer archivo de bitácora `latest.log`.
                          </p>
                        </div>
                      </div>
                    )
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

              {/* ──────────────── MODO 4: RESCATE DE JUGADOR (PLAYER RESCUE) ──────────────── */}
              {mode === "player-rescue" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Info Header Banner */}
                  <div className="p-4 rounded-2xl border flex gap-3 items-start"
                    style={{ background: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.15)" }}>
                    <Heart className="w-5 h-5 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-200 font-headline">Rescate de Emergencia de Jugadores</h4>
                      <p className="text-[10px] text-foreground/50 leading-relaxed">
                        Edita directamente archivos <code className="bg-white/5 px-1 rounded">.dat</code> de jugador pegándolos en la carpeta portátil <code className="bg-white/5 px-1 rounded text-amber-400 font-mono">.mine/source/.mim-index/player-rescue/</code>. SAGE los analizará en tiempo real sin requerir mundos activos.
                      </p>
                    </div>
                  </div>

                  {/* Loading State */}
                  {loadingPlayers && (
                    <div className="py-12 flex flex-col items-center gap-3 text-foreground/40">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <p className="text-xs">Buscando archivos de rescate en .mim-index/player-rescue...</p>
                    </div>
                  )}

                  {/* Player List */}
                  {!loadingPlayers && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">
                          {players.length} archivo(s) detectado(s)
                        </span>
                        <button
                          onClick={fetchPlayersList}
                          className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Re-escanear
                        </button>
                      </div>

                      {players.length === 0 ? (
                        <div className="p-6 border border-white/5 rounded-2xl bg-white/2 text-center flex flex-col items-center justify-center gap-3">
                          <User className="w-8 h-8 text-foreground/20" />
                          <div>
                            <p className="text-xs font-bold text-foreground/60">Bandeja de Rescate Vacía</p>
                            <p className="text-[10px] text-foreground/30 mt-1 max-w-[280px] mx-auto leading-relaxed">
                              Pega tus archivos <code className="bg-white/5 px-1 rounded font-mono">UUID.dat</code> o <code className="bg-white/5 px-1 rounded font-mono">level.dat</code> en la carpeta: <br />
                              <span className="text-indigo-300 font-mono text-[9px] bg-black/40 px-1.5 py-0.5 rounded select-all block mt-1.5 border border-white/5">
                                D:\.mine\source\.mim-index\player-rescue\
                              </span>
                            </p>
                            <p className="text-[9px] text-amber-400/50 mt-1">
                              ¡Luego presiona el botón de <strong>Re-escanear</strong> arriba!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                          {players.map((p) => {
                            const isSel = selectedPlayer?.filePath === p.filePath;
                            return (
                              <div
                                key={p.filePath}
                                onClick={() => {
                                  setSelectedPlayer(p);
                                  setNewCoords([
                                    Math.round(p.coordinates?.[0] ?? 0),
                                    Math.round(p.coordinates?.[1] ?? 80),
                                    Math.round(p.coordinates?.[2] ?? 0)
                                  ]);
                                  setNewDimension(p.dimension || "minecraft:overworld");
                                  setRescueSuccess(false);
                                  setRescueLogs([]);
                                }}
                                className={`p-3 rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between gap-3 ${
                                  isSel
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                    : "bg-white/2 border-white/5 text-foreground/50 hover:bg-white/5 hover:border-white/10"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <User className={`w-3.5 h-3.5 shrink-0 ${isSel ? "text-amber-400" : "text-foreground/30"}`} />
                                    <span className="text-xs font-mono font-bold truncate max-w-[150px] block">
                                      {p.fileName.replace(".dat", "")}
                                    </span>
                                    {p.isHost && (
                                      <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0">
                                        Anfitrión
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5 flex-wrap items-center">
                                    <span className="bg-white/5 border border-white/8 text-foreground/40 text-[9px] px-1.5 py-0.5 rounded font-mono">
                                      {p.worldName}
                                    </span>
                                    <span className="bg-white/5 border border-white/8 text-foreground/40 text-[9px] px-1.5 py-0.5 rounded font-mono">
                                      🎒 {p.inventoryCount ?? 0} ítems
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                                      p.dimension?.includes("nether") 
                                        ? "bg-red-500/10 border-red-500/25 text-red-400" 
                                        : p.dimension?.includes("end") 
                                        ? "bg-purple-500/10 border-purple-500/25 text-purple-400" 
                                        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                    }`}>
                                      🌎 {p.dimension?.split(":")[1] || p.dimension}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[10px] font-mono text-foreground/40">Coords:</p>
                                  <p className="text-[10px] font-mono font-bold mt-0.5">
                                    {p.coordinates ? `${Math.round(p.coordinates[0])}, ${Math.round(p.coordinates[1])}, ${Math.round(p.coordinates[2])}` : "0, 0, 0"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Editing Panel */}
                  {selectedPlayer && (
                    <div className="p-5 rounded-2xl border border-white/5 bg-white/2 space-y-5 animate-slide-up">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Heart className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-foreground/80 font-headline">Rescatando a {selectedPlayer.fileName.replace(".dat", "")}</h4>
                          <p className="text-[9px] text-foreground/30 mt-0.5 truncate max-w-[280px]">Mundo: {selectedPlayer.worldName}</p>
                        </div>
                      </div>

                      {/* Coords Config */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={resetCoords}
                            onChange={(e) => setResetCoords(e.target.checked)}
                            className="rounded border-white/10 bg-black/40 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5"
                          />
                          Reubicar Coordenadas (Teleport)
                        </label>

                        {resetCoords && (
                          <div className="space-y-3 pl-5">
                            <div className="grid grid-cols-3 gap-2.5">
                              {["X", "Y", "Z"].map((axis, i) => (
                                <div key={axis} className="space-y-1">
                                  <span className="text-[8px] font-black text-foreground/30 block">{axis} (Latitud/Longitud)</span>
                                  <input
                                    type="number"
                                    value={newCoords[i]}
                                    onChange={(e) => {
                                      const next = [...newCoords] as [number, number, number];
                                      next[i] = Number(e.target.value);
                                      setNewCoords(next);
                                    }}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground/80 focus:outline-none focus:border-amber-500/30 text-center font-mono"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex gap-2.5 flex-wrap">
                              <button
                                onClick={() => setNewCoords([0, 80, 0])}
                                className="px-2.5 py-1 rounded bg-white/5 border border-white/8 text-[9px] font-bold text-foreground/60 hover:bg-white/10 hover:text-amber-400 active:scale-95 transition-all font-mono"
                              >
                                🎯 Spawn Central (0, 80, 0)
                              </button>
                              <button
                                onClick={() => setNewCoords([
                                  Math.round(selectedPlayer.coordinates?.[0] ?? 0),
                                  120,
                                  Math.round(selectedPlayer.coordinates?.[2] ?? 0)
                                ])}
                                className="px-2.5 py-1 rounded bg-white/5 border border-white/8 text-[9px] font-bold text-foreground/60 hover:bg-white/10 hover:text-amber-400 active:scale-95 transition-all font-mono"
                                title="Mueve al jugador más arriba en el aire por si estaba buceando en bloques sólidos de tierra o rocas"
                              >
                                ☁️ Aire Seguro (Y=120)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dimension Config */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={changeDimension}
                            onChange={(e) => setChangeDimension(e.target.checked)}
                            className="rounded border-white/10 bg-black/40 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5"
                          />
                          Restablecer Dimensión
                        </label>

                        {changeDimension && (
                          <div className="pl-5">
                            <select
                              value={newDimension}
                              onChange={(e) => setNewDimension(e.target.value)}
                              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-foreground/70 focus:outline-none focus:border-amber-500/30"
                            >
                              <option value="minecraft:overworld">🟢 Mundo Normal (Overworld)</option>
                              <option value="minecraft:the_nether">🔴 El Nether (Inframundo)</option>
                              <option value="minecraft:the_end">🟣 El End (Dimensión del Dragón)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Inventory Wipe Config */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-foreground/50 uppercase tracking-wider cursor-pointer">
                          <input
                            type="checkbox"
                            checked={clearInventory}
                            onChange={(e) => setClearInventory(e.target.checked)}
                            className="rounded border-white/10 bg-black/40 text-rose-500 focus:ring-rose-500/30 w-3.5 h-3.5"
                          />
                          <span className={clearInventory ? "text-rose-400" : ""}>Vaciar Inventario del Jugador</span>
                        </label>
                        {clearInventory && (
                          <p className="text-[9px] text-rose-400/70 leading-normal pl-5">
                            ⚠️ <strong>¡Cuidado!</strong> Esto borrará todos los ítems de su inventario y cofre de ender. Úsalo como último recurso si el juego se cae al conectar por culpa de un ítem corrupto.
                          </p>
                        )}
                      </div>

                      {/* Execute Button */}
                      <button
                        disabled={rescuingPlayer || (!resetCoords && !clearInventory && !changeDimension)}
                        onClick={handlePlayerRescue}
                        className="w-full py-3 rounded-xl font-bold font-headline text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] shadow-lg shadow-amber-600/15"
                      >
                        {rescuingPlayer ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando Rescate...</>
                        ) : (
                          <><Heart className="w-4 h-4 animate-pulse" /> Ejecutar Rescate de Emergencia</>
                        )}
                      </button>

                      {/* Backup Note */}
                      <p className="text-[8px] text-foreground/30 text-center leading-normal">
                        Se creará un respaldo de seguridad del archivo <code className="bg-white/5 px-1 rounded">.mim_bak</code> automáticamente antes de guardar.
                      </p>
                    </div>
                  )}

                  {/* Rescue Results Output */}
                  {rescueLogs.length > 0 && (
                    <div className={`p-4 rounded-2xl border space-y-2 animate-fade-in ${
                      rescueSuccess ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                    }`}>
                      <div className="flex items-center gap-2">
                        {rescueSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <h5 className={`text-xs font-bold font-headline ${rescueSuccess ? "text-emerald-300" : "text-red-300"}`}>
                          {rescueSuccess ? "Rescate Ejecutado Exitosamente" : "Error en el Rescate"}
                        </h5>
                      </div>
                      <div className="space-y-1 font-mono text-[9px] text-foreground/60 leading-normal pl-6">
                        {rescueLogs.map((log, i) => (
                          <div key={i}>• {log}</div>
                        ))}
                      </div>
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
