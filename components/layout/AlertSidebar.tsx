import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpCircle, 
  Shield, 
  Package, 
  RefreshCw, 
  FileWarning, 
  Info, 
  Loader2, 
  Globe, 
  ChevronDown, 
  ChevronUp,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  History,
  Activity,
  Search
} from "lucide-react";
import { eventBus } from "@/lib/eventBus";
import { incidentManager, Incident } from "@/lib/incidentManager";

interface AlertSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  conflicts: any[];
  modrinthStatus: Record<string, any>;
  library: any[];
  downloadingMods: Record<string, boolean>;
  ignoredUpdates: Set<string>;
  handleResolveConflict: (c: any, replace: boolean) => void;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
  handleDismissUpdate: (path: string) => void;
  checkingUpdates?: boolean;
  handleCheckUpdates?: () => void;
  securityAlerts?: Array<{
    filePath: string;
    fileName: string;
    riskLevel: "clean" | "caution" | "suspicious" | "critical";
    riskScore: number;
    summary: string;
  }>;
}

export function AlertSidebar({
  sidebarOpen,
  setSidebarOpen,
  conflicts,
  modrinthStatus,
  library,
  downloadingMods,
  ignoredUpdates,
  handleResolveConflict,
  handleDownloadUpdate,
  handleDismissUpdate,
  checkingUpdates,
  handleCheckUpdates,
  securityAlerts = [],
}: AlertSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | "sage" | "updates" | "conflicts" | "config">("all");

  // Persistence for activeTab
  useEffect(() => {
    const saved = localStorage.getItem("alert_active_tab");
    if (saved) setActiveTab(saved as any);
  }, []);

  useEffect(() => {
    localStorage.setItem("alert_active_tab", activeTab);
  }, [activeTab]);

  const [expandedChangelog, setExpandedChangelog] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Unified notifications states
  const [activeProject, setActiveProject] = useState<any>(null);
  const [configAlerts, setConfigAlerts] = useState<Array<{
    id: string;
    title: string;
    detail: string;
    type: "danger" | "warning";
  }>>([]);
  const [sageAlerts, setSageAlerts] = useState<Array<{
    id: string;
    title: string;
    detail: string;
    type: "danger" | "warning";
  }>>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [seenVersions, setSeenVersions] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("mim_seen_collection_versions") || "{}");
      } catch {
        return {};
      }
    }
    return {};
  });

  // On mount or when modrinthStatus changes, initialize any unseen collection projects to their current latestVersion
  useEffect(() => {
    let changed = false;
    const updatedSeen = { ...seenVersions };
    
    Object.entries(modrinthStatus).forEach(([path, s]) => {
      if (path.startsWith("collection:") && s.status === "update_available" && s.latestVersion) {
        const projectId = path.replace("collection:", "");
        if (!updatedSeen[projectId]) {
          updatedSeen[projectId] = s.latestVersion;
          changed = true;
        }
      }
    });
    
    if (changed) {
      setSeenVersions(updatedSeen);
      if (typeof window !== "undefined") {
        localStorage.setItem("mim_seen_collection_versions", JSON.stringify(updatedSeen));
      }
    }
  }, [modrinthStatus]);

  const handleMarkSeen = (projectId: string, latestVersion: string) => {
    const updated = { ...seenVersions, [projectId]: latestVersion };
    setSeenVersions(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("mim_seen_collection_versions", JSON.stringify(updated));
    }
  };

  const { modUpdates, collectionUpdates, shaderUpdates, resourcePackUpdates } = React.useMemo(() => {
    const modsList: [string, any][] = [];
    const collsList: [string, any][] = [];
    const shadersList: [string, any][] = [];
    const rpsList: [string, any][] = [];

    Object.entries(modrinthStatus).forEach(([path, s]) => {
      if (s.status !== "update_available" || !s.latestVersion) return;

      if (path.startsWith("collection:")) {
        const projectId = path.replace("collection:", "");
        const lastSeen = seenVersions[projectId];
        if (lastSeen && lastSeen !== s.latestVersion) {
          collsList.push([path, s]);
        }
      } else if (path.toLowerCase().includes("shaderpacks")) {
        if (!ignoredUpdates.has(path)) {
          shadersList.push([path, s]);
        }
      } else if (path.toLowerCase().includes("resourcepacks")) {
        if (!ignoredUpdates.has(path)) {
          rpsList.push([path, s]);
        }
      } else {
        const mod = library.find(l => l.path === path);
        if (mod && !ignoredUpdates.has(path)) {
          modsList.push([path, s]);
        }
      }
    });

    return { 
      modUpdates: modsList, 
      collectionUpdates: collsList, 
      shaderUpdates: shadersList, 
      resourcePackUpdates: rpsList 
    };
  }, [modrinthStatus, library, seenVersions, ignoredUpdates]);

  const updates = [
    ...modUpdates,
    ...collectionUpdates,
    ...shaderUpdates,
    ...resourcePackUpdates,
  ];

  // Unified real-time fetch of configuration errors and SAGE crash logs/security warnings
  const fetchConfigAndSageAlerts = async (proj = activeProject) => {
    try {
      // 1. Fetch settings validation
      const settingsRes = await fetch("/api/settings");
      const alerts: any[] = [];
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        
        // Check for empty API keys
        if (!settingsData.virusTotalApiKey) {
          alerts.push({
            id: "cfg-virustotal",
            title: "VirusTotal: sin API key configurada",
            detail: "No se ha configurado la API Key de VirusTotal. SAGE no podrá consultar la reputación de firmas en la nube.",
            type: "warning"
          });
        }
        if (!settingsData.modrinthApiKey) {
          alerts.push({
            id: "cfg-modrinth",
            title: "Modrinth: sin API key configurada",
            detail: "Falta tu API Key de Modrinth. El re-escaneo de actualizaciones y tags automáticos puede verse limitado.",
            type: "warning"
          });
        }

        // Validate paths exist
        const pathRes = await fetch("/api/settings/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths: [
              settingsData.sourceBase,
              settingsData.buildsBase,
              settingsData.minecraftPath,
              settingsData.downloadsPath,
              settingsData.stagingPath
            ]
          })
        });
        
        if (pathRes.ok) {
          const pathData = await pathRes.json();
          const results = pathData.results || {};
          
          if (settingsData.sourceBase && !results[settingsData.sourceBase]) {
            alerts.push({
              id: "cfg-source",
              title: "Carpeta de código fuente (Source) inválida",
              detail: `La ruta de origen "${settingsData.sourceBase}" no existe en el disco. MIM no podrá gestionar tus proyectos locales.`,
              type: "danger"
            });
          }
          if (settingsData.buildsBase && !results[settingsData.buildsBase]) {
            alerts.push({
              id: "cfg-builds",
              title: "Carpeta de compilaciones (Builds) inválida",
              detail: `La ruta "${settingsData.buildsBase}" no existe en el disco. No podrás exportar tus compilaciones.`,
              type: "danger"
            });
          }
          if (settingsData.minecraftPath && !results[settingsData.minecraftPath]) {
            alerts.push({
              id: "cfg-minecraft",
              title: "Instalación de Minecraft (.minecraft) no detectada",
              detail: `No se encontró la carpeta en "${settingsData.minecraftPath}". El juego no está instalado en este equipo, por lo que el análisis de logs locales estará inactivo.`,
              type: "warning"
            });
          }
        }
      }
      setConfigAlerts(alerts);
      
      // Emit config alerts as incidents
      alerts.forEach(a => {
        incidentManager.createIncident({
          id: a.id,
          title: a.title,
          detail: a.detail,
          severity: a.type === "danger" ? "danger" : "warning",
          module: "CONFIG"
        });
      });

      // Automatically resolve configuration incidents that are no longer active
      const activeConfigIds = new Set(alerts.map(a => a.id));
      const possibleConfigIds = ["cfg-virustotal", "cfg-modrinth", "cfg-source", "cfg-builds", "cfg-minecraft"];
      
      for (const id of possibleConfigIds) {
        if (!activeConfigIds.has(id)) {
          await incidentManager.resolveIncident(id);
        }
      }

      // 2. Fetch SAGE analysis warnings
      const sage: any[] = [];
      if (proj) {
        // Crash analysis check
        const logsRes = await fetch(`/api/project/logs?project=${proj.name}&version=${proj.version}`);
        if (logsRes.ok) {
          const logFilesData = await logsRes.json();
          const logFilesList = logFilesData?.files || [];
          
          // Determinamos la fecha de la sesión actual buscando el log más reciente (latest.log)
          const latestLog = logFilesList.find((f: any) => f.path === "logs/latest.log" || f.path === "global:logs/latest.log");
          const sessionDate = latestLog?.date || new Date().toISOString().split("T")[0];

          const crashFiles = logFilesList.filter((f: any) => f.type === "crash");
          
          // Solo alertamos sobre crashes que ocurrieron el mismo día que el log activo (crashes de la sesión)
          const activeCrashes = crashFiles.filter((f: any) => f.date === sessionDate);
          
          if (activeCrashes.length > 0) {
            eventBus.emit("sage:crash-detected", {
              crashId: `crash-${Date.now()}`,
              crashType: "mod", // Default a mod, podría ser más específico
              severity: activeCrashes.length > 2 ? "critical" : "high",
              logFile: activeCrashes[0].path,
              stackTrace: undefined, // Podría extraerse del archivo si es necesario
              suspectedMods: [], // Podría analizarse el stack trace
              sessionId: sessionDate
            });
          }
        }

        // Security scanner check (retrieve list of scannable files, trigger rapid scan)
        const secRes = await fetch(`/api/security/scan?project=${proj.name}&version=${proj.version}&loader=${proj.loader}`);
        if (secRes.ok) {
          const secData = await secRes.json();
          if (secData.success && secData.scannable && secData.scannable.length > 0) {
            const scanRes = await fetch("/api/security/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filePaths: secData.scannable.map((s: any) => s.filePath) })
            });
            if (scanRes.ok) {
              const scanData = await scanRes.json();
              if (scanData.success && scanData.results) {
                const criticalCount = scanData.results.filter((r: any) => r.riskLevel === "critical").length;
                const suspiciousCount = scanData.results.filter((r: any) => r.riskLevel === "suspicious").length;
                
                if (criticalCount > 0 || suspiciousCount > 0) {
                  const riskFiles = scanData.results.filter((r: any) => 
                    r.riskLevel === "critical" || r.riskLevel === "suspicious"
                  );
                  
                  eventBus.emit("sage:security-risk", {
                    riskId: `security-${Date.now()}`,
                    riskType: criticalCount > 0 ? "malware" : "file-system",
                    severity: criticalCount > 0 ? "critical" : "suspicious",
                    fileName: riskFiles[0]?.fileName || "unknown",
                    riskScore: criticalCount > 0 ? 90 : 60,
                    findings: riskFiles.map((r: any) => r.summary || r.riskLevel)
                  });
                }
              }
            }
          }
        }

        // 3. Dependency Ownership Check
        const dRes = await fetch(`/api/library/resolve-ownership?project=${proj.name}&version=${proj.version}&loader=${proj.loader}`);
        if (dRes.ok) {
          const dData = await dRes.json();
          if (dData.success && dData.actions && dData.actions.length > 0) {
            dData.actions.forEach((act: any) => {
              incidentManager.createIncident({
                id: `dep-ownership-${act.modId}`,
                title: `Librería mal aislada: ${act.modName}`,
                detail: `${act.reason} Se recomienda moverla a ${act.suggestedCategory}.`,
                severity: act.severity === "warning" ? "warning" : "info",
                module: "SYSTEM",
                meta: {
                  type: "dependency_move",
                  modId: act.modId,
                  currentPath: act.currentPath,
                  suggestedCategory: act.suggestedCategory,
                }
              });
            });
          }
        }
      }
    } catch (e) {
      console.error("Error al actualizar alertas unificadas:", e);
    }
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('[data-sidebar-toggle="true"]') || target.closest('[data-header-toggle="true"]')) return;
        setSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen, setSidebarOpen]);

  // Subscribe to central MIM custom events
  useEffect(() => {
    const handleActiveProject = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      setActiveProject(customEvent.detail);
      fetchConfigAndSageAlerts(customEvent.detail);
    };

    const handleRefresh = () => {
      fetchConfigAndSageAlerts(activeProject);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("active-project-changed", handleActiveProject);
      window.addEventListener("refresh-system", handleRefresh);
      
      const handleIncidents = (e: any) => {
        setIncidents([...e.detail]);
      };
      window.addEventListener("mim:incidents-updated", handleIncidents);
      
      // Initial load
      incidentManager.getIncidents("active").then(setIncidents).catch(err => {
        console.error("[AlertSidebar] Error loading incidents:", err);
        setIncidents([]);
      });
    }

    fetchConfigAndSageAlerts(activeProject);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("active-project-changed", handleActiveProject);
        window.removeEventListener("refresh-system", handleRefresh);
        window.removeEventListener("mim:incidents-updated", (e: any) => {
          setIncidents([...e.detail]);
        });
      }
    };
  }, [activeProject]);

  // Reload when the sidebar is opened, and set up auto-refresh on window focus & interval
  useEffect(() => {
    if (!sidebarOpen) return;

    fetchConfigAndSageAlerts(activeProject);
    incidentManager.markAsSeen();

    // Auto-refresh periodically (e.g., every 15 seconds) while sidebar is open
    const intervalId = setInterval(() => {
      fetchConfigAndSageAlerts(activeProject);
    }, 15000);

    // Auto-refresh immediately when window gains focus (user returned after fixing configs manually)
    const handleWindowFocus = () => {
      fetchConfigAndSageAlerts(activeProject);
    };
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [sidebarOpen, activeProject]);

  const renderUpdateCard = (path: string, s: any, type: "mod" | "collection" | "shader" | "resourcepack") => {
    const isCollection = type === "collection";
    const mod = isCollection ? null : library.find(l => l.path === path);
    
    // Prefer human-readable title from Modrinth.
    // For assets without a Modrinth match, use the filename — NEVER the internal hash slug.
    const rawFilename = path.substring(path.lastIndexOf("\\") + 1).replace(/\.(zip|jar)$/i, "");
    const displayName = s.title || s.slug ||
      (isCollection
        ? "Mod Seguido"
        : type === "shader" || type === "resourcepack"
          ? rawFilename
          : (mod?.meta?.modName || mod?.fileName));

    const currentVersion = isCollection ? null : mod?.meta?.modVersion;
    const hasCurrentVersion = currentVersion && currentVersion !== "unknown";

    return (
      <div 
        key={path} 
        className="p-3 rounded-xl border animate-fade-in transition-all duration-300 hover:border-white/10"
        style={{ borderColor: "var(--color-accent-border)", background: "var(--color-accent-bg)" }}
      >
        <div className="flex items-start gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--color-accent-hover)" }}
          >
            <Package className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-subhead text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                {displayName}
              </p>
              {isCollection && (
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase shrink-0">Seguido</span>
              )}
              {type === "shader" && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[10px] font-bold border border-yellow-500/20 uppercase shrink-0">Shader</span>
              )}
              {type === "resourcepack" && (
                <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-500 text-[10px] font-bold border border-teal-500/20 uppercase shrink-0">Textura</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              {!isCollection && hasCurrentVersion ? (
                <>
                  <span style={{ color: "var(--color-muted)" }}>v{currentVersion}</span>
                  <span style={{ color: "var(--color-accent)" }}>→</span>
                  <span style={{ color: "var(--color-success)" }}>v{s.latestVersion}</span>
                </>
              ) : (
                <span style={{ color: "var(--color-success)" }}>Nuevo: v{s.latestVersion}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {isCollection ? (
            <>
              <ActionButton
                primary
                onClick={() => handleDownloadUpdate(path, s.downloadUrl!, `${s.slug || "mod"}-${s.latestVersion}.jar`)}
                disabled={downloadingMods[path]}
                icon={downloadingMods[path] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                label={downloadingMods[path] ? "Descargando..." : "Descargar"}
              />
              <ActionButton
                onClick={() => {
                  const projectId = path.replace("collection:", "");
                  handleMarkSeen(projectId, s.latestVersion!);
                }}
                label="Visto"
              />
            </>
          ) : (
            <>
              <ActionButton
                primary
                onClick={() => {
                  let filename = path.substring(path.lastIndexOf("\\") + 1);
                  if (type === "mod" && mod?.meta?.modVersion) {
                    filename = mod.fileName.replace(mod.meta.modVersion, s.latestVersion!);
                  } else {
                    const ext = filename.substring(filename.lastIndexOf("."));
                    const base = filename.substring(0, filename.lastIndexOf("."));
                    filename = `${base}-${s.latestVersion}${ext}`;
                  }
                  handleDownloadUpdate(path, s.downloadUrl!, filename);
                }}
                disabled={downloadingMods[path]}
                icon={downloadingMods[path] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                label={downloadingMods[path] ? "Descargando..." : (type === "mod" ? "Actualizar" : "Descargar")}
              />
              <ActionButton
                onClick={() => handleDismissUpdate(path)}
                label="Ignorar"
              />
            </>
          )}
          
          <div className="w-full flex gap-2 mt-1">
            <ActionButton
              onClick={() => window.open(`https://modrinth.com/mod/${s.slug || s.projectId}`, "_blank")}
              icon={<Globe className="w-3.5 h-3.5" />}
              label="Web"
              small
            />
            <ActionButton
              onClick={() => setExpandedChangelog(expandedChangelog === path ? null : path)}
              icon={expandedChangelog === path ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              label="Más Info"
              small
            />
          </div>
        </div>

        {expandedChangelog === path && (
          <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5 animate-fade-in">
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-2">Registro de cambios:</p>
            <div className="text-xs max-h-40 overflow-y-auto custom-scrollbar font-sans leading-relaxed whitespace-pre-wrap pr-2" style={{ color: "var(--color-muted)" }}>
              {s.changelog || "Sin detalles disponibles."}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={sidebarRef}
      className={`fixed inset-y-0 right-0 w-[400px] z-[200] flex flex-col shadow-2xl transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${sidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      style={{ 
        background: "var(--glass-bg)", 
        borderLeft: "1px solid var(--glass-border)",
        backdropFilter: "var(--liquid-blur)",
        boxShadow: "var(--shadow-drop)",
      }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-headline flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          Centro de Alertas
          {(conflicts.length + updates.length + incidents.filter(i => i.status === "active").length) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
              {conflicts.length + updates.length + incidents.filter(i => i.status === "active").length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {handleCheckUpdates && (
            <button
              onClick={handleCheckUpdates}
              disabled={checkingUpdates}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)", border: "1px solid var(--color-accent-border)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? "animate-spin" : ""}`} />
              <span>{checkingUpdates ? "Buscando..." : "Buscar Updates"}</span>
            </button>
          )}
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="p-2 rounded-xl transition-colors hover:bg-white/5" 
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Alert Category Tabs */}
      <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: "var(--color-border)" }}>
        <TabButton
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          icon={<Info className="w-3.5 h-3.5" />}
          label="Todas"
          count={conflicts.length + updates.length + sageAlerts.length + configAlerts.length}
        />
        <TabButton
          active={activeTab === "sage"}
          onClick={() => setActiveTab("sage")}
          icon={<Activity className="w-3.5 h-3.5" />}
          label="SAGE"
          count={incidents.filter(i => i.status === "active" && i.module === "SAGE").length}
          alert={incidents.some(i => i.status === "active" && i.module === "SAGE" && i.severity === "danger")}
        />
        <TabButton
          active={activeTab === "updates"}
          onClick={() => setActiveTab("updates")}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          label="Updates"
          count={updates.length}
        />
        <TabButton
          active={activeTab === "conflicts"}
          onClick={() => setActiveTab("conflicts")}
          icon={<FileWarning className="w-3.5 h-3.5" />}
          label="Conflictos"
          count={conflicts.length}
        />
        <TabButton
          active={activeTab === "config"}
          onClick={() => setActiveTab("config")}
          icon={<Settings className="w-3.5 h-3.5" />}
          label="Ajustes"
          count={incidents.filter(i => i.status === "active" && i.module === "CONFIG").length}
          alert={incidents.some(i => i.status === "active" && i.module === "CONFIG" && i.severity === "danger")}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* Empty State - Global */}
        {activeTab === "all" && conflicts.length === 0 && updates.length === 0 && incidents.filter(i => i.status === "active").length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce"
              style={{ background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)" }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: "var(--color-success)" }} />
            </div>
            <p className="font-subhead text-base" style={{ color: "var(--color-foreground)" }}>Todo al día</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>No hay alertas de ningún tipo en tu sistema</p>
          </div>
        )}

        {/* Empty State - SAGE */}
        {activeTab === "sage" && incidents.filter(i => i.status === "active" && i.module === "SAGE").length === 0 && (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110"
              style={{ background: "rgba(102,200,160,0.12)", border: "1px solid rgba(102,200,160,0.2)" }}
            >
              <Activity className="w-8 h-8 text-[#66C8A0]" />
            </div>
            <p className="font-headline text-base font-bold" style={{ color: "var(--color-foreground)" }}>SAGE: Todo en Orden</p>
            <p className="text-sm mt-1 px-6 leading-relaxed" style={{ color: "var(--color-muted)" }}>No se han detectado malware, amenazas críticas ni caídas del juego en el proyecto actual.</p>
          </div>
        )}

        {/* Empty State - Ajustes */}
        {activeTab === "config" && incidents.filter(i => i.status === "active" && i.module === "CONFIG").length === 0 && (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110"
              style={{ background: "rgba(187,150,228,0.12)", border: "1px solid rgba(187,150,228,0.2)" }}
            >
              <Settings className="w-8 h-8 text-[#BB96E4]" />
            </div>
            <p className="font-headline text-base font-bold" style={{ color: "var(--color-foreground)" }}>Ajustes Correctos</p>
            <p className="text-sm mt-1 px-6 leading-relaxed" style={{ color: "var(--color-muted)" }}>Todas las rutas en disco son funcionales y las credenciales están debidamente cargadas.</p>
          </div>
        )}

        {/* Empty State - Conflicts */}
        {activeTab === "conflicts" && conflicts.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <CheckCircle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="font-headline text-base font-bold" style={{ color: "var(--color-foreground)" }}>Sin Conflictos</p>
            <p className="text-sm mt-1 px-6 leading-relaxed" style={{ color: "var(--color-muted)" }}>Todos los mods instalados son compatibles entre sí sin duplicados.</p>
          </div>
        )}

        {/* Empty State - Updates */}
        {activeTab === "updates" && updates.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <RefreshCw className="w-8 h-8 text-amber-400" />
            </div>
            <p className="font-headline text-base font-bold" style={{ color: "var(--color-foreground)" }}>Mods Actualizados</p>
            <p className="text-sm mt-1 px-6 leading-relaxed" style={{ color: "var(--color-muted)" }}>No se encontraron nuevas actualizaciones disponibles en Modrinth para tus mods.</p>
          </div>
        )}

        {/* ──────── INCIDENTS SECTION (SAGE / CONFIG / SYSTEM) ──────── */}
        {(activeTab === "all" || activeTab === "sage" || activeTab === "config") && incidents.filter(i => i.status === "active").length > 0 && (
          <div className="flex flex-col gap-6">
            {["SAGE", "CONFIG", "SYSTEM"].map(mod => {
              const modIncidents = incidents.filter(i => i.status === "active" && i.module === mod);
              if (modIncidents.length === 0) return null;
              if (activeTab === "sage" && mod !== "SAGE") return null;
              if (activeTab === "config" && mod !== "CONFIG") return null;

              const modInfo = {
                SAGE: { icon: <Activity className="w-4 h-4" />, title: "Diagnósticos SAGE", color: "#818cf8" },
                CONFIG: { icon: <Settings className="w-4 h-4" />, title: "Ajustes del Sistema", color: "#a78bfa" },
                SYSTEM: { icon: <Shield className="w-4 h-4" />, title: "Alertas de Sistema", color: "#fb7185" }
              }[mod as "SAGE" | "CONFIG" | "SYSTEM"];

              return (
                <AlertSection
                  key={mod}
                  icon={modInfo.icon}
                  title={modInfo.title}
                  count={modIncidents.length}
                  color={modInfo.color}
                >
                  <div className="flex flex-col gap-3">
                    {modIncidents.map((incident) => {
                      const isDanger = incident.severity === "danger";
                      return (
                        <div 
                          key={incident.id} 
                          className="p-3.5 rounded-2xl border animate-fade-in transition-all duration-300 relative group overflow-hidden"
                          style={{ 
                            borderColor: isDanger ? "rgba(239, 68, 68, 0.2)" : "rgba(167, 139, 250, 0.2)", 
                            background: isDanger ? "rgba(239, 68, 68, 0.04)" : "rgba(167, 139, 250, 0.04)" 
                          }}
                        >
                          {!incident.seen && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
                          )}
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                              style={{ background: isDanger ? "rgba(239, 68, 68, 0.08)" : "rgba(167, 139, 250, 0.08)" }}
                            >
                              {incident.severity === "danger" ? <ShieldX className="w-4 h-4 text-red-400" /> : <ShieldAlert className="w-4 h-4 text-purple-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`font-headline text-xs font-bold ${isDanger ? 'text-red-300' : 'text-purple-300'}`}>
                                  {incident.title}
                                </p>
                                <span className="text-[8px] opacity-30 font-mono">
                                  {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[10px] mt-1 leading-relaxed text-foreground/70">{incident.detail}</p>
                              
                              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={async () => {
                                     await incidentManager.resolveIncident(incident.id);
                                     const refreshed = await incidentManager.getIncidents("active");
                                     setIncidents(refreshed);
                                   }}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  Resolver
                                </button>
                                                                 {incident.module === "SAGE" && (
                                   <button
                                     onClick={() => {
                                       setSidebarOpen(false);
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent("sage-toggle", { detail: true }));
                                        }, 150);
                                     }}
                                     className="text-[9px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                                   >
                                     Ver en SAGE
                                   </button>
                                 )}
                                 {incident.meta?.type === "dependency_move" && (
                                   <button
                                     onClick={async (e) => {
                                       e.stopPropagation();
                                       try {
                                         const res = await fetch("/api/classify", {
                                           method: "POST",
                                           headers: { "Content-Type": "application/json" },
                                           body: JSON.stringify({
                                             sourcePaths: [incident.meta.currentPath],
                                             targetCategory: incident.meta.suggestedCategory,
                                             modloader: activeProject?.loader,
                                             version: activeProject?.version,
                                             projectName: activeProject?.name,
                                           }),
                                         });
                                         if (res.ok) {
                                           await incidentManager.resolveIncident(incident.id);
                                           const refreshed = await incidentManager.getIncidents("active");
                                           setIncidents(refreshed);
                                           window.dispatchEvent(new CustomEvent("refresh-system"));
                                         }
                                       } catch (err) {
                                         console.error("Error correcting library location:", err);
                                       }
                                     }}
                                     className="text-[9px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 animate-pulse"
                                   >
                                     <CheckCircle className="w-3 h-3 text-emerald-400" />
                                     Corregir Ubicación
                                   </button>
                                 )}
                                 {incident.meta?.dependency && (
                                   <button
                                     onClick={() => {
                                       setSidebarOpen(false);
                                       setTimeout(() => {
                                         window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query: incident.meta.dependency } }));
                                       }, 150);
                                     }}
                                     className="text-[9px] font-bold px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 hover:bg-pink-500/20 transition-colors flex items-center gap-1 animate-pulse"
                                   >
                                     <Search className="w-3 h-3 text-pink-400" />
                                     Buscar en FOMO
                                   </button>
                                 )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AlertSection>
              );
            })}
          </div>
        )}

        {/* ──────── 1. MODS UPDATES SECTION ──────── */}
        {(activeTab === "all" || activeTab === "updates") && modUpdates.length > 0 && (
          <AlertSection
            icon={<RefreshCw className="w-4 h-4" />}
            title="Actualizaciones de Mods"
            count={modUpdates.length}
            color="var(--color-accent)"
          >
            <div className="flex flex-col gap-2">
              {modUpdates.map(([path, s]) => renderUpdateCard(path, s, "mod"))}
            </div>
          </AlertSection>
        )}

        {/* ──────── 2. COLLECTIONS UPDATES SECTION ──────── */}
        {(activeTab === "all" || activeTab === "updates") && collectionUpdates.length > 0 && (
          <AlertSection
            icon={<RefreshCw className="w-4 h-4" />}
            title="Mods Seguidos (Colecciones)"
            count={collectionUpdates.length}
            color="var(--color-primary)"
          >
            <div className="flex flex-col gap-2">
              {collectionUpdates.map(([path, s]) => renderUpdateCard(path, s, "collection"))}
            </div>
          </AlertSection>
        )}

        

        

        {/* ──────── CONFLICTS SECTION ──────── */}
        {(activeTab === "all" || activeTab === "conflicts") && conflicts.length > 0 && (
          <AlertSection
            icon={<FileWarning className="w-4 h-4" />}
            title="Archivos Duplicados"
            count={conflicts.length}
            color="var(--color-danger)"
          >
            <div className="flex flex-col gap-2">
              {conflicts.map((c, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-xl border animate-fade-in"
                  style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-bg)" }}
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-danger-hover)" }}
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-danger)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-subhead text-sm truncate" style={{ color: "var(--color-foreground)" }}>{c.oldFile.meta?.modName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span style={{ color: "var(--color-muted)" }}>v{c.oldFile.meta?.modVersion}</span>
                        <span style={{ color: "var(--color-danger)" }}>vs</span>
                        <span style={{ color: "var(--color-success)" }}>v{c.newFile.meta?.modVersion}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <ActionButton
                      primary
                      danger
                      onClick={() => handleResolveConflict(c, true)}
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      label="Reemplazar"
                    />
                    <ActionButton
                      onClick={() => handleResolveConflict(c, false)}
                      label="Mantener ambos"
                    />
                  </div>
                </div>
              ))}
            </div>
          </AlertSection>
        )}

        {/* Historial de Incidentes Resolvidos */}
        {(activeTab === "all" || activeTab === "sage") && incidents.filter(i => i.status === "resolved").length > 0 && (
          <div className="mt-8 border-t border-white/5 pt-6 opacity-40 hover:opacity-100 transition-opacity">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 mb-4 flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Incidentes Recientes Resolvidos
            </h4>
            <div className="flex flex-col gap-2">
              {incidents.filter(i => i.status === "resolved").slice(0, 5).map(incident => (
                <div key={incident.id} className="flex items-center gap-2 text-[10px] text-foreground/50">
                  <CheckCircle className="w-3 h-3 text-emerald-500/50" />
                  <span className="truncate flex-1">{incident.title}</span>
                  <span className="text-[8px] font-mono">{new Date(incident.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  alert?: boolean;
}

function TabButton({ active, onClick, icon, label, count, alert }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all min-w-0 ${alert ? "relative" : ""}`}
      style={{
        background: active ? "var(--color-hover)" : "transparent",
        color: active ? "var(--color-foreground)" : "var(--color-muted)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--color-hover)";
          e.currentTarget.style.color = "var(--color-foreground)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-muted)";
        }
      }}
    >
      <span className="shrink-0" style={{ color: active ? "var(--color-primary)" : "inherit" }}>{icon}</span>
      <span className="text-[0.65rem] leading-tight truncate w-full px-1">{label}</span>
      {count > 0 && (
        <span 
          className="text-[0.55rem] px-1.5 py-0 rounded-full shrink-0"
          style={{ 
            background: alert ? "var(--color-danger-bg)" : "var(--color-secondary-bg)",
            color: alert ? "var(--color-danger)" : "var(--color-muted)",
          }}
        >
          {count}
        </span>
      )}
      {alert && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      )}
    </button>
  );
}

interface AlertSectionProps {
  key?: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

function AlertSection({ icon, title, count, color, children, defaultOpen = true }: AlertSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3.5 text-left transition-colors hover:bg-white/5"
      >
        <span style={{ color }}>{icon}</span>
        <h3 className="text-xs font-headline tracking-wider uppercase font-bold" style={{ color }}>
          {title}
        </h3>
        <span 
          className="text-xs px-2 py-0.5 rounded-full font-bold ml-2 transition-all" 
          style={{ background: "rgba(255, 255, 255, 0.08)", color: "var(--color-foreground)" }}
        >
          {count}
        </span>
        <ChevronDown 
          className="w-4 h-4 ml-auto transition-transform duration-300 opacity-60" 
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color }}
        />
      </button>
      
      {isOpen && (
        <div className="p-3.5 border-t border-white/5 flex flex-col gap-3 animate-fade-in bg-black/15">
          {children}
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  small?: boolean;
}

function ActionButton({ primary, danger, onClick, disabled, icon, label, small }: ActionButtonProps) {
  const getButtonStyle = () => {
    if (primary && danger) {
      return {
        background: "var(--color-danger-bg)",
        color: "var(--color-danger)",
        hoverBg: "var(--color-danger-hover)",
      };
    }
    if (primary) {
      return {
        background: "var(--color-accent-bg)",
        color: "var(--color-accent)",
        hoverBg: "var(--color-accent-hover)",
      };
    }
    return {
      background: "var(--color-secondary-bg)",
      color: "var(--color-muted)",
      hoverBg: "var(--color-hover)",
    };
  };

  const style = getButtonStyle();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${small ? 'py-1 px-2 text-[10px]' : 'py-2 px-3 text-xs'} flex-1 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5`}
      style={{
        background: style.background,
        color: style.color,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = style.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = style.background)}
    >
      {icon}
      {label}
    </button>
  );
}
