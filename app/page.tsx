/**
 * @fileoverview Main application page – orchestrates all major sections.
 *
 * State lives in two custom hooks:
 *   - useProjects  → project CRUD + localStorage persistence
 *   - useLibrary   → library load, conflict detection, updates, classification
 *
 * Rendering is delegated entirely to focused section components.
 * This file intentionally contains NO business logic.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package } from "lucide-react";
import { useProjects }        from "../hooks/useProjects";
import { useLibrary }         from "../hooks/useLibrary";
import { CATEGORY_HOTKEYS }   from "../constants/app";
import { SectionHeading }     from "@/components/ui/primitives";
import { ProjectsSection }    from "@/components/projects/ProjectsSection";
import { LibrarySection }     from "@/components/library/LibrarySection";
import { PendingFilesSection } from "@/components/library/PendingFilesSection";
import { QuickCategorizeSection } from "@/components/library/QuickCategorizeSection";
import { AlertSidebar }       from "@/components/layout/AlertSidebar";
import { DescriptionModal }   from "@/components/ui/DescriptionModal";
import { BuildPanel }         from "@/components/projects/BuildPanel";
import type { PendingFile, LibraryFile } from "@/lib/types";
import { LOADER_COLORS } from "../constants/app";

function Divider() {
  return <div className="h-px w-full" style={{ background: "var(--color-border)" }} aria-hidden="true" />;
}

function getPendingFingerprint(file: PendingFile): string {
  const meta = file.meta;
  return [
    meta?.modId || "unknown",
    meta?.modName || file.fileName,
    meta?.modVersion || "unknown",
    meta?.gameVersion || "unknown",
    meta?.loader || "unknown",
    meta?.projectType || "unknown",
    meta?.sha1 || "no-sha1",
  ].join("|").toLowerCase();
}

export default function Page() {
  const projects = useProjects();

  const [pendingFiles,     setPendingFiles]     = useState<PendingFile[]>([]);
  const [selectedFiles,    setSelectedFiles]    = useState<PendingFile[]>([]);
  const [selectedLibFiles, setSelectedLibFiles] = useState<LibraryFile[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showSubcategories,setShowSubcategories]= useState<string | null>(null);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);

  const lib = useLibrary(
    projects.activeProject,
    pendingFiles,
    setPendingFiles,
    selectedLibFiles,
    setSelectedLibFiles,
  );

  const allSelected = [...selectedFiles, ...selectedLibFiles];

  /* ── SSE file watcher ────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const es = new EventSource("/api/watcher");
    es.onopen    = () => setLoading(false);
    es.onerror   = () => setLoading(false);
    es.onmessage = (e) => {
      try {
        const data: PendingFile = JSON.parse(e.data);
        if (data?.fileName) {
          setPendingFiles((prev) => {
            if (prev.find((f) => f.path === data.path)) return prev;

            const duplicate = prev.find((f) => getPendingFingerprint(f) === getPendingFingerprint(data));
            if (duplicate) {
              void fetch("/api/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: data.path }),
              });
              return prev;
            }

            return [...prev, data];
          });
          setLoading(false);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    const seen = new Map<string, PendingFile>();
    const duplicates: PendingFile[] = [];

    for (const pending of pendingFiles) {
      const key = getPendingFingerprint(pending);
      if (seen.has(key)) {
        duplicates.push(pending);
      } else {
        seen.set(key, pending);
      }
    }

    if (duplicates.length === 0) return;

    setPendingFiles((prev) => {
      const duplicatePaths = new Set(duplicates.map((file) => file.path));
      return prev.filter((file) => !duplicatePaths.has(file.path));
    });

    for (const duplicate of duplicates) {
      void fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: duplicate.path }),
      });
    }
  }, [pendingFiles]);

  /* ── Keyboard hotkeys ────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (allSelected.length === 0) return;
      const cat = CATEGORY_HOTKEYS[e.key];
      if (cat) setShowSubcategories(cat);
      if (e.key === "Escape") {
        setShowSubcategories(null);
        setSelectedFiles([]);
        setSelectedLibFiles([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allSelected.length]);

  const clearSelected = useCallback(() => {
    setSelectedFiles([]);
    setSelectedLibFiles([]);
    setShowSubcategories(null);
  }, []);

  const handleClassify = useCallback((cat: string, sub: string) => {
    lib.handleClassify(cat, sub, allSelected, setPendingFiles, clearSelected);
  }, [lib, allSelected, clearSelected]);

  const handleDeletePendingFile = useCallback(async (file: PendingFile) => {
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.path }),
      });
      if (res.ok) {
        setPendingFiles(prev => prev.filter(f => f.path !== file.path));
        setSelectedFiles(prev => prev.filter(f => f.path !== file.path));
      } else {
        console.error("Error deleting file:", await res.text());
      }
    } catch (e) {
      console.error("Error deleting file:", e);
    }
  }, []);

  return (
    <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? "pr-[400px]" : "pr-0"}`}>
      <div className="space-y-8 pb-16">

        {/* ── Row 1: Projects + Build ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
          <ProjectsSection
            projects={projects.projects}
            activeProjectId={projects.activeProjectId}
            editingId={projects.editingId}
            creatingNew={projects.creatingNew}
            setActiveProjectId={projects.setActiveProjectId}
            setEditingId={projects.setEditingId}
            setCreatingNew={projects.setCreatingNew}
            handleDeleteProject={projects.handleDeleteProject}
            handleSaveProject={projects.handleSaveProject}
            loaderColors={LOADER_COLORS}
          />

          {projects.activeProject && (
            <section className="animate-fade-up stagger-1 lg:min-w-[420px]">
              <SectionHeading
                icon={<Package className="w-4 h-4" />}
                title="Build"
                sub={`${projects.activeProject.name} · ${projects.activeProject.version} · ${projects.activeProject.loader}`}
                accentColor="var(--color-accent)"
              />
              <BuildPanel
                projectName={projects.activeProject.name}
                version={projects.activeProject.version}
                loader={projects.activeProject.loader}
              />
            </section>
          )}
        </div>

        <Divider />

        {/* ── Row 2: Pending + Categorize | Library ────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

          <div className="space-y-6">
            <PendingFilesSection
              pendingFiles={pendingFiles}
              loading={loading}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              activeProject={projects.activeProject}
              onDeleteFile={handleDeletePendingFile}
            />
            <QuickCategorizeSection
              allSelected={allSelected}
              activeProject={projects.activeProject}
              showSubcategories={showSubcategories}
              setShowSubcategories={setShowSubcategories}
              handleClassify={handleClassify}
              setSelectedFiles={setSelectedFiles}
              setSelectedLibFiles={setSelectedLibFiles}
            />
          </div>

          <LibrarySection
            library={lib.library}
            loadingLibrary={lib.loadingLibrary}
            selectedLibFiles={selectedLibFiles}
            setSelectedLibFiles={setSelectedLibFiles}
            activeProject={projects.activeProject}
            downloadingMods={lib.downloadingMods}
            modrinthStatus={lib.modrinthStatus}
            ignoredUpdates={lib.ignoredUpdates}
            conflicts={lib.conflicts}
            setSidebarOpen={setSidebarOpen}
            checkingUpdates={lib.checkingUpdates}
            handleCheckUpdates={lib.handleCheckUpdates}
            handleViewDescription={lib.handleViewDescription}
            loadingDescription={lib.loadingDescription}
            handleSyncAllDescriptions={lib.handleSyncAllDescriptions}
            syncingDescriptions={lib.syncingDescriptions}
            handleUnclassify={lib.handleUnclassify}
            handleDownloadUpdate={lib.handleDownloadUpdate}
          />
        </div>

        {/* ── Modals + Sidebars ────────────────────────────────────────── */}
        {lib.modDescription && (
          <DescriptionModal
            modDescription={lib.modDescription}
            onClose={() => lib.setModDescription(null)}
          />
        )}

        <AlertSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          conflicts={lib.conflicts}
          modrinthStatus={lib.modrinthStatus}
          ignoredUpdates={lib.ignoredUpdates}
          library={lib.library}
          downloadingMods={lib.downloadingMods}
          handleResolveConflict={lib.handleResolveConflict}
          handleDownloadUpdate={lib.handleDownloadUpdate}
          handleDismissUpdate={lib.handleDismissUpdate}
        />
      </div>
    </div>
  );
}
