"use client";

import React, { useState, useEffect } from "react";
import {
  Package, Server, Zap, Plus, Pencil, Check, X, Trash2,
  Inbox, FolderOpen, ChevronRight, RefreshCw, Layers, BookOpen, Loader2
} from "lucide-react";
import { ModCard }          from "@/components/ModCard";
import { HotkeyCard }       from "@/components/HotkeyCard";
import { SkeletonLoader }   from "@/components/SkeletonLoader";
import { SubcategoryPanel } from "@/components/SubcategoryPanel";
import { BuildPanel }       from "@/components/BuildPanel";
import { CATEGORIES, LOADERS } from "@/lib/constants";
import type { Loader } from "@/lib/constants";

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface PendingFile {
  path: string;
  fileName: string;
  meta?: { version?: string; loader?: string; gameVersion?: string; modVersion?: string; modName?: string; modId?: string };
}

interface LibraryFile extends PendingFile {
  category: string;
  sub: string;
}

interface Project {
  id: string;
  name: string;
  version: string;
  loader: Loader;
}

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
  forge: "#FF8C00", neoforge: "#FF783C", fabric: "#66C8A0",
};

/* ── SectionHeading ─────────────────────────────────────────────────────────── */
function SectionHeading({ icon, title, sub, badge, accentColor }: {
  icon: React.ReactNode; title: string; sub?: string; badge?: number; accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: accentColor ? `color-mix(in srgb, ${accentColor} 12%, transparent)` : "rgba(187,150,228,0.1)",
          border: `1px solid ${accentColor ? `color-mix(in srgb, ${accentColor} 22%, transparent)` : "rgba(187,150,228,0.18)"}`,
          color: accentColor ?? "var(--color-primary)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="font-headline text-base leading-none" style={{ color: "var(--color-foreground)" }}>
            {title}
          </h2>
          {badge !== undefined && badge > 0 && (
            <span
              className="font-label rounded-full px-2 py-0.5 animate-fade-in"
              style={{ background: "var(--color-accent)", color: "#1a0a00", fontSize: "0.6rem" }}
            >
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── ProjectEditor ──────────────────────────────────────────────────────────── */
function ProjectEditor({ initial, onSave, onCancel }: {
  initial?: Project; onSave: (p: Project) => void; onCancel: () => void;
}) {
  const [name,    setName]    = useState(initial?.name    ?? "");
  const [version, setVersion] = useState(initial?.version ?? "1.20.1");
  const [loader,  setLoader]  = useState<Loader>(initial?.loader ?? "forge");
  const valid = name.trim().length > 0 && version.trim().length > 0;

  return (
    <div
      className="rounded-2xl p-4 animate-scale-in"
      style={{ background: "rgba(187,150,228,0.06)", border: "1px solid var(--color-border-strong)" }}
    >
      <p className="font-label mb-3" style={{ color: "var(--color-muted)", fontSize: "0.62rem" }}>
        {initial ? "Editar proyecto" : "Nuevo proyecto"}
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del proyecto"
          className="input-base w-52"
        />
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Versión (ej: 1.20.1)"
          className="input-base w-36"
        />
        <select
          value={loader}
          onChange={(e) => setLoader(e.target.value as Loader)}
          className="input-base"
          style={{ cursor: "pointer", color: LOADER_COLOR[loader] ?? "var(--color-foreground)" }}
        >
          {LOADERS.map((l) => (
            <option key={l} value={l} style={{ background: "var(--color-background)", color: LOADER_COLOR[l] ?? "inherit" }}>
              {l}
            </option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            disabled={!valid}
            onClick={() => onSave({ id: initial?.id ?? newId(), name: name.trim(), version: version.trim(), loader })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-subhead text-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--color-primary)", color: "var(--color-background)" }}
          >
            <Check className="w-3.5 h-3.5" /> Guardar
          </button>
          <button
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────────────── */
function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="py-14 text-center rounded-2xl animate-fade-in"
      style={{ border: "1px dashed var(--color-border)", background: "rgba(255,255,255,0.01)" }}
    >
      <div
        className="w-11 h-11 mx-auto mb-3.5 rounded-xl flex items-center justify-center animate-float"
        style={{ background: "rgba(187,150,228,0.06)", border: "1px solid var(--color-border)" }}
      >
        <Inbox className="w-5 h-5" style={{ color: "var(--color-muted)" }} />
      </div>
      <p className="font-body-med text-sm" style={{ color: "var(--color-muted)" }}>{message}</p>
    </div>
  );
}

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
    es.onmessage = (e) => {
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

  /* ── Check updates ───────────────────────────────────────────────────────── */
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

  /* ── Download update ─────────────────────────────────────────────────────── */
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

  /* ── Badge helper ────────────────────────────────────────────────────────── */
  function getBadge(f: LibraryFile) {
    const s = modrinthStatus[f.path];
    if (!s) return {};
    if (s.status === "update_available") return {
      badgeText: "↑ " + s.latestVersion,
      badgeColor: "bg-[rgba(255,208,102,0.15)] text-[#FFD066] border border-[rgba(255,208,102,0.3)]",
      onDownload: () => handleDownloadUpdate(f.path, s.downloadUrl, f.fileName.replace(f.meta?.modVersion ?? "", s.latestVersion)),
    };
    if (s.status === "updated")           return { badgeText: "Al día",             badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    if (s.status === "updated_downloaded") return { badgeText: "Descargado",         badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    return { badgeText: "No encontrado", badgeColor: "bg-white/8 text-foreground/40" };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-8 pb-16">

      {/* ══════════════════════════════════════════════════════════════════════
          ROW 1 — Projects + Build (side by side on wide screens)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">

        {/* ── Projects ──────────────────────────────────────────────────── */}
        <section className="animate-fade-up">
          <SectionHeading
            icon={<FolderOpen className="w-4 h-4" />}
            title="Proyectos"
            sub="Seleccioná o creá un proyecto para comenzar"
            accentColor="var(--color-primary)"
          />

          <div
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: "color-mix(in srgb, var(--color-card) 82%, transparent)",
              border: "1px solid var(--color-border)",
              backdropFilter: "blur(18px)",
            }}
          >
            {/* Project chips */}
            <div className="flex flex-wrap gap-2 items-center">
              {projects.map((p) => editingId === p.id ? null : (
                <button
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200"
                  style={{
                    background: activeProjectId === p.id ? "rgba(187,150,228,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${activeProjectId === p.id ? "rgba(187,150,228,0.4)" : "var(--color-border)"}`,
                    boxShadow: activeProjectId === p.id ? "0 0 16px rgba(187,150,228,0.10)" : "none",
                  }}
                >
                  {activeProjectId === p.id && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-primary)" }} />
                  )}
                  <span className="font-subhead text-sm" style={{ color: "var(--color-foreground)" }}>{p.name}</span>
                  <span className="font-label rounded-full px-1.5 py-0.5" style={{ background: "rgba(255,208,102,0.1)", color: "var(--color-accent)", fontSize: "0.58rem" }}>{p.version}</span>
                  <span className="font-label" style={{ color: LOADER_COLOR[p.loader] ?? "var(--color-muted)", opacity: 0.8, fontSize: "0.58rem" }}>{p.loader}</span>

                  {/* Edit/Delete */}
                  <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-0.5 transition-opacity">
                    <span
                      onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setCreatingNew(false); }}
                      className="w-5 h-5 flex items-center justify-center rounded-md transition-all"
                      style={{ color: "var(--color-muted)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded-md transition-all"
                      style={{ color: "var(--color-muted)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
                        (e.currentTarget as HTMLElement).style.color = "#f87171";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
                      }}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </span>
                  </span>
                </button>
              ))}

              <button
                onClick={() => { setCreatingNew(true); setEditingId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-body-med text-sm transition-all"
                style={{
                  border: "1px dashed var(--color-border-strong)",
                  color: "var(--color-muted)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-primary)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(187,150,228,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>

            {/* Editors */}
            {editingId && (
              <ProjectEditor
                initial={projects.find((p) => p.id === editingId)}
                onSave={handleSaveProject}
                onCancel={() => setEditingId(null)}
              />
            )}
            {creatingNew && (
              <ProjectEditor onSave={handleSaveProject} onCancel={() => setCreatingNew(false)} />
            )}

            {projects.length === 0 && !creatingNew && (
              <p className="font-caption italic" style={{ color: "var(--color-muted)" }}>
                Sin proyectos todavía — usá el botón <strong className="font-body-med not-italic">+ Nuevo</strong>
              </p>
            )}
          </div>
        </section>

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
          <section className="animate-fade-up stagger-2">
            <SectionHeading
              icon={<Inbox className="w-4 h-4" />}
              title="Ingresos Pendientes"
              sub="Archivos detectados en tu carpeta de Descargas"
              badge={pendingFiles.length}
              accentColor="var(--color-primary)"
            />
            <div className="space-y-2">
              {loading ? (
                <SkeletonLoader />
              ) : pendingFiles.length === 0 ? (
                <EmptyState message="Monitoreando Descargas... Descargá un .jar para verlo aquí" />
              ) : (
                pendingFiles.map((f, i) => {
                  const isSelected  = selectedFiles.some((s) => s.path === f.path);
                  const displayName = (f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName;
                  return (
                    <ModCard
                      key={f.path}
                      index={i}
                      name={displayName}
                      version={f.meta?.gameVersion ?? f.meta?.version ?? "unknown"}
                      modVersion={f.meta?.modVersion}
                      loader={f.meta?.loader ?? "unknown"}
                      isSelected={isSelected}
                      onClick={() => setSelectedFiles((prev) =>
                        isSelected ? prev.filter((s) => s.path !== f.path) : [...prev, f]
                      )}
                      activeVersion={activeProject?.version ?? ""}
                      activeLoader={activeProject?.loader ?? ""}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Quick Categorize */}
          <section className="animate-fade-up stagger-3">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,208,102,0.1)", border: "1px solid rgba(255,208,102,0.2)", color: "var(--color-accent)" }}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-headline text-base leading-none" style={{ color: "var(--color-foreground)" }}>
                    Categorización Rápida
                  </h2>
                  {allSelected.length > 0 && (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <ChevronRight className="w-3 h-3" style={{ color: "var(--color-muted)" }} />
                      <span className="font-caption max-w-[200px] truncate" style={{ color: "var(--color-primary)", opacity: 0.8 }}>
                        {allSelected.length === 1 ? allSelected[0].fileName : `${allSelected.length} archivos`}
                      </span>
                      <button
                        onClick={() => { setSelectedFiles([]); setSelectedLibFiles([]); setShowSubcategories(null); }}
                        className="font-label transition-colors"
                        style={{ color: "var(--color-muted)", fontSize: "0.58rem" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-foreground)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
                      >
                        Desmarcar
                      </button>
                    </div>
                  )}
                </div>
                <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {allSelected.length > 0 ? "Presioná 1, 2, 3 o hacé click en una categoría" : "Seleccioná uno o más archivos para categorizar"}
                </p>
              </div>
            </div>

            {/* No project warning */}
            {!activeProject && (
              <div
                className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in"
                style={{ border: "1px solid rgba(255,208,102,0.2)", background: "rgba(255,208,102,0.05)" }}
              >
                <span className="font-caption" style={{ color: "rgba(255,208,102,0.7)" }}>
                  Creá o seleccioná un proyecto antes de clasificar.
                </span>
              </div>
            )}

            {/* Subcategories or hotkey cards */}
            {showSubcategories && allSelected.length > 0 ? (
              <SubcategoryPanel
                activeCategory={showSubcategories}
                fileName={allSelected.length === 1 ? allSelected[0].fileName : `${allSelected.length} archivos seleccionados`}
                onSelect={handleClassify}
                onBack={() => setShowSubcategories(null)}
              />
            ) : (
              <div
                className={`grid grid-cols-3 gap-3 transition-all duration-300 ${
                  (allSelected.length === 0 || !activeProject) ? "opacity-35 pointer-events-none" : ""
                }`}
              >
                <HotkeyCard
                  num="1"
                  title=".essential"
                  desc="Fauna, Bosses, Arsenal, Dimensiones"
                  icon={<Package className="w-4 h-4" />}
                  color="wisteria"
                  onClick={() => setShowSubcategories(".essential")}
                />
                <HotkeyCard
                  num="2"
                  title=".local"
                  desc="Animaciones, Rendimiento, Partículas"
                  icon={<Zap className="w-4 h-4" />}
                  color="gold"
                  onClick={() => setShowSubcategories(".local")}
                />
                <HotkeyCard
                  num="3"
                  title=".server"
                  desc="Estructuras, Terreno, QoL servidor"
                  icon={<Server className="w-4 h-4" />}
                  color="wisteria"
                  onClick={() => setShowSubcategories(".server")}
                />
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT: Library ────────────────────────────────────────────── */}
        <section className="animate-fade-up" style={{ animationDelay: "0.18s" }}>
          {/* Library header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(102,200,160,0.1)", border: "1px solid rgba(102,200,160,0.2)", color: "#66C8A0" }}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-headline text-base leading-none" style={{ color: "var(--color-foreground)" }}>
                  Librería de Source
                </h2>
                <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {library.length > 0 ? `${library.length} mods instalados` : "Mods instalados en este proyecto"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedLibFiles.length === 1 && (
                <button
                  onClick={handleViewDescription}
                  disabled={loadingDescription}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-sm transition-all animate-fade-in disabled:opacity-50"
                  style={{ background: "rgba(102,200,160,0.1)", border: "1px solid rgba(102,200,160,0.25)", color: "#66C8A0", fontSize: "0.65rem" }}
                >
                  {loadingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                  Ver Descripción
                </button>
              )}
              {selectedLibFiles.length > 0 && (
                <button
                  onClick={handleUnclassify}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-sm transition-all animate-fade-in"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "0.65rem" }}
                >
                  Mover a Descargas
                </button>
              )}
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(187,150,228,0.08)",
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-primary)",
                  fontSize: "0.62rem",
                }}
                onMouseEnter={(e) => { if (!checkingUpdates) (e.currentTarget as HTMLElement).style.background = "rgba(187,150,228,0.14)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(187,150,228,0.08)"; }}
              >
                <RefreshCw className={`w-3 h-3 ${checkingUpdates ? "animate-spin" : ""}`} />
                {checkingUpdates ? "Buscando..." : "Buscar Updates"}
              </button>
            </div>
          </div>

          {/* Library grid */}
          {loadingLibrary ? (
            <SkeletonLoader />
          ) : library.length === 0 ? (
            <EmptyState message="No hay mods instalados en este proyecto aún" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {library.map((f, i) => {
                const displayName = (f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName;
                const isSelected  = selectedLibFiles.some((s) => s.path === f.path);
                const badge       = getBadge(f);
                return (
                  <ModCard
                    key={f.path}
                    index={i}
                    name={displayName}
                    version={f.meta?.gameVersion ?? f.meta?.version ?? "unknown"}
                    modVersion={f.meta?.modVersion}
                    loader={f.meta?.loader ?? "unknown"}
                    isSelected={isSelected}
                    onClick={() => setSelectedLibFiles((prev) =>
                      isSelected ? prev.filter((s) => s.path !== f.path) : [...prev, f]
                    )}
                    activeVersion={activeProject?.version ?? ""}
                    activeLoader={activeProject?.loader ?? ""}
                    badgeText={badge.badgeText}
                    badgeColor={badge.badgeColor}
                    onDownload={badge.onDownload}
                    isDownloading={downloadingMods[f.path]}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Modal for Description ────────────────────────────────────────────── */}
      {modDescription && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => setModDescription(null)}
        >
          <div 
            className="rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" 
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border-strong)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start p-5 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h2 className="text-xl font-headline" style={{ color: "var(--color-foreground)" }}>
                  {modDescription.title || modDescription.modName || "Descripción del Mod"}
                </h2>
                {modDescription.url && (
                  <a href={modDescription.url} target="_blank" rel="noreferrer" className="text-sm hover:underline mt-1 block" style={{ color: "var(--color-accent)" }}>
                    Ver en Modrinth ↗
                  </a>
                )}
              </div>
              <button 
                onClick={() => setModDescription(null)} 
                className="p-2 rounded-xl transition-colors hover:bg-white/10" 
                style={{ color: "var(--color-muted)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modDescription.description && (
                <p className="font-body-med mb-6 text-sm italic" style={{ color: "var(--color-primary)" }}>
                  "{modDescription.description}"
                </p>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {modDescription.body ? (
                  modDescription.body
                ) : (
                  <span className="opacity-70">No hay documentación detallada (body) disponible para este mod en Modrinth.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}