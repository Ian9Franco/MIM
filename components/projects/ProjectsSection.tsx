import React from "react";
import { FolderOpen, Pencil, Trash2, Plus } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { ProjectEditor } from "./ProjectEditor";
import type { Project } from "@/lib/types";

interface ProjectsSectionProps {
  projects: Project[];
  activeProjectId: string | null;
  editingId: string | null;
  creatingNew: boolean;
  setActiveProjectId: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setCreatingNew: (b: boolean) => void;
  handleDeleteProject: (id: string) => void;
  handleSaveProject: (p: Project) => void;
  loaderColors: Record<string, string>;
}

/**
 * Sección principal que muestra la lista de proyectos (instancias) del usuario.
 * Permite seleccionar, editar y crear nuevos proyectos.
 */
export function ProjectsSection({
  projects,
  activeProjectId,
  editingId,
  creatingNew,
  setActiveProjectId,
  setEditingId,
  setCreatingNew,
  handleDeleteProject,
  handleSaveProject,
  loaderColors,
}: ProjectsSectionProps) {
  return (
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
              <span className="font-label" style={{ color: loaderColors[p.loader] ?? "var(--color-muted)", opacity: 0.8, fontSize: "0.58rem" }}>{p.loader}</span>

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
  );
}
