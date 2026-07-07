"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Layers, Trash2, Pencil, Check, Loader2, ImagePlus } from "lucide-react";
import type { ModHit } from "./SpotlightMarquees";
import { ImageCropper } from "./ImageCropper";

/* ─── Types ─── */
interface DraftItem {
  id?: string;
  project_id: string;
  name: string;
  icon_url?: string;
  project_type: string;
  category: string;    // "mod" | "resourcepack" | "shader" | "datapack"
  content_type?: string;
  side?: "client" | "server" | "both";
  version_id?: string | null;
  game_versions?: string[];
  loader?: string;
  loaders?: string[];
  versions?: string[];
}

interface Draft {
  id: string;
  name: string;
  minecraft_version: string;
  loader: string;
  visibility: string;
  cover_image?: string | null;
  items?: DraftItem[];
}

/* ─── Utility: auto-categorize a mod hit ─── */
function autoCategory(mod: ModHit): string {
  const t = (mod.projectType || "mod").toLowerCase();
  if (t === "resourcepack") return "resourcepack";
  if (t === "shader") return "shader";
  if (t === "datapack") return "datapack";
  return "mod";
}

/* ─── Category labels ─── */
const CAT_LABELS: Record<string, string> = {
  mod: "Mod",
  resourcepack: "Textura / Resourcepack",
  shader: "Shader",
  datapack: "Datapack",
};

const CAT_COLORS: Record<string, string> = {
  mod: "#F05A28",
  resourcepack: "#0EA5E9",
  shader: "#A855F7",
  datapack: "#10B981",
};

const SIDE_LABELS: Record<string, string> = {
  both: "Cliente + Servidor",
  client: "Solo cliente",
  server: "Solo servidor",
};

export interface DraftAddResult {
  ok: boolean;
  status: "compatible" | "warning" | "exists" | "error";
  message: string;
  contentType?: string;
}

/* ─── Props ─── */
interface DraftPickerModalProps {
  open: boolean;
  initialEditDraftId?: string | null;
  pendingMod: ModHit | null;
  drafts: Draft[];
  onClose: () => void;
  onCreateDraft: (name: string, version: string, loader: string) => Promise<Draft | null>;
  onAddModToDraft: (draftId: string, mod: ModHit, category: string) => Promise<DraftAddResult>;
  onRemoveModFromDraft: (draftId: string, projectId: string, itemId?: string) => Promise<void>;
  onRecategorize: (draftId: string, projectId: string, newCat: string) => Promise<void>;
  onUpdateSide: (draftId: string, projectId: string, side: string, itemId?: string) => Promise<void>;
  onUpdateDraftCover: (draftId: string, coverImage: string | null) => Promise<void>;
  onDeleteDraft: (draftId: string) => Promise<void>;
  onRefreshDrafts: () => void;
}

