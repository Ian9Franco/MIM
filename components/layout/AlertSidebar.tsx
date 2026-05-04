import React from "react";
import { X, Bell, CheckCircle, AlertTriangle, ArrowUpCircle } from "lucide-react";

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
  handleDismissUpdate
}: AlertSidebarProps) {
  const updates = Object.entries(modrinthStatus).filter(([_, s]) => s.status === "update_available");
  
  return (
    <div 
      className={`fixed inset-y-0 right-0 w-[400px] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ background: "color-mix(in srgb, var(--color-card) 98%, transparent)", borderLeft: "1px solid var(--color-border-strong)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-headline flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
          <Bell className="w-5 h-5 text-[var(--color-primary)]" />
          Centro de Alertas
        </h2>
        <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-white/10" style={{ color: "var(--color-muted)" }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
        {conflicts.length === 0 && Object.entries(modrinthStatus).filter(([p, s]) => s.status === "update_available" && !ignoredUpdates.has(p)).length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-[var(--color-accent)] opacity-50" />
            <p className="font-subhead">Todo al día</p>
            <p className="text-xs mt-1">No hay conflictos ni actualizaciones pendientes.</p>
          </div>
        ) : (
          <>
            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div>
                <h3 className="text-xs font-headline tracking-wider uppercase mb-3" style={{ color: "#f87171" }}>
                  Duplicados detectados ({conflicts.length})
                </h3>
                <div className="flex flex-col gap-3">
                  {conflicts.map((c, idx) => (
                    <div key={idx} className="p-4 rounded-xl border bg-white/5" style={{ borderColor: "rgba(248,113,113,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-[#f87171]" />
                        <span className="font-subhead text-sm text-[#f87171]">{c.oldFile.meta?.modName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="opacity-70">Vieja: v{c.oldFile.meta?.modVersion}</div>
                        <div className="text-[#66C8A0]">Nueva: v{c.newFile.meta?.modVersion}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleResolveConflict(c, true)} className="flex-1 py-1.5 rounded-lg bg-[#f87171]/20 hover:bg-[#f87171]/30 text-[#f87171] text-xs font-subhead transition-colors">
                          Reemplazar
                        </button>
                        <button onClick={() => handleResolveConflict(c, false)} className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs font-subhead transition-colors">
                          Ignorar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Updates */}
            {Object.entries(modrinthStatus).filter(([p, s]) => s.status === "update_available" && !ignoredUpdates.has(p)).length > 0 && (
              <div>
                <h3 className="text-xs font-headline tracking-wider uppercase mb-3 text-[#FFD066]">
                  Actualizaciones Disponibles ({Object.entries(modrinthStatus).filter(([p, s]) => s.status === "update_available" && !ignoredUpdates.has(p)).length})
                </h3>
                <div className="flex flex-col gap-3">
                  {Object.entries(modrinthStatus)
                    .filter(([p, s]) => s.status === "update_available" && !ignoredUpdates.has(p))
                    .map(([path, s]) => {
                      const mod = library.find(l => l.path === path);
                      if (!mod) return null;
                      return (
                        <div key={path} className="p-4 rounded-xl border bg-white/5" style={{ borderColor: "rgba(255,208,102,0.2)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowUpCircle className="w-4 h-4 text-[#FFD066]" />
                            <span className="font-subhead text-sm text-[#FFD066]">{mod.meta?.modName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div className="opacity-70">Actual: v{mod.meta?.modVersion}</div>
                            <div className="text-[#66C8A0]">Nueva: v{s.latestVersion}</div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleDownloadUpdate(path, s.downloadUrl!, mod.fileName.replace(mod.meta?.modVersion ?? "", s.latestVersion!))}
                              disabled={downloadingMods[path]}
                              className="flex-1 py-2 rounded-xl bg-[#FFD066]/20 hover:bg-[#FFD066]/30 text-[#FFD066] text-xs font-subhead transition-colors disabled:opacity-50"
                            >
                              {downloadingMods[path] ? "Descargando..." : "Descargar"}
                            </button>
                            <button 
                              onClick={() => handleDismissUpdate(path)}
                              className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-xs font-subhead transition-colors"
                            >
                              Ignorar
                            </button>
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
