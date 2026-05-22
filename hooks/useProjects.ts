"use client";
import { useState, useEffect, useCallback } from "react";
import type { Project } from "@/lib/core/types";

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

  // Emit global event when active project changes to keep other managers (like GATE) in sync
  useEffect(() => {
    if (activeProject && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("active-project-changed", { detail: activeProject }));
    }
  }, [activeProject]);

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
