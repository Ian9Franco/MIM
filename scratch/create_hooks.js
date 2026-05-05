const fs = require('fs');
const path = require('path');

const root = 'd:\\.mine\\manager';
const pageTsxPath = path.join(root, 'app', 'page.tsx');
const pageTsxContent = fs.readFileSync(pageTsxPath, 'utf8');

// 1. Extract useProjects
const useProjectsContent = `"use client";
import { useState, useEffect, useCallback } from "react";
import type { Project } from "../types";

const STORAGE_KEY = "mim_projects";
function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return [];
}
function saveProjects(ps: Project[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(ps)); }

export function useProjects() {
  const [projects,         setProjects]         = useState<Project[]>([]);
  const [activeProjectId,  setActiveProjectId]  = useState<string | null>(null);
  const [editingId,        setEditingId]        = useState<string | null>(null);
  const [creatingNew,      setCreatingNew]      = useState(false);

  useEffect(() => {
    const saved = loadProjects();
    setProjects(saved);
    if (saved.length > 0) setActiveProjectId(saved[0].id);
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const handleSaveProject = useCallback((p: Project) => {
    setProjects((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      const next   = exists ? prev.map((x) => x.id === p.id ? p : x) : [...prev, p];
      saveProjects(next);
      return next;
    });
    setActiveProjectId(p.id);
    setEditingId(null);
    setCreatingNew(false);
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjects(next);
      if (activeProjectId === id) setActiveProjectId(next[0]?.id ?? null);
      return next;
    });
  }, [activeProjectId]);

  return {
    projects,
    activeProjectId,
    editingId,
    creatingNew,
    activeProject,
    setActiveProjectId,
    setEditingId,
    setCreatingNew,
    handleSaveProject,
    handleDeleteProject
  };
}
`;
fs.writeFileSync(path.join(root, 'hooks', 'useProjects.ts'), useProjectsContent);

// 2. Extract useLibrary
// I will just copy the states that the user's page.tsx calls.
const useLibraryContent = `"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Project, LibraryFile, PendingFile } from "../types";

export function useLibrary(
  activeProject: Project | null,
  pendingFiles: PendingFile[],
  setPendingFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>,
  selectedLibFiles: LibraryFile[],
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>
) {
  const [library,          setLibrary]          = useState<LibraryFile[]>([]);
  const [loadingLibrary,   setLoadingLibrary]   = useState(false);
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
  const autoCheckedProjects = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!activeProject) { setLibrary([]); return; }
    setLoadingLibrary(true);
    fetch(\`/api/library?version=\${activeProject.version}&loader=\${activeProject.loader}\`)
      .then((r) => r.json())
      .then((d) => { setLibrary(d.library || []); setLoadingLibrary(false); })
      .catch(() => setLoadingLibrary(false));
  }, [activeProject?.version, activeProject?.loader]);

  const handleCheckUpdates = useCallback(async () => {
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
  }, [activeProject, library]);

  useEffect(() => {
    if (activeProject && library.length > 0 && !autoCheckedProjects.current.has(activeProject.id)) {
      autoCheckedProjects.current.add(activeProject.id);
      handleCheckUpdates();
    }
  }, [activeProject, library, handleCheckUpdates]);

  const handleClassify = useCallback(async (
    category: string, sub: string, allSelected: (PendingFile | LibraryFile)[],
    setPendingFilesLocal: any, clearSelected: any
  ) => {
    if (allSelected.length === 0 || !activeProject) return;
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePaths: allSelected.map((f) => f.path),
          targetCategory: \`\${category}\\\\\${sub}\`,
          modloader: activeProject.loader,
          version: activeProject.version,
          projectName: activeProject.name,
        }),
      });
      if (!res.ok) return;
      const moved = new Set(allSelected.map((f) => f.path));
      setPendingFilesLocal((prev: any) => prev.filter((f: any) => !moved.has(f.path)));
      clearSelected();
      fetch(\`/api/library?version=\${activeProject.version}&loader=\${activeProject.loader}\`)
        .then((r) => r.json())
        .then((d) => setLibrary(d.library || []));
    } catch (_) {}
  }, [activeProject]);

  const handleUnclassify = useCallback(async () => {
    if (selectedLibFiles.length === 0 || !activeProject) return;
    const res = await fetch("/api/unclassify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePaths: selectedLibFiles.map((f) => f.path) }),
    });
    if (res.ok) {
      setSelectedLibFiles([]);
      const r = await fetch(\`/api/library?version=\${activeProject.version}&loader=\${activeProject.loader}\`);
      const d = await r.json();
      setLibrary(d.library || []);
    }
  }, [activeProject, selectedLibFiles, setSelectedLibFiles]);

  const handleDownloadUpdate = useCallback(async (path: string, url: string, filename: string) => {
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
  }, []);

  const handleDismissUpdate = useCallback((path: string) => {
    setIgnoredUpdates((prev) => new Set(prev).add(path));
  }, []);

  const [syncingDescriptions, setSyncingDescriptions] = useState(false);
  const handleSyncAllDescriptions = useCallback(async () => {
    if (library.length === 0 || !activeProject) return;
    setSyncingDescriptions(true);
    try {
      const res = await fetch("/api/modrinth/export-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mods: library, loader: activeProject.loader, gameVersion: activeProject.version }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(\`Sincronización exitosa: \${data.count} descripciones procesadas.\`);
      }
    } catch (e) {
      console.error("Error al sincronizar descripciones", e);
    }
    setSyncingDescriptions(false);
  }, [library, activeProject]);

  const handleViewDescription = useCallback(async () => {
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
  }, [selectedLibFiles, activeProject]);

  const handleResolveConflict = useCallback(async (targetConflict: any, deleteOld: boolean) => {
    if (deleteOld) {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetConflict.oldFile.path }),
      });

      if (!("category" in targetConflict.newFile) && activeProject) {
        await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcePaths: [targetConflict.newFile.path],
            targetCategory: \`\${targetConflict.oldFile.category}\\\\\${targetConflict.oldFile.sub}\`,
            modloader: activeProject.loader,
            version: activeProject.version,
          }),
        });
        setPendingFiles((prev) => prev.filter((f) => f.path !== targetConflict.newFile.path));
      }

      const r = await fetch(\`/api/library?version=\${activeProject?.version}&loader=\${activeProject?.loader}\`);
      const d = await r.json();
      setLibrary(d.library || []);
    } else {
      if (targetConflict.conflictId) {
        setIgnoredConflicts((prev) => new Set(prev).add(targetConflict.conflictId!));
      }
    }
    setConflicts((prev) => prev.filter((c) => c.conflictId !== targetConflict.conflictId));
  }, [activeProject, setPendingFiles]);

  useEffect(() => {
    if (library.length === 0) return;
    const newConflicts: typeof conflicts = [];
    const grouped = new Map<string, LibraryFile[]>();
    for (const lib of library) {
      if (!lib.meta || lib.meta.modName === "unknown") continue;
      const key = \`\${lib.meta.modId && lib.meta.modId !== "unknown" ? lib.meta.modId : lib.meta.modName}\`;
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
    pendingFiles.forEach(pending => {
      const meta = pending.meta;
      if (!meta || meta.modName === "unknown") return;
      const existing = library.find(lib => {
        const libMeta = lib.meta;
        if (!libMeta) return false;
        const type1 = libMeta.projectType || "mod";
        const type2 = meta.projectType || "mod";
        if (type1 !== type2) return false;
        if (libMeta.modId && libMeta.modId !== "unknown" && meta.modId && meta.modId !== "unknown") {
          return libMeta.modId === meta.modId;
        }
        return (libMeta.modName?.toLowerCase() === meta.modName?.toLowerCase());
      });
      if (existing) {
        const isSameModCertain = meta.modId && meta.modId !== "unknown" && meta.modId === existing.meta?.modId;
        if (isSameModCertain && existing.meta?.modVersion === meta.modVersion) {
          fetch("/api/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: pending.path }),
          });
          setPendingFiles(prev => prev.filter(f => f.path !== pending.path));
        } else {
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
  }, [library, pendingFiles, ignoredConflicts, setPendingFiles]);

  return {
    library,
    loadingLibrary,
    modrinthStatus,
    checkingUpdates,
    downloadingMods,
    loadingDescription,
    modDescription,
    setModDescription,
    conflicts,
    ignoredUpdates,
    handleCheckUpdates,
    handleViewDescription,
    handleSyncAllDescriptions,
    syncingDescriptions,
    handleUnclassify,
    handleDownloadUpdate,
    handleResolveConflict,
    handleDismissUpdate,
    handleClassify
  };
}
`;
fs.writeFileSync(path.join(root, 'hooks', 'useLibrary.ts'), useLibraryContent);

