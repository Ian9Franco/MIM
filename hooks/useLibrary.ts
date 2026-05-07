"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Project, LibraryFile, PendingFile } from "@/lib/types";

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

  // Memoización agresiva para optimizar rendimiento con grandes librerías
  const libraryHash = useMemo(() => 
    library.map(m => `${m.path}:${m.fileName}`).join('|'), 
    [library.length, library.map(m => m.path).join(',')]
  );

  const selectedHash = useMemo(() => 
    selectedLibFiles.map(f => f.path).join('|'),
    [selectedLibFiles.length, selectedLibFiles.map(f => f.path).join(',')]
  );

  const statusHash = useMemo(() => 
    Object.keys(modrinthStatus).sort().join('|'),
    [Object.keys(modrinthStatus).length]
  );

  const projectHash = useMemo(() => 
    activeProject ? `${activeProject.version}:${activeProject.loader}:${activeProject.name}` : '',
    [activeProject?.version, activeProject?.loader, activeProject?.name]
  );

  useEffect(() => {
    if (!activeProject) { setLibrary([]); return; }
    setLoadingLibrary(true);
    fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`)
      .then((r) => r.json())
      .then((d) => { setLibrary(d.library || []); setLoadingLibrary(false); })
      .catch(() => setLoadingLibrary(false));
  }, [projectHash]);

  const checkUpdates = useCallback(async (force = false) => {
    if (!activeProject) return;
    setCheckingUpdates(true);
    try {
      // 1. Gather local mods
      const localMods = [...library, ...pendingFiles];
      
      // 2. Fetch collection mods (optional background check)
      let collectionMods: any[] = [];
      try {
        const collRes = await fetch("/api/modrinth/collections");
        if (collRes.ok) {
          const { collections } = await collRes.json();
          for (const coll of (collections || [])) {
            if (coll.isLocal) continue;
            // Note: We don't fetch every collection's mods to avoid hitting rate limits, 
            // but we can fetch 'followed-projects' which is the main one.
            if (coll.id === "followed-projects") {
              const modsRes = await fetch(`/api/modrinth/collections?collectionId=${coll.id}`);
              if (modsRes.ok) {
                const { mods: collItems } = await modsRes.json();
                collectionMods = (collItems || []).map((m: any) => ({
                  path: `collection:${m.projectId}`, // Special path for virtual mods
                  fileName: m.title,
                  meta: {
                    modId: m.projectId,
                    modName: m.title,
                    modVersion: "0.0.0", // Assume we want to know any update if not installed
                    projectType: m.projectType || "mod"
                  }
                }));
              }
            }
          }
        }
      } catch (e) {
        console.warn("[useLibrary] Failed to fetch collection mods for updates", e);
      }

      const res = await fetch("/api/modrinth/check-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mods: [...localMods, ...collectionMods], 
          loader: activeProject.loader, 
          gameVersion: activeProject.version,
          forceRefresh: force
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setModrinthStatus(data.updates || {});
      }
    } catch (_) {}
    setCheckingUpdates(false);
  }, [activeProject, libraryHash, pendingFiles.length]);

  const handleCheckUpdates = useCallback(() => {
    checkUpdates(true);
  }, [checkUpdates]);

  const refreshLibrary = useCallback(async () => {
    if (!activeProject) return;
    setLoadingLibrary(true);
    try {
      const res = await fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`);
      if (res.ok) {
        const data = await res.json();
        setLibrary(data.library || []);
      }
    } catch (_) {}
    setLoadingLibrary(false);
  }, [projectHash]);

  useEffect(() => {
    if (activeProject && library.length > 0 && !autoCheckedProjects.current.has(activeProject.id)) {
      autoCheckedProjects.current.add(activeProject.id);
      checkUpdates(false);
    }
  }, [activeProject, library, checkUpdates]);

  useEffect(() => {
    if (activeProject && pendingFiles.length > 0) {
      checkUpdates(false);
    }
  }, [activeProject, pendingFiles.length, checkUpdates]);

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
          targetCategory: `${category}\\${sub}`,
          modloader: activeProject.loader,
          version: activeProject.version,
          projectName: activeProject.name,
        }),
      });
      if (!res.ok) return;
      const moved = new Set(allSelected.map((f) => f.path));
      setPendingFilesLocal((prev: any) => prev.filter((f: any) => !moved.has(f.path)));
      clearSelected();
      fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`)
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
      const r = await fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`);
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
        // Silent success, the UI already updates the descriptions automatically
      }
    } catch (e) {
      // Ignored to avoid console clutter
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
    handleClassify,
    refreshLibrary
  };
}
