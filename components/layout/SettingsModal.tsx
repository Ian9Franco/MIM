"use client";

import React, { useState, useEffect } from "react";
import { Settings, Check, X, FolderSearch, MoveRight, Lock, Unlock, AlertTriangle, FolderOpen } from "lucide-react";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  
  const [sourceBase, setSourceBase] = useState("");
  const [buildsBase, setBuildsBase] = useState("");
  const [downloadsPath, setDownloadsPath] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moveProgress, setMoveProgress] = useState("");

  // Nuevos estados para seguridad y estética premium
  const [canEdit, setCanEdit] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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

  const handleReset = () => {
    if (originalSettings) {
      setSourceBase(originalSettings.sourceBase || "");
      setBuildsBase(originalSettings.buildsBase || "");
      setDownloadsPath(originalSettings.downloadsPath || "");
    }
    setCanEdit(false);
  };

  const checkHasChanges = () => {
    if (!originalSettings) return false;
    return (
      sourceBase !== originalSettings.sourceBase ||
      buildsBase !== originalSettings.buildsBase ||
      downloadsPath !== originalSettings.downloadsPath
    );
  };

  const handleCloseAttempt = () => {
    if (saving) return;
    if (checkHasChanges()) {
      setShowConfirmClose(true);
    } else {
      onClose();
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fade-in" 
        onClick={handleCloseAttempt} 
      />
      
      {/* Centered Premium Modal Wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative w-full max-w-2xl rounded-3xl pointer-events-auto p-8 animate-scale-in overflow-hidden shadow-2xl border border-primary/20"
          style={{ 
            background: "color-mix(in srgb, var(--color-card) 95%, transparent)", 
            backdropFilter: "blur(24px)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)" 
          }}
        >
          {/* Unsaved Changes Confirmation Overlay inside the modal */}
          {showConfirmClose && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#141416]/95 backdrop-blur-md animate-fade-in">
              <div 
                className="w-full max-w-sm rounded-2xl p-6 border border-primary/20 bg-card shadow-2xl text-center space-y-5 animate-scale-in"
                style={{ background: "var(--color-surface)" }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-headline text-base text-foreground">Cambios sin guardar</h4>
                  <p className="font-caption text-xs text-muted mt-1.5 leading-relaxed">
                    Modificaste las rutas de tus carpetas. ¿Querés guardar los cambios antes de salir o descartarlos?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      setShowConfirmClose(false);
                      await handleSave();
                    }}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs bg-primary text-background hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                  >
                    <Check className="w-3.5 h-3.5" /> Guardar y Salir
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmClose(false);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs border border-white/10 text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all"
                  >
                    Descartar cambios
                  </button>
                  <button
                    onClick={() => setShowConfirmClose(false)}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs text-muted hover:text-foreground transition-all"
                  >
                    Seguir editando
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
              <div>
                <h3 className="font-headline text-lg text-foreground leading-none">
                  Ajustes de Ubicaciones
                </h3>
                <p className="font-caption text-[11px] text-muted mt-1">
                  Gestioná los directorios principales del sistema
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Unlock / Lock Toggle Button */}
              {canEdit ? (
                <button 
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 transition-all text-xs font-subhead"
                  title="Bloquear edición y revertir cambios locales"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Bloquear
                </button>
              ) : (
                <button 
                  onClick={() => setCanEdit(true)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-subhead"
                  title="Habilitar edición de rutas"
                >
                  <Unlock className="w-3.5 h-3.5 animate-pulse" />
                  Editar Rutas
                </button>
              )}
              
              <button 
                onClick={handleCloseAttempt} 
                disabled={saving} 
                className="p-2 rounded-xl hover:bg-white/5 text-muted hover:text-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted font-caption flex flex-col items-center justify-center gap-3">
              <FolderOpen className="w-8 h-8 text-primary/40 animate-pulse" />
              Cargando directorios...
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Descargas */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-label text-muted text-[0.65rem] tracking-wider">
                    CARPETA DESCARGAS (DOWNLOADS)
                  </label>
                  {!canEdit && (
                    <span className="font-caption text-[10px] text-foreground/30 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Solo lectura
                    </span>
                  )}
                </div>
                <div className="relative flex items-center gap-3">
                  <div className="relative flex-1 flex items-center">
                    <FolderSearch className={`w-4 h-4 absolute left-3 pointer-events-none transition-colors duration-300 ${canEdit ? "text-primary" : "text-muted/40"}`} />
                    <input 
                      value={downloadsPath} 
                      onChange={e => setDownloadsPath(e.target.value)} 
                      className={`input-base w-full pr-4 text-sm font-mono transition-all duration-300 ${
                        canEdit 
                          ? "text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)]" 
                          : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                      }`} 
                      style={{ paddingLeft: "2.5rem" }}
                      disabled={saving || !canEdit}
                      placeholder="C:\Users\...\Downloads"
                    />
                  </div>
                  <button 
                    onClick={() => handlePickFolder(setDownloadsPath)}
                    disabled={saving || !canEdit}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-subhead transition-all duration-300 border ${
                      canEdit
                        ? "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
                        : "border-white/5 text-foreground/20 bg-white/1 cursor-not-allowed"
                    }`}
                  >
                    Examinar
                  </button>
                </div>
              </div>
              
              {/* Source */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-label text-muted text-[0.65rem] tracking-wider">
                    CARPETA SOURCE (PROYECTOS)
                  </label>
                  {!canEdit && (
                    <span className="font-caption text-[10px] text-foreground/30 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Solo lectura
                    </span>
                  )}
                </div>
                <div className="relative flex items-center gap-3">
                  <div className="relative flex-1 flex items-center">
                    <FolderSearch className={`w-4 h-4 absolute left-3 pointer-events-none transition-colors duration-300 ${canEdit ? "text-primary" : "text-muted/40"}`} />
                    <input 
                      value={sourceBase} 
                      onChange={e => setSourceBase(e.target.value)} 
                      className={`input-base w-full pr-4 text-sm font-mono transition-all duration-300 ${
                        canEdit 
                          ? "text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)]" 
                          : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                      }`} 
                      style={{ paddingLeft: "2.5rem" }}
                      disabled={saving || !canEdit}
                      placeholder="d:\.mine\source"
                    />
                  </div>
                  <button 
                    onClick={() => handlePickFolder(setSourceBase)}
                    disabled={saving || !canEdit}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-subhead transition-all duration-300 border ${
                      canEdit
                        ? "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
                        : "border-white/5 text-foreground/20 bg-white/1 cursor-not-allowed"
                    }`}
                  >
                    Examinar
                  </button>
                </div>
              </div>

              {/* Builds */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-label text-muted text-[0.65rem] tracking-wider">
                    CARPETA BUILDS (COMPILADOS)
                  </label>
                  {!canEdit && (
                    <span className="font-caption text-[10px] text-foreground/30 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Solo lectura
                    </span>
                  )}
                </div>
                <div className="relative flex items-center gap-3">
                  <div className="relative flex-1 flex items-center">
                    <FolderSearch className={`w-4 h-4 absolute left-3 pointer-events-none transition-colors duration-300 ${canEdit ? "text-primary" : "text-muted/40"}`} />
                    <input 
                      value={buildsBase} 
                      onChange={e => setBuildsBase(e.target.value)} 
                      className={`input-base w-full pr-4 text-sm font-mono transition-all duration-300 ${
                        canEdit 
                          ? "text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)]" 
                          : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                      }`} 
                      style={{ paddingLeft: "2.5rem" }}
                      disabled={saving || !canEdit}
                      placeholder="d:\.mine\builds"
                    />
                  </div>
                  <button 
                    onClick={() => handlePickFolder(setBuildsBase)}
                    disabled={saving || !canEdit}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-subhead transition-all duration-300 border ${
                      canEdit
                        ? "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
                        : "border-white/5 text-foreground/20 bg-white/1 cursor-not-allowed"
                    }`}
                  >
                    Examinar
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-primary/10 flex items-center justify-between">
                <div className="text-xs font-label text-accent animate-pulse">
                  {saving && moveProgress && (
                    <span className="flex items-center gap-2">
                      <MoveRight className="w-3.5 h-3.5" /> {moveProgress}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCloseAttempt}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-subhead text-muted hover:text-foreground transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving || !canEdit}
                    className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-subhead text-sm transition-all duration-300 shadow-lg ${
                      canEdit
                        ? "bg-primary text-background hover:opacity-90 shadow-primary/20 cursor-pointer"
                        : "bg-white/5 text-foreground/30 border border-white/5 cursor-not-allowed shadow-none"
                    }`}
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
