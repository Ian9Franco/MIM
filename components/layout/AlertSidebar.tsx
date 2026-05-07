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
  Activity,
  Settings
} from "lucide-react";

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

  const updates = Object.entries(modrinthStatus).filter(([path, s]) => {
    if (path.startsWith("collection:")) {
      const projectId = path.replace("collection:", "");
      const lastSeen = seenVersions[projectId];
      return s.status === "update_available" && s.latestVersion && lastSeen && lastSeen !== s.latestVersion;
    }
    const mod = library.find(l => l.path === path);
    return s.status === "update_available" && mod && !ignoredUpdates.has(path);
  });

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

      // 2. Fetch SAGE analysis warnings
      const sage: any[] = [];
      if (proj) {
        // Crash analysis check
        const logsRes = await fetch(`/api/project/logs?project=${proj.name}&version=${proj.version}`);
        if (logsRes.ok) {
          const logFilesData = await logsRes.json();
          const logFilesList = logFilesData?.files || [];
          const crashFiles = logFilesList.filter((f: any) => f.type === "crash");
          if (crashFiles.length > 0) {
            sage.push({
              id: "sage-crashes",
              title: `¡Se detectaron caídas de juego! (${crashFiles.length})`,
              detail: `Se encontraron ${crashFiles.length} reportes en la carpeta crash-reports de este proyecto. Revisa SAGE para analizarlos.`,
              type: "danger"
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
                
                if (criticalCount > 0) {
                  sage.push({
                    id: "sage-malware",
                    title: `¡SAGE detectó riesgo crítico! (${criticalCount})`,
                    detail: `Se encontraron ${criticalCount} archivos que contienen malware o firmas potencialmente peligrosas. ¡No inicies el juego!`,
                    type: "danger"
                  });
                } else if (suspiciousCount > 0) {
                  sage.push({
                    id: "sage-suspicious",
                    title: `Riesgos moderados detectados (${suspiciousCount})`,
                    detail: `Se identificaron ${suspiciousCount} archivos sospechosos en tus mods. Te sugerimos escanearlos detalladamente en SAGE.`,
                    type: "warning"
                  });
                }
              }
            }
          }
        }
      }
      setSageAlerts(sage);
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
    }

    fetchConfigAndSageAlerts(activeProject);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("active-project-changed", handleActiveProject);
        window.removeEventListener("refresh-system", handleRefresh);
      }
    };
  }, [activeProject]);

  // Reload when the sidebar is opened
  useEffect(() => {
    if (sidebarOpen) {
      fetchConfigAndSageAlerts(activeProject);
    }
  }, [sidebarOpen, activeProject]);

  // Update global alert status dot (unifies everything!)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const total = conflicts.length + updates.length + configAlerts.length + sageAlerts.length;
      window.dispatchEvent(new CustomEvent("alert-status-changed", { detail: total > 0 }));
    }
  }, [conflicts.length, updates.length, configAlerts.length, sageAlerts.length]);

  return (
    <div 
      ref={sidebarRef}
      className={`fixed inset-y-0 right-0 w-[400px] z-[200] flex flex-col shadow-2xl transition-transform duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ 
        background: "var(--color-card)", 
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-headline flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          Centro de Alertas
          {(conflicts.length + updates.length + configAlerts.length + sageAlerts.length) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
              {conflicts.length + updates.length + configAlerts.length + sageAlerts.length}
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
          count={sageAlerts.length}
          alert={sageAlerts.some(a => a.type === "danger")}
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
          count={configAlerts.length}
          alert={configAlerts.some(a => a.type === "danger")}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* Empty State - Global */}
        {activeTab === "all" && conflicts.length === 0 && updates.length === 0 && sageAlerts.length === 0 && configAlerts.length === 0 && (
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
        {activeTab === "sage" && sageAlerts.length === 0 && (
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
        {activeTab === "config" && configAlerts.length === 0 && (
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

        {/* ──────── SAGE ALERTS SECTION ──────── */}
        {(activeTab === "all" || activeTab === "sage") && sageAlerts.length > 0 && (
          <AlertSection
            icon={<Activity className="w-4 h-4 text-indigo-400 animate-pulse" />}
            title="Diagnósticos de SAGE"
            count={sageAlerts.length}
            color="#818cf8"
          >
            <div className="flex flex-col gap-2">
              {sageAlerts.map((alert) => {
                const isDanger = alert.type === "danger";
                return (
                  <div 
                    key={alert.id} 
                    className="p-3 rounded-xl border animate-fade-in transition-all duration-300"
                    style={{ 
                      borderColor: isDanger ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", 
                      background: isDanger ? "rgba(239, 68, 68, 0.04)" : "rgba(245, 158, 11, 0.04)" 
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: isDanger ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)" }}
                      >
                        <AlertTriangle className={`w-4 h-4 ${isDanger ? 'text-red-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-headline text-xs font-bold ${isDanger ? 'text-red-300' : 'text-amber-300'}`}>
                          {alert.title}
                        </p>
                        <p className="text-[10px] mt-1 leading-relaxed text-foreground/70">{alert.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AlertSection>
        )}

        {/* ──────── UPDATES SECTION ──────── */}
        {(activeTab === "all" || activeTab === "updates") && updates.length > 0 && (
          <AlertSection
            icon={<RefreshCw className="w-4 h-4" />}
            title="Actualizaciones de Mods"
            count={updates.length}
            color="var(--color-accent)"
          >
            <div className="flex flex-col gap-2">
              {updates.map(([path, s]) => {
                const isCollection = path.startsWith("collection:");
                const mod = isCollection ? null : library.find(l => l.path === path);
                if (!isCollection && (!mod || ignoredUpdates.has(path))) return null;
                return (
                  <div 
                    key={path} 
                    className="p-3 rounded-xl border animate-fade-in"
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
                            {isCollection ? s.slug : (mod?.meta?.modName || mod?.fileName)}
                          </p>
                          {isCollection && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase shrink-0">Seguido</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {isCollection ? (
                            <span style={{ color: "var(--color-success)" }}>Nuevo: v{s.latestVersion}</span>
                          ) : (
                            <>
                              <span style={{ color: "var(--color-muted)" }}>v{mod?.meta?.modVersion}</span>
                              <span style={{ color: "var(--color-accent)" }}>→</span>
                              <span style={{ color: "var(--color-success)" }}>v{s.latestVersion}</span>
                            </>
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
                            onClick={() => handleDownloadUpdate(path, s.downloadUrl!, mod!.fileName.replace(mod!.meta?.modVersion ?? "", s.latestVersion!))}
                            disabled={downloadingMods[path]}
                            icon={downloadingMods[path] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                            label={downloadingMods[path] ? "Descargando..." : "Actualizar"}
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
              })}
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

        {/* ──────── CONFIG / SETTINGS SECTION ──────── */}
        {(activeTab === "all" || activeTab === "config") && configAlerts.length > 0 && (
          <AlertSection
            icon={<Settings className="w-4 h-4 text-purple-400" />}
            title="Alertas de Configuración"
            count={configAlerts.length}
            color="#a78bfa"
          >
            <div className="flex flex-col gap-2">
              {configAlerts.map((alert) => {
                const isDanger = alert.type === "danger";
                return (
                  <div 
                    key={alert.id} 
                    className="p-3 rounded-xl border animate-fade-in transition-all duration-300"
                    style={{ 
                      borderColor: isDanger ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", 
                      background: isDanger ? "rgba(239, 68, 68, 0.04)" : "rgba(245, 158, 11, 0.04)" 
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: isDanger ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)" }}
                      >
                        <FileWarning className={`w-4 h-4 ${isDanger ? 'text-red-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-headline text-xs font-bold ${isDanger ? 'text-red-300' : 'text-purple-300'}`}>
                          {alert.title}
                        </p>
                        <p className="text-[10px] mt-1 leading-relaxed text-foreground/70">{alert.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AlertSection>
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
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}

function AlertSection({ icon, title, count, color, children }: AlertSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-xs font-headline tracking-wider uppercase" style={{ color }}>
          {title}
        </h3>
        <span 
          className="ml-auto text-xs px-2 py-0.5 rounded-full" 
          style={{ background: "var(--color-secondary-bg)", color: "var(--color-muted)" }}
        >
          {count}
        </span>
      </div>
      {children}
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
