"use client";

import React, { useState, useEffect } from "react";
import { Settings, Check, X, FolderSearch, MoveRight } from "lucide-react";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  
  const [sourceBase, setSourceBase] = useState("");
  const [buildsBase, setBuildsBase] = useState("");
  const [downloadsPath, setDownloadsPath] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moveProgress, setMoveProgress] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setOriginalSettings(d);
        setSourceBase(d.sourceBase || "");
        setBuildsBase(d.buildsBase || "");
        setDownloadsPath(d.downloadsPath || "");
        setLoading(false);
      });
  }, []);

  const handlePickFolder = async (setter: React.Dispatch<React.SetStateAction<string>>) => {
    try {
      const res = await fetch("/api/settings/pick-folder");
      if (res.ok) {
        const data = await res.json();
        if (data.path) setter(data.path);
      }
    } catch (e) {
      console.error("No se pudo abrir el selector", e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Identificar cambios
    const changes = [];
    if (sourceBase !== originalSettings.sourceBase) changes.push({ name: "Source", old: originalSettings.sourceBase, new: sourceBase });
    if (buildsBase !== originalSettings.buildsBase) changes.push({ name: "Builds", old: originalSettings.buildsBase, new: buildsBase });
    if (downloadsPath !== originalSettings.downloadsPath) changes.push({ name: "Descargas", old: originalSettings.downloadsPath, new: downloadsPath });

    if (changes.length > 0) {
      const move = window.confirm(
        "Has cambiado las rutas de destino. ¿Deseas MUDAR los archivos existentes a las nuevas ubicaciones ahora mismo?\n\nSi eliges Cancelar, solo se guardarán las rutas sin mover tus archivos."
      );

      if (move) {
        for (const change of changes) {
          setMoveProgress(`Moviendo ${change.name}...`);
          await fetch("/api/settings/move-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourcePath: change.old, targetPath: change.new })
          });
        }
      }
    }

    setMoveProgress("Guardando ajustes...");
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceBase, buildsBase, downloadsPath })
    });
    
    setSaving(false);
    onClose();
    window.location.reload();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="w-full max-w-2xl rounded-2xl pointer-events-auto p-6 animate-scale-in"
          style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Ajustes de Ubicaciones
            </h3>
            <button onClick={onClose} disabled={saving} className="p-1 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted font-caption">Cargando...</div>
          ) : (
            <div className="space-y-5">
              
              {/* Descargas */}
              <div>
                <label className="block font-label text-muted mb-1.5 text-[0.65rem] tracking-wider">CARPETA DESCARGAS (DOWNLOADS)</label>
                <div className="relative flex items-center gap-2 group">
                  <div className="relative flex-1 flex items-center">
                    <FolderSearch className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
                    <input 
                      value={downloadsPath} 
                      onChange={e => setDownloadsPath(e.target.value)} 
                      className="input-base w-full pl-10 pr-4 text-sm font-mono text-foreground/80" 
                      disabled={saving}
                    />
                  </div>
                  <button 
                    onClick={() => handlePickFolder(setDownloadsPath)}
                    disabled={saving}
                    className="shrink-0 px-3 py-2 rounded-xl text-xs font-subhead transition-all border border-primary/20 text-primary hover:bg-primary/10"
                  >
                    Examinar
                  </button>
                </div>
              </div>
              
              {/* Source */}
              <div>
                <label className="block font-label text-muted mb-1.5 text-[0.65rem] tracking-wider">CARPETA SOURCE (PROYECTOS)</label>
                <div className="relative flex items-center gap-2 group">
                  <div className="relative flex-1 flex items-center">
                    <FolderSearch className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
                    <input 
                      value={sourceBase} 
                      onChange={e => setSourceBase(e.target.value)} 
                      className="input-base w-full pl-10 pr-4 text-sm font-mono text-foreground/80" 
                      disabled={saving}
                    />
                  </div>
                  <button 
                    onClick={() => handlePickFolder(setSourceBase)}
                    disabled={saving}
                    className="shrink-0 px-3 py-2 rounded-xl text-xs font-subhead transition-all border border-primary/20 text-primary hover:bg-primary/10"
                  >
                    Examinar
                  </button>
                </div>
              </div>

              {/* Builds */}
              <div>
                <label className="block font-label text-muted mb-1.5 text-[0.65rem] tracking-wider">CARPETA BUILDS (COMPILADOS)</label>
                <div className="relative flex items-center gap-2 group">
                  <div className="relative flex-1 flex items-center">
                    <FolderSearch className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
                    <input 
                      value={buildsBase} 
                      onChange={e => setBuildsBase(e.target.value)} 
                      className="input-base w-full pl-10 pr-4 text-sm font-mono text-foreground/80" 
                      disabled={saving}
                    />
                  </div>
                  <button 
                    onClick={() => handlePickFolder(setBuildsBase)}
                    disabled={saving}
                    className="shrink-0 px-3 py-2 rounded-xl text-xs font-subhead transition-all border border-primary/20 text-primary hover:bg-primary/10"
                  >
                    Examinar
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 flex items-center justify-between">
                <div className="text-xs font-label text-accent animate-pulse">
                  {saving && moveProgress && (
                    <span className="flex items-center gap-2">
                      <MoveRight className="w-3.5 h-3.5" /> {moveProgress}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-sm font-subhead text-muted hover:text-foreground transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-subhead text-sm transition-all bg-primary text-background hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    <Check className="w-4 h-4" /> Guardar y Recargar
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
