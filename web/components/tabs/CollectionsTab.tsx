"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Loader2, ArrowLeft, ChevronRight, UserCheck } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import type { CollectionItem } from "../../app/types";
import { DraftDetailView } from "../DraftDetailView";

interface CollectionsTabProps {
  activeCollection: CollectionItem | null;
  modrinthFeatured: CollectionItem[];
  curseForgeFeatured: CollectionItem[];
  activeCollectionMods: ModHit[];
  loadingActiveMods: boolean;
  session: any;
  userDrafts: any[];
  activeDraft?: any;
  handleEnterCollection: (coll: CollectionItem) => void;
  handleExitCollection: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: (draft: any) => void;
  onRemoveModFromDraft?: (draftId: string, projectId: string, itemId?: string) => Promise<void>;
  onRefreshDrafts?: () => void;
  onEditDraft?: (draft: any) => void;
  onCreateDraft?: () => void;
  onUpdateDraftMetadata?: (draftId: string, updates: any) => Promise<boolean>;
  onRecategorizeDraftItem?: (draftId: string, projectId: string, category: string) => Promise<void>;
  onUpdateDraftItemSide?: (draftId: string, projectId: string, side: string, itemId?: string) => Promise<void>;
  userFavorites?: any[];
  userFollowedAuthors?: any[];
}

/**
 * CollectionsTab — lista de colecciones Modrinth/CurseForge y Drafts del usuario.
 * Al entrar en un draft muestra DraftDetailView con banner y sub-tabs.
 * Al entrar en una colección editorial muestra la vista estándar de ítems.
 */
export function CollectionsTab({
  activeCollection, modrinthFeatured, curseForgeFeatured, activeCollectionMods,
  loadingActiveMods, session, userDrafts, activeDraft, handleEnterCollection, handleExitCollection,
  handleOpenModDetails, handleEnterDraftCollection, onRemoveModFromDraft, onRefreshDrafts,
  onEditDraft, onCreateDraft, onUpdateDraftMetadata, onRecategorizeDraftItem, onUpdateDraftItemSide,
  userFavorites = [],
  userFollowedAuthors = [],
}: CollectionsTabProps) {
  const isDraftCollection = activeCollection?.source === "draft";

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
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1">Colecciones Oficiales de Modrinth</h3>
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


            {/* Mis Mods Favoritos */}
            {session && (
              <div className="flex flex-col gap-3 mb-6 shrink-0 mt-2">
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1">Mis Mods Favoritos</h3>
                {userFavorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                    {userFavorites.map((fav: any) => {
                      const projectId = fav.mod_id || fav.project_id || fav.id;
                      const projectType = fav.project_type || "mod";
                      return (
                        <div
                          key={fav.id}
                          onClick={() => handleOpenModDetails({
                            projectId,
                            title: fav.name,
                            description: fav.description || "",
                            iconUrl: fav.icon_url,
                            author: fav.author || "Comunidad",
                            projectType,
                            categories: fav.categories || [],
                            url: fav.url || `https://modrinth.com/${projectType}/${projectId}`,
                            _source: fav.platform || "modrinth",
                          })}
                          className="bg-surface/60 border border-border hover:border-white/10 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
                        >
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {fav.icon_url ? (
                              <img src={fav.icon_url} alt="" className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-white/40 text-xs font-bold uppercase">{fav.name.substring(0, 2)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{fav.name}</h4>
                            <p className="text-[9px] text-white/35 mt-0.5 capitalize">{fav.platform}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl p-6 text-center">
                    <p className="text-xs text-white/40">No tienes mods favoritos guardados.</p>
                  </div>
                )}
              </div>
            )}

            {/* Autores Seguidos */}
            {session && (
              <div className="flex flex-col gap-3 mb-6 shrink-0">
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1">Autores Seguidos</h3>
                {userFollowedAuthors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                    {userFollowedAuthors.map((a: any) => (
                      <div
                        key={a.id}
                        className="bg-surface/60 border border-border rounded-2xl p-3.5 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {a.icon_url ? (
                            <img src={a.icon_url} alt="" className="object-cover w-full h-full rounded-full" />
                          ) : (
                            <span className="text-blue-400 text-[10px] font-bold uppercase">{a.author_name?.substring(0, 2)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{a.author_name}</h4>
                          <p className="text-[9px] text-white/35 mt-0.5 capitalize">{a.platform}</p>
                        </div>
                        <UserCheck className="w-3.5 h-3.5 text-blue-400/60 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl p-6 text-center">
                    <p className="text-xs text-white/40">No seguís a ningún autor todavía.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

        ) : isDraftCollection && activeDraft ? (
          /* ── Draft detail: banner + tabs (Resumen, Ítems, Miembros, Actividad) ── */
          <DraftDetailView
            key={`draft-${activeCollection.id}`}
            draft={activeDraft}
            activeCollectionMods={activeCollectionMods}
            loadingActiveMods={loadingActiveMods}
            session={session}
            onBack={handleExitCollection}
            onEditDraft={onEditDraft}
            handleOpenModDetails={handleOpenModDetails}
            onRemoveModFromDraft={onRemoveModFromDraft}
            onRefreshDrafts={onRefreshDrafts}
            onUpdateDraftMetadata={onUpdateDraftMetadata}
            onRecategorizeDraftItem={onRecategorizeDraftItem}
            onUpdateDraftItemSide={onUpdateDraftItemSide}
          />

        ) : (
          /* ── Standard Modrinth/CurseForge collection detail ── */
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
                {activeCollectionMods.map((mod: any) => (
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
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
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
