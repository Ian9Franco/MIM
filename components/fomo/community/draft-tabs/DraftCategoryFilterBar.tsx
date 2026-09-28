"use client";

import React from "react";
import {
  DRAFT_CONTENT_TYPE_FILTERS,
  MAP_PARENTS,
  orgParentForTypeFilter,
  categoryDisplayLabel,
  type DraftContentTypeFilter,
  type DraftMapChild,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";
import { FomoDropdown, FomoDropdownOption } from "@/components/fomo/shared/FomoDropdown";
import { Plus } from "lucide-react";

export function DraftCategoryFilterBar({
  typeFilter,
  parentFilter,
  childFilter,
  children,
  layout,
  isModern,
  onTypeFilter,
  onParentFilter,
  onChildFilter,
  canEditCategories,
  onCreateCategory,
  createCategoryDisabled,
  createCategoryTitle,
}: {
  typeFilter: DraftContentTypeFilter;
  parentFilter: MapParentId | "all";
  childFilter: string | "all";
  children: DraftMapChild[];
  layout: DraftMapLayout;
  isModern?: boolean;
  onTypeFilter: (value: DraftContentTypeFilter) => void;
  onParentFilter: (value: MapParentId | "all") => void;
  onChildFilter: (value: string | "all") => void;
  canEditCategories?: boolean;
  onCreateCategory?: () => void;
  createCategoryDisabled?: boolean;
  createCategoryTitle?: string;
}) {
  const typeLockedParent = orgParentForTypeFilter(typeFilter);
  const parentLockedByType = typeLockedParent !== "all";
  const visibleChildren = parentFilter === "all"
    ? children
    : children.filter((child) => child.parent === parentFilter);
  const childLabel = childFilter === "all"
    ? "Todas las categorías"
    : categoryDisplayLabel(childFilter, childFilter, layout);
  const parentLabel = parentLockedByType
    ? `${MAP_PARENTS.find((parent) => parent.id === typeLockedParent)?.label || typeLockedParent} (fijo)`
    : parentFilter === "all"
      ? "Todas las ramas"
      : MAP_PARENTS.find((parent) => parent.id === parentFilter)?.label || parentFilter;

  const childOptionLabel = (child: DraftMapChild) => {
    const label = categoryDisplayLabel(child.id, child.label, layout);
    if (parentFilter !== "all") return label;
    const parentName = MAP_PARENTS.find((parent) => parent.id === child.parent)?.label || child.parent;
    return `${parentName} · ${label}`;
  };

  return (
    <div className={`relative z-20 flex flex-col gap-2 rounded-xl border px-2 py-2 text-[10px] sm:flex-row sm:flex-wrap sm:items-center ${isModern ? "border-border bg-muted/40" : "border-white/10 bg-white/4"}`}>
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible">
        {DRAFT_CONTENT_TYPE_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onTypeFilter(entry.id)}
            className={`shrink-0 rounded-lg border px-2 py-1 font-bold ${typeFilter === entry.id ? "border-primary/40 bg-primary/15 text-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {parentLockedByType ? (
          <div
            className={`min-w-[8.5rem] flex-1 rounded-xl border px-3.5 py-2.5 text-xs font-bold sm:flex-none ${isModern ? "border-border bg-muted/50 text-muted-foreground" : "border-white/15 bg-white/5 text-white/60"}`}
            title="Texturas y shaders van a Client; datapacks a Server (build alluser / allhost)"
          >
            {parentLabel}
          </div>
        ) : (
        <FomoDropdown className="min-w-[8.5rem] flex-1 sm:flex-none" valueLabel={parentLabel}>
          <FomoDropdownOption active={parentFilter === "all"} onClick={() => { onParentFilter("all"); onChildFilter("all"); }}>
            Todas las ramas
          </FomoDropdownOption>
          {MAP_PARENTS.map((parent) => (
            <FomoDropdownOption
              key={parent.id}
              active={parentFilter === parent.id}
              onClick={() => { onParentFilter(parent.id); onChildFilter("all"); }}
            >
              {parent.label}
            </FomoDropdownOption>
          ))}
        </FomoDropdown>
        )}
        <FomoDropdown
          className="min-w-[11rem] flex-1 sm:flex-none sm:min-w-[12rem]"
          menuClassName="min-w-[min(100vw-2rem,18rem)] sm:min-w-[14rem]"
          valueLabel={childLabel}
        >
          <FomoDropdownOption active={childFilter === "all"} onClick={() => onChildFilter("all")}>
            Todas las categorías
          </FomoDropdownOption>
          {visibleChildren.map((child) => (
            <FomoDropdownOption key={child.id} active={childFilter === child.id} onClick={() => onChildFilter(child.id)}>
              {childOptionLabel(child)}
            </FomoDropdownOption>
          ))}
        </FomoDropdown>
        {canEditCategories && onCreateCategory ? (
          <button
            type="button"
            disabled={createCategoryDisabled}
            title={createCategoryTitle}
            onClick={onCreateCategory}
            className={`flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
              isModern
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </button>
        ) : null}
      </div>
    </div>
  );
}
