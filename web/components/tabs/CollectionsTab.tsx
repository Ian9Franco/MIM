"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Loader2, ArrowLeft, ChevronRight, Layers, Trash2, Pencil } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import type { CollectionItem } from "../../app/types";

interface CollectionsTabProps {
  activeCollection: CollectionItem | null;
  modrinthFeatured: CollectionItem[];
  curseForgeFeatured: CollectionItem[];
  activeCollectionMods: ModHit[];
  loadingActiveMods: boolean;
  session: any;
  userDrafts: any[];
  handleEnterCollection: (coll: CollectionItem) => void;
  handleExitCollection: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: (draft: any) => void;
  onRemoveModFromDraft?: (draftId: string, projectId: string, itemId?: string) => Promise<void>;
  onRefreshDrafts?: () => void;
  onEditDraft?: (draft: any) => void;
}

/**
 * CollectionsTab — lista de colecciones Modrinth/CurseForge y Drafts del usuario.
 * Al entrar en una colección muestra sus mods.
 */
export function CollectionsTab({
  activeCollection, modrinthFeatured, curseForgeFeatured, activeCollectionMods,
  loadingActiveMods, session, userDrafts, handleEnterCollection, handleExitCollection,
  handleOpenModDetails, handleEnterDraftCollection, onRemoveModFromDraft, onRefreshDrafts, onEditDraft,
}: CollectionsTabProps) {
  const [draftTypeFilter, setDraftTypeFilter] = React.useState("all");
  const [removedDraftItemIds, setRemovedDraftItemIds] = React.useState<Set<string>>(new Set());
  const isDraftCollection = activeCollection?.source === "draft";
  const draftTypeFilters = [
    { id: "all", label: "Todo" },
    { id: "mod", label: "Mods" },
    { id: "resourcepack", label: "Texturas" },
    { id: "shader", label: "Shaders" },
    { id: "datapack", label: "Datapacks" },
  ];
  React.useEffect(() => {
    setDraftTypeFilter("all");
    setRemovedDraftItemIds(new Set());
  }, [activeCollection?.id]);
  const typeLabel = (type?: string) => {
    if (type === "resourcepack") return "Textura";
    if (type === "shader") return "Shader";
    if (type === "datapack") return "Datapack";
    return "Mod";
  };
  const visibleCollectionMods = activeCollectionMods.filter((mod: any) => {
    const key = mod.itemId || mod.id || mod.projectId;
    if (removedDraftItemIds.has(key)) return false;
    if (!isDraftCollection || draftTypeFilter === "all") return true;
    return (mod.projectType || "mod") === draftTypeFilter;
  });

  return (
    <motion.div
      key="collections"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 relative"
    >
      <AnimatePresence mode="wait">
        {!activeCollection ? (
          /* ── List view ── */
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
          >
            <div
              className="border-l-2 rounded-r-lg p-3 mb-6 shrink-0"
              style={{
                background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
                borderColor: "var(--color-primary)"
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>
                Colecciones
              </p>
              <h2 className="text-xs font-semibold text-white/95 mt-1">
                Colecciones editoriales y modpacks colaborativos.
              </h2>
            </div>

            {/* Modrinth Official */}
            {modrinthFeatured.length > 0 && (
              <div className="flex flex-col gap-3 mb-6 shrink-0">
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1">
                  Colecciones Oficiales de Modrinth
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {modrinthFeatured.map(coll => (
                    <div
                      key={coll.id}
                      onClick={() => handleEnterCollection(coll)}
                      className="mim-themed-card border rounded-2xl p-4 flex flex-col gap-3 min-w-[260px] max-w-[260px] snap-center hover:border-white/10 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="h-28 rounded-xl bg-white/5 border border-white/[0.05] overflow-hidden relative flex items-center justify-center">
                        {coll.iconUrl ? (
                          <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Compass className="w-12 h-12 text-white/20" />
                        )}
                        <span className="absolute bottom-2.5 right-2.5 bg-black/60 border border-white/[0.05] rounded-md px-2 py-0.5 text-[9px] font-mono text-white/70">
                          {coll.projectCount} mods
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate">{coll.name}</h4>
                        <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">{coll.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CurseForge Picks */}
            {curseForgeFeatured.length > 0 && (
              <div className="flex flex-col gap-3 mb-6 shrink-0">
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1">CurseForge Picks</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {curseForgeFeatured.map(pick => (
                    <div
                      key={pick.id}
                      onClick={() => handleEnterCollection(pick)}
                      className="mim-themed-card border rounded-2xl p-4 flex flex-col gap-3 min-w-[260px] max-w-[260px] snap-center hover:border-white/10 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="h-28 rounded-xl bg-white/5 border border-white/[0.05] overflow-hidden relative">
                        <img src={pick.iconUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate">{pick.name}</h4>
                        <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">{pick.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Drafts */}
            <div className="flex flex-col gap-3 mb-6 shrink-0">
              <h3 className="text-xs font-bold text-white/80 tracking-wide px-1">
                Tus Modpacks Colaborativos (Supabase)
              </h3>
              {session ? (
                userDrafts.length > 0 ? (
                  <div className="grid gap-3 px-1">
                    {userDrafts.map(draft => (
                      <div
                        key={draft.id}
                        onClick={() => handleEnterDraftCollection(draft)}
                        className="mim-themed-card border rounded-2xl overflow-hidden active:scale-[0.98] transition-all cursor-pointer hover:border-white/10"
                      >
                        {draft.cover_image && (
                          <div className="h-20 w-full">
                            <img src={draft.cover_image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{draft.name}</h4>
                              <p className="text-[10px] text-white/45 mt-0.5">Versión: {draft.minecraft_version} • Loader: {draft.loader}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {onEditDraft && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditDraft(draft);
                                }}
                                className="p-1.5 rounded-lg text-white/35 hover:text-orange-300 hover:bg-white/5 transition-all active:scale-90"
                                title="Editar draft"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <ChevronRight className="w-4 h-4 text-white/30" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl p-6 text-center text-xs text-white/40">
                    No tienes modpacks creados.
                  </div>
                )
              ) : (
                <div className="bg-surface/60 border border-border rounded-2xl p-6 text-center">
                  <p className="text-xs text-white/40">
                    Iniciá sesión en la pestaña Perfil para sincronizar y ver tus modpacks.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── Collection detail view ── */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center gap-3 mb-5 shrink-0">
              <button
                onClick={handleExitCollection}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl text-white/70 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Colección abierta</span>
                <h2 className="text-xs font-bold text-white truncate leading-tight mt-0.5">{activeCollection.name}</h2>
              </div>
            </div>

            {loadingActiveMods ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Leyendo mods de la colección...</span>
              </div>
            ) : activeCollectionMods.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-1 scrollbar-none">
                <p className="text-[10px] text-white/40 italic px-1 mb-2">{activeCollection.description}</p>
                {isDraftCollection && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 px-1">
                    {draftTypeFilters.map((filter) => {
                      const active = draftTypeFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => setDraftTypeFilter(filter.id)}
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
                {visibleCollectionMods.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center text-xs text-white/40">
                    No hay items de este tipo.
                  </div>
                ) : visibleCollectionMods.map((mod: any) => (
                  <div
                    key={mod.itemId || mod.id || mod.projectId}
                    onClick={() => handleOpenModDetails(mod)}
                    className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/20">
                          {typeLabel(mod.projectType)}
                        </span>
                        {mod.loaders?.[0] && (
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {mod.loaders[0]}
                          </span>
                        )}
                        {mod.gameVersions?.[0] && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 text-white/55 border border-white/[0.06]">
                            {mod.gameVersions[0]}
                          </span>
                        )}
                        {mod.side && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {mod.side}
                          </span>
                        )}
                        {mod.versionId ? (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-300 border border-green-500/20">
                            OK
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                            revisar
                          </span>
                        )}
                      </div>
                    </div>
                    {isDraftCollection && onRemoveModFromDraft ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const itemId = mod.itemId || mod.id;
                          await onRemoveModFromDraft(activeCollection.id, mod.projectId, itemId);
                          setRemovedDraftItemIds((prev) => new Set(prev).add(itemId || mod.projectId));
                          onRefreshDrafts?.();
                        }}
                        className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                        title="Eliminar del draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                <Compass className="w-12 h-12 text-emerald-400 mb-4 opacity-50" />
                <h2 className="text-sm font-semibold text-white">Sin mods</h2>
                <p className="text-xs text-white/40 mt-1">Esta colección no tiene proyectos asociados.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
