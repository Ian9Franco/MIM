"use client";

import React, { useState } from "react";
import { LayoutList, LayoutGrid, GalleryHorizontal, ChevronDown } from "lucide-react";
import { SORT_OPTIONS, type SortOrder } from "@/constants/app";
import { DISCOVER_PAGE_SIZES, type DiscoverViewMode } from "@/hooks/fomo/useFomoFilters";

type ToolbarProps = {
  sortOrder: SortOrder;
  onSort: (value: SortOrder) => void;
  pageSize: number;
  onPageSize: (value: number) => void;
  viewMode: DiscoverViewMode;
  onViewMode: (value: DiscoverViewMode) => void;
  pageSizeDisabled?: boolean;
};

const VIEWS: { value: DiscoverViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "list", label: "Lista", icon: <LayoutList className="w-4 h-4" /> },
  { value: "gallery", label: "Galería", icon: <GalleryHorizontal className="w-4 h-4" /> },
  { value: "card", label: "Tarjetas", icon: <LayoutGrid className="w-4 h-4" /> },
];

function Menu({
  label,
  valueLabel,
  disabled,
  children,
}: {
  label: string;
  valueLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
        style={{
          borderColor: "var(--fomo-border)",
          color: "var(--fomo-text-primary)",
          background: "var(--fomo-secondary-bg)",
        }}
      >
        <span style={{ color: "var(--fomo-text-muted)" }}>{label}</span>
        {valueLabel}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && !disabled && (
        <div
          className="absolute left-0 top-full z-40 mt-1 min-w-[10rem] overflow-hidden rounded-xl border shadow-xl"
          style={{
            borderColor: "var(--fomo-border)",
            background: "var(--fomo-card-bg)",
          }}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

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
        <Menu label="Ordenar" valueLabel={sortLabel}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSort(opt.value)}
              className="block w-full px-3 py-2 text-left text-xs font-bold hover:bg-white/5"
              style={{
                color: opt.value === sortOrder ? "var(--color-primary)" : "var(--fomo-text-primary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </Menu>
        <Menu
          label="Ver"
          valueLabel={String(pageSize)}
          disabled={pageSizeDisabled}
        >
          {DISCOVER_PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSize(size)}
              className="block w-full px-3 py-2 text-left text-xs font-bold hover:bg-white/5"
              style={{
                color: size === pageSize ? "var(--color-primary)" : "var(--fomo-text-primary)",
              }}
            >
              {size}
            </button>
          ))}
        </Menu>
      </div>
      <div
        className="flex items-center gap-1 rounded-xl border p-1"
        style={{ borderColor: "var(--fomo-border)", background: "var(--fomo-secondary-bg)" }}
        role="group"
        aria-label="Modo de vista"
      >
        {VIEWS.map((view) => {
          const active = viewMode === view.value;
          return (
            <button
              key={view.value}
              type="button"
              title={view.label}
              aria-pressed={active}
              onClick={() => onViewMode(view.value)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: active ? "color-mix(in srgb, var(--color-primary) 18%, transparent)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--fomo-text-muted)",
              }}
            >
              {view.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