const MC_VERSIONS = ["1.21.1", "1.20.4", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.16.5", "1.12.2"];
const LOADERS = ["fabric", "forge", "neoforge", "quilt", "any"];

/**
 * DraftPickerModal — selecciona o crea un draft y agrega el mod pendiente.
 * También permite editar drafts existentes (eliminar items, recategorizar).
 */
export function DraftPickerModal({
  open, initialEditDraftId, pendingMod, drafts, onClose,
  onCreateDraft, onAddModToDraft, onRemoveModFromDraft,
  onRecategorize, onUpdateSide, onUpdateDraftCover, onDeleteDraft, onRefreshDrafts,
}: DraftPickerModalProps) {
  const [view, setView] = useState<"pick" | "create" | "edit">("pick");
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState("1.20.1");
  const [newLoader, setNewLoader] = useState("fabric");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackStatus, setFeedbackStatus] = useState<DraftAddResult["status"]>("compatible");
  const [rawCover, setRawCover] = useState<string | null>(null);
  const [editTypeFilter, setEditTypeFilter] = useState("all");
  const typeFilters = [
    { id: "all", label: "Todo" },
    { id: "mod", label: "Mods" },
    { id: "resourcepack", label: "Texturas" },
    { id: "shader", label: "Shaders" },
    { id: "datapack", label: "Datapacks" },
  ];

  useEffect(() => {
    if (!open || !initialEditDraftId) return;
    const draft = drafts.find((d) => d.id === initialEditDraftId);
    if (!draft) return;
    setEditingDraft(draft);
    setEditTypeFilter("all");
    setFeedback("");
    setView("edit");
  }, [drafts, initialEditDraftId, open]);

  const resetAndClose = () => {
    setView("pick");
    setEditingDraft(null);
    setEditTypeFilter("all");
    setNewName(""); setFeedback("");
    onClose();
  };

  const handleAddToDraft = async (draft: Draft) => {
    if (!pendingMod) return;
    setLoading(true);
    const cat = autoCategory(pendingMod);
    const result = await onAddModToDraft(draft.id, pendingMod, cat);
    setLoading(false);
    setFeedbackStatus(result.status);
    setFeedback(result.message);
    setTimeout(resetAndClose, result.status === "compatible" ? 1400 : 2600);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const created = await onCreateDraft(newName.trim(), newVersion, newLoader);
    setLoading(false);
    if (created && pendingMod) {
      await handleAddToDraft(created);
    } else if (created) {
      onRefreshDrafts();
      resetAndClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={resetAndClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                  {view === "create" ? "Nuevo Draft" : view === "edit" ? `Editar: ${editingDraft?.name}` : "Agregar al Draft"}
                </h3>
              </div>
              <button onClick={resetAndClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--color-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pending mod preview */}
            {pendingMod && view !== "edit" && (
              <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-primary) 6%, transparent)" }}>
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/[0.08] flex items-center justify-center">
                  {pendingMod.iconUrl ? <img src={pendingMod.iconUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white/40 text-xs font-bold uppercase">{pendingMod.title.substring(0, 2)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{pendingMod.title}</p>
                  <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>
                    Se categorizará como: <strong style={{ color: CAT_COLORS[autoCategory(pendingMod)] }}>{CAT_LABELS[autoCategory(pendingMod)]}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex flex-col gap-3 p-5 max-h-[55vh] overflow-y-auto scrollbar-thin">
              <AnimatePresence mode="wait">
                {/* ── Pick view ── */}
                {view === "pick" && (
                  <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                    {drafts.length === 0 ? (
                      <p className="text-xs text-white/40 text-center py-4">No tenés drafts. Creá uno primero.</p>
                    ) : (
                      drafts.map(draft => (
                        <div key={draft.id} className="flex items-center gap-2 p-3 rounded-2xl border transition-all" style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-card) 80%, transparent)" }}>
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 border border-white/[0.06] shrink-0 flex items-center justify-center">
                            {draft.cover_image ? <img src={draft.cover_image} alt="" className="w-full h-full object-cover" /> : <Layers className="w-4 h-4 text-white/30" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{draft.name}</p>
                            <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>{draft.minecraft_version} · {draft.loader}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingDraft(draft); setEditTypeFilter("all"); setView("edit"); }}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: "var(--color-muted)" }}
                              title="Editar draft"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {pendingMod && (
                              <button
                                onClick={() => handleAddToDraft(draft)}
                                disabled={loading}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                                style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}
                              >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Agregar</>}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {feedback && (
                      <div
                        className="text-xs rounded-xl px-4 py-2.5 text-center font-semibold"
                        style={{
                          background: feedbackStatus === "warning"
                            ? "color-mix(in srgb, #F59E0B 12%, transparent)"
                            : feedbackStatus === "error"
                              ? "color-mix(in srgb, #EF4444 12%, transparent)"
                              : "color-mix(in srgb, #10B981 12%, transparent)",
                          color: feedbackStatus === "warning" ? "#F59E0B" : feedbackStatus === "error" ? "#EF4444" : "#10B981",
                          border: `1px solid ${feedbackStatus === "warning" ? "#F59E0B40" : feedbackStatus === "error" ? "#EF444440" : "#10B98130"}`,
                        }}
                      >
                        {feedback}
                      </div>
                    )}

                    <button
                      onClick={() => setView("create")}
                      className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-dashed"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
                    >
                      <Plus className="w-4 h-4" /> Crear nuevo draft
                    </button>
                  </motion.div>
                )}

                {/* ── Create view ── */}
                {view === "create" && (
                  <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>Nombre del Draft</label>
                      <input
                        type="text" placeholder="Mi Modpack Épico" value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded-xl py-2.5 px-3 text-xs outline-none"
                        style={{ background: "color-mix(in srgb, var(--color-card) 80%, transparent)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>Versión MC</label>
                        <select value={newVersion} onChange={(e) => setNewVersion(e.target.value)} className="w-full rounded-xl py-2 px-3 text-xs outline-none cursor-pointer" style={{ background: "color-mix(in srgb, var(--color-card) 80%, transparent)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
                          {MC_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>Loader</label>
                        <select value={newLoader} onChange={(e) => setNewLoader(e.target.value)} className="w-full rounded-xl py-2 px-3 text-xs outline-none cursor-pointer" style={{ background: "color-mix(in srgb, var(--color-card) 80%, transparent)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
                          {LOADERS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setView("pick")} className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: "var(--color-card)", color: "var(--color-muted)" }}>
                        Cancelar
                      </button>
                      <button onClick={handleCreate} disabled={loading || !newName.trim()} className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: "var(--color-primary)", color: "white" }}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {pendingMod ? "Crear y Agregar" : "Crear Draft"}</>}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Edit view ── */}
                {view === "edit" && editingDraft && (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                        {editingDraft.minecraft_version} · {editingDraft.loader}
                      </p>
                      <button
                        onClick={async () => { if (confirm(`Eliminar draft "${editingDraft.name}"?`)) { await onDeleteDraft(editingDraft.id); onRefreshDrafts(); resetAndClose(); } }}
                        className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar draft
                      </button>
                    </div>

                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-card) 80%, transparent)" }}>
                      <div className="relative h-24 bg-black/25">
                        {editingDraft.cover_image ? (
                          <img src={editingDraft.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] uppercase font-mono tracking-wider" style={{ color: "var(--color-muted)" }}>Sin banner</div>
                        )}
                        <label className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-bold text-white cursor-pointer">
                          <ImagePlus className="w-4 h-4" /> Cambiar banner
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setRawCover(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                      {editingDraft.cover_image && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onUpdateDraftCover(editingDraft.id, null);
                            setEditingDraft(d => d ? { ...d, cover_image: null } : d);
                            onRefreshDrafts();
                          }}
                          className="w-full py-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                        >
                          Quitar banner
                        </button>
                      )}
                    </div>

                    {editingDraft.items && editingDraft.items.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                        {typeFilters.map((filter) => {
                          const active = editTypeFilter === filter.id;
                          return (
                            <button
                              key={filter.id}
                              onClick={() => setEditTypeFilter(filter.id)}
                              className="shrink-0 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95"
                              style={{
                                background: active ? "color-mix(in srgb, var(--color-primary) 16%, transparent)" : "color-mix(in srgb, var(--color-card) 70%, transparent)",
                                borderColor: active ? "color-mix(in srgb, var(--color-primary) 35%, transparent)" : "var(--color-border)",
                                color: active ? "var(--color-primary)" : "var(--color-muted)",
                              }}
                            >
                              {filter.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!editingDraft.items || editingDraft.items.length === 0 ? (
                      <p className="text-xs text-white/40 italic text-center py-4">Este draft no tiene items todavía.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {editingDraft.items
                          .filter((item) => {
                            if (editTypeFilter === "all") return true;
                            return (item.content_type || item.category || item.project_type || "mod") === editTypeFilter;
                          })
                          .map((item) => {
                          const itemType = item.content_type || item.category || item.project_type || "mod";
                          const itemSide = item.side || "both";
                          return (
                          <div key={item.id || `${item.project_id}-${itemType}`} className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-card) 80%, transparent)" }}>
                            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                              {item.icon_url ? <img src={item.icon_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white/40 text-[9px] font-bold uppercase">{item.name.substring(0, 2)}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{item.name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <select
                                  value={itemType}
                                  onChange={async (e) => { await onRecategorize(editingDraft.id, item.project_id, e.target.value); onRefreshDrafts(); setEditingDraft(d => d ? { ...d, items: d.items?.map(i => i.project_id === item.project_id ? { ...i, category: e.target.value, content_type: e.target.value } : i) } : null); }}
                                  className="text-[9px] rounded-md py-0.5 px-1 outline-none cursor-pointer"
                                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: CAT_COLORS[itemType] || "var(--color-muted)" }}
                                >
                                  {Object.entries(CAT_LABELS).map(([val, lbl]) => (
                                    <option key={val} value={val}>{lbl}</option>
                                  ))}
                                </select>
                                <select
                                  value={itemSide}
                                  onChange={async (e) => { await onUpdateSide(editingDraft.id, item.project_id, e.target.value, item.id); onRefreshDrafts(); setEditingDraft(d => d ? { ...d, items: d.items?.map(i => i.project_id === item.project_id ? { ...i, side: e.target.value as any } : i) } : null); }}
                                  className="text-[9px] rounded-md py-0.5 px-1 outline-none cursor-pointer"
                                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                                >
                                  {Object.entries(SIDE_LABELS).map(([val, lbl]) => (
                                    <option key={val} value={val}>{lbl}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {(item.loaders?.[0] || item.loader) && (
                                  <span className="text-[8px] font-bold uppercase rounded-md px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                    {item.loaders?.[0] || item.loader}
                                  </span>
                                )}
                                {(item.game_versions?.[0] || item.versions?.[0]) && (
                                  <span className="text-[8px] font-mono rounded-md px-1.5 py-0.5 bg-white/5 text-white/55 border border-white/[0.06]">
                                    {item.game_versions?.[0] || item.versions?.[0]}
                                  </span>
                                )}
                                <span className={`text-[8px] font-mono rounded-md px-1.5 py-0.5 border ${item.version_id ? "bg-green-500/10 text-green-300 border-green-500/20" : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"}`}>
                                  {item.version_id ? "compatible" : "revisar version"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={async () => { await onRemoveModFromDraft(editingDraft.id, item.project_id, item.id); onRefreshDrafts(); setEditingDraft(d => d ? { ...d, items: d.items?.filter(i => (item.id ? i.id !== item.id : i.project_id !== item.project_id)) } : null); }}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                        })}
                        {editingDraft.items.filter((item) => editTypeFilter === "all" || (item.content_type || item.category || item.project_type || "mod") === editTypeFilter).length === 0 && (
                          <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center text-xs text-white/40">
                            No hay items de este tipo.
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={() => setView("pick")} className="w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-1" style={{ background: "var(--color-card)", color: "var(--color-muted)" }}>
                      ← Volver
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          {rawCover && editingDraft && (
            <ImageCropper
              imageUrl={rawCover}
              aspectRatio={16 / 9}
              shape="rect"
              onCancel={() => setRawCover(null)}
              onSave={async (croppedUrl) => {
                await onUpdateDraftCover(editingDraft.id, croppedUrl);
                setEditingDraft(d => d ? { ...d, cover_image: croppedUrl } : d);
                setRawCover(null);
                onRefreshDrafts();
              }}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
