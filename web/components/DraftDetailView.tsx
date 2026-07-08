"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Layers, Users, Activity, LayoutGrid, Pencil, Trash2,
  ChevronRight, Loader2, Package, Plus, UserCheck, X, Check, Eye
} from "lucide-react";
import type { ModHit } from "./SpotlightMarquees";
import { supabase } from "../lib/supabaseClient";

interface DraftDetailViewProps {
  draft: any;
  activeCollectionMods: ModHit[];
  loadingActiveMods: boolean;
  session: any;
  onBack: () => void;
  onEditDraft?: (draft: any) => void;
  handleOpenModDetails: (mod: ModHit) => void;
  onRemoveModFromDraft?: (draftId: string, projectId: string, itemId?: string) => Promise<void>;
  onRefreshDrafts?: () => void;
  onUpdateDraftMetadata?: (draftId: string, updates: any) => Promise<boolean>;
  onRecategorizeDraftItem?: (draftId: string, projectId: string, category: string) => Promise<void>;
  onUpdateDraftItemSide?: (draftId: string, projectId: string, side: string, itemId?: string) => Promise<void>;
}

type DraftTab = "summary" | "items" | "members" | "activity";

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  mod:         { bg: "bg-orange-500/10",  text: "text-orange-300",  border: "border-orange-500/20",   hex: "#f97316" },
  resourcepack:{ bg: "bg-purple-500/10",  text: "text-purple-300",  border: "border-purple-500/20",   hex: "#a855f7" },
  shader:      { bg: "bg-blue-500/10",    text: "text-blue-300",    border: "border-blue-500/20",     hex: "#3b82f6" },
  datapack:    { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20",  hex: "#10b981" },
};

const typeLabel = (type?: string) => {
  if (type === "resourcepack") return "Textura";
  if (type === "shader") return "Shader";
  if (type === "datapack") return "Datapack";
  return "Mod";
};

const typeColor = (type?: string) => TYPE_COLORS[type || "mod"] || TYPE_COLORS.mod;

