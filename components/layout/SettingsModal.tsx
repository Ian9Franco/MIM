"use client";

import React, { useState, useEffect } from "react";
import { Settings, Check, X, FolderSearch, MoveRight, Lock, Unlock, AlertTriangle, FolderOpen, RefreshCw, Package, KeyRound, Eye, EyeOff } from "lucide-react";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  
  const [sourceBase, setSourceBase] = useState("");
  const [buildsBase, setBuildsBase] = useState("");
  const [downloadsPath, setDownloadsPath] = useState("");
  const [minecraftPath, setMinecraftPath] = useState("");
  const [stagingPath, setStagingPath] = useState("");
  
  // Claves de API y Conectividad
  const [modrinthApiKey, setModrinthApiKey] = useState("");
  const [curseforgeApiKey, setCurseforgeApiKey] = useState("");
  const [virusTotalApiKey, setVirusTotalApiKey] = useState("");
  
  const [showModrinth, setShowModrinth] = useState(false);
  const [showCurseforge, setShowCurseforge] = useState(false);
  const [showVirusTotal, setShowVirusTotal] = useState(false);
  const [activeTab, setActiveTab] = useState<"paths" | "apiKeys">("paths");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moveProgress, setMoveProgress] = useState("");

  // Nuevos estados para seguridad y estética premium
  const [canEdit, setCanEdit] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pathValidation, setPathValidation] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [showStagingWarning, setShowStagingWarning] = useState<{ pathName: string; stagingPath: string } | null>(null);
  const [pathPickWarning, setPathPickWarning] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar ajustes");
        return r.json();
      })
      .then((d) => {
        setOriginalSettings(d);
        setSourceBase(d.sourceBase || "");
        setBuildsBase(d.buildsBase || "");
        setDownloadsPath(d.downloadsPath || "");
        setMinecraftPath(d.minecraftPath || "");
        setStagingPath(d.stagingPath || "");
        setModrinthApiKey(d.modrinthApiKey || "");
        setCurseforgeApiKey(d.curseforgeApiKey || "");
        setVirusTotalApiKey(d.virusTotalApiKey || "");
        setLoading(false);
        
        // Validar inicialmente
        validatePaths([
          d.sourceBase, d.buildsBase, d.downloadsPath, d.minecraftPath, d.stagingPath
        ]);
      });
  }, []);

  const validatePaths = async (paths: string[]) => {
    setIsValidating(true);
    try {
      const res = await fetch("/api/settings/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: paths.filter(Boolean) })
      });
      if (res.ok) {
        const { results } = await res.json();
        setPathValidation(results);
        
        // Si hay alguna ruta inválida, habilitar edición automáticamente
        const hasInvalid = Object.values(results).some(v => v === false);
        if (hasInvalid) setCanEdit(true);
      }
    } catch (e) {
      console.error("Error validando rutas", e);
    }
    setIsValidating(false);
  };

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        validatePaths([sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath, loading]);

  const handlePickFolder = async (setter: React.Dispatch<React.SetStateAction<string>>, isMinecraft = false, currentPath = "") => {
    // Si la ruta no es válida (está en rojo), avisamos antes de abrir el selector del sistema
    if (pathValidation[currentPath] === false) {
      const message = isMinecraft 
        ? "No se detectó la carpeta de Minecraft en tu sistema.\n\nPara que MIM pueda gestionar tus mods y analizar errores, necesitás tener el juego instalado. ¿Deseas buscar la carpeta manualmente de todas formas?"
        : "La carpeta configurada no existe actualmente en el disco.\n\n¿Deseas abrir el explorador para seleccionar una ubicación válida?";
        
      setPathPickWarning({
        message,
        onConfirm: () => {
          setPathPickWarning(null);
          // Llamamos recursivamente pero saltando la validación esta vez
          executePick(setter, currentPath);
        }
      });
      return;
    }

    await executePick(setter, currentPath);
  };

  const executePick = async (setter: React.Dispatch<React.SetStateAction<string>>, currentPath = "") => {
    try {
      const url = currentPath 
        ? `/api/settings/pick-folder?initialPath=${encodeURIComponent(currentPath)}` 
        : "/api/settings/pick-folder";
        
      const res = await fetch(url);
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
      setMinecraftPath(originalSettings.minecraftPath || "");
      setStagingPath(originalSettings.stagingPath || "");
      setModrinthApiKey(originalSettings.modrinthApiKey || "");
      setCurseforgeApiKey(originalSettings.curseforgeApiKey || "");
      setVirusTotalApiKey(originalSettings.virusTotalApiKey || "");
    }
    setCanEdit(false);
  };

  const checkHasChanges = () => {
    if (!originalSettings) return false;
    return (
      sourceBase !== originalSettings.sourceBase ||
      buildsBase !== originalSettings.buildsBase ||
      downloadsPath !== originalSettings.downloadsPath ||
      minecraftPath !== originalSettings.minecraftPath ||
      stagingPath !== originalSettings.stagingPath ||
      modrinthApiKey !== (originalSettings.modrinthApiKey || "") ||
      curseforgeApiKey !== (originalSettings.curseforgeApiKey || "") ||
      virusTotalApiKey !== (originalSettings.virusTotalApiKey || "")
    );
  };

  const handleCloseAttempt = () => {
    if (saving) return;

    // Comprobar si todas las rutas actuales son válidas
    const currentPaths = [sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath];
    const hasInvalid = currentPaths.some(p => pathValidation[p] === false);

    if (hasInvalid) {
      // Si la ruta inválida es la de Minecraft, mostramos el aviso de staging
      if (pathValidation[minecraftPath] === false) {
        setShowStagingWarning({ pathName: "Minecraft (.minecraft)", stagingPath: stagingPath });
      } else {
        alert("No podés cerrar los ajustes hasta que todas las rutas sean válidas.");
      }
      setCanEdit(true);
      return;
    }

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
    if (minecraftPath !== originalSettings.minecraftPath) changes.push({ name: "Minecraft", old: originalSettings.minecraftPath, new: minecraftPath });
    if (stagingPath !== originalSettings.stagingPath) changes.push({ name: "Staging", old: originalSettings.stagingPath, new: stagingPath });

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
      body: JSON.stringify({ 
        sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath,
        modrinthApiKey, curseforgeApiKey, virusTotalApiKey,
        validated: true 
      })
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
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
              <div 
                className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl text-center space-y-5 animate-scale-in"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-headline text-base text-foreground">Cambios sin guardar</h4>
                  <p className="font-caption text-xs text-muted mt-1.5 leading-relaxed">
                    Modificaste los ajustes de MIM. ¿Querés guardar los cambios antes de salir o descartarlos?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      setShowConfirmClose(false);
                      await handleSave();
                    }}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs bg-primary text-white hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                  >
                    <Check className="w-3.5 h-3.5" /> Guardar y Salir
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmClose(false);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs border text-foreground/80 hover:bg-hover transition-all"
                    style={{ borderColor: "var(--color-border)" }}
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

          {/* Staging Warning Overlay */}
          {showStagingWarning && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
              <div 
                className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl text-center space-y-5 animate-scale-in"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                  <Package className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-headline text-base text-foreground">Ruta de {showStagingWarning.pathName} no válida</h4>
                  <p className="font-caption text-xs text-muted mt-2 leading-relaxed">
                    Estás por salir sin definir una ruta válida. Los archivos que deberían ir ahí (como shaders o resourcepacks) se almacenarán temporalmente en:
                  </p>
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 font-mono text-[10px] break-all text-amber-500 font-semibold">
                    {showStagingWarning.stagingPath}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setShowStagingWarning(null);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs bg-amber-500 text-white hover:opacity-90 transition-all shadow-lg shadow-amber-500/10"
                  >
                    Entendido, salir de todas formas
                  </button>
                  <button
                    onClick={() => setShowStagingWarning(null)}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs border text-foreground/80 hover:bg-hover transition-all"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    Volver y corregir ruta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Path Pick Warning Overlay */}
          {pathPickWarning && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
              <div 
                className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl text-center space-y-5 animate-scale-in"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                  <FolderSearch className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-headline text-base text-foreground">Aviso de Ubicación</h4>
                  <p className="font-caption text-xs text-muted mt-2 leading-relaxed whitespace-pre-line">
                    {pathPickWarning.message}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={pathPickWarning.onConfirm}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs bg-primary text-white hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                  >
                    Buscar manualmente
                  </button>
                  <button
                    onClick={() => setPathPickWarning(null)}
                    className="w-full py-2.5 rounded-xl font-subhead text-xs border text-foreground/80 hover:bg-hover transition-all"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    Cancelar
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
                  Ajustes de Sistema
                </h3>
                <p className="font-caption text-[11px] text-muted mt-1">
                  Gestioná los directorios del juego y del sistema
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
              
              {/* Pestañas de Navegación Premium */}
              <div className="flex border-b border-white/5 pb-2 mb-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("paths")}
                  className={`pb-2.5 px-4 text-xs font-headline tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === "paths"
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  RUTAS DEL SISTEMA
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("apiKeys")}
                  className={`pb-2.5 px-4 text-xs font-headline tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === "apiKeys"
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  CONECTIVIDAD (KEYS)
                </button>
              </div>

              {/* Contenedor con Scroll para prevenir desbordes en pantallas chicas */}
              <div className="max-h-[350px] overflow-y-auto pr-2 space-y-6 scrollbar-thin">
                {activeTab === "paths" ? (
                  <div className="space-y-5">
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
                                ? `text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)] ${pathValidation[downloadsPath] === false ? "border-red-500/50 bg-red-500/5" : ""}` 
                                : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                            }`} 
                            style={{ paddingLeft: "2.5rem" }}
                            disabled={saving || !canEdit}
                            placeholder="C:\Users\...\Downloads"
                          />
                          {pathValidation[downloadsPath] === false && (
                            <div className="absolute right-3 text-red-500 animate-pulse">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePickFolder(setDownloadsPath, false, downloadsPath)}
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

                    {/* Minecraft Path */}
                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-label text-muted text-[0.65rem] tracking-wider">
                          CARPETA DEL JUEGO (.MINECRAFT)
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
                            value={minecraftPath} 
                            onChange={e => setMinecraftPath(e.target.value)} 
                            className={`input-base w-full pr-4 text-sm font-mono transition-all duration-300 ${
                              canEdit 
                                ? `text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)] ${pathValidation[minecraftPath] === false ? "border-red-500/50 bg-red-500/5" : ""}` 
                                : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                            }`} 
                            style={{ paddingLeft: "2.5rem" }}
                            disabled={saving || !canEdit}
                            placeholder="C:\Users\...\AppData\Roaming\.minecraft"
                          />
                          {pathValidation[minecraftPath] === false && (
                            <div className="absolute right-3 text-red-500 animate-pulse">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePickFolder(setMinecraftPath, true, minecraftPath)}
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

                    {/* Staging Path */}
                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-label text-muted text-[0.65rem] tracking-wider">
                          CARPETA STAGING (DEPÓSITO TEMPORAL)
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
                            value={stagingPath} 
                            onChange={e => setStagingPath(e.target.value)} 
                            className={`input-base w-full pr-4 text-sm font-mono transition-all duration-300 ${
                              canEdit 
                                ? `text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)] ${pathValidation[stagingPath] === false ? "border-red-500/50 bg-red-500/5" : ""}` 
                                : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                            }`} 
                            style={{ paddingLeft: "2.5rem" }}
                            disabled={saving || !canEdit}
                            placeholder="D:\.mine\source\.mim-index\staging"
                          />
                          {pathValidation[stagingPath] === false && (
                            <div className="absolute right-3 text-red-500 animate-pulse">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePickFolder(setStagingPath, false, stagingPath)}
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
                      <p className="mt-2 text-[10px] text-muted leading-relaxed">
                        Aquí se guardarán los archivos (como shaders o resourcepacks) si la carpeta de Minecraft no está disponible.
                      </p>
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
                                ? `text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)] ${pathValidation[sourceBase] === false ? "border-red-500/50 bg-red-500/5" : ""}` 
                                : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                            }`} 
                            style={{ paddingLeft: "2.5rem" }}
                            disabled={saving || !canEdit}
                            placeholder="d:\.mine\source"
                          />
                          {pathValidation[sourceBase] === false && (
                            <div className="absolute right-3 text-red-500 animate-pulse">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePickFolder(setSourceBase, false, sourceBase)}
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
                                ? `text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)] ${pathValidation[buildsBase] === false ? "border-red-500/50 bg-red-500/5" : ""}` 
                                : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                            }`} 
                            style={{ paddingLeft: "2.5rem" }}
                            disabled={saving || !canEdit}
                            placeholder="d:\.mine\builds"
                          />
                          {pathValidation[buildsBase] === false && (
                            <div className="absolute right-3 text-red-500 animate-pulse">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePickFolder(setBuildsBase, false, buildsBase)}
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
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* CurseForge API Key */}
                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <label className="font-label text-muted text-[0.65rem] tracking-wider">
                            CURSEFORGE API KEY
                          </label>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-subhead bg-primary/10 text-primary border border-primary/20">
                            Requerida para búsquedas
                          </span>
                        </div>
                        <a 
                          href="https://console.curseforge.com/" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-primary hover:underline font-subhead transition-all"
                        >
                          Obtener clave →
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <KeyRound className={`w-4 h-4 absolute left-3 transition-colors duration-300 ${canEdit ? "text-primary" : "text-muted/40"}`} />
                        <input 
                          type={showCurseforge ? "text" : "password"}
                          value={curseforgeApiKey} 
                          onChange={e => setCurseforgeApiKey(e.target.value)} 
                          className={`input-base w-full pr-12 text-sm font-mono transition-all duration-300 ${
                            canEdit 
                              ? "text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)]" 
                              : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                          }`}
                          style={{ paddingLeft: "2.5rem" }}
                          placeholder="Tu clave de CurseForge (ej. $2a$10$...)"
                          disabled={saving || !canEdit}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurseforge(!showCurseforge)}
                          className="absolute right-3 p-1.5 text-muted hover:text-foreground transition-colors"
                          disabled={!canEdit}
                        >
                          {showCurseforge ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted leading-relaxed">
                        Habilita la búsqueda, indexación y descarga de mods directamente desde CurseForge.
                      </p>
                    </div>

                    {/* Modrinth API Key */}
                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <label className="font-label text-muted text-[0.65rem] tracking-wider">
                            MODRINTH API KEY / TOKEN
                          </label>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-subhead bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Opcional / Colecciones
                          </span>
                        </div>
                        <a 
                          href="https://modrinth.com/settings/pats" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-emerald-400 hover:underline font-subhead transition-all"
                        >
                          Obtener token →
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <KeyRound className={`w-4 h-4 absolute left-3 transition-colors duration-300 ${canEdit ? "text-emerald-400" : "text-muted/40"}`} />
                        <input 
                          type={showModrinth ? "text" : "password"}
                          value={modrinthApiKey} 
                          onChange={e => setModrinthApiKey(e.target.value)} 
                          className={`input-base w-full pr-12 text-sm font-mono transition-all duration-300 ${
                            canEdit 
                              ? "text-foreground bg-white/4 border-emerald-500/20 focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.08)]" 
                              : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                          }`}
                          style={{ paddingLeft: "2.5rem" }}
                          placeholder="Tu token PAT de Modrinth (mrp_...)"
                          disabled={saving || !canEdit}
                        />
                        <button
                          type="button"
                          onClick={() => setShowModrinth(!showModrinth)}
                          className="absolute right-3 p-1.5 text-muted hover:text-foreground transition-colors"
                          disabled={!canEdit}
                        >
                          {showModrinth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted leading-relaxed">
                        Evita límites de descarga (rate limits) en Modrinth y permite sincronizar tus colecciones.
                      </p>
                    </div>

                    {/* VirusTotal API Key */}
                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <label className="font-label text-muted text-[0.65rem] tracking-wider">
                            VIRUSTOTAL API KEY
                          </label>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-subhead bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Opcional / Escaneo
                          </span>
                        </div>
                        <a 
                          href="https://www.virustotal.com/gui/user/join" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-blue-400 hover:underline font-subhead transition-all"
                        >
                          Obtener clave →
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <KeyRound className={`w-4 h-4 absolute left-3 transition-colors duration-300 ${canEdit ? "text-blue-400" : "text-muted/40"}`} />
                        <input 
                          type={showVirusTotal ? "text" : "password"}
                          value={virusTotalApiKey} 
                          onChange={e => setVirusTotalApiKey(e.target.value)} 
                          className={`input-base w-full pr-12 text-sm font-mono transition-all duration-300 ${
                            canEdit 
                              ? "text-foreground bg-white/4 border-blue-500/20 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.08)]" 
                              : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
                          }`}
                          style={{ paddingLeft: "2.5rem" }}
                          placeholder="Tu clave API de VirusTotal..."
                          disabled={saving || !canEdit}
                        />
                        <button
                          type="button"
                          onClick={() => setShowVirusTotal(!showVirusTotal)}
                          className="absolute right-3 p-1.5 text-muted hover:text-foreground transition-colors"
                          disabled={!canEdit}
                        >
                          {showVirusTotal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted leading-relaxed">
                        Analiza tus archivos JAR descargados contra más de 70 motores de seguridad en la nube.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-primary/10 flex items-center justify-between">
                <div className="text-[10px] font-label animate-fade-in flex items-center gap-2">
                  {saving && moveProgress ? (
                    <span className="flex items-center gap-2 text-accent">
                      <MoveRight className="w-3.5 h-3.5" /> {moveProgress}
                    </span>
                  ) : isValidating ? (
                    <span className="flex items-center gap-2 text-muted">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Comprobando rutas...
                    </span>
                  ) : Object.values(pathValidation).every(v => v === true) ? (
                    <span className="flex items-center gap-2 text-[#66C8A0]">
                      <Check className="w-3 h-3" /> Todas las rutas son válidas
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-3 h-3" /> Corregí las rutas en rojo
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
