"use client";

import React, { useMemo } from "react";
import {
  addMapChild,
  branchExistingCategories,
  categoryDisplayLabel,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";

export interface DraftItemCategoryPickerProps {
  layout: DraftMapLayout;
  branch: MapParentId;
  usedChildIds: string[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string, layoutAfter: DraftMapLayout) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  /** Tighter grid for embedded modal use */
  compact?: boolean;
}

export function DraftItemCategoryPicker({
  layout,
  branch,
  usedChildIds,
  selectedCategoryId,
  onSelectCategory,
  newCategoryName,
  setNewCategoryName,
  compact = false,
}: DraftItemCategoryPickerProps) {
  const existing = useMemo(
    () => branchExistingCategories(layout, branch, usedChildIds),
    [layout, branch, usedChildIds],
  );

  const pickExisting = (childId: string) => {
    onSelectCategory(childId, layout);
  };

  const createCustom = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const { layout: next, child } = addMapChild(layout, branch, trimmed);
    setNewCategoryName("");
    onSelectCategory(child.id, next);
  };

  return (
    <div className="space-y-2">
      {existing.length === 0 ? (
        <p className="text-[10px] text-white/40 px-0.5">
          No hay categorías en esta rama todavía. Creá una abajo.
        </p>
      ) : (
        <div
          className={`grid grid-cols-2 gap-1.5 overflow-y-auto ${compact ? "max-h-36" : "max-h-48"}`}
        >
          {existing.map((child) => {
            const active = selectedCategoryId === child.id;
            const label = categoryDisplayLabel(child.id, child.label, layout);
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => pickExisting(child.id)}
                className={`rounded-xl border px-2 py-2 text-left text-[10px] font-bold truncate ${
                  active
                    ? "border-orange-400/40 bg-orange-500/15 text-orange-200"
                    : "border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:border-indigo-400/35"
                }`}
                title={label}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
          onKeyDown={(e) => {
            if (e.key === "Enter") createCustom();
          }}
        />
        <button
          type="button"
          disabled={!newCategoryName.trim()}
          onClick={createCustom}
          className="rounded-xl bg-orange-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
        >
          Crear
        </button>
      </div>
    </div>
  );
}
