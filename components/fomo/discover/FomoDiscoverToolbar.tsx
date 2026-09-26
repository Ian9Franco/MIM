"use client";

import React from "react";
import { LayoutList, LayoutGrid, GalleryHorizontal } from "lucide-react";
import { SORT_OPTIONS, type SortOrder } from "@/constants/app";
import { DISCOVER_PAGE_SIZES, type DiscoverViewMode } from "@/hooks/fomo/useFomoFilters";
import { FomoDropdown, FomoDropdownOption } from "@/components/fomo/shared/FomoDropdown";
import { FomoSegmentedNav } from "@/components/fomo/shared/FomoSegmentedNav";

type ToolbarProps = {
  sortOrder: SortOrder;
  onSort: (value: SortOrder) => void;
  pageSize: number;
  onPageSize: (value: number) => void;
  viewMode: DiscoverViewMode;
  onViewMode: (value: DiscoverViewMode) => void;
  pageSizeDisabled?: boolean;
};

const VIEWS: { id: DiscoverViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "list", label: "Lista", icon: <LayoutList className="w-4 h-4" /> },
  { id: "gallery", label: "Galería", icon: <GalleryHorizontal className="w-4 h-4" /> },
  { id: "card", label: "Tarjetas", icon: <LayoutGrid className="w-4 h-4" /> },
];

export function FomoDiscoverToolbar({
  sortOrder,
  onSort,
  pageSize,
  onPageSize,
  viewMode,
  onViewMode,
  pageSizeDisabled,
}: ToolbarProps) {
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label || "Relevancia";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <FomoDropdown label="Ordenar" valueLabel={sortLabel}>
          {SORT_OPTIONS.map((opt) => (
            <FomoDropdownOption key={opt.value} active={opt.value === sortOrder} onClick={() => onSort(opt.value)}>
              {opt.label}
            </FomoDropdownOption>
          ))}
        </FomoDropdown>
        <FomoDropdown label="Ver" valueLabel={String(pageSize)} disabled={pageSizeDisabled}>
          {DISCOVER_PAGE_SIZES.map((size) => (
            <FomoDropdownOption key={size} active={size === pageSize} onClick={() => onPageSize(size)}>
              {size}
            </FomoDropdownOption>
          ))}
        </FomoDropdown>
      </div>
      <FomoSegmentedNav
        compact
        layoutId="fomo-discover-view"
        value={viewMode}
        onChange={onViewMode}
        items={VIEWS}
      />
    </div>
  );
}
