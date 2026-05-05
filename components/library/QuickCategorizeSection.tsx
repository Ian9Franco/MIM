import React from "react";
import { Zap, ChevronRight, Package, Server } from "lucide-react";
import { SubcategoryPanel } from "./SubcategoryPanel";
import { HotkeyCard } from "../ui/HotkeyCard";
import type { PendingFile, LibraryFile, Project } from "@/lib/types";

interface QuickCategorizeSectionProps {
  allSelected: (PendingFile | LibraryFile)[];
  activeProject: Project | null;
  showSubcategories: string | null;
  setShowSubcategories: (s: string | null) => void;
  handleClassify: (cat: string, sub: string) => void;
  setSelectedFiles: (p: any) => void;
  setSelectedLibFiles: (p: any) => void;
}

export function QuickCategorizeSection({
  allSelected,
  activeProject,
  showSubcategories,
  setShowSubcategories,
  handleClassify,
  setSelectedFiles,
  setSelectedLibFiles
}: QuickCategorizeSectionProps) {
  return (
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
          projectName={activeProject?.name || null}
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
  );
}
