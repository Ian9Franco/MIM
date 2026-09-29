"use client";

import React from "react";
import {
  MAP_CHILD_PRESETS,
  addMapChild,
  categoryDisplayLabel,
  childCategoryId,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";

export interface DraftItemCategoryPickerProps {
  layout: DraftMapLayout;
  branch: MapParentId;
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
  selectedCategoryId,
  onSelectCategory,
  newCategoryName,
  setNewCategoryName,
  compact = false,
}: DraftItemCategoryPickerProps) {
  const customChildren = (layout.children || []).filter(
    (child) => child.parent === branch && !MAP_CHILD_PRESETS.some((preset) => preset.slug === child.slug),
  );

  const pickPreset = (slug: string, label: string) => {
    const { layout: next } = addMapChild(layout, branch, label);
    onSelectCategory(childCategoryId(branch, slug), next);
  };

  const pickCustom = (childId: string) => {
    onSelectCategory(childId, layout);
  };

  const createCustom = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const { layout: next, child } = addMapChild(layout, branch, trimmed);
    setNewCategoryName("");
    onSelectCategory(child.id, next);
  };

  const presetActive = (slug: string) => selectedCategoryId === childCategoryId(branch, slug);

  return (
    <div className="space-y-2">
      {customChildren.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customChildren.map((child) => {
            const active = selectedCategoryId === child.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => pickCustom(child.id)}
                className={`rounded-xl border px-2 py-1.5 text-[10px] font-bold ${
                  active
                    ? "border-indigo-400/50 bg-indigo-500/25 text-indigo-100"
                    : "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                }`}
              >
                {categoryDisplayLabel(child.id, child.label, layout)}
              </button>
            );
          })}
        </div>
      )}
      <div
        className={`grid grid-cols-2 gap-1.5 overflow-y-auto ${compact ? "max-h-36" : "max-h-48"}`}
      >
        {MAP_CHILD_PRESETS.map((preset) => {
          const active = presetActive(preset.slug);
          return (
            <button
              key={preset.slug}
              type="button"
              onClick={() => pickPreset(preset.slug, preset.label)}
              className={`rounded-xl border px-2 py-2 text-left text-[10px] font-bold ${
                active
                  ? "border-orange-400/40 bg-orange-500/15 text-orange-200"
                  : "border-white/10 bg-white/5 text-white/80 hover:border-orange-500/30"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
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
