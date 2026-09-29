"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pencil } from "lucide-react";
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

export function DraftOverlayPortal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}

export function DraftCreateCategoryModal({
  open,
  onClose,
  layout,
  assignParent,
  setAssignParent,
  newCategoryName,
  setNewCategoryName,
  onCreated,
  onRenameCategory,
  lockedParent,
  title = "Nueva categoría",
  description,
}: {
  open: boolean;
  onClose: () => void;
  layout: DraftMapLayout;
  assignParent: MapParentId;
  setAssignParent: (parent: MapParentId) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  onCreated: (child: DraftMapChild, nextLayout: DraftMapLayout) => void;
  onRenameCategory?: (childId: string, label: string) => void;
  lockedParent?: MapParentId;
  title?: string;
  description?: string;
}) {
  const branch = lockedParent ?? assignParent;
  const branchLabel = MAP_PARENTS.find((parent) => parent.id === branch)?.label || branch;
  const helpText = description ?? `Se creará solo en la rama ${branchLabel}. Los ítems se asignan después.`;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    if (open && lockedParent) setAssignParent(lockedParent);
  }, [open, lockedParent, setAssignParent]);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditLabel("");
    }
  }, [open]);

  useEffect(() => {
    setEditingId(null);
    setEditLabel("");
  }, [branch]);

  const branchChildren = layout.children.filter(
    (child) => child.parent === branch && !isUncategorizedChildId(child.id),
  );

  const saveRename = (childId: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed || !onRenameCategory) {
      setEditingId(null);
      return;
    }
    onRenameCategory(childId, trimmed);
    setEditingId(null);
  };

  const createWithLabel = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const { layout: next, child } = addMapChild(layout, branch, trimmed);
    onCreated(child, next);
    setNewCategoryName("");
    onClose();
  };

  return (
    <DraftOverlayPortal open={open} onClose={onClose}>
      <div
        className="relative z-[201] w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-create-category-title"
      >
        <h3 id="draft-create-category-title" className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[10px] text-white/50">{helpText}</p>
        {lockedParent ? (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-orange-200">
            Rama: {branchLabel}
          </div>
        ) : (
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
        )}
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
        {branchChildren.length > 0 && onRenameCategory && (
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <span className="text-[9px] font-bold uppercase text-white/40">Editar existentes en esta rama</span>
            {branchChildren.map((child) => {
              const display = categoryDisplayLabel(child.id, child.label, layout);
              const isEditing = editingId === child.id;
              return (
                <div key={child.id} className="flex items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => saveRename(child.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(child.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-orange-500/30 bg-black/40 px-2 py-1.5 text-[10px] font-bold text-white"
                      />
                      <button
                        type="button"
                        title="Guardar nombre"
                        className="rounded-md p-1.5 text-orange-300 hover:bg-orange-500/15"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => saveRename(child.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-white/75">{display}</span>
                      <button
                        type="button"
                        title="Renombrar"
                        className="rounded-md p-1.5 text-white/40 hover:text-white hover:bg-white/10"
                        onClick={() => {
                          setEditingId(child.id);
                          setEditLabel(display);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
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
    </DraftOverlayPortal>
  );
}
