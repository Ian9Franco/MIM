"use client";

import React, { useState } from "react";
import { Plus, ArrowLeft, Trash2, X } from "lucide-react";
import { useProjectSubcategories } from "@/hooks/useProjectSubcategories";
import { ConfirmModal } from "../ui/ConfirmModal";

interface SubcategoryPanelProps {
  activeCategory: string;
  fileName: string;
  projectName: string | null;
  onSelect: (category: string, sub: string) => void;
  onBack: () => void;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ".essential": { label: "Essential · Core",    color: "#BB96E4", bg: "rgba(187,150,228,0.07)", border: "rgba(187,150,228,0.2)"  },
  ".local":     { label: "Local · Client-side", color: "#FFD066", bg: "rgba(255,208,102,0.07)", border: "rgba(255,208,102,0.18)" },
  ".server":    { label: "Server-side",          color: "#66C8A0", bg: "rgba(102,200,160,0.07)", border: "rgba(102,200,160,0.18)" },
};

export function SubcategoryPanel({ activeCategory, fileName, projectName, onSelect, onBack }: SubcategoryPanelProps) {
  const {
    subcategories,
    loading,
    addSubcategory,
    removeSubcategory,
  } = useProjectSubcategories(projectName);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [subToDelete, setSubToDelete] = useState<string | null>(null);
  
  const subs = subcategories?.[activeCategory] ?? [];
  const meta = CATEGORY_META[activeCategory] ?? CATEGORY_META[".essential"];

  const handleAddSubcategory = async () => {
    if (!newSubName.trim()) return;
    const success = await addSubcategory(activeCategory, newSubName.trim().toLowerCase());
    if (success) {
      setNewSubName("");
      setIsAdding(false);
    }
  };

  const handleRemoveSubcategory = async () => {
    if (!subToDelete) return;
    await removeSubcategory(activeCategory, subToDelete);
    setSubToDelete(null);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden animate-scale-in"
      style={{
        background: "color-mix(in srgb, var(--color-card) 85%, transparent)",
        border: `1px solid ${meta.border}`,
        backdropFilter: "blur(18px)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: meta.bg, borderBottom: `1px solid ${meta.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--color-foreground)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div>
            <p className="font-label" style={{ color: meta.color, fontSize: "0.62rem" }}>{meta.label}</p>
            <p className="font-caption truncate max-w-[260px]" style={{ color: "var(--color-muted)" }}>
              {fileName}
            </p>
          </div>
        </div>

        <span className="font-label" style={{ color: "var(--color-muted)", fontSize: "0.6rem" }}>
          {subs.length} categorías
        </span>
      </div>

      {/* Add subcategory input */}
      {isAdding ? (
        <div className="px-4 py-2 flex items-center gap-2">
          <input
            type="text"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubcategory();
              if (e.key === "Escape") setIsAdding(false);
            }}
            placeholder="Nombre de subcategoría..."
            className="flex-1 px-3 py-1.5 rounded-lg text-sm font-body-med bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/25"
            autoFocus
          />
          <button
            onClick={handleAddSubcategory}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            Agregar
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="p-1.5 rounded-lg hover:bg-white/10"
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="px-4 py-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10"
            style={{ color: meta.color }}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar subcategoría
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {subs.map((sub, i) => (
          <div
            key={sub}
            className="animate-fade-up group relative flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl overflow-hidden capitalize transition-all duration-200"
            style={{
              animationDelay: `${i * 0.025}s`,
              opacity: 0,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = meta.bg;
              el.style.borderColor = meta.border;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.02)";
              el.style.borderColor = "rgba(255,255,255,0.07)";
            }}
          >
            <button
              onClick={() => onSelect(activeCategory, sub)}
              className="flex-1 text-left font-body-med text-sm capitalize transition-colors duration-200"
              style={{ color: "var(--color-muted)" }}
            >
              {sub}
            </button>
            <button
              onClick={() => setSubToDelete(sub)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red-500/20"
              style={{ color: "var(--color-muted)" }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!subToDelete}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleRemoveSubcategory}
        title="¿Eliminar subcategoría?"
        message={`¿Estás seguro de que querés eliminar la subcategoría "${subToDelete}"? Los mods ya clasificados no se moverán.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        type="danger"
      />
    </div>
  );
}