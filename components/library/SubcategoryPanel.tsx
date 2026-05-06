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
  ".local":     { label: "Local · Client-side", color: "var(--color-accent)", bg: "var(--color-accent-bg)", border: "var(--color-accent-border)" },
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
      className="w-full rounded-3xl overflow-hidden animate-scale-in shadow-2xl relative"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "0 25px 60px -12px rgba(0,0,0,0.25)",
        backdropFilter: "blur(24px)",
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
              border: "1px solid var(--color-border)",
              background: "var(--color-hover)",
              color: "var(--color-foreground)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-border-strong)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover)"; }}
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

        <span className="font-bold tracking-tighter" style={{ color: meta.color, fontSize: "0.7rem" }}>
          {subs.length} {subs.length === 1 ? 'SUB' : 'SUBS'}
        </span>
      </div>

      {/* Premium Add Subcategory Input */}
      <div className="px-5 py-4 border-b border-dashed" style={{ borderColor: "var(--color-border)" }}>
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
            style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}
          >
            <Plus className="w-4 h-4" />
            <span>Agregar subcategoría</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-fade-in">
            <input
              autoFocus
              type="text"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubcategory();
                if (e.key === "Escape") { setIsAdding(false); setNewSubName(""); }
              }}
              placeholder="Nombre de subcategoría..."
              className="flex-1 bg-[var(--color-secondary-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/50 transition-all text-[var(--color-foreground)]"
            />
            <button
              onClick={handleAddSubcategory}
              disabled={!newSubName.trim()}
              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
            >
              Agregar
            </button>
            <button onClick={() => { setIsAdding(false); setNewSubName(""); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors" style={{ color: "var(--color-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid - Standardized 2 columns for premium look */}
      <div className="p-5 grid grid-cols-2 gap-4">
        {subs.map((sub, i) => (
          <div
            key={sub}
            className="animate-fade-up group relative flex items-center justify-center text-center rounded-2xl overflow-hidden capitalize transition-all duration-300"
            style={{
              animationDelay: `${i * 0.025}s`,
              border: "1px solid var(--color-border)",
              background: "color-mix(in srgb, var(--color-card) 4%, transparent)",
              height: "72px", 
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = `linear-gradient(145deg, ${meta.bg}, transparent)`;
              el.style.borderColor = meta.border;
              el.style.transform = "scale(1.02) translateY(-2px)";
              el.style.boxShadow = `0 10px 25px -5px color-mix(in srgb, ${meta.color} 25%, transparent)`;
              const text = el.querySelector('button');
              if (text) {
                text.style.color = "var(--color-foreground)";
                text.style.textShadow = `0 0 15px color-mix(in srgb, ${meta.color} 50%, transparent)`;
              }
              const bgLetter = el.querySelector('.bg-letter') as HTMLElement;
              if (bgLetter) bgLetter.style.opacity = "0.15";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "color-mix(in srgb, var(--color-card) 4%, transparent)";
              el.style.borderColor = "var(--color-border)";
              el.style.transform = "scale(1) translateY(0)";
              el.style.boxShadow = "none";
              const text = el.querySelector('button');
              if (text) {
                text.style.color = "var(--color-muted)";
                text.style.textShadow = "none";
              }
              const bgLetter = el.querySelector('.bg-letter') as HTMLElement;
              if (bgLetter) bgLetter.style.opacity = "0.05";
            }}
          >
            {/* Letra de fondo para profundidad */}
            <div 
              className="bg-letter absolute inset-0 flex items-center justify-center font-black-it text-5xl select-none pointer-events-none transition-opacity duration-500"
              style={{ color: meta.color, opacity: 0.05, transform: "scale(1.4)" }}
            >
              {sub.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={() => onSelect(activeCategory, sub)}
              className="relative z-10 flex-1 h-full flex items-center justify-center px-3 font-subhead text-[13px] font-bold tracking-wide capitalize transition-colors duration-300 leading-snug"
              style={{ color: "var(--color-muted)" }}
            >
              {sub}
            </button>

            <button
              onClick={() => setSubToDelete(sub)}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/20 z-20"
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