"use client";

import React from "react";

export function DraftCategoryCreateRow({
  value,
  onChange,
  onCreate,
}: {
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nueva categoría"
        className="flex-1 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
        onKeyDown={(e) => {
          if (e.key === "Enter") onCreate();
        }}
      />
      <button
        type="button"
        disabled={!value.trim()}
        onClick={onCreate}
        className="rounded-xl bg-orange-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
      >
        Crear
      </button>
    </div>
  );
}