export function DraftDetailView({
  draft: initialDraft,
  activeCollectionMods,
  loadingActiveMods,
  session,
  onBack,
  handleOpenModDetails,
  onRemoveModFromDraft,
  onRefreshDrafts,
  onUpdateDraftMetadata,
  onRecategorizeDraftItem,
  onUpdateDraftItemSide,
}: DraftDetailViewProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [tab, setTab] = useState<DraftTab>("items");
  const [typeFilter, setTypeFilter] = useState("all");

  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const ownerMember = members.find((m) => m.role === "owner");
  const creatorUsername = ownerMember?.profiles?.username || null;

  // Modal states
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editLoader, setEditLoader] = useState("");
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editVisibility, setEditVisibility] = useState("private");
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Item edit modal states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemType, setItemType] = useState("");
  const [itemSide, setItemSide] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Sync draft prop
  useEffect(() => {
    setDraft(initialDraft);
    setEditName(initialDraft?.name || "");
    setEditVersion(initialDraft?.minecraft_version || "");
    setEditLoader(initialDraft?.loader || "");
    setEditCoverImage(initialDraft?.cover_image || "");
    setEditVisibility(initialDraft?.visibility || "private");
  }, [initialDraft]);

  // Reset state on draft change
  useEffect(() => {
    setTab("items");
    setTypeFilter("all");
    setRemovedIds(new Set());
    setMembers([]);
    setActivity([]);
  }, [draft?.id]);

  const loadMembers = () => {
    if (!draft?.id) return;
    setLoadingMembers(true);
    supabase
      .from("draft_members")
      .select("*, profiles(username, avatar_url, color)")
      .eq("draft_id", draft.id)
      .then(({ data }) => {
        setMembers(data || []);
        setLoadingMembers(false);
      });
  };

  const loadActivity = () => {
    if (!draft?.id) return;
    setLoadingActivity(true);
    supabase
      .from("draft_activity")
      .select("*, profiles(username, avatar_url, color)")
      .eq("draft_id", draft.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setActivity(data || []);
        setLoadingActivity(false);
      });
  };

  // Load members and owner on mount or draft change
  useEffect(() => {
    if (draft?.id) {
      loadMembers();
    }
  }, [draft?.id]);

  // Load activity when tab switches
  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      loadActivity();
    }
  }, [tab, draft?.id]);

  const typeFilters = [
    { id: "all", label: "Todo" },
    { id: "mod", label: "Mods" },
    { id: "resourcepack", label: "Texturas" },
    { id: "shader", label: "Shaders" },
    { id: "datapack", label: "Datapacks" },
  ];

  const visibleMods = activeCollectionMods.filter((mod: any) => {
    const key = mod.itemId || mod.id || mod.projectId;
    if (removedIds.has(key)) return false;
    if (typeFilter === "all") return true;
    return (mod.projectType || "mod") === typeFilter;
  });

  const tabs: { id: DraftTab; label: string; icon: React.ReactNode }[] = [
    { id: "summary",  label: "Resumen",   icon: <LayoutGrid className="w-3 h-3" /> },
    { id: "items",    label: "Ítems",     icon: <Layers className="w-3 h-3" /> },
    { id: "members",  label: "Miembros",  icon: <Users className="w-3 h-3" /> },
    { id: "activity", label: "Actividad", icon: <Activity className="w-3 h-3" /> },
  ];

  const handleSaveMetadata = async () => {
    if (!draft?.id || !onUpdateDraftMetadata) return;
    setSavingMetadata(true);
    const ok = await onUpdateDraftMetadata(draft.id, {
      name: editName,
      minecraft_version: editVersion,
      loader: editLoader,
      cover_image: editCoverImage || null,
      visibility: editVisibility,
    });
    if (ok) {
      setDraft((prev: any) => ({
        ...prev,
        name: editName,
        minecraft_version: editVersion,
        loader: editLoader,
        cover_image: editCoverImage || null,
        visibility: editVisibility,
      }));
      setShowMetadataModal(false);
      onRefreshDrafts?.();
      loadActivity(); // Refresh activity log
    }
    setSavingMetadata(false);
  };

  const handleSaveItemEdit = async () => {
    if (!draft?.id || !editingItem) return;
    setSavingItem(true);
    try {
      if (onRecategorizeDraftItem && itemType !== editingItem.projectType) {
        await onRecategorizeDraftItem(draft.id, editingItem.projectId, itemType);
      }
      if (onUpdateDraftItemSide && itemSide !== editingItem.side) {
        await onUpdateDraftItemSide(draft.id, editingItem.projectId, itemSide, editingItem.itemId);
      }
      setEditingItem(null);
      onRefreshDrafts?.();
      // Temporarily update mod properties locally so changes are visible instantly
      const idx = activeCollectionMods.findIndex(m => m.itemId === editingItem.itemId);
      if (idx !== -1) {
        activeCollectionMods[idx].projectType = itemType;
        activeCollectionMods[idx].side = itemSide;
      }
      loadActivity();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <motion.div
      key="draft-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-4 shrink-0" style={{ minHeight: draft?.cover_image ? 130 : 80 }}>
        {draft?.cover_image ? (
          <img
            src={draft.cover_image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 30%, #000) 0%, #0c0c0c 100%)",
            }}
          />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Back + Edit */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-white/80 text-[10px] font-bold transition-all active:scale-95"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver
          </button>
          {onUpdateDraftMetadata && (
            <button
              onClick={() => {
                setEditName(draft?.name || "");
                setEditVersion(draft?.minecraft_version || "");
                setEditLoader(draft?.loader || "");
                setEditCoverImage(draft?.cover_image || "");
                setShowMetadataModal(true);
              }}
              className="bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-2 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider"
              title="Editar configuración del draft"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
          )}
        </div>

        {/* Draft info */}
        <div className="absolute bottom-3 left-4 right-4 z-10">
          <div className="flex items-end gap-2 justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Draft Modpack</p>
              <h2 className="text-sm font-black text-white leading-tight mt-0.5 drop-shadow-md">{draft?.name}</h2>
              <p className="text-[10px] text-white/50 mt-0.5">
                {draft?.minecraft_version} · {draft?.loader}
                {creatorUsername && ` · por @${creatorUsername}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                draft?.visibility === "public"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-white/5 text-white/40 border-white/10"
              }`}>
                {draft?.visibility === "public" ? "Público" : "Privado"}
              </span>
              <span className="text-[9px] text-white/40 font-mono">
                {activeCollectionMods.length} ítems
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.06] pb-2 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
              tab === t.id
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-24">
        <AnimatePresence mode="wait">
          {/* ── SUMMARY ── */}
          {tab === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Versión", value: draft?.minecraft_version },
                  { label: "Loader", value: draft?.loader },
                  { label: "Visibilidad", value: draft?.visibility === "public" ? "Público" : "Privado" },
                  { label: "Total ítems", value: activeCollectionMods.length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-white/30">{label}</p>
                    <p className="text-xs font-bold text-white mt-1 capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {/* Breakdown by type */}
              {activeCollectionMods.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-3">Composición</p>
                  <div className="space-y-3">
                    {(["mod", "resourcepack", "shader", "datapack"] as const).map((type) => {
                      const count = activeCollectionMods.filter(m => (m.projectType || "mod") === type).length;
                      const pct = activeCollectionMods.length > 0 ? (count / activeCollectionMods.length) * 100 : 0;
                      const col = typeColor(type);
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className={`text-[8px] font-bold uppercase w-16 shrink-0 ${col.text}`}>{typeLabel(type)}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: col.hex }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-white/60 w-8 text-right font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              {draft?.description && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-2">Descripción</p>
                  <p className="text-xs text-white/65 leading-relaxed">{draft.description}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ITEMS ── */}
          {tab === "items" && (
            <motion.div
              key="items"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {/* Type filter */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {typeFilters.map((f) => {
                  const active = typeFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setTypeFilter(f.id)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95"
                      style={{
                        background: active ? "color-mix(in srgb, var(--color-primary) 16%, transparent)" : "color-mix(in srgb, var(--color-card) 70%, transparent)",
                        borderColor: active ? "color-mix(in srgb, var(--color-primary) 35%, transparent)" : "var(--color-border)",
                        color: active ? "var(--color-primary)" : "var(--color-muted)",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {loadingActiveMods ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                </div>
              ) : visibleMods.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center text-xs text-white/40">
                  {typeFilter === "all" ? "Este draft no tiene ítems." : "No hay items de este tipo."}
                </div>
              ) : (
                visibleMods.map((mod: any) => {
                  const col = typeColor(mod.projectType);
                  return (
                    <div
                      key={mod.itemId || mod.id || mod.projectId}
                      onClick={() => handleOpenModDetails(mod)}
                      className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-white/15"
                    >
                      <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {mod.iconUrl ? (
                          <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                        ) : (
                          <Package className="w-5 h-5 text-white/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${col.bg} ${col.text} border ${col.border}`}>
                            {typeLabel(mod.projectType)}
                          </span>
                          {mod.gameVersions?.[0] && (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 text-white/55 border border-white/[0.06]" title="Versiones compatibles de este mod">
                              {mod.gameVersions.join(", ")}
                            </span>
                          )}
                          {mod.loaders?.[0] && (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase">
                              {mod.loaders[0]}
                            </span>
                          )}
                          {mod.side && (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 capitalize">
                              {mod.side === "both" ? "Ambos" : mod.side === "client" ? "Cliente" : "Servidor"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit item action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(mod);
                          setItemType(mod.projectType || "mod");
                          setItemSide(mod.side || "both");
                        }}
                        className="p-1.5 rounded-lg text-white/30 hover:text-orange-400 hover:bg-orange-500/10 transition-all active:scale-90"
                        title="Modificar tipo o lado del ítem"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {onRemoveModFromDraft ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const itemId = mod.itemId || mod.id;
                            await onRemoveModFromDraft(draft.id, mod.projectId, itemId);
                            setRemovedIds((prev) => new Set(prev).add(itemId || mod.projectId));
                            onRefreshDrafts?.();
                            loadActivity();
                          }}
                          className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 shrink-0"
                          title="Eliminar del draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ── MEMBERS ── */}
          {tab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {loadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center">
                  <Users className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-xs text-white/40">No hay miembros adicionales en este draft.</p>
                </div>
              ) : (
                members.map((member: any) => {
                  const profile = member.profiles;
                  const initial = (profile?.username || "?").charAt(0).toUpperCase();
                  return (
                    <div key={member.id} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                        style={{ backgroundColor: profile?.color || "var(--color-primary)" }}
                      >
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-black">{initial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">@{profile?.username || "Usuario"}</p>
                        <p className="text-[9px] text-white/45 mt-0.5 capitalize font-semibold">{member.role}</p>
                      </div>
                      {member.role === "owner" ? (
                        <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                          Owner
                        </span>
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ── ACTIVITY ── */}
          {tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              {loadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                </div>
              ) : activity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center">
                  <Activity className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-xs text-white/40">Sin actividad registrada aún.</p>
                </div>
              ) : (
                activity.map((evt: any) => {
                  const profile = evt.profiles;
                  const initial = (profile?.username || "?").charAt(0).toUpperCase();
                  const date = new Date(evt.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <div key={evt.id} className="flex items-start gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div
                        className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 overflow-hidden"
                        style={{ backgroundColor: profile?.color || "var(--color-primary)", width: 26, height: 26 }}
                      >
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-black">{initial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/80">
                          <span className="font-bold" style={{ color: profile?.color || "var(--color-primary)" }}>
                            @{profile?.username || "Usuario"}
                          </span>
                          {" "}
                          <span className="text-white/60">{evt.action}</span>
                        </p>
                        {evt.payload?.name && (
                          <p className="text-[9px] text-orange-300/80 mt-0.5 truncate font-semibold">
                            {evt.payload.name}
                          </p>
                        )}
                        <p className="text-[9px] font-mono text-white/30 mt-0.5">{date}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* METADATA EDIT MODAL */}
      <AnimatePresence>
        {showMetadataModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMetadataModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-sm p-5 relative z-10 flex flex-col gap-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Configuración de Draft</h3>
                <button
                  onClick={() => setShowMetadataModal(false)}
                  className="p-1 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Nombre del Draft</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all"
                    placeholder="Ej. Mi Modpack Brutal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Minecraft</label>
                    <input
                      type="text"
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all"
                      placeholder="Ej. 1.20.1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Mod Loader</label>
                    <select
                      value={editLoader}
                      onChange={(e) => setEditLoader(e.target.value)}
                      className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                    >
                      <option value="fabric">Fabric</option>
                      <option value="forge">Forge</option>
                      <option value="neoforge">NeoForge</option>
                      <option value="quilt">Quilt</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">URL del Banner (Cover)</label>
                  <input
                    type="text"
                    value={editCoverImage}
                    onChange={(e) => setEditCoverImage(e.target.value)}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all font-mono text-[10px]"
                    placeholder="https://ejemplo.com/imagen.png"
                  />
                  {editCoverImage && (
                    <div className="mt-2 h-14 rounded-lg overflow-hidden border border-white/5">
                      <img src={editCoverImage} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = "none"; }} />
                    </div>
                  )}
                </div>

                {/* Visibility selector for creator */}
                {draft?.owner_id === session?.user?.id && (
                  <div>
                    <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Visibilidad</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setEditVisibility("private")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-center ${
                          editVisibility === "private"
                            ? "bg-white/10 text-white border-white/20"
                            : "bg-transparent text-white/45 border-white/5 hover:border-white/10"
                        }`}
                      >
                        Privado
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditVisibility("public")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-center ${
                          editVisibility === "public"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-transparent text-white/45 border-white/5 hover:border-white/10"
                        }`}
                      >
                        Público
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setShowMetadataModal(false)}
                  className="px-4 py-2 rounded-xl text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMetadata}
                  disabled={savingMetadata || !editName.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  {savingMetadata ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ITEM EDIT MODAL */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-xs p-5 relative z-10 flex flex-col gap-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">{editingItem.title}</h3>
                  <p className="text-[9px] text-white/40 font-mono mt-0.5">Editar Propiedades</p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Tipo de Proyecto</label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    {([
                      { id: "mod", label: "Mod" },
                      { id: "resourcepack", label: "Textura" },
                      { id: "shader", label: "Shader" },
                      { id: "datapack", label: "Datapack" }
                    ]).map((t) => {
                      const active = itemType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setItemType(t.id)}
                          className={`py-2 px-2 rounded-xl text-[10px] font-semibold transition-all border text-center ${
                            active
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                              : "bg-white/[0.02] text-white/60 border-white/[0.06] hover:bg-white/5"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Side Selection */}
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Entorno / Lado</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {([
                      { id: "both", label: "Ambos" },
                      { id: "client", label: "Cliente" },
                      { id: "server", label: "Servidor" }
                    ]).map((s) => {
                      const active = itemSide === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setItemSide(s.id)}
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
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white/60 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveItemEdit}
                  disabled={savingItem}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                >
                  {savingItem ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