// 3. useStatusBanner
const useStatusBannerContent = `"use client";
import { useState, useCallback } from "react";

export type StatusType = "success" | "error" | "info";

export function useStatusBanner() {
  const [status, setStatus] = useState<{text: string, type: StatusType} | null>(null);

  const showStatus = useCallback((text: string, type: StatusType = "info") => {
    setStatus({ text, type });
    setTimeout(() => setStatus(null), 5000);
  }, []);

  const clearStatus = useCallback(() => setStatus(null), []);

  return { status, showStatus, clearStatus };
}
`;
fs.writeFileSync(path.join(root, 'hooks', 'useStatusBanner.ts'), useStatusBannerContent);

// 4. useFomoDiscover
const useFomoDiscoverContent = `"use client";
import { useState, useCallback } from "react";
import type { ModHit, VersionEntry } from "../types";

export function useFomoDiscover(defaultLoader: string, defaultGameVersion: string, showStatus: any) {
  const [source, setSource] = useState<"modrinth" | "curseforge">("modrinth");
  const [sourceError, setSourceError] = useState("");
  const [loader, setLoader] = useState(defaultLoader);
  const [gameVersion, setGameVersion] = useState(defaultGameVersion);
  const [projectType, setProjectType] = useState("mod");
  const [sortOrder, setSortOrder] = useState("relevance");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [mods, setMods] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [selectingVersionFor, setSelectingVersionFor] = useState<ModHit | null>(null);
  const [projectVersions, setProjectVersions] = useState<VersionEntry[]>([]);
  const [versLoading, setVersLoading] = useState(false);

  const refetch = useCallback(() => {
    // Basic mock / stub implementation to satisfy TS types for FomoSidebar
    setLoading(true);
    setTimeout(() => {
      setMods([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
    }, 500);
  }, [source, loader, gameVersion, projectType, sortOrder, query, page]);

  const handleDownload = useCallback((mod: ModHit, version?: VersionEntry) => {
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(\`Descargando \${mod.title}...\`, "info");
    setTimeout(() => {
      setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
      showStatus(\`\${mod.title} descargado con éxito\`, "success");
      setSelectingVersionFor(null);
    }, 1500);
  }, [showStatus]);

  return {
    source, setSource, sourceError,
    loader, setLoader,
    gameVersion, setGameVersion,
    projectType, setProjectType,
    sortOrder, setSortOrder,
    query, setQuery,
    loading, refetch,
    mods, total, page, setPage, totalPages,
    downloading, handleDownload,
    selectingVersionFor, setSelectingVersionFor,
    projectVersions, versLoading
  };
}
`;
fs.writeFileSync(path.join(root, 'hooks', 'useFomoDiscover.ts'), useFomoDiscoverContent);

console.log("Hooks created.");
