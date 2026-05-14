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
}: FomoSidebarPortalProps) {
  const isSidebarVisible = detailsOpen || (fomoOpen && !downloadsSidebarCollapsed);
  
  return (
    <>
      <aside
        className={`fomo-sidebar fomo-sidebar-container fixed top-0 right-0 h-screen z-50 flex flex-col shadow-[0_0_50px_rgba(13,39,80,0.12)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] border-l ${
          detailsOpen ? "w-[600px] max-w-[90vw]" : "w-[380px]"
        } ${
          isSidebarVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{
          background: "var(--fomo-bg, color-mix(in srgb, var(--color-card) 94%, transparent))",
          borderColor: "var(--fomo-border, var(--color-border))",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className={`flex-1 flex flex-col min-h-0 ${detailsOpen ? "" : "p-6 overflow-y-auto custom-scrollbar"}`}>
          {detailsOpen ? (
            <div id="fomo-details-sidebar-portal" className="flex-1 flex flex-col min-h-0" />
          ) : (
            <PendingFilesSection
              pendingFiles={pendingFiles}
              loading={loading}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              activeProject={activeProject}
              onDeleteFile={onDeleteFile}
              modrinthStatus={modrinthStatus}
              onCloseSidebar={() => setDownloadsSidebarCollapsed(true)}
            />
          )}
        </div>
      </aside>

      {fomoOpen && !detailsOpen && downloadsSidebarCollapsed && (
        <button
          onClick={() => setDownloadsSidebarCollapsed(false)}
          className="fixed right-5 top-20 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full border bg-card/95 backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in border-primary/30 hover:border-primary/50 text-primary group"
          style={{
            borderColor: "rgba(99, 102, 241, 0.3)",
            background: "color-mix(in srgb, var(--color-card) 95%, transparent)"
          }}
        >
          <div className="relative shrink-0">
            <Inbox className="w-4 h-4 group-hover:animate-pulse text-indigo-400" />
            {pendingFiles.length > 0 && (
              <span className="absolute -top-2 -right-2 w-4.5 h-4.5 rounded-full bg-rose-500 text-white text-[8px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
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
