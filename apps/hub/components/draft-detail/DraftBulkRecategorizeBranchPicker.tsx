"use client";

import React from "react";
import type { MapParentId } from "@/lib/fomo/draftMapLayout";

const ITEM_SIDES: { id: MapParentId; label: string }[] = [
  { id: "both", label: "Ambos" },
  { id: "client", label: "Cliente" },
  { id: "server", label: "Servidor" },
];

export function BulkBranchPicker({
  fixedForAll,
  branch,
  onBranch,
}: {
  fixedForAll: MapParentId | null;
  branch: MapParentId;
  onBranch: (branch: MapParentId) => void;
}) {
  if (fixedForAll) {
    const label = ITEM_SIDES.find((s) => s.id === fixedForAll)?.label ?? fixedForAll;
    return (
      <p className="mt-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold text-emerald-200">
        Rama fija para la selección: {label}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
      {ITEM_SIDES.map((s) => {
        const active = branch === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onBranch(s.id);
            }}
            className={`py-2 px-1 rounded-xl text-[9px] font-semibold transition-all border text-center ${
              active
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-white/[0.02] text-white/60 border-white/[0.06] hover:bg-white/5"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
