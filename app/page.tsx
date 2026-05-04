"use client";

import React, { useState, useEffect, useRef } from "react";
import { Package } from "lucide-react";
import { BuildPanel }       from "@/components/BuildPanel";
import { SectionHeading }   from "@/components/SectionHeading";
import { ProjectsSection }      from "@/components/ProjectsSection";
import { LibrarySection }       from "@/components/LibrarySection";
import { PendingFilesSection }  from "@/components/PendingFilesSection";
import { QuickCategorizeSection } from "@/components/QuickCategorizeSection";
import { AlertSidebar }         from "@/components/AlertSidebar";
import { DescriptionModal } from "@/components/DescriptionModal";
import { CATEGORIES } from "@/lib/constants";
import type { Project, PendingFile, LibraryFile } from "@/lib/types";

/* ── localStorage helpers ────────────────────────────────────────────────────── */
const STORAGE_KEY = "mim_projects";
function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return [];
}
function saveProjects(ps: Project[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(ps)); }
function newId() { return Math.random().toString(36).slice(2, 9); }

/* ── Shared style primitives ─────────────────────────────────────────────────── */
const LOADER_COLOR: Record<string, string> = {
  forge: "#EF4444", neoforge: "#FF783C", fabric: "#66C8A0",
};

/* ── Divider ────────────────────────────────────────────────────────────────── */
function Divider() {
  return <div className="h-px w-full" style={{ background: "var(--color-border)" }} />;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function Page() {
  const [projects,         setProjects]         = useState<Project[]>([]);
  const [activeProjectId,  setActiveProjectId]  = useState<string | null>(null);
  const [editingId,        setEditingId]        = useState<string | null>(null);
  const [creatingNew,      setCreatingNew]      = useState(false);

  const [loading,          setLoading]          = useState(true);
  const [pendingFiles,     setPendingFiles]     = useState<PendingFile[]>([]);
  const [selectedFiles,    setSelectedFiles]    = useState<PendingFile[]>([]);
  const [showSubcategories,setShowSubcategories]= useState<string | null>(null);

  const [library,          setLibrary]          = useState<LibraryFile[]>([]);
  const [loadingLibrary,   setLoadingLibrary]   = useState(false);
  const [selectedLibFiles, setSelectedLibFiles] = useState<LibraryFile[]>([]);
  const [modrinthStatus,   setModrinthStatus]   = useState<Record<string, any>>({});
  const [checkingUpdates,  setCheckingUpdates]  = useState(false);
  const [downloadingMods,  setDownloadingMods]  = useState<Record<string, boolean>>({});
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [modDescription, setModDescription] = useState<{title?: string, description?: string, body?: string, url?: string, modName?: string} | null>(null);

  const [conflicts, setConflicts] = useState<{
    newFile: PendingFile | LibraryFile;
    oldFile: LibraryFile;
    conflictId?: string;
  }[]>([]);
  const [ignoredConflicts, setIgnoredConflicts] = useState<Set<string>>(new Set());
  const [ignoredUpdates, setIgnoredUpdates] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const autoCheckedProjects = useRef<Set<string>>(new Set());

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const allSelected   = [...selectedFiles, ...selectedLibFiles];

  /* ── Persist / restore projects ──────────────────────────────────────────── */
  useEffect(() => {
    const saved = loadProjects();
    setProjects(saved);
    if (saved.length > 0) setActiveProjectId(saved[0].id);
  }, []);

  /* ── SSE watcher ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const es = new EventSource("/api/watcher");
    es.onopen = () => setLoading(false);
    es.onmessage = async (e) => {
      try {
        const data: PendingFile = JSON.parse(e.data);
        if (data?.fileName) {
          setPendingFiles((prev) => prev.find((f) => f.path === data.path) ? prev : [...prev, data]);
          setLoading(false);
        }
      } catch (_) {}
    };
    es.onerror = () => setLoading(false);
    return () => es.close();
  }, []);

  /* ── Load library ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!activeProject) { setLibrary([]); return; }
    setLoadingLibrary(true);
    fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}`)
      .then((r) => r.json())
      .then((d) => { setLibrary(d.library || []); setLoadingLibrary(false); })
      .catch(() => setLoadingLibrary(false));
  }, [activeProject?.version, activeProject?.loader]);

  /* ── Hotkeys ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (allSelected.length === 0) return;
      if (e.key === "1") setShowSubcategories(CATEGORIES[0]);
      if (e.key === "2") setShowSubcategories(CATEGORIES[1]);
      if (e.key === "3") setShowSubcategories(CATEGORIES[2]);
      if (e.key === "Escape") {
        setShowSubcategories(null);
        setSelectedFiles([]);
        setSelectedLibFiles([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allSelected]);

  /* ── Project CRUD ────────────────────────────────────────────────────────── */
  const handleSaveProject = (p: Project) => {
    setProjects((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      const next   = exists ? prev.map((x) => x.id === p.id ? p : x) : [...prev, p];
      saveProjects(next);
      return next;
    });
    setActiveProjectId(p.id);
    setEditingId(null);
    setCreatingNew(false);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjects(next);
      if (activeProjectId === id) setActiveProjectId(next[0]?.id ?? null);
      return next;
    });
  };

  /* ── Classify ────────────────────────────────────────────────────────────── */
  const handleClassify = async (category: string, sub: string) => {
    if (allSelected.length === 0 || !activeProject) return;
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePaths: allSelected.map((f) => f.path),
          targetCategory: `${category}\\${sub}`,
          modloader: activeProject.loader,
          version: activeProject.version,
          projectName: activeProject.name,
        }),
      });
      if (!res.ok) return;
      const moved = new Set(allSelected.map((f) => f.path));
      setPendingFiles((prev) => prev.filter((f) => !moved.has(f.path)));
      setSelectedFiles([]);
      setSelectedLibFiles([]);
      setShowSubcategories(null);
      fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}`)
        .then((r) => r.json())
        .then((d) => setLibrary(d.library || []));
    } catch (_) {}
  };

  /* ── Unclassify ──────────────────────────────────────────────────────────── */
  const handleUnclassify = async () => {
    if (selectedLibFiles.length === 0 || !activeProject) return;
    const res = await fetch("/api/unclassify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePaths: selectedLibFiles.map((f) => f.path) }),
    });
    if (res.ok) {
      setSelectedLibFiles([]);
      const r = await fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}`);
      const d = await r.json();
      setLibrary(d.library || []);
    }
  };

  /* ── Auto Check Updates ────────────────────────────────────────────────── */
  useEffect(() => {
    if (activeProject && library.length > 0 && !autoCheckedProjects.current.has(activeProject.id)) {
      autoCheckedProjects.current.add(activeProject.id);
      handleCheckUpdates(); // Auto check updates silently on project load
    }
  }, [activeProject, library]);

  const handleCheckUpdates = async () => {
    if (!activeProject || library.length === 0) return;
    setCheckingUpdates(true);
    try {
      const res = await fetch("/api/modrinth/check-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mods: library, loader: activeProject.loader, gameVersion: activeProject.version }),
      });
      if (res.ok) {
        const data = await res.json();
        setModrinthStatus(data.updates || {});
      }
    } catch (_) {}
    setCheckingUpdates(false);
  };

  /* ── Download & Dismiss update ───────────────────────────────────────────── */
  const handleDownloadUpdate = async (path: string, url: string, filename: string) => {
    setDownloadingMods((prev) => ({ ...prev, [path]: true }));
    try {
      const res = await fetch("/api/modrinth/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, filename }),
      });
      if (res.ok) {
        setModrinthStatus((prev) => ({ ...prev, [path]: { ...prev[path], status: "updated_downloaded" } }));
      }
    } catch (_) {}
    setDownloadingMods((prev) => ({ ...prev, [path]: false }));
  };

  const handleDismissUpdate = (path: string) => {
    setIgnoredUpdates((prev) => new Set(prev).add(path));
  };

  /* ── Conflict Resolution ────────────────────────────────────────────────── */
  const handleResolveConflict = async (targetConflict: typeof conflicts[0], deleteOld: boolean) => {
    if (deleteOld) {
      // 1. Delete old file
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetConflict.oldFile.path }),
      });

      // 2. If new file is pending (in Downloads), auto-classify it to the old file's location
      if (!("category" in targetConflict.newFile) && activeProject) {
        await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcePaths: [targetConflict.newFile.path],
            targetCategory: `${targetConflict.oldFile.category}\\${targetConflict.oldFile.sub}`,
            modloader: activeProject.loader,
            version: activeProject.version,
          }),
        });
        setPendingFiles((prev) => prev.filter((f) => f.path !== targetConflict.newFile.path));
      }

    const r = await fetch(`/api/library?version=${activeProject?.version}&loader=${activeProject?.loader}`);
    const d = await r.json();
    setLibrary(d.library || []);
    } else {
      // Ignore this conflict so it doesn't pop up again
      if (targetConflict.conflictId) {
        setIgnoredConflicts((prev) => new Set(prev).add(targetConflict.conflictId!));
      }
    }
    
    setConflicts((prev) => prev.filter((c) => c.conflictId !== targetConflict.conflictId));
  };

  /* ── Check Conflicts (Library & Pending) ──────────────────────────────── */
  useEffect(() => {
    if (library.length === 0) return;
    
    const newConflicts: typeof conflicts = [];

    // 1. Check for conflicts WITHIN the library
    const grouped = new Map<string, LibraryFile[]>();
    for (const lib of library) {
      if (!lib.meta || lib.meta.modName === "unknown") continue;
      // Grouping by modId only. If they are in the same project folder, they shouldn't exist twice
      // even if their internal gameVersion is wrong.
      const key = `${lib.meta.modId && lib.meta.modId !== "unknown" ? lib.meta.modId : lib.meta.modName}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(lib);
    }
    
    for (const mods of grouped.values()) {
      if (mods.length > 1) {
        const id1 = mods[0].path;
        const id2 = mods[1].path;
        const conflictId = [id1, id2].sort().join("|");
        
        if (!ignoredConflicts.has(conflictId)) {
          newConflicts.push({ newFile: mods[1], oldFile: mods[0], conflictId });
        }
      }
    }

    // 2. Check pending files against library
    pendingFiles.forEach(pending => {
      const meta = pending.meta;
      if (!meta || meta.modName === "unknown") return;
      
      const existing = library.find(lib => {
        const libMeta = lib.meta;
        if (!libMeta) return false;
        
        // Ensure project types match (so a mod and a resourcepack with the same name don't clash)
        const type1 = libMeta.projectType || "mod";
        const type2 = meta.projectType || "mod";
        if (type1 !== type2) return false;

        // HIGHER PRECISION: Prioritize modId comparison. 
        // If both have modId, they must match exactly.
        if (libMeta.modId && libMeta.modId !== "unknown" && meta.modId && meta.modId !== "unknown") {
          return libMeta.modId === meta.modId;
        }
        
        // FALLBACK: If one or both are "unknown", we use the name, but this is less precise.
        return (libMeta.modName?.toLowerCase() === meta.modName?.toLowerCase());
      });

      if (existing) {
        // ONLY AUTO-DELETE if we are 100% sure it's the same mod (modId matches and is NOT unknown)
        const isSameModCertain = meta.modId && meta.modId !== "unknown" && meta.modId === existing.meta?.modId;
        
        if (isSameModCertain && existing.meta?.modVersion === meta.modVersion) {
          // AUTOMATIC DELETE: Identical mod version and ID found in library
          console.log("Auto-deleting duplicate from downloads:", pending.fileName);
          fetch("/api/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: pending.path }),
          });
          setPendingFiles(prev => prev.filter(f => f.path !== pending.path));
        } else {
          // UPDATE CONFLICT OR AMBIGUOUS MATCH
          const conflictId = [pending.path, existing.path].sort().join("|");
          if (!ignoredConflicts.has(conflictId)) {
            newConflicts.push({ newFile: pending, oldFile: existing, conflictId });
          }
        }
      }
    });

    setConflicts(prev => {
      const existingIds = new Set(prev.map(c => c.conflictId));
      const added = newConflicts.filter(c => !existingIds.has(c.conflictId));
      if (added.length === 0) return prev;
      return [...prev, ...added];
    });
  }, [library, pendingFiles, ignoredConflicts]);

  /* ── View Mod Description ────────────────────────────────────────────────── */
  const handleViewDescription = async () => {
    if (selectedLibFiles.length !== 1 || !activeProject) return;
    setLoadingDescription(true);
    const mod = selectedLibFiles[0];
    try {
      const res = await fetch("/api/modrinth/export-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mods: [mod], loader: activeProject.loader, gameVersion: activeProject.version }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data[0]) {
          setModDescription(data.data[0]);
        }
      }
    } catch (e) {
      console.error("Error al obtener la descripción", e);
    }
    setLoadingDescription(false);
  };


  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? "pr-[400px]" : "pr-0"}`}>
      <div className="space-y-8 pb-16">

      {/* ══════════════════════════════════════════════════════════════════════
          ROW 1 — Projects + Build (side by side on wide screens)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">

        {/* ── Projects ──────────────────────────────────────────────────── */}
        <ProjectsSection
          projects={projects}
          activeProjectId={activeProjectId}
          editingId={editingId}
          creatingNew={creatingNew}
          setActiveProjectId={setActiveProjectId}
          setEditingId={setEditingId}
          setCreatingNew={setCreatingNew}
          handleDeleteProject={handleDeleteProject}
          handleSaveProject={handleSaveProject}
          loaderColors={LOADER_COLOR}
        />

        {/* ── Build ─────────────────────────────────────────────────────── */}
        {activeProject && (
          <section className="animate-fade-up stagger-1 lg:min-w-[420px]">
            <SectionHeading
              icon={<Package className="w-4 h-4" />}
              title="Build"
              sub={`${activeProject.name} · ${activeProject.version} · ${activeProject.loader}`}
              accentColor="var(--color-accent)"
            />
            <BuildPanel
              projectName={activeProject.name}
              version={activeProject.version}
              loader={activeProject.loader}
            />
          </section>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ROW 2 — Pending + Categorize (left) | Library (right)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Pending + Categorize ────────────────────────────────── */}
        <div className="space-y-6">

          {/* Pending files */}
          <PendingFilesSection
            pendingFiles={pendingFiles}
            loading={loading}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            activeProject={activeProject}
          />

          {/* Quick Categorize */}
          <QuickCategorizeSection
            allSelected={allSelected}
            activeProject={activeProject}
            showSubcategories={showSubcategories}
            setShowSubcategories={setShowSubcategories}
            handleClassify={handleClassify}
            setSelectedFiles={setSelectedFiles}
            setSelectedLibFiles={setSelectedLibFiles}
          />
        </div>

        {/* ── RIGHT: Library ────────────────────────────────────────────── */}
        <LibrarySection
          library={library}
          loadingLibrary={loadingLibrary}
          selectedLibFiles={selectedLibFiles}
          setSelectedLibFiles={setSelectedLibFiles}
          activeProject={activeProject}
          downloadingMods={downloadingMods}
          modrinthStatus={modrinthStatus}
          ignoredUpdates={ignoredUpdates}
          conflicts={conflicts}
          setSidebarOpen={setSidebarOpen}
          checkingUpdates={checkingUpdates}
          handleCheckUpdates={handleCheckUpdates}
          handleViewDescription={handleViewDescription}
          loadingDescription={loadingDescription}
          handleUnclassify={handleUnclassify}
          handleDownloadUpdate={handleDownloadUpdate}
        />
      </div>

      {/* ── Modal for Description ────────────────────────────────────────────── */}
      {modDescription && (
        <DescriptionModal 
          modDescription={modDescription} 
          onClose={() => setModDescription(null)} 
        />
      )}

      {/* ── Sidebar de Alertas ─────────────────────────────────────────────── */}
      <AlertSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        conflicts={conflicts}
        modrinthStatus={modrinthStatus}
        ignoredUpdates={ignoredUpdates}
        library={library}
        downloadingMods={downloadingMods}
        handleResolveConflict={handleResolveConflict}
        handleDownloadUpdate={handleDownloadUpdate}
        handleDismissUpdate={handleDismissUpdate}
      />

    </div>
    </div>
  );
}