"use client";

import React from "react";
import { useRootLayoutManager } from "@/hooks/useRootLayoutManager";
import { FomoSidebar } from "@/components/fomo/FomoSidebar";
import { SageSidebar } from "@/components/sage/SageSidebar";
import { TweakSidebar } from "@/components/layout/TweakSidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { StagingModal } from "@/components/layout/StagingModal";
import { PackHealthPanel } from "@/components/gate/PackHealthModal";
import { LayoutHeader } from "./LayoutHeader";
import { LayoutFooter } from "./LayoutFooter";
import { FomoFloatingPlayer } from "@/components/fomo/FomoFloatingPlayer";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const {
    fomoOpen, sageOpen, tweakOpen, activeProject, settingsOpen, setSettingsOpen,
    alertSidebarOpen, hasAlerts, alertCount, alertsSeen, stagingOpen, setStagingOpen,
    hasStagingFiles, packHealthOpen, setPackHealthOpen, packHealthReport, setPackHealthReport,
    isValidatingHealth, onForceBuildCallback, isRefreshing, handleToggleUI, handleRefresh,
    handleCheckHealth, handleFomoSearch, pendingFiles, handleOpenDownloads, watcherStatus
  } = useRootLayoutManager();

  // Atajos de teclado globales (Esc para cerrar sidebars)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
        if (isInput) return;

        // Cerrar en orden de prioridad (modales primero, luego sidebars)
        if (packHealthOpen) {
          setPackHealthOpen(false);
          window.dispatchEvent(new CustomEvent("pack-health-toggle", { detail: false }));
          setTimeout(() => setPackHealthReport(null), 1000);
          return;
        }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (stagingOpen) { setStagingOpen(false); return; }
        if (tweakOpen) { handleToggleUI('tweak', false); return; }
        if (fomoOpen) { handleToggleUI('fomo', false); return; }
        if (sageOpen) { handleToggleUI('sage', false); return; }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [packHealthOpen, settingsOpen, stagingOpen, tweakOpen, fomoOpen, sageOpen, setPackHealthOpen, setSettingsOpen, setStagingOpen, handleToggleUI, setPackHealthReport]);

  return (
    <div className="font-poppins">
      {/* Ambient Background Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 70% 50% at 8% -8%, rgba(187,150,228,0.09) 0%, transparent 58%)",
            "radial-gradient(ellipse 45% 35% at 92% 108%, rgba(255,208,102,0.05) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      <FomoSidebar 
        open={fomoOpen} 
        onClose={() => handleToggleUI('fomo', false)} 
        activeProject={activeProject} 
        pendingFiles={pendingFiles}
        onOpenDownloads={handleOpenDownloads}
      />
      <SageSidebar open={sageOpen} onClose={() => handleToggleUI('sage', false)} activeProject={activeProject} />
      <TweakSidebar isOpen={tweakOpen} onClose={() => handleToggleUI('tweak', false)} activeProject={activeProject} />

      <div
        className="relative z-10 min-h-screen flex flex-col transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-x-hidden"
        style={{ 
          transform: `translateX(${(fomoOpen || sageOpen) ? 550 : 0}px) scale(${(fomoOpen || sageOpen) ? 0.98 : 1})`,
          filter: (fomoOpen || sageOpen) ? "blur(10px) brightness(0.8)" : "none",
          paddingRight: tweakOpen ? "935px" : (alertSidebarOpen || packHealthOpen) ? "400px" : "0px",
          width: "100%",
        }}
      >
        <LayoutHeader 
          fomoOpen={fomoOpen} onToggleFomo={(v) => handleToggleUI('fomo', v)} 
          isRefreshing={isRefreshing} onRefresh={handleRefresh}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenStaging={() => setStagingOpen(true)}
          hasStagingFiles={hasStagingFiles}
          stagingOpen={stagingOpen}
          alertSidebarOpen={alertSidebarOpen} onToggleAlerts={(v) => handleToggleUI('alerts', v)}
          hasAlerts={hasAlerts} alertsSeen={alertsSeen}
          sageOpen={sageOpen} onToggleSage={(v) => handleToggleUI('sage', v)}
          tweakOpen={tweakOpen} onToggleTweak={(v) => handleToggleUI('tweak', v)}
          packHealthOpen={packHealthOpen} onCheckHealth={handleCheckHealth}
          activeProject={activeProject} isValidatingHealth={isValidatingHealth}
          watcherStatus={watcherStatus}
        />

        <main className="flex-1 w-full max-w-400 mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {children}
        </main>

        <LayoutFooter />
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {stagingOpen && <StagingModal onClose={() => setStagingOpen(false)} />}
      
      {packHealthReport && (
        <PackHealthPanel
          report={packHealthReport}
          isOpen={packHealthOpen}
          activeProject={activeProject}
          onClose={() => {
            setPackHealthOpen(false);
            window.dispatchEvent(new CustomEvent("pack-health-toggle", { detail: false }));
            setTimeout(() => setPackHealthReport(null), 1000);
          }}
          onForceBuild={() => {
            if (onForceBuildCallback) onForceBuildCallback();
            setPackHealthOpen(false);
          }}
          onFomoSearch={handleFomoSearch}
          isBuilding={false}
        />
      )}

      <FomoFloatingPlayer />
    </div>
  );
}
