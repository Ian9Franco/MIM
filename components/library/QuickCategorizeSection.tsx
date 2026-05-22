import React, { useState } from "react";
import { Zap, ChevronRight, Package, Server, Trash2, X, Cpu, ChevronDown } from "lucide-react";
import { SubcategoryPanel } from "./SubcategoryPanel";
import { HotkeyCard } from "../ui/HotkeyCard";
import type { PendingFile, LibraryFile, Project } from "@/lib/core/types";

interface QuickCategorizeSectionProps {
  allSelected: (PendingFile | LibraryFile)[];
  activeProject: Project | null;
  showSubcategories: string | null;
  setShowSubcategories: (s: string | null) => void;
  handleClassify: (cat: string, sub: string) => void;
  setSelectedFiles: (p: any) => void;
  setSelectedLibFiles: (p: any) => void;
  onDeleteSelected?: () => void;
  onUnclassifySelected?: () => void;
  onAutoCategorize?: () => void;
  autoClassify?: boolean;
  setAutoClassify?: (v: boolean) => void;
}

export function QuickCategorizeSection({
  allSelected,
  activeProject,
  showSubcategories,
  setShowSubcategories,
  handleClassify,
  setSelectedFiles,
  setSelectedLibFiles,
  onDeleteSelected,
  onUnclassifySelected,
  onAutoCategorize,
  autoClassify = false,
  setAutoClassify
}: QuickCategorizeSectionProps) {
  const [showAutoMenu, setShowAutoMenu] = useState(false);

  // Atajos de teclado: 1, 2, 3 y C
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (allSelected.length === 0 || !activeProject) return;

      if (e.key === "1") {
        e.preventDefault();
        setShowSubcategories(".essential");
      }
      if (e.key === "2") {
        e.preventDefault();
        setShowSubcategories(".local");
      }
      if (e.key === "3") {
        e.preventDefault();
        setShowSubcategories(".server");
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        if (allSelected.length > 0) {
          handleClassify("auto", "");
        } else {
          setAutoClassify?.(!autoClassify);
          if (onAutoCategorize && !autoClassify) onAutoCategorize();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allSelected.length, activeProject, setShowSubcategories, handleClassify, autoClassify, setAutoClassify, onAutoCategorize]);

  return (
    <section className="animate-fade-up stagger-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--color-accent-bg)", border: "1px solid var(--color-accent-border)", color: "var(--color-accent)" }}
        >
          <Zap className="w-4 h-4" />
        </div>
        <h2 className="font-headline text-base leading-none" style={{ color: "var(--color-foreground)" }}>
          Categorización Rápida
        </h2>
        
        {activeProject && (
          <button
            onClick={() => {
              if (allSelected.length > 0) {
                handleClassify("auto", "");
              } else {
                setAutoClassify?.(!autoClassify);
                if (onAutoCategorize && !autoClassify) onAutoCategorize();
              }
            }}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-2xl transition-all hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-wider shadow-lg border-2 ${
              allSelected.length > 0
                ? "bg-primary border-primary/40 text-white shadow-primary/20"
                : autoClassify 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 ring-4 ring-emerald-500/10' 
                  : 'bg-white/5 border-white/10 text-muted'
            }`}
            title={allSelected.length > 0 ? "Clasificar automáticamente todos los mods seleccionados" : "Activar modo automático: organiza las descargas nuevas al instante"}
          >
            <Cpu className={`w-4 h-4 ${autoClassify ? 'animate-pulse' : ''}`} />
            <span>
              {allSelected.length > 0 
                ? `Clasificar ${allSelected.length} ahora` 
                : autoClassify ? "MODO AUTO: ON" : "ACTIVAR AUTO"}
            </span>
          </button>
        )}
      </div>
      {/* Selected Mods Workbench */}
      {allSelected.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <div 
            className="rounded-[2rem] p-5 border relative overflow-hidden transition-all duration-500"
            style={{ 
              background: "var(--color-card)", 
              borderColor: "var(--color-border)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.05)"
            }}
          >
            {/* Header info for the bucket */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-primary)" }} />
                <span className="font-headline text-xs tracking-wider uppercase opacity-60" style={{ color: "var(--color-foreground)" }}>
                  Bandeja de Clasificación
                </span>
              </div>
              <button
                onClick={() => { setSelectedFiles([]); setSelectedLibFiles([]); setShowSubcategories(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all group hover:scale-105 active:scale-95 shadow-sm hover:bg-white/5"
                style={{ 
                  background: "rgba(255, 255, 255, 0.03)", 
                  border: "1px solid var(--color-border)",
                  color: "var(--color-muted)"
                }}
                title="Quitar todos los archivos de la bandeja y devolverlos a la lista"
              >
                <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="font-headline text-[9px] tracking-widest uppercase font-bold">
                  Deseleccionar todo
                </span>
              </button>
            </div>

            {/* The Grid */}
            <div className="grid grid-cols-5 gap-3.5">
              {allSelected.map((mod, idx) => {
                const isPending = 'path' in mod && !('category' in mod);
                const meta = mod.meta;
                
                // Real compatibility check logic matching ModCard.tsx
                const activeVer = activeProject?.version || "";
                const activeLdr = activeProject?.loader || "";
                const modVer = meta?.gameVersion || "unknown";
                const modLdr = meta?.loader || "unknown";
                
                const isCompatibleRange = (() => {
                  if (modVer === "unknown" || modVer === activeVer) return true;
                  if (modVer.endsWith("+")) return activeVer.startsWith(modVer.slice(0, -1));
                  if (activeVer.startsWith(modVer + ".")) return true;
                  if (modVer.includes(" - ")) {
                    const [start, end] = modVer.split(" - ");
                    return activeVer.startsWith(start) || activeVer.startsWith(end);
                  }
                  return false;
                })();

                const isCompatibleLoader = (() => {
                  if (modLdr === "unknown" || activeLdr === "" || modLdr === activeLdr) return true;
                  
                  // Exception for 1.20.1: Forge and NeoForge are compatible
                  if (activeVer === "1.20.1") {
                    const l = modLdr.toLowerCase();
                    const al = activeLdr.toLowerCase();
                    if ((l === "forge" && al === "neoforge") || (l === "neoforge" && al === "forge")) {
                      return true;
                    }
                  }
                  
                  return false;
                })();

                const isCompatible = (modVer === "unknown" || isCompatibleRange) && isCompatibleLoader;

                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      if (isPending) {
                        setSelectedFiles((prev: any) => prev.filter((s: any) => s.path !== (mod as PendingFile).path));
                      } else {
                        setSelectedLibFiles((prev: any) => prev.filter((s: any) => s.path !== (mod as LibraryFile).path));
                      }
                    }}
                    className="group relative aspect-square rounded-2xl flex items-center justify-center border transition-all hover:scale-110 active:scale-95 animate-fade-up cursor-pointer"
                    style={{ 
                      background: !isCompatible ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                      borderColor: !isCompatible ? "rgba(239,68,68,0.25)" : "var(--color-border)",
                      animationDelay: `${idx * 0.04}s`,
                      boxShadow: isCompatible ? "none" : "0 0 15px rgba(239,68,68,0.1)"
                    }}
                    title={mod.fileName}
                  >
                    {!isCompatible && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-background z-10 shadow-lg">
                        <Zap className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    )}
                    
                    {meta?.iconBase64 ? (
                      <img 
                        src={meta.iconBase64} 
                        alt="" 
                        className="w-8 h-8 object-cover rounded-md shadow-sm" 
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <Package className={`w-5.5 h-5.5 transition-colors ${!isCompatible ? "text-red-400" : "text-muted group-hover:text-primary"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Instruction Footer & Bulk Actions */}
            <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-3">
               <div className="flex items-center justify-between">
                 <p className="font-caption text-[11px] italic opacity-40" style={{ color: "var(--color-foreground)" }}>
                   {allSelected.length} {allSelected.length === 1 ? "archivo listo" : "archivos listos"} para procesar
                 </p>
                 
                 <div className="flex items-center gap-2">
                   {/* Unclassify Selected (Mover a Descargas) */}
                   {allSelected.length > 0 && onUnclassifySelected && (
                     <button
                       onClick={onUnclassifySelected}
                       className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-[10px] font-bold uppercase tracking-wider"
                       style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--color-foreground)" }}
                       title="Mover archivos seleccionados de vuelta a Descargas"
                     >
                       Mover a Descargas
                     </button>
                   )}

                   {/* Delete Selected (only if there are pending files) */}
                   {allSelected.some(m => 'path' in m && !('category' in m)) && onDeleteSelected && (
                     <button
                       onClick={onDeleteSelected}
                       className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-[10px] font-bold uppercase tracking-wider"
                       style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
                       title="Eliminar permanentemente los archivos de descargas seleccionados"
                     >
                       Eliminar
                     </button>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories area title/instruction (Only when no items) */}
      {allSelected.length === 0 && (
        <div className="mb-6 px-1">
           <p className="font-caption text-sm" style={{ color: "var(--color-muted)" }}>
             Seleccioná uno o más archivos de la izquierda para comenzar a clasificar.
           </p>
        </div>
      )}

      {/* No project warning */}
      {!activeProject && (
        <div
          className="mb-6 px-4 py-3 rounded-2xl flex items-center gap-2 animate-fade-in"
          style={{ border: "1px solid var(--color-accent-border)", background: "var(--color-accent-bg)" }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
          <span className="font-caption text-xs" style={{ color: "var(--color-accent)" }}>
            Creá o seleccioná un proyecto para habilitar las categorías.
          </span>
        </div>
      )}

      {/* Destination Categories */}
      <div className="space-y-4 mb-2">
         <span className="font-headline text-[10px] tracking-widest uppercase opacity-40 px-1" style={{ color: "var(--color-foreground)" }}>
           Destinos de Clasificación
         </span>
      </div>

      {showSubcategories && allSelected.length > 0 && activeProject ? (
        <SubcategoryPanel
          activeCategory={showSubcategories}
          fileName={allSelected.length === 1 ? allSelected[0].fileName : `${allSelected.length} archivos seleccionados`}
          projectName={activeProject?.name || null}
          onSelect={handleClassify}
          onBack={() => setShowSubcategories(null)}
        />
      ) : (
        <div
          className={`flex flex-col gap-3.5 transition-all duration-500 ${
            (allSelected.length === 0 || !activeProject) ? "opacity-35 pointer-events-none grayscale-[0.5]" : ""
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
