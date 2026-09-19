"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, FolderKanban, Layers, Pencil, Plus, X } from "lucide-react";
import type { HomeDraft } from "../../lib/drafts/draftContract";
import type { Fn } from "../../types/fn";

interface CommunityDraftsSectionProps {
  session: { user?: { id: string } } | null;
  userDrafts: HomeDraft[];
  onOpenDraft: Fn<[HomeDraft]>;
  onCreateDraft?: Fn<[]>;
  onUpdateDraftMetadata?: Fn<[string, Record<string, unknown>], Promise<boolean>>;
}

export function CommunityDraftsSection({
  session,
  userDrafts,
  onOpenDraft,
  onCreateDraft,
  onUpdateDraftMetadata,
}: CommunityDraftsSectionProps) {
  const userId = session?.user?.id;
  const drafts = useMemo(
    () =>
      [...userDrafts].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime(),
      ),
    [userDrafts],
  );
  const mineDrafts = useMemo(
    () => drafts.filter((draft) => !userId || !draft.owner_id || draft.owner_id === userId),
    [drafts, userId],
  );
  const communityDrafts = useMemo(
    () => drafts.filter((draft) => Boolean(userId && draft.owner_id && draft.owner_id !== userId)),
    [drafts, userId],
  );
  const [editing, setEditing] = useState<HomeDraft | null>(null);
  const [editVisibility, setEditVisibility] = useState("private");
  const [saving, setSaving] = useState(false);

  const openSettings = (draft: HomeDraft) => {
    setEditing(draft);
    setEditVisibility(draft.visibility === "public" ? "public" : "private");
  };

  const saveVisibility = async () => {
    if (!editing || !onUpdateDraftMetadata) return;
    setSaving(true);
    const ok = await onUpdateDraftMetadata(editing.id, { visibility: editVisibility });
    setSaving(false);
    if (ok) setEditing(null);
  };

  return (
    <motion.section
      key="community-drafts"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-28 scrollbar-none"
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[8px] font-mono font-bold uppercase text-white/30">Tu espacio</p>
          <h3 className="mt-0.5 text-xs font-black text-white/80">Drafts</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            onCreateDraft?.();
          }}
          className="mim-control-3d flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[8px] font-bold text-white/65"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </button>
      </div>

      {!session ? (
        <Empty icon={<FolderKanban className="h-9 w-9" />} title="Iniciá sesión para crear" text="Tus drafts aparecerán acá." />
      ) : !mineDrafts.length && !communityDrafts.length ? (
        <Empty
          icon={<FolderKanban className="h-9 w-9" />}
          title="Creá tu primer draft"
          text="Combiná mods, texturas y shaders en un draft compatible."
          action="Nuevo draft"
          onAction={() => {
            onCreateDraft?.();
          }}
        />
      ) : (
        <>
          {mineDrafts[0] && (
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => {
                onOpenDraft(mineDrafts[0]);
              }}
              className="mim-collection-hero mim-themed-card w-full overflow-hidden text-left"
            >
              <div className="relative h-28 overflow-hidden bg-white/[.035]">
                {mineDrafts[0].cover_image ? (
                  <img src={mineDrafts[0].cover_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Layers className="h-9 w-9 text-white/15" />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[7px] font-black uppercase text-white/75">
                  Continuar trabajando
                </span>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-white">{mineDrafts[0].name}</h3>
                  <p className="mt-1 text-[9px] text-white/45">
                    {mineDrafts[0].minecraft_version ?? "Versión libre"} · {mineDrafts[0].loader ?? "Cualquier loader"} · {mineDrafts[0].items?.length ?? 0} ítems
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30" />
              </div>
            </button>
            {onUpdateDraftMetadata && (
              <button
                type="button"
                onClick={() => {
                  openSettings(mineDrafts[0]);
                }}
                className="absolute right-3 top-3 z-10 flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-black/65 px-2 text-[8px] font-bold uppercase text-white/80 backdrop-blur-md"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            )}
          </div>
          )}
          {mineDrafts.length > 0 && (
          <div className="mt-5">
            <p className="text-[8px] font-mono font-bold uppercase text-white/30">{mineDrafts.length} en total</p>
            <h3 className="mt-0.5 text-xs font-black text-white/80">Tus drafts</h3>
            <div className="mt-2 space-y-2">
              {mineDrafts.map((draft) => (
                <DraftRow
                  key={draft.id}
                  draft={draft}
                  canEdit={Boolean(onUpdateDraftMetadata)}
                  onOpen={() => onOpenDraft(draft)}
                  onEdit={() => openSettings(draft)}
                />
              ))}
            </div>
          </div>
          )}
          {communityDrafts.length > 0 && (
          <div className="mt-6">
            <p className="text-[8px] font-mono font-bold uppercase text-white/30">{communityDrafts.length} visibles</p>
            <h3 className="mt-0.5 text-xs font-black text-white/80">Drafts de la comunidad</h3>
            <p className="mt-1 text-[9px] text-white/35">Los públicos se ven. Editarlos pide invitación del dueño.</p>
            <div className="mt-2 space-y-2">
              {communityDrafts.map((draft) => (
                <DraftRow
                  key={draft.id}
                  draft={draft}
                  canEdit={false}
                  onOpen={() => onOpenDraft(draft)}
                />
              ))}
            </div>
          </div>
          )}
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-mono font-bold uppercase text-white/35">Estado</p>
                <h3 className="text-sm font-black text-white">{editing.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditVisibility("private");
                }}
                className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                  editVisibility === "private"
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/8 text-white/45"
                }`}
              >
                Privado
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditVisibility("public");
                }}
                className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                  editVisibility === "public"
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                    : "border-white/8 text-white/45"
                }`}
              >
                Público
              </button>
            </div>
            <p className="mt-3 text-[9px] leading-relaxed text-white/40">
              Público: cualquiera con sesión puede agregar o quitar ítems. Privado: solo se puede ver.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void saveVisibility();
              }}
              className="mt-4 h-10 w-full rounded-xl bg-orange-500 text-[10px] font-black uppercase tracking-wider text-black disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function DraftRow({
  draft,
  canEdit,
  onOpen,
  onEdit,
}: {
  draft: HomeDraft;
  canEdit: boolean;
  onOpen: Fn<[]>;
  onEdit?: Fn<[]>;
}) {
  return (
    <div className="mim-collection-card flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/75 p-3">
      <button type="button" onClick={() => onOpen()} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white/[.035]">
          {draft.cover_image ? (
            <img src={draft.cover_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Layers className="h-4 w-4 text-white/25" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{draft.name}</p>
          <p className="mt-1 text-[8px] text-white/40">
            {draft.minecraft_version ?? "Sin versión"} · {draft.loader ?? "Sin loader"} · {draft.items?.length ?? 0} ítems
          </p>
        </div>
      </button>
      {canEdit && onEdit ? (
        <button
          type="button"
          onClick={() => onEdit()}
          className={`rounded-md border px-1.5 py-0.5 text-[7px] font-bold uppercase ${
            draft.visibility === "public"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : "border-border text-white/40"
          }`}
        >
          {draft.visibility === "public" ? "Público" : "Privado"}
        </button>
      ) : (
        <span className={`rounded-md border px-1.5 py-0.5 text-[7px] uppercase ${
          draft.visibility === "public"
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
            : "border-border text-white/40"
        }`}>
          {draft.visibility === "public" ? "Público" : "Privado"}
        </span>
      )}
      {canEdit && onEdit && (
        <button
          type="button"
          onClick={() => onEdit()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/55"
          aria-label={`Editar ${draft.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: string;
  onAction?: Fn<[]>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center text-white/15">
      {icon}
      <h3 className="mt-3 text-xs font-bold text-white">{title}</h3>
      <p className="mt-1 text-[9px] text-white/35">{text}</p>
      {action && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
          }}
          className="mim-control-3d mt-4 rounded-lg border border-border px-3 py-2 text-[9px] font-bold text-white/65"
        >
          {action}
        </button>
      )}
    </div>
  );
}
