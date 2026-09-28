"use client";

import React from "react";
import {
  MAP_CHILD_PRESETS,
  MAP_PARENTS,
  addMapChild,
  categoryDisplayLabel,
  isUncategorizedChildId,
  type DraftMapChild,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";

export function DraftCreateCategoryModal({
  open,
  onClose,
  layout,
  assignParent,
  setAssignParent,
  newCategoryName,
  setNewCategoryName,
  onCreated,
  title = "Nueva categoría",
  description = "Organización del draft (Client / Server / Both). Los ítems se asignan después.",
}: {
  open: boolean;
  onClose: () => void;
  layout: DraftMapLayout;
  assignParent: MapParentId;
  setAssignParent: (parent: MapParentId) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  onCreated: (child: DraftMapChild, nextLayout: DraftMapLayout) => void;
  title?: string;
  description?: string;
}) {
  if (!open) return null;

  const customChildren = layout.children.filter(
    (child) =>
      child.parent === assignParent
      && !MAP_CHILD_PRESETS.some((preset) => preset.slug === child.slug)
      && !isUncategorizedChildId(child.id),
  );

  const createWithLabel = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const { layout: next, child } = addMapChild(layout, assignParent, trimmed);
    onCreated(child, next);
    setNewCategoryName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[10px] text-white/50">{description}</p>
        <div className="flex gap-1">
          {MAP_PARENTS.map((parent) => (
            <button
              key={parent.id}
              type="button"
              onClick={() => setAssignParent(parent.id)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase ${
                assignParent === parent.id
                  ? "border-orange-400/40 bg-orange-500/15 text-orange-300"
                  : "border-white/10 text-white/50"
              }`}
            >
              {parent.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
          {MAP_CHILD_PRESETS.filter((preset) => preset.slug !== "other").map((preset) => (
            <button
              key={preset.slug}
              type="button"
              onClick={() => createWithLabel(preset.label)}
              className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-left text-[10px] font-bold text-white/80 hover:border-orange-500/30"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {customChildren.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customChildren.map((child) => (
              <span
                key={child.id}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white/60"
              >
                {categoryDisplayLabel(child.id, child.label, layout)}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1 border-t border-white/10">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre personalizado…"
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") createWithLabel(newCategoryName);
            }}
          />
          <button
            type="button"
            disabled={!newCategoryName.trim()}
            onClick={() => createWithLabel(newCategoryName)}
            className="rounded-xl bg-orange-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
          >
            Crear
          </button>
        </div>
        <button type="button" onClick={onClose} className="w-full py-2 text-[10px] text-white/40">
          Cancelar
        </button>
      </div>
    </div>
  );
}
