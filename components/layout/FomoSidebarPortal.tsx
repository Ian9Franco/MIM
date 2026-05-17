"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { PendingFilesSection } from "@/components/library/PendingFilesSection";
import type { PendingFile } from "@/lib/types";

interface FomoSidebarPortalProps {
  fomoOpen: boolean;
  detailsOpen: boolean;
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
}

export function FomoSidebarPortal({
  fomoOpen,
  detailsOpen,
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
}: FomoSidebarPortalProps) {
  // Downloads is visible when FOMO is open, details are NOT open, and not collapsed
  const showDownloads = fomoOpen && !detailsOpen && !downloadsSidebarCollapsed;

  // Floating button visible when FOMO is open but downloads is hidden (and details not open)
  const showFloatingBtn = fomoOpen && !detailsOpen && downloadsSidebarCollapsed;

  return (
    <>
      {/* Downloads Sidebar — collapses when details open */}
      <aside
        className={`fomo-sidebar fomo-sidebar-container fixed top-0 right-0 h-screen z-[80] w-[380px] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.4)] transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] border-l ${
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
        <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto custom-scrollbar">
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
          />
        </div>
      </aside>

      {/* Floating button — visible when downloads is hidden but FOMO is open */}
      {showFloatingBtn && (
        <button
          onClick={() => setDownloadsSidebarCollapsed(false)}
          className={`fixed top-20 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-full border backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in group ${
            detailsOpen ? "right-[520px]" : "right-5"
          }`}
          style={{
            borderColor: "rgba(99, 102, 241, 0.3)",
            background: "color-mix(in srgb, var(--color-card) 95%, transparent)"
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
    </>
  );
}
