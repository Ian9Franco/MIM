"use client";

import React, { useMemo } from "react";
import {
  addMapChild,
  branchExistingCategories,
  categoryDisplayLabel,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";
import { DraftCategoryCreateRow } from "./DraftCategoryCreateRow";

export interface DraftItemCategoryPickerProps {
  layout: DraftMapLayout;
  branch: MapParentId;
  usedChildIds: string[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string, layoutAfter: DraftMapLayout) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  compact?: boolean;
}

function ExistingCategoryGrid({
  existing,
  layout,
  selectedCategoryId,
  onPick,
  compact,
}: {
  existing: ReturnType<typeof branchExistingCategories>;
  layout: DraftMapLayout;
  selectedCategoryId?: string;
  onPick: (childId: string) => void;
  compact: boolean;
}) {
  if (existing.length === 0) {
    return (
      <p className="text-[10px] text-white/40 px-0.5">
        No hay categorías en esta rama todavía. Creá una abajo.
      </p>
    );
  }
  return (
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
            onClick={() => {
              onPick(child.id);
            }}
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
  );
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

  const createCustom = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const { layout: next, child } = addMapChild(layout, branch, trimmed);
    setNewCategoryName("");
    onSelectCategory(child.id, next);
  };

  return (
    <div className="space-y-2">
      <ExistingCategoryGrid
        existing={existing}
        layout={layout}
        selectedCategoryId={selectedCategoryId}
        compact={compact}
        onPick={(childId) => {
          onSelectCategory(childId, layout);
        }}
      />
      <DraftCategoryCreateRow
        value={newCategoryName}
        onChange={setNewCategoryName}
        onCreate={createCustom}
      />
    </div>
  );
}
