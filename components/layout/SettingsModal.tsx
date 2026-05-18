"use client";

import React from "react";
import { Settings, X, Lock, Unlock, AlertTriangle, FolderOpen, Package, FolderSearch } from "lucide-react";
import { useSettingsManager } from "@/hooks/useSettingsManager";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { 
  SettingsTabNav, PathInputGroup, ApiKeyInputGroup, OverlayDialog, SettingsFooter 
} from "./SettingsComponents";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const {
    sourceBase, setSourceBase, buildsBase, setBuildsBase, downloadsPath, setDownloadsPath, 
    minecraftPath, setMinecraftPath, stagingPath, setStagingPath,
    modrinthApiKey, setModrinthApiKey, curseforgeApiKey, setCurseforgeApiKey, virusTotalApiKey, setVirusTotalApiKey,
    showModrinth, setShowModrinth, showCurseforge, setShowCurseforge, showVirusTotal, setShowVirusTotal,
    activeTab, setActiveTab, loading, saving, moveProgress, canEdit, setCanEdit,
    showConfirmClose, setShowConfirmClose, pathValidation, keyValidation, 
    isValidating, isValidatingKeys, showStagingWarning, setShowStagingWarning,
    pathPickWarning, setPathPickWarning, handlePickFolder, handleReset, handleCloseAttempt, handleSave
  } = useSettingsManager(onClose);

  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    const seen = localStorage.getItem("onboarding_settings");
    const guidesEnabled = localStorage.getItem("guides_enabled") === "true";
    if (!seen || guidesEnabled) {
      setShowOnboarding(true);
    }
  }, []);

  const onboardingSteps = [
    {
      target: '#onboarding-settings-tabs',
      title: 'Secciones de Ajustes',
      content: 'Desde acá podés cambiar entre la configuración de Rutas del Sistema y las Claves de API.'
    },
    {
      target: '#onboarding-settings-paths',
      title: 'Rutas del Sistema',
      content: 'Configurá las carpetas de descargas, del juego, staging, source y builds. Acordate que tenés que hacer clic en "Editar Rutas" arriba para poder cambiarlas.'
    },
    {
      target: '#onboarding-settings-keys',
      title: 'Conectividad (Keys)',
      content: 'Acá pegás tus claves de CurseForge, Modrinth y VirusTotal para que MIM pueda buscar actualizaciones y verificar virus.'
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fade-in" onClick={handleCloseAttempt} />
      
      {/* Centered Premium Modal Wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative w-full max-w-2xl rounded-3xl pointer-events-auto p-8 animate-bounce-in overflow-hidden shadow-2xl border border-primary/20"
          style={{ 
            background: "color-mix(in srgb, var(--color-card) 95%, transparent)", 
            backdropFilter: "blur(24px)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)" 
          }}
        >
          {/* Overlay Dialogs */}
          {showConfirmClose && (
            <OverlayDialog 
              icon={AlertTriangle} title="Cambios sin guardar" 
              desc="Modificaste los ajustes de MIM. ¿Querés guardar los cambios antes de salir o descartarlos?"
              primaryAction={{ label: "Guardar y Salir", onClick: handleSave }}
              secondaryAction={{ label: "Descartar cambios", onClick: onClose }}
              tertiaryAction={{ label: "Seguir editando", onClick: () => setShowConfirmClose(false) }}
            />
          )}

          {showStagingWarning && (
            <OverlayDialog 
              icon={Package} title={`Ruta de ${showStagingWarning.pathName} no válida`}
              desc={(
                <>
                  Estás por salir sin definir una ruta válida. Los archivos se almacenarán temporalmente en:
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 font-mono text-[10px] break-all text-amber-500 font-semibold">{showStagingWarning.stagingPath}</div>
                </>
              )}
              primaryAction={{ label: "Entendido, salir de todas formas", onClick: onClose, color: 'amber' }}
              secondaryAction={{ label: "Volver y corregir ruta", onClick: () => setShowStagingWarning(null) }}
            />
          )}

          {pathPickWarning && (
            <OverlayDialog 
              icon={FolderSearch} title="Aviso de Ubicación" desc={pathPickWarning.message}
              primaryAction={{ label: "Buscar manualmente", onClick: pathPickWarning.onConfirm }}
              secondaryAction={{ label: "Cancelar", onClick: () => setPathPickWarning(null) }}
            />
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
              <div>
                <h3 className="font-headline text-lg text-foreground leading-none">Ajustes de Sistema</h3>
                <p className="font-caption text-[11px] text-muted mt-1">Gestioná los directorios del juego y del sistema</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit ? (
                <button onClick={handleReset} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 transition-all text-xs font-subhead">
                  <Lock className="w-3.5 h-3.5" /> Bloquear
                </button>
              ) : (
                <button onClick={() => setCanEdit(true)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-subhead">
                  <Unlock className="w-3.5 h-3.5 animate-pulse" /> Editar Rutas
                </button>
              )}
              <button onClick={handleCloseAttempt} disabled={saving} className="p-2 rounded-xl hover:bg-white/5 text-muted hover:text-foreground transition-all"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted font-caption flex flex-col items-center justify-center gap-3">
              <FolderOpen className="w-8 h-8 text-primary/40 animate-pulse" /> Cargando directorios...
            </div>
          ) : (
            <div className="space-y-6">
              <div id="onboarding-settings-tabs">
                <SettingsTabNav activeTab={activeTab} setActiveTab={setActiveTab} />
              </div>
              <div className="max-h-[350px] overflow-y-auto pr-2 space-y-6 scrollbar-thin">
                {activeTab === "paths" ? (
                  <div id="onboarding-settings-paths" className="space-y-5">
                    <PathInputGroup label="Carpeta Descargas" value={downloadsPath} onChange={setDownloadsPath} onPick={() => handlePickFolder(setDownloadsPath, false, downloadsPath)} canEdit={canEdit} isValid={pathValidation[downloadsPath]} saving={saving} placeholder="C:\Users\...\Downloads" />
                    <PathInputGroup label="Carpeta del Juego (.minecraft)" value={minecraftPath} onChange={setMinecraftPath} onPick={() => handlePickFolder(setMinecraftPath, true, minecraftPath)} canEdit={canEdit} isValid={pathValidation[minecraftPath]} saving={saving} placeholder="C:\Users\...\AppData\Roaming\.minecraft" />
                    <PathInputGroup label="Carpeta Staging" value={stagingPath} onChange={setStagingPath} onPick={() => handlePickFolder(setStagingPath, false, stagingPath)} canEdit={canEdit} isValid={pathValidation[stagingPath]} saving={saving} placeholder="D:\.mine\source\.mim-index\staging" desc="Depósito temporal para archivos cuando Minecraft no está disponible." />
                    <PathInputGroup label="Carpeta Source (Proyectos)" value={sourceBase} onChange={setSourceBase} onPick={() => handlePickFolder(setSourceBase, false, sourceBase)} canEdit={canEdit} isValid={pathValidation[sourceBase]} saving={saving} placeholder="d:\.mine\source" />
                    <PathInputGroup label="Carpeta Builds (Compilados)" value={buildsBase} onChange={setBuildsBase} onPick={() => handlePickFolder(setBuildsBase, false, buildsBase)} canEdit={canEdit} isValid={pathValidation[buildsBase]} saving={saving} placeholder="d:\.mine\builds" />
                  </div>
                ) : (
                  <div id="onboarding-settings-keys" className="space-y-5">
                    <ApiKeyInputGroup label="CurseForge API Key" value={curseforgeApiKey} onChange={setCurseforgeApiKey} show={showCurseforge} onToggleShow={() => setShowCurseforge(!showCurseforge)} canEdit={canEdit} isValid={keyValidation.curseforge} isValidating={isValidatingKeys} saving={saving} placeholder="Tu clave de CurseForge..." badge="Requerida" link="https://console.curseforge.com/" />
                    <ApiKeyInputGroup label="Modrinth Token" value={modrinthApiKey} onChange={setModrinthApiKey} show={showModrinth} onToggleShow={() => setShowModrinth(!showModrinth)} canEdit={canEdit} isValid={keyValidation.modrinth} isValidating={isValidatingKeys} saving={saving} placeholder="mrp_..." badge="Opcional" color="emerald" link="https://modrinth.com/settings/pats" />
                    <ApiKeyInputGroup label="VirusTotal API Key" value={virusTotalApiKey} onChange={setVirusTotalApiKey} show={showVirusTotal} onToggleShow={() => setShowVirusTotal(!showVirusTotal)} canEdit={canEdit} isValid={keyValidation.virusTotal} isValidating={isValidatingKeys} saving={saving} placeholder="Tu clave API..." badge="Opcional" color="blue" link="https://www.virustotal.com/gui/user/join" />
                  </div>
                )}
              </div>
              <SettingsFooter 
                saving={saving} moveProgress={moveProgress} isValidating={isValidating} isValidatingKeys={isValidatingKeys} 
                activeTab={activeTab} pathValidation={pathValidation} keyValidation={keyValidation} 
                canEdit={canEdit} onCancel={handleCloseAttempt} onSave={handleSave} 
              />
            </div>
          )}
        </div>
      </div>

      {showOnboarding && (
        <OnboardingTour 
          steps={onboardingSteps} 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem("onboarding_settings", "true");
          }} 
          onStepChange={(step) => {
            if (step === 1) setActiveTab("paths");
            if (step === 2) setActiveTab("apiKeys");
          }}
        />
      )}
    </>
  );
}
