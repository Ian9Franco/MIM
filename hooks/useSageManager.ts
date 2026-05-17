import { useState, useEffect, useCallback } from "react";
import { analyzeMinecraftLog, type SageAnalysisResult } from "@/utils/sageAnalyzer";
import type { Project } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";

export interface LocalLogFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
  type: "log" | "crash";
  date?: string;
}

export type SageMode = "crash" | "latest-log" | "paste" | "security" | "player-rescue";

export function useSageManager(activeProject: Project | null, isOpen: boolean, onClose: () => void) {
  const [mode, setMode] = useState<SageMode>("security");
  
  // ── Persistence for mode ──
  useEffect(() => {
    const saved = localStorage.getItem("sage_mode");
    if (saved) setMode(saved as any);
  }, []);

  useEffect(() => {
    localStorage.setItem("sage_mode", mode);
  }, [mode]);

  // ── Player Rescue logic ──
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [rescuingPlayer, setRescuingPlayer] = useState(false);
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
    } catch (e) { console.error(e); }
    setLoadingPlayers(false);
  }, [activeProject]);

  const handlePlayerRescue = async (options: any) => {
    if (!selectedPlayer) return;
    setRescuingPlayer(true);
    setRescueLogs([]);
    setRescueSuccess(false);
    try {
      const res = await fetch("/api/sage/player-rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: selectedPlayer.filePath, ...options })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRescueLogs(data.logs || ["Jugador rescatado correctamente."]);
          setRescueSuccess(true);
          fetchPlayersList();
          eventBus.emit("sage:player-rescued", {
            playerId: selectedPlayer.fileName.replace(".dat", ""),
            playerName: selectedPlayer.isHost ? "Host/Singleplayer" : selectedPlayer.fileName.replace(".dat", ""),
            rescueType: options.clearInventory ? "inventory" : options.changeDimension ? "dimension" : "position",
            success: true,
            backupCreated: data.backupCreated ?? true
          });
        } else {
          setRescueLogs([`Error: ${data.error || "No se pudo rescatar al jugador"}`]);
        }
      }
    } catch (e: any) { setRescueLogs([`Error: ${e.message}`]); }
    setRescuingPlayer(false);
  };

  // ── Security Scanner logic ──
  const [secScannable, setSecScannable] = useState<any[]>([]);
  const [secResults, setSecResults] = useState<any[]>([]);
  const [secScanning, setSecScanning] = useState(false);
  const [secLoading, setSecLoading] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);
  const [secScanned, setSecScanned] = useState(false);

  const fetchScannable = useCallback(async () => {
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const isMimu = savedMode === "MIMU";
    
    if (!isMimu && !activeProject) return;
    setSecLoading(true);
    setSecError(null);
    try {
      const projectParam = isMimu ? "MIMU" : activeProject?.name;
      const versionParam = isMimu ? "1.20.1" : activeProject?.version;
      const loaderParam = isMimu ? "forge" : activeProject?.loader;
      
      const res = await fetch(`/api/security/scan?project=${projectParam}&version=${versionParam}&loader=${loaderParam}`);
      const data = await res.json();
      if (data.success) setSecScannable(data.scannable || []);
      else setSecError(data.error || "Error listando archivos");
    } catch (e) { setSecError("No se pudo contactar el servidor"); }
    setSecLoading(false);
  }, [activeProject]);

  const runSecurityScan = useCallback(async (extraPaths?: string[]) => {
    const allPaths = [
      ...secScannable.map((s: any) => s.filePath),
      ...(Array.isArray(extraPaths) ? extraPaths : [])
    ];
    
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const isMimu = savedMode === "MIMU";
    
    if (!isMimu && !activeProject && allPaths.length === 0) return;
    if (allPaths.length === 0) return;
    
    setSecScanning(true);
    setSecError(null);
    setSecScanned(true);

    try {
      // ── PASO 1: Escaneo Local Rápido (Batch) ──────────────────────
      console.log(`[/hooks/useSageManager] Paso 1: Escaneando localmente ${allPaths.length} archivos...`);
      const resLocal = await fetch("/api/security/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePaths: allPaths, localOnly: true }),
      });
      
      const dataLocal = await resLocal.json();
      
      if (dataLocal.success && dataLocal.results) {
        const merged = Object.entries(dataLocal.results as Record<string, any>).map(([filePath, result]) => {
          const entry = secScannable.find((s: any) => s.filePath === filePath) || {
            filePath,
            fileName: filePath.split(/[\\/]/).pop() || filePath,
            assetType: filePath.endsWith(".jar") ? "mod" : "zip",
          };
          return { ...entry, result: { ...result, riskScore: result.riskScore ?? 0, riskLevel: result.riskLevel ?? "clean" } };
        });
        
        setSecResults(merged);
        
        // ── PASO 2: Cola en segundo plano para VirusTotal ──────────────────────
        console.log(`[/hooks/useSageManager] Paso 2: Iniciando cola de VirusTotal...`);
        
        for (let i = 0; i < merged.length; i++) {
          const entry = merged[i];
          const result = entry.result;
          
          // Solo consultamos si NO es Whitelist y NO tiene resultado de VirusTotal todavía
          if (!result.whitelisted && (!result.virusTotal || result.virusTotal.fromCache === undefined)) {
            const resVT = await fetch("/api/security/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filePath: entry.filePath }),
            });
            
            const dataVT = await resVT.json();
            
            if (dataVT.success && dataVT.result) {
              const freshResult = dataVT.result;
              const updatedEntry = { ...entry, result: { ...freshResult, riskScore: freshResult.riskScore ?? 0, riskLevel: freshResult.riskLevel ?? "clean" } };
              
              setSecResults(prev => {
                const map = new Map(prev.map((r: any) => [r.filePath, r]));
                map.set(entry.filePath, updatedEntry);
                return Array.from(map.values());
              });

              // Si se usó la API (no vino de caché), esperamos 15 segundos!
              if (freshResult.virusTotal && freshResult.virusTotal.fromCache === false) {
                console.log(`[/hooks/useSageManager] VT used for ${entry.fileName}, waiting 15s...`);
                await new Promise(resolve => setTimeout(resolve, 15000));
              }
            }
          }
        }
      } else {
        setSecError(dataLocal.error || "Error en el escaneo local");
      }
    } catch (e) { 
      setSecError("Error de conexión al ejecutar el scan"); 
    } finally {
      setSecScanning(false);
    }
  }, [activeProject, secScannable]);

  const resetSecurityScan = useCallback(() => {
    setSecResults([]);
    setSecScanned(false);
    fetchScannable();
  }, [fetchScannable]);

  // ── Real-time scan: auto-scan new downloads ──
  useEffect(() => {
    const handler = (payload: any) => {
      const fileName = payload?.fileName;
      if (!fileName) return;
      fetch(`/api/security/scan?project=${activeProject?.name || ""}&version=${activeProject?.version || ""}&loader=${activeProject?.loader || ""}`)
        .then(r => r.json())
        .then(data => {
          const match = (data.scannable || []).find((s: any) =>
            s.fileName.includes(fileName) || fileName.includes(s.fileName.replace(" (Descargas)", ""))
          );
          if (match) runSecurityScan([match.filePath]);
        })
        .catch(() => {});
    };
    return eventBus.subscribe("fomo:mod-downloaded", handler);
  }, [activeProject, runSecurityScan]);

  // ── Log Analysis logic ──
  const [localFiles, setLocalFiles] = useState<LocalLogFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [crashAnalysis, setCrashAnalysis] = useState<SageAnalysisResult | null>(null);
  const [logAnalysis, setLogAnalysis] = useState<SageAnalysisResult | null>(null);
  const [pasteAnalysis, setPasteAnalysis] = useState<SageAnalysisResult | null>(null);
  const [selectedCrashFile, setSelectedCrashFile] = useState<LocalLogFile | null>(null);
  const [latestLogFile, setLatestLogFile] = useState<LocalLogFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchLocalFiles = useCallback(async () => {
    if (!activeProject) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/project/logs?project=${activeProject.name}&version=${activeProject.version}`);
      if (res.ok) {
        const data = await res.json();
        const files: LocalLogFile[] = data.files || [];
        setLocalFiles(files);

        // Auto-selection logic
        if (files.length > 0) {
          if (mode === "crash") {
            const newestCrash = files.find(f => f.type === "crash");
            if (newestCrash) {
              setSelectedCrashFile(newestCrash);
              handleLoadAndAnalyze(newestCrash);
            }
          } else if (mode === "latest-log") {
            const latestLog = files.find(f => f.name.toLowerCase().includes("latest.log"));
            if (latestLog) {
              setLatestLogFile(latestLog);
              handleLoadAndAnalyze(latestLog);
            }
          }
        }
      }
    } catch (e) { console.error("[SAGE] Error fetching local files:", e); }
    setLoadingFiles(false);
  }, [activeProject]);

  const handleLoadAndAnalyze = async (file: LocalLogFile) => {
    if (!activeProject) return;
    setReadingFile(true);
    try {
      const res = await fetch(`/api/project/logs?project=${activeProject.name}&version=${activeProject.version}&file=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        const result = analyzeMinecraftLog(data.content || "");
        if (file.type === "crash") setCrashAnalysis(result);
        else setLogAnalysis(result);
        eventBus.emit("sage:analysis-completed", { type: file.type, success: true, category: result.rule || "unknown" });
      }
    } catch (e) { console.error("[SAGE] Error analyzing file:", e); }
    setReadingFile(false);
  };

  const handleConfirmDelete = async (file: LocalLogFile) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/project/logs?project=${activeProject.name}&version=${activeProject.version}&file=${encodeURIComponent(file.path)}`, { method: "DELETE" });
      if (res.ok) {
        setLocalFiles(prev => prev.filter(f => f.path !== file.path));
        if (selectedCrashFile?.path === file.path) { setSelectedCrashFile(null); setCrashAnalysis(null); }
      }
    } catch (err) { console.error("[SAGE] Error deleting file:", err); }
  };

  const handleAnalyzeText = (text: string) => {
    setAnalyzing(true);
    setTimeout(() => {
      const res = analyzeMinecraftLog(text);
      setPasteAnalysis(res);
      setAnalyzing(false);
    }, 600);
  };

  useEffect(() => {
    if (isOpen && activeProject) {
      fetchLocalFiles();
      fetchPlayersList();
      fetchScannable();
    }
  }, [isOpen, activeProject, fetchLocalFiles, fetchPlayersList, fetchScannable]);

  return {
    mode, setMode, 
    players, loadingPlayers, selectedPlayer, setSelectedPlayer, rescuingPlayer, rescueLogs, rescueSuccess, fetchPlayersList, handlePlayerRescue,
    secScannable, secResults, secScanning, secLoading, secError, secScanned, fetchScannable, runSecurityScan, resetSecurityScan,
    localFiles, loadingFiles, readingFile, crashAnalysis, logAnalysis, pasteAnalysis, selectedCrashFile, setSelectedCrashFile, latestLogFile, setLatestLogFile, 
    analyzing, fetchLocalFiles, handleLoadAndAnalyze, handleConfirmDelete, handleAnalyzeText
  };
}
