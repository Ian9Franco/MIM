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
import { TabButton, AlertSection, ActionButton, UpdateCard, EmptyState, IncidentCard } from "./AlertSidebarComponents";

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

  useEffect(() => {
    const load = () => {
      try {
        setFollowedMods(JSON.parse(localStorage.getItem("mim_followed_mods") || "[]"));
        setFollowedAuthors(JSON.parse(localStorage.getItem("mim_followed_authors") || "[]"));
      } catch {}
    };
    load();
    window.addEventListener("mim-followed-mods-changed", load);
    window.addEventListener("mim-followed-authors-changed", load);
    return () => { window.removeEventListener("mim-followed-mods-changed", load); window.removeEventListener("mim-followed-authors-changed", load); };
  }, []);

  const { 
    activeTab, setActiveTab, activeProject, incidents, setIncidents, 
    modUpdates, collectionUpdates, shaderUpdates, resourcePackUpdates, 
    newAuthorMods, handleMarkSeen 
  } = useAlertManager(sidebarOpen, library, modrinthStatus, followedMods, followedAuthors, ignoredUpdates);

  const updates = [...modUpdates, ...collectionUpdates, ...shaderUpdates, ...resourcePackUpdates, ...newAuthorMods.map(m => [m.path, { ...m, status: "update_available" }])];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        if ((e.target as HTMLElement).closest('[data-sidebar-toggle="true"]') || (e.target as HTMLElement).closest('[data-header-toggle="true"]')) return;
        setSidebarOpen(false);
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
    <div ref={sidebarRef} className={`fixed inset-y-0 right-0 w-[400px] z-[200] flex flex-col shadow-2xl transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${sidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`} style={{ background: "var(--glass-bg)", borderLeft: "1px solid var(--glass-border)", backdropFilter: "var(--liquid-blur)", boxShadow: "var(--shadow-drop)", borderRadius: "2rem 0 0 2rem" }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-headline flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--color-primary)" }} /> Centro de Alertas
          {(conflicts.length + updates.length + incidents.length) > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>{conflicts.length + updates.length + incidents.length}</span>}
        </h2>
        <div className="flex items-center gap-2">
          {handleCheckUpdates && <button onClick={handleCheckUpdates} disabled={checkingUpdates} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)", border: "1px solid var(--color-accent-border)" }}><RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? "animate-spin" : ""}`} /> <span>{checkingUpdates ? "Buscando..." : "Buscar Updates"}</span></button>}
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: "var(--color-muted)" }}><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: "var(--color-border)" }}>
        <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} icon={<Info className="w-3.5 h-3.5" />} label="Todas" count={conflicts.length + updates.length + incidents.length} />
        <TabButton active={activeTab === "sage"} onClick={() => setActiveTab("sage")} icon={<Activity className="w-3.5 h-3.5" />} label="SAGE" count={incidents.filter(i => i.status === "active" && i.module === "SAGE").length} alert={incidents.some(i => i.status === "active" && i.module === "SAGE" && i.severity === "danger")} />
        <TabButton active={activeTab === "updates"} onClick={() => setActiveTab("updates")} icon={<RefreshCw className="w-3.5 h-3.5" />} label="Updates" count={updates.length} />
        <TabButton active={activeTab === "conflicts"} onClick={() => setActiveTab("conflicts")} icon={<FileWarning className="w-3.5 h-3.5" />} label="Conflictos" count={conflicts.length} />
        <TabButton active={activeTab === "config"} onClick={() => setActiveTab("config")} icon={<Settings className="w-3.5 h-3.5" />} label="Ajustes" count={incidents.filter(i => i.status === "active" && i.module === "CONFIG").length} alert={incidents.some(i => i.status === "active" && i.module === "CONFIG" && i.severity === "danger")} />
        <TabButton active={activeTab === "bytecode"} onClick={() => setActiveTab("bytecode")} icon={<Binary className="w-3.5 h-3.5" />} label="Bytecode" count={bytecodeConflicts?.totalConflicts || 0} alert={(bytecodeConflicts?.highRiskConflicts || 0) > 0} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-40 min-h-0">
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
    </div>
  );
}
