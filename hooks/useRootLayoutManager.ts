import { useState, useEffect, useRef } from "react";
import type { Project, PackHealthReport } from "@/lib/types";
import { incidentManager } from "@/lib/incidentManager";
import { useStaging } from "@/hooks/useStaging";

export function useRootLayoutManager() {
  const [fomoOpen, setFomoOpen] = useState(false);
  const [sageOpen, setSageOpen] = useState(false);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertSidebarOpen, setAlertSidebarOpen] = useState(false);
  const [hasAlerts, setHasAlerts] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [alertsSeen, setAlertsSeen] = useState(false);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [hasStagingFiles, setHasStagingFiles] = useState(false);
  const [packHealthOpen, setPackHealthOpen] = useState(false);
  const [packHealthReport, setPackHealthReport] = useState<PackHealthReport | null>(null);
  const [isValidatingHealth, setIsValidatingHealth] = useState(false);
  const [onForceBuildCallback, setOnForceBuildCallback] = useState<(() => void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [watcherStatusLabel, setWatcherStatusLabel] = useState("Watcher");
  const [customWatcherStatus, setCustomWatcherStatus] = useState<string | null>(null);
  const staging = useStaging();

  // Listen for pending files updates
  useEffect(() => {
    const handleUpdate = (e: any) => setPendingFiles(e.detail.files || []);
    window.addEventListener("fomo-pending-files-update", handleUpdate);
    return () => window.removeEventListener("fomo-pending-files-update", handleUpdate);
  }, []);

  // Listen for custom watcher status changes
  useEffect(() => {
    const handleStatusChange = (e: any) => {
      if (e.detail === "Watcher") {
        setTimeout(() => setCustomWatcherStatus(null), 5000);
      } else {
        setCustomWatcherStatus(e.detail);
      }
    };
    window.addEventListener("watcher-status-change", handleStatusChange);
    return () => window.removeEventListener("watcher-status-change", handleStatusChange);
  }, []);

  // Detect new files and show "Descargas"
  const prevLength = useRef(0);
  useEffect(() => {
    if (pendingFiles.length > prevLength.current) {
      setWatcherStatusLabel("Descargas");
      const timer = setTimeout(() => setWatcherStatusLabel("Watcher"), 5000);
      return () => clearTimeout(timer);
    }
    prevLength.current = pendingFiles.length;
  }, [pendingFiles.length]);

  // Mark alerts as seen
  useEffect(() => {
    if (alertSidebarOpen) {
      setAlertsSeen(true);
      incidentManager.markAsSeen();
    }
  }, [alertSidebarOpen]);

  // Persistence for activeProject
  useEffect(() => {
    const saved = localStorage.getItem("mim_active_project");
    if (saved) {
      try { setActiveProject(JSON.parse(saved)); } catch (e) { console.warn("Error loading active project", e); }
    }
  }, []);

  useEffect(() => {
    if (activeProject) localStorage.setItem("mim_active_project", JSON.stringify(activeProject));
  }, [activeProject]);

  // Sync incident counts
  useEffect(() => {
    const updateCounts = async () => {
      try {
        const activeIncidents = await incidentManager.getIncidents("active");
        const unseeenCount = activeIncidents.filter(i => !i.seen).length;
        setAlertCount(activeIncidents.length);
        setHasAlerts(activeIncidents.length > 0);
        setAlertsSeen(unseeenCount === 0);
      } catch (error) {
        setAlertCount(0);
        setHasAlerts(false);
        setAlertsSeen(true);
      }
    };
    updateCounts();
    return incidentManager.subscribe(updateCounts);
  }, []);

  // Global Event Listeners
  useEffect(() => {
    const handleAlertToggle = (e: Event) => {
      const isOpen = (e as CustomEvent).detail;
      setAlertSidebarOpen(isOpen);
      if (isOpen) setPackHealthOpen(false);
    };
    const handleFomoToggleEvent = (e: Event) => setFomoOpen((e as CustomEvent).detail);
    const handleSageToggleEvent = (e: Event) => setSageOpen((e as CustomEvent).detail);
    const handleTweakToggleEvent = (e: Event) => setTweakOpen((e as CustomEvent).detail);
    const handleProjectChange = (e: Event) => setActiveProject((e as CustomEvent).detail);
    const handleStagingStatus = (e: Event) => setHasStagingFiles((e as CustomEvent).detail);

    const handlePackHealthToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "boolean") {
        setPackHealthOpen(detail);
        if (detail) setAlertSidebarOpen(false);
      } else if (detail && typeof detail === "object") {
        setPackHealthOpen(detail.open);
        if (detail.open) setAlertSidebarOpen(false);
        if (detail.report) setPackHealthReport(detail.report);
        if (detail.onForceBuild) setOnForceBuildCallback(() => detail.onForceBuild);
      }
    };

    window.addEventListener("alert-sidebar-toggle", handleAlertToggle);
    window.addEventListener("fomo-toggle", handleFomoToggleEvent);
    window.addEventListener("sage-toggle", handleSageToggleEvent);
    window.addEventListener("tweak-toggle", handleTweakToggleEvent);
    window.addEventListener("active-project-changed", handleProjectChange);
    window.addEventListener("staging-status-changed", handleStagingStatus);
    window.addEventListener("pack-health-toggle", handlePackHealthToggle);
    
    if (staging.hasFiles) setHasStagingFiles(true);

    return () => {
      window.removeEventListener("alert-sidebar-toggle", handleAlertToggle);
      window.removeEventListener("fomo-toggle", handleFomoToggleEvent);
      window.removeEventListener("sage-toggle", handleSageToggleEvent);
      window.removeEventListener("tweak-toggle", handleTweakToggleEvent);
      window.removeEventListener("active-project-changed", handleProjectChange);
      window.removeEventListener("staging-status-changed", handleStagingStatus);
      window.removeEventListener("pack-health-toggle", handlePackHealthToggle);
    };
  }, [staging.hasFiles]);

  const handleToggleUI = (type: 'fomo' | 'sage' | 'tweak' | 'alerts', isOpen: boolean) => {
    const setters: Record<string, (v: boolean) => void> = { fomo: setFomoOpen, sage: setSageOpen, tweak: setTweakOpen, alerts: setAlertSidebarOpen };
    const events: Record<string, string> = { fomo: "fomo-toggle", sage: "sage-toggle", tweak: "tweak-toggle", alerts: "alert-sidebar-toggle" };
    
    setters[type](isOpen);
    const soundFile = isOpen ? "/fomo_sound.mp3" : "/fomoff.mp3";
    const audio = new Audio(soundFile);
    audio.volume = 0.35;
    audio.play().catch(() => {});

    window.dispatchEvent(new CustomEvent(events[type], { detail: isOpen }));
    
    if (isOpen) {
      Object.keys(setters).forEach(k => { if (k !== type) { setters[k](false); window.dispatchEvent(new CustomEvent(events[k], { detail: false })); } });
      setPackHealthOpen(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("refresh-system"));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCheckHealth = async () => {
    if (packHealthOpen) {
      setPackHealthOpen(false);
      return;
    }
    
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const isMimu = savedMode === "MIMU";
    
    if (!isMimu && !activeProject) return;
    if (isValidatingHealth) return;

    setAlertSidebarOpen(false);
    window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: false }));
    
    setIsValidatingHealth(true);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectName: isMimu ? "MIMU" : activeProject?.name, 
          version: isMimu ? "1.20.1" : activeProject?.version, // Idealmente detectar versión del juego
          loader: isMimu ? "forge" : activeProject?.loader,   // Idealmente detectar loader del juego
          buildTarget: "both" 
        }),
      });
      if (res.ok) {
        setPackHealthReport(await res.json());
        setPackHealthOpen(true);
      }
    } catch (err) {
      console.error("Health check failed:", err);
    } finally { setIsValidatingHealth(false); }
  };

  const handleFomoSearch = (query: string) => {
    setPackHealthOpen(false);
    handleToggleUI('fomo', true);
    setTimeout(() => window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } })), 400);
  };

  const watcherStatus = isRefreshing ? ".minecraft" : (customWatcherStatus || watcherStatusLabel);

  return {
    fomoOpen, sageOpen, tweakOpen, activeProject, settingsOpen, setSettingsOpen,
    alertSidebarOpen, hasAlerts, alertCount, alertsSeen, stagingOpen, setStagingOpen,
    hasStagingFiles, packHealthOpen, setPackHealthOpen, packHealthReport, setPackHealthReport,
    isValidatingHealth, onForceBuildCallback, isRefreshing, handleToggleUI, handleRefresh,
    handleCheckHealth, handleFomoSearch,
    pendingFiles,
    watcherStatus,
    handleOpenDownloads: () => {
      window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
      window.dispatchEvent(new CustomEvent("toggle-downloads", { detail: { collapsed: false } }));
    }
  };
}
