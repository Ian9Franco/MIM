/**
 * SageSidebar – Systematic Analyzer for Glitches & Exceptions (SAGE)
 * Optimized for v5.9: Modular structure with custom hooks and sub-components.
 */

"use client";

import React, { useState } from "react";
import { useSageManager, type LocalLogFile } from "@/hooks/useSageManager";
import { SageHeader, SageNavigation } from "./SageComponents";
import { SageSecurityScanner } from "./SageSecurityScanner";
import { SageLogViewer } from "./SageLogViewer";
import { SagePlayerRescue } from "./SagePlayerRescue";
import { SageManualPaste } from "./SageManualPaste";
import { SageDeleteModal } from "./SageDeleteModal";
import type { Project } from "@/lib/types";

export interface SageSidebarProps {
  open: boolean;
  onClose: () => void;
  activeProject: Project | null;
}

export function SageSidebar({ open, onClose, activeProject }: SageSidebarProps) {
  const sage = useSageManager(activeProject, open, onClose);
  const [fileToDelete, setFileToDelete] = useState<LocalLogFile | null>(null);

  const handleAutoFix = (fix: any) => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("fomo-search-and-open", { 
        detail: { query: fix.dependencyId || fix.modId } 
      }));
    }, 400);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-md transition-opacity duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Diagnóstico SAGE"
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col shadow-2xl transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-l-0 ${
          open ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{
          width: "1100px",
          maxWidth: "92vw",
          background: "var(--glass-bg)",
          borderColor: "var(--color-border)",
          borderRightColor: "color-mix(in srgb, var(--color-primary) 22%, transparent)",
          backdropFilter: "blur(40px)",
          borderRadius: "0 2.5rem 2.5rem 0",
          boxShadow: `24px 0 60px rgba(0,0,0,0.45), inset -1px 0 0 color-mix(in srgb, var(--color-primary) 10%, transparent)`,
        }}
      >
        {/* Accent Top Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] opacity-60 z-10" style={{ background: `linear-gradient(90deg, transparent, var(--color-primary), transparent)` }} />

        <SageHeader onClose={onClose} />

        <SageNavigation 
          mode={sage.mode} setMode={sage.setMode} 
          activeProject={activeProject} 
          fetchScannable={sage.fetchScannable}
          secScannable={sage.secScannable}
          secLoading={sage.secLoading}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {sage.mode === "security" && (
            <SageSecurityScanner 
              secLoading={sage.secLoading} secError={sage.secError} 
              secScanning={sage.secScanning} secScanned={sage.secScanned} 
              secScannable={sage.secScannable} secResults={sage.secResults} 
              onScan={sage.runSecurityScan} onReset={sage.resetSecurityScan}
            />
          )}

          {(sage.mode === "crash" || sage.mode === "latest-log") && (
            <SageLogViewer 
              mode={sage.mode} localFiles={sage.localFiles} 
              loadingFiles={sage.loadingFiles} readingFile={sage.readingFile} 
              analysis={sage.mode === "crash" ? sage.crashAnalysis : sage.logAnalysis}
              selectedFile={sage.mode === "crash" ? sage.selectedCrashFile : sage.latestLogFile}
              onSelect={(f: LocalLogFile) => {
                if (sage.mode === "crash") sage.setSelectedCrashFile(f);
                else sage.setLatestLogFile(f);
                sage.handleLoadAndAnalyze(f);
              }}
              onDelete={setFileToDelete}
              onAutoFix={handleAutoFix}
            />
          )}

          {sage.mode === "player-rescue" && (
            <SagePlayerRescue 
              players={sage.players} loadingPlayers={sage.loadingPlayers}
              selectedPlayer={sage.selectedPlayer} setSelectedPlayer={sage.setSelectedPlayer}
              rescuingPlayer={sage.rescuingPlayer} rescueLogs={sage.rescueLogs}
              rescueSuccess={sage.rescueSuccess} onRescue={sage.handlePlayerRescue}
            />
          )}

          {sage.mode === "paste" && (
            <SageManualPaste 
              analyzing={sage.analyzing} analysis={sage.pasteAnalysis}
              onAnalyze={sage.handleAnalyzeText} onAutoFix={handleAutoFix}
            />
          )}
        </div>
      </aside>

      <SageDeleteModal 
        file={fileToDelete} 
        onClose={() => setFileToDelete(null)} 
        onConfirm={() => {
          if (fileToDelete) sage.handleConfirmDelete(fileToDelete);
          setFileToDelete(null);
        }}
      />
    </>
  );
}
