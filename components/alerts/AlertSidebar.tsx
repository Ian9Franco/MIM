/**
 * MIM — Alert Center Sidebar
 * Optimized for v5.9: Components and logic extracted to separate files.
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  X, Bell, CheckCircle, AlertTriangle, Shield, Package, RefreshCw, 
  FileWarning, Info, Settings, ShieldAlert, ShieldX, History, Activity, Binary, Sparkles
} from "lucide-react";
import { incidentManager } from "@/lib/incidentManager";
import { useAlertManager } from "@/hooks/useAlertManager";
import { mimDB } from "@/lib/indexeddb";
import { TabButton, AlertSection, ActionButton, UpdateCard, EmptyState, IncidentCard } from "./AlertSidebarComponents";
import { OnboardingTour } from "@/components/ui/OnboardingTour";

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
  bytecodeConflicts?: any;
}

export function AlertSidebar({
  sidebarOpen, setSidebarOpen, conflicts, bytecodeConflicts, modrinthStatus, library,
  downloadingMods, ignoredUpdates, handleResolveConflict, handleDownloadUpdate, handleDismissUpdate,
  checkingUpdates, handleCheckUpdates
}: AlertSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [followedMods, setFollowedMods] = useState<any[]>([]);
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding_alrt");
    const guidesEnabled = localStorage.getItem("guides_enabled") === "true";
    if (sidebarOpen && (!seen || guidesEnabled)) {
      setShowOnboarding(true);
    } else if (!sidebarOpen) {
      setShowOnboarding(false);
    }
  }, [sidebarOpen]);

  const onboardingSteps = [
    {
      target: '#onboarding-alrt-tabs',
      title: 'Secciones de Alertas',
      content: 'Desde acá podés filtrar las alertas por categoría: SAGE (logs), Updates, Conflictos de archivos, Ajustes y Bytecode.'
    },
    {
      target: '#onboarding-alrt-content',
      title: 'Contenido de Alertas',
      content: 'Acá vas a ver el listado de todas las alertas activas. Podés resolver conflictos, actualizar mods o limpiar el historial.'
    }
  ];

  useEffect(() => {
    const load = async () => {
      try {
        await mimDB.init();
        const mods = await mimDB.getAllFollowedMods();
        const authors = await mimDB.getAllFollowedAuthors();
        
        setFollowedMods(mods.map((m: any) => m.data));
        setFollowedAuthors(authors.map((a: any) => a.name));
      } catch (err) {
        console.error("Error loading followed data in AlertSidebar", err);
      }
    };
    load();
    
    const handleEvent = () => { load(); };
    
    window.addEventListener("mim-followed-mods-changed", handleEvent);
    window.addEventListener("mim-followed-authors-changed", handleEvent);
    return () => { 
      window.removeEventListener("mim-followed-mods-changed", handleEvent); 
      window.removeEventListener("mim-followed-authors-changed", handleEvent); 
    };
  }, []);

  const { 
    activeTab, setActiveTab, activeProject, incidents, setIncidents, 
    modUpdates, collectionUpdates, shaderUpdates, resourcePackUpdates, 
    newAuthorMods, handleMarkSeen 
  } = useAlertManager(sidebarOpen, library, modrinthStatus, followedMods, followedAuthors, ignoredUpdates);

  const updates = [...modUpdates, ...collectionUpdates, ...shaderUpdates, ...resourcePackUpdates, ...newAuthorMods.map(m => [m.path, { ...m, status: "update_available" }])];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(target)) {
        // Prevent closing if we clicked a toggle button or another sidebar/overlay
        if (target.closest('[data-sidebar-toggle="true"]') || 
            target.closest('[data-header-toggle="true"]') ||
            target.closest('.fomo-sidebar') ||
            target.closest('.lightbox-overlay') ||
            target.closest('.onboarding-tooltip')) return;
            
        setSidebarOpen(false);
        window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: false }));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen, setSidebarOpen]);

  const renderUpdates = (list: [string, any][], type: any) => (
    <div className="flex flex-col gap-2">
      {list.map(([path, s]) => (
        <UpdateCard key={path} path={path} s={s} type={type} library={library} downloadingMods={downloadingMods} handleDownloadUpdate={handleDownloadUpdate} handleDismissUpdate={handleDismissUpdate} handleMarkSeen={handleMarkSeen} setSidebarOpen={setSidebarOpen} />
      ))}
    </div>
  );

  return (
    <aside 
      ref={sidebarRef} 
      className={`fixed inset-y-0 right-0 w-[450px] z-[200] flex flex-col shadow-2xl transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-r-0 ${sidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`} 
      style={{ 
        background: "var(--glass-bg)", 
        borderColor: "var(--color-border)", 
        borderLeftColor: "color-mix(in srgb, var(--color-primary) 22%, transparent)",
        backdropFilter: "blur(40px)", 
        boxShadow: `-24px 0 60px rgba(0,0,0,0.45), inset 1px 0 0 color-mix(in srgb, var(--color-primary) 10%, transparent)`, 
        borderRadius: "2.5rem 0 0 2.5rem" 
      }}
    >
      {/* Accent Top Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] opacity-60 z-10" style={{ background: `linear-gradient(90deg, transparent, var(--color-primary), transparent)` }} />
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-headline flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--color-primary)" }} /> Centro de Alertas
          {(conflicts.length + updates.length + incidents.length) > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>{conflicts.length + updates.length + incidents.length}</span>}
        </h2>
        <div className="flex items-center gap-2">
          {activeTab === "sage" && (
            <button 
              onClick={async () => {
                const sageIncidents = incidents.filter(i => i.module === "SAGE" && i.status === "active");
                for (const inc of sageIncidents) {
                  await incidentManager.resolveIncident(inc.id);
                }
                setIncidents(await incidentManager.getIncidents("active"));
              }} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105" 
              style={{ background: "rgba(239, 68, 68, 0.1)", color: "rgb(239, 68, 68)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> <span>Limpiar Todo</span>
            </button>
          )}
          {handleCheckUpdates && activeTab === "updates" && <button onClick={handleCheckUpdates} disabled={checkingUpdates} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)", border: "1px solid var(--color-accent-border)" }}><RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? "animate-spin" : ""}`} /> <span>{checkingUpdates ? "Buscando..." : "Buscar Updates"}</span></button>}
          <button onClick={() => { setSidebarOpen(false); window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: false })); }} className="p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: "var(--color-muted)" }}><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div id="onboarding-alrt-tabs" className="flex items-center gap-1 p-2 border-b overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ borderColor: "var(--color-border)" }}>
        <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} icon={<Info className="w-3.5 h-3.5" />} label="Todas" count={conflicts.length + updates.length + incidents.length} />
        <TabButton active={activeTab === "sage"} onClick={() => setActiveTab("sage")} icon={<Activity className="w-3.5 h-3.5" />} label="SAGE" count={incidents.filter(i => i.status === "active" && i.module === "SAGE").length} alert={incidents.some(i => i.status === "active" && i.module === "SAGE" && i.severity === "danger")} />
        <TabButton active={activeTab === "updates"} onClick={() => setActiveTab("updates")} icon={<RefreshCw className="w-3.5 h-3.5" />} label="Updates" count={updates.length} />
        <TabButton active={activeTab === "conflicts"} onClick={() => setActiveTab("conflicts")} icon={<FileWarning className="w-3.5 h-3.5" />} label="Conflictos" count={conflicts.length} />
        <TabButton active={activeTab === "config"} onClick={() => setActiveTab("config")} icon={<Settings className="w-3.5 h-3.5" />} label="Ajustes" count={incidents.filter(i => i.status === "active" && i.module === "CONFIG").length} alert={incidents.some(i => i.status === "active" && i.module === "CONFIG" && i.severity === "danger")} />
        <TabButton active={activeTab === "bytecode"} onClick={() => setActiveTab("bytecode")} icon={<Binary className="w-3.5 h-3.5" />} label="Bytecode" count={bytecodeConflicts?.totalConflicts || 0} alert={(bytecodeConflicts?.highRiskConflicts || 0) > 0} />
      </div>

      <div id="onboarding-alrt-content" className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-40 min-h-0">
        {activeTab === "all" && conflicts.length === 0 && updates.length === 0 && incidents.filter(i => i.status === "active").length === 0 && <EmptyState icon={CheckCircle} title="Todo al día" desc="No hay alertas de ningún tipo en tu sistema" />}
        {activeTab === "sage" && incidents.filter(i => i.status === "active" && i.module === "SAGE").length === 0 && <EmptyState icon={Activity} title="SAGE: Todo en Orden" desc="No se han detectado amenazas críticas." color="#66C8A0" />}
        {activeTab === "config" && incidents.filter(i => i.status === "active" && i.module === "CONFIG").length === 0 && <EmptyState icon={Settings} title="Ajustes Correctos" desc="Todas las rutas son funcionales." color="#BB96E4" />}

        {(activeTab === "all" || activeTab === "sage" || activeTab === "config") && ["SAGE", "CONFIG", "SYSTEM"].map(mod => {
          const modIncidents = incidents.filter(i => i.status === "active" && i.module === mod);
          if (modIncidents.length === 0 || (activeTab === "sage" && mod !== "SAGE") || (activeTab === "config" && mod !== "CONFIG")) return null;
          const infoMap: Record<string, any> = { SAGE: { i: <Activity className="w-4 h-4" />, t: "Diagnósticos SAGE", c: "#818cf8" }, CONFIG: { i: <Settings className="w-4 h-4" />, t: "Ajustes", c: "#a78bfa" }, SYSTEM: { i: <Shield className="w-4 h-4" />, t: "Sistema", c: "#fb7185" } };
          const info = infoMap[mod];
          return (
            <AlertSection key={mod} icon={info.i} title={info.t} count={modIncidents.length} color={info.c}>
              {modIncidents.map(inc => (
                <IncidentCard 
                  key={inc.id} 
                  inc={inc} 
                  onResolve={async (id) => { await incidentManager.resolveIncident(id); setIncidents(await incidentManager.getIncidents("active")); }} 
                  onViewSage={() => { setSidebarOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent("sage-toggle", { detail: true })), 150); }} 
                />
              ))}
            </AlertSection>
          );
        })}

        {(activeTab === "all" || activeTab === "updates") && (
          <>
            {modUpdates.length > 0 && <AlertSection icon={<RefreshCw className="w-4 h-4" />} title="Mods" count={modUpdates.length} color="var(--color-accent)">{renderUpdates(modUpdates, "mod")}</AlertSection>}
            {collectionUpdates.length > 0 && <AlertSection icon={<RefreshCw className="w-4 h-4" />} title="Seguidos" count={collectionUpdates.length} color="var(--color-primary)">{renderUpdates(collectionUpdates, "collection")}</AlertSection>}
          </>
        )}

        {(activeTab === "all" || activeTab === "bytecode") && bytecodeConflicts && bytecodeConflicts.conflicts.length > 0 && (() => {
          // Contar combinaciones de mods para el resumen
          const pairCounts = new Map<string, { mods: string[], count: number }>();
          bytecodeConflicts.conflicts.forEach((c: any) => {
            const modNames = c.mods.map((m: any) => m.modName).sort();
            const key = modNames.join(' & ');
            if (!pairCounts.has(key)) {
              pairCounts.set(key, { mods: modNames, count: 0 });
            }
            pairCounts.get(key)!.count++;
          });
          
          const sortedPairs = Array.from(pairCounts.values()).sort((a, b) => b.count - a.count);

          return (
            <>
              {sortedPairs.length > 0 && (
                <div className="p-3.5 mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200/80 animate-fade-in">
                  <p className="font-bold mb-2 text-amber-400 flex items-center gap-1.5">
                    <span className="text-sm">🛡️</span> Portero de Bytecode
                  </p>
                  <div className="space-y-2">
                    {sortedPairs.map((pair, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <div className="flex items-start gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${pair.count > 10 ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <p className="leading-normal">
                            {pair.mods.map((mod: string, i: number) => (
                              <React.Fragment key={i}>
                                <span className="text-white font-bold">{mod}</span>
                                {i < pair.mods.length - 1 && (i === pair.mods.length - 2 ? " y " : ", ")}
                              </React.Fragment>
                            ))}{" "}
                            {pair.count > 10 ? "tienen un conflicto masivo" : "chocan"} en{" "}
                            <span className="text-white font-bold">{pair.count}</span> {pair.count === 1 ? "clase" : "clases"}.
                          </p>
                        </div>
                        <p className="text-[10px] opacity-70 ml-3">
                          {pair.count > 10 
                            ? "❌ Son incompatibles o duplicados (ej: mismos mods en distintos loaders). Se recomienda dejar solo uno."
                            : "⚠️ Modifican la misma lógica. Podría haber inestabilidad o mal funcionamiento según cuál cargue primero."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <AlertSection icon={<Binary className="w-4 h-4" />} title="Conflictos de Bytecode" count={bytecodeConflicts.conflicts.length} color="#818cf8" defaultOpen={false}>
                {bytecodeConflicts.conflicts.map((c: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border animate-fade-in" style={{ borderColor: c.riskScore > 70 ? "var(--color-danger-border)" : "var(--color-border)", background: c.riskScore > 70 ? "var(--color-danger-bg)" : "rgba(129,138,248,0.05)" }}>
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.riskScore > 70 ? "var(--color-danger-hover)" : "rgba(129,138,248,0.1)" }}>
                        <Binary className="w-4 h-4" style={{ color: c.riskScore > 70 ? "var(--color-danger)" : "#818cf8" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-subhead text-xs truncate text-white/90" title={c.targetClass}>{c.targetClass.split('.').pop()}</p>
                        <p className="text-[10px] text-white/40 truncate">{c.targetClass}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.mods.map((m: any, j: number) => (
                            <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/60">
                              {m.modName}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={`text-xs font-bold ${c.riskScore > 70 ? "text-red-400" : "text-amber-400"}`}>
                        {c.riskScore}%
                      </div>
                    </div>
                  </div>
                ))}
              </AlertSection>
            </>
          );
        })()}

        {(activeTab === "all" || activeTab === "conflicts") && conflicts.length > 0 && (
          <AlertSection icon={<FileWarning className="w-4 h-4" />} title="Conflictos" count={conflicts.length} color="var(--color-danger)">
            {conflicts.map((c, i) => (
              <div key={i} className="p-3 rounded-xl border animate-fade-in" style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-bg)" }}>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-danger-hover)" }}><AlertTriangle className="w-4 h-4" style={{ color: "var(--color-danger)" }} /></div>
                  <div className="flex-1 min-w-0"><p className="font-subhead text-sm truncate">{c.oldFile.meta?.modName}</p><div className="flex items-center gap-2 mt-1 text-xs"><span style={{ color: "var(--color-muted)" }}>v{c.oldFile.meta?.modVersion}</span> <span style={{ color: "var(--color-danger)" }}>vs</span> <span style={{ color: "var(--color-success)" }}>v{c.newFile.meta?.modVersion}</span></div></div>
                </div>
                <div className="flex gap-2 mt-3"><ActionButton primary danger onClick={() => handleResolveConflict(c, true)} icon={<RefreshCw className="w-3.5 h-3.5" />} label="Reemplazar" /><ActionButton onClick={() => handleResolveConflict(c, false)} label="Ignorar" /></div>
              </div>
            ))}
          </AlertSection>
        )}
      </div>

      {showOnboarding && (
        <OnboardingTour 
          steps={onboardingSteps} 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem("onboarding_alrt", "true");
          }} 
        />
      )}
    </aside>
  );
}
