"use client";

import React from "react";
import { FlaskConical, Inbox } from "lucide-react";
import { activeDraftManager } from "@/lib/fomo/activeDraftManager";
import { PendingFilesSection } from "@/components/library/PendingFilesSection";
import type { PendingFile } from "@/lib/core/types";

interface FomoSidebarPortalProps {
  fomoOpen: boolean;
  detailsOpen: boolean;
  fomoMode?: string;
  downloadsSidebarCollapsed: boolean;
  setDownloadsSidebarCollapsed: (v: boolean) => void;
  pendingFiles: PendingFile[];
  loading: boolean;
  selectedFiles: PendingFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>;
  activeProject: any;
  onDeleteFile: (f: PendingFile) => Promise<void>;
  modrinthStatus: any;
  detectedVersion?: string;
  availableVersions?: string[];
  setDetectedVersion?: (v: string) => void;
}

export function FomoSidebarPortal({
  fomoOpen,
  detailsOpen,
  fomoMode = "spotlight",
  downloadsSidebarCollapsed,
  setDownloadsSidebarCollapsed,
  pendingFiles,
  loading,
  selectedFiles,
  setSelectedFiles,
  activeProject,
  onDeleteFile,
  modrinthStatus,
  detectedVersion,
  availableVersions,
  setDetectedVersion,
}: FomoSidebarPortalProps) {
  const showExploreFloaters = fomoOpen && !detailsOpen && fomoMode === "discover";
  const showDownloads = showExploreFloaters && !downloadsSidebarCollapsed;
  const showDownloadsButton = showExploreFloaters && downloadsSidebarCollapsed;

  const openActiveDraft = () => {
    const draft = activeDraftManager.getActiveDraft();
    if (!draft) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "No hay Draft Activo. Selecciona uno en Drafts.", type: "warning" },
      }));
      return;
    }
    localStorage.setItem("fomo_community_draft_id", draft.id);
    localStorage.setItem("fomo_community_subtab", "drafts");
    window.dispatchEvent(new CustomEvent("fomo-open-draft", { detail: draft.id }));
    window.dispatchEvent(new CustomEvent("fomo-community-tab", { detail: "drafts" }));
    window.dispatchEvent(new CustomEvent("fomo-switch-tab", { detail: { tab: "community" } }));
  };

  return (
    <>
      {/* Downloads Sidebar — collapses when details open */}
      <aside
        className={`fomo-sidebar fomo-sidebar-container fixed top-0 right-0 h-screen z-[80] w-[320px] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.4)] transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] border-l ${
          showDownloads
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{
          background: "var(--fomo-bg, color-mix(in srgb, var(--color-card) 94%, transparent))",
          borderColor: "var(--fomo-border, var(--color-border))",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <PendingFilesSection
            pendingFiles={pendingFiles}
            loading={loading}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            activeProject={activeProject}
            onDeleteFile={onDeleteFile}
            modrinthStatus={modrinthStatus}
            onCloseSidebar={() => setDownloadsSidebarCollapsed(true)}
            detectedVersion={detectedVersion}
            availableVersions={availableVersions}
            setDetectedVersion={setDetectedVersion}
          />
        </div>
      </aside>

      {showExploreFloaters && (
        <div className="fixed top-20 right-5 z-[80] flex flex-col items-end gap-2">
          {showDownloadsButton && (
            <button
              onClick={() => setDownloadsSidebarCollapsed(false)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-full border backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in group"
              style={{
                borderColor: "rgba(99, 102, 241, 0.3)",
                background: "color-mix(in srgb, var(--color-card) 95%, transparent)",
              }}
            >
              <div className="relative shrink-0">
                <Inbox className="w-4 h-4 group-hover:animate-pulse text-indigo-400" />
                {pendingFiles.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                    {pendingFiles.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-foreground/70 group-hover:text-indigo-400">
                Ver Descargas
              </span>
            </button>
          )}
          <button
            onClick={openActiveDraft}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full border backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in group"
            style={{
              borderColor: "rgba(187, 150, 228, 0.35)",
              background: "color-mix(in srgb, var(--color-card) 95%, transparent)",
            }}
          >
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-foreground/70 group-hover:text-primary">
              Ver draft activo
            </span>
          </button>
        </div>
      )}
    </>
  );
}
