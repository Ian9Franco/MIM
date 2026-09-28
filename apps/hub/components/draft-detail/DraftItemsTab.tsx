"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, Pencil, Trash2, ChevronRight, Tag } from "lucide-react";
import { typeColor, typeLabel } from "./draftDetailConstants";
import { CollectionsSkeleton } from "../FomoSkeletons";
import type { ModHit } from "../SpotlightMarquees";
import { supabase } from "../../lib/supabaseClient";
import {
  MAP_CHILD_PRESETS,
  MAP_PARENTS,
  addMapChild,
  categoryDisplayLabel,
  childCategoryId,
  groupItemsByChildId,
  isUncategorizedChildId,
  itemMatchesTreeFilter,
  orgParentForItem,
  orgParentForTypeFilter,
  fixedOrgParentForContentType,
  parseChildCategoryId,
  removeMapChild,
  visibleMapChildren,
  withCategoryLabel,
  withItemsAssignedToCategory,
  type DraftContentTypeFilter,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";
import {
  dualFormatBadgeLabel,
  formatDisplayLabel,
  isDualDraftFormat,
  isOrgParentAllowedForFormat,
  uniqueDraftFormats,
  type DraftItemFormat,
} from "@/lib/fomo/draftItemFormats";
import { fetchDraftProjectFormats, type DraftProjectFormatInfo } from "../../lib/drafts/draftRemote";
import { resolveSessionMapLayout, writeDraftMapLayoutCache } from "@/lib/fomo/draftMapLayoutCache";
import { DraftCategoryFilterBar } from "@/components/fomo/community/draft-tabs/DraftCategoryFilterBar";
import { DraftCreateCategoryModal, DraftOverlayPortal } from "@/components/fomo/community/draft-tabs/DraftCreateCategoryModal";

interface DraftItemsTabProps {
  draftId: string;
  draftVersion?: string;
  mapLayout?: unknown;
  loadingActiveMods: boolean;
  visibleMods: ModHit[];
  handleOpenModDetails: (mod: ModHit) => void;
  onOpenEditItem: (mod: ModHit) => void;
  onRemoveItem?: (mod: ModHit) => void;
  onAssignOrgCategory?: (mod: ModHit, categoryId: string, side: MapParentId) => Promise<void>;
  onChangeItemFormat?: (
    mod: ModHit,
    contentType: string,
    extras?: { versionId?: string | null; category?: string; side?: string },
  ) => Promise<void>;
  onBulkRelocate?: (fromId: string, otherId: string, parent: MapParentId) => void;
  canEditItems?: boolean;
  isPublic?: boolean;
}

export function DraftItemsTab({
  draftId,
  draftVersion,
  mapLayout,
  loadingActiveMods,
  visibleMods,
  handleOpenModDetails,
  onOpenEditItem,
  onRemoveItem,
  onAssignOrgCategory,
  onChangeItemFormat,
  onBulkRelocate,
  canEditItems = false,
  isPublic = false,
}: DraftItemsTabProps) {
  const [typeFilter, setTypeFilter] = useState<DraftContentTypeFilter>("all");
  const [parentFilter, setParentFilter] = useState<MapParentId | "all">("all");
  const [childFilter, setChildFilter] = useState<string | "all">("all");
  const [layout, setLayout] = useState<DraftMapLayout>(() => resolveSessionMapLayout(mapLayout, draftId));
  const [groupEditId, setGroupEditId] = useState<string | null>(null);
  const [groupEditLabel, setGroupEditLabel] = useState("");
  const [assigning, setAssigning] = useState<ModHit | null>(null);
  const [assignParent, setAssignParent] = useState<MapParentId>("both");
  const [assignFormat, setAssignFormat] = useState<string>("mod");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [projectFormats, setProjectFormats] = useState<Record<string, DraftProjectFormatInfo>>({});

  useEffect(() => {
    setLayout(resolveSessionMapLayout(mapLayout, draftId));
  }, [mapLayout, draftId]);

  useEffect(() => {
    setTypeFilter("all");
    setParentFilter("all");
    setChildFilter("all");
  }, [draftId]);

  useEffect(() => {
    const locked = orgParentForTypeFilter(typeFilter);
    if (locked !== "all") setParentFilter(locked);
  }, [typeFilter]);

  const projectIdsKey = visibleMods.map((mod) => mod.projectId).filter(Boolean).sort().join(",");
  useEffect(() => {
    if (!draftVersion || !projectIdsKey) {
      setProjectFormats({});
      return;
    }
    let cancelled = false;
    void fetchDraftProjectFormats(projectIdsKey.split(","), draftVersion).then((next) => {
      if (!cancelled) setProjectFormats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [draftVersion, projectIdsKey]);

  const formatsFor = useCallback((mod: ModHit) => {
    return uniqueDraftFormats([mod.projectType, ...(projectFormats[mod.projectId]?.types || [])]);
  }, [projectFormats]);

  const decorateMod = useCallback((mod: ModHit): ModHit => {
    const info = projectFormats[mod.projectId];
    return {
      ...mod,
      availableFormats: formatsFor(mod),
      formatVersionIds: info?.versionByType,
    };
  }, [formatsFor, projectFormats]);

  const persistLayout = useCallback((next: DraftMapLayout) => {
    setLayout(next);
    writeDraftMapLayoutCache(draftId, next);
    void supabase.from("drafts").update({ map_layout: next }).eq("id", draftId);
  }, [draftId]);

  const treeItems = useMemo(
    () => visibleMods.map((mod) => ({
      ...mod,
      id: String(mod.itemId || mod.projectId),
      category: mod.orgCategory,
      side: mod.side,
      mod_name: mod.title,
      project_id: mod.projectId,
      content_type: mod.projectType,
      projectType: mod.projectType,
    })),
    [visibleMods],
  );

  const filteredItems = useMemo(() => {
    return treeItems.filter((item) => {
      if (typeFilter !== "all" && (item.projectType || "mod") !== typeFilter) return false;
      return itemMatchesTreeFilter(item, parentFilter, childFilter);
    });
  }, [treeItems, typeFilter, parentFilter, childFilter]);

  const grouped = useMemo(() => groupItemsByChildId(filteredItems, layout), [filteredItems, layout]);
  const mapChildren = useMemo(() => visibleMapChildren(layout, Object.keys(grouped)), [layout, grouped]);

  const handleSaveChild = (childId: string, label: string) => {
    persistLayout(withCategoryLabel(layout, childId, label));
  };

  const handleRemoveChild = async (childId: string) => {
    const result = removeMapChild(layout, childId);
    if (!result.ok) return;
    if (!window.confirm("¿Eliminar esta categoría? Los items pasan a Sin categoría.")) return;
    persistLayout(result.layout);
    await supabase
      .from("draft_items")
      .update({ category: result.otherId, side: result.parent })
      .eq("draft_id", draftId)
      .eq("category", result.fromId);
    onBulkRelocate?.(result.fromId, result.otherId, result.parent);
  };

  const commitAssign = async (nextLayout: DraftMapLayout, childId: string, parent: MapParentId) => {
    if (!assigning) return;
    const format = assignFormat || assigning.projectType || "mod";
    const nextParent = isOrgParentAllowedForFormat(parent, format)
      ? parent
      : (fixedOrgParentForContentType(format) || parent);
    const parsed = parseChildCategoryId(childId);
    const resolvedChild = parsed ? childCategoryId(nextParent, parsed.slug) : childId;
    persistLayout(withItemsAssignedToCategory(nextLayout, resolvedChild, [String(assigning.itemId || assigning.projectId)]));
    const versionId = projectFormats[assigning.projectId]?.versionByType?.[format as DraftItemFormat];
    if (format !== assigning.projectType && onChangeItemFormat) {
      await onChangeItemFormat(assigning, format, { versionId, category: resolvedChild, side: nextParent });
    } else {
      await onAssignOrgCategory?.(assigning, resolvedChild, nextParent);
    }
    setAssigning(null);
    setNewCategoryName("");
  };

  const openCreateCategory = () => {
    const locked = orgParentForTypeFilter(typeFilter);
    const branch = locked !== "all" ? locked : parentFilter;
    if (branch === "all") return;
    setAssignParent(branch);
    setNewCategoryName("");
    setShowCreateCategory(true);
  };

  const handleCategoryCreated = (child: { id: string; parent: MapParentId }, nextLayout: DraftMapLayout) => {
    persistLayout(nextLayout);
    setParentFilter(child.parent);
    setChildFilter(child.id);
  };

  return (
    <motion.div
      key="items"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 h-full min-h-0 max-h-[min(70vh,720px)] overflow-hidden"
    >
      <div className="relative z-20 shrink-0 overflow-visible">
      <DraftCategoryFilterBar
        typeFilter={typeFilter}
        parentFilter={parentFilter}
        childFilter={childFilter}
        mapChildren={mapChildren}
        layout={layout}
        onTypeFilter={setTypeFilter}
        onParentFilter={setParentFilter}
        onChildFilter={setChildFilter}
        canEditCategories={canEditItems}
        onCreateCategory={canEditItems ? openCreateCategory : undefined}
        createCategoryDisabled={
          orgParentForTypeFilter(typeFilter) === "all" && parentFilter === "all"
        }
        createCategoryTitle={
          orgParentForTypeFilter(typeFilter) !== "all"
            ? "Nueva categoría en la rama fija de este tipo"
            : parentFilter === "all"
              ? "Elegí Client, Server o Both en el filtro de rama"
              : "Nueva categoría en la rama seleccionada"
        }
      />
      </div>

      <div className="relative z-0 flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-4 pr-1">
      {loadingActiveMods ? (
        <CollectionsSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center text-xs text-white/40">
          <p>{visibleMods.length === 0 ? "Este draft no tiene ítems." : childFilter !== "all" ? "No hay ítems en esta categoría. Tocá el badge de categoría en un ítem para moverlo." : "No hay items con estos filtros."}</p>
          <p className="mt-2 px-4 text-[9px] text-white/30">
            {canEditItems
              ? "Podés agregar mods desde Explorar. Solo el dueño y los invitados editan."
              : isPublic
                ? "Este draft es público: se puede ver. Para editar necesitás una invitación."
                : "Draft privado: solo se puede ver."}
          </p>
        </div>
      ) : (
        MAP_PARENTS.map((parent) => {
          const kids = mapChildren.filter((child) => child.parent === parent.id && (grouped[child.id]?.length || 0) > 0);
          if (kids.length === 0) return null;
          return (
            <div key={parent.id} className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white/50">
                {categoryDisplayLabel(parent.id, parent.label, layout)}
              </h3>
              {kids.map((child) => {
                const items = grouped[child.id] || [];
                return (
                  <div key={child.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <Tag className="w-3 h-3 text-orange-400/70" />
                      {groupEditId === child.id ? (
                        <input
                          autoFocus
                          value={groupEditLabel}
                          onChange={(e) => setGroupEditLabel(e.target.value)}
                          onBlur={() => {
                            handleSaveChild(child.id, groupEditLabel);
                            setGroupEditId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveChild(child.id, groupEditLabel);
                              setGroupEditId(null);
                            }
                            if (e.key === "Escape") setGroupEditId(null);
                          }}
                          className="min-w-0 flex-1 max-w-xs rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                        />
                      ) : (
                        <h4 className="text-xs font-bold text-white">{categoryDisplayLabel(child.id, child.label, layout)}</h4>
                      )}
                      <span className="text-[10px] text-white/40">({items.length})</span>
                      {canEditItems && (
                        <>
                          <button
                            type="button"
                            title="Renombrar categoría"
                            className="p-1 rounded-md text-white/30 hover:text-white"
                            onClick={() => {
                              setGroupEditId(child.id);
                              setGroupEditLabel(categoryDisplayLabel(child.id, child.label, layout));
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {!isUncategorizedChildId(child.id) && (
                            <button
                              type="button"
                              title="Eliminar categoría"
                              className="p-1 rounded-md text-white/30 hover:text-red-400"
                              onClick={() => { void handleRemoveChild(child.id); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {items.map((mod) => {
                      const col = typeColor(mod.projectType);
                      const dualTypes = projectFormats[mod.projectId]?.types || [];
                      const dual = isDualDraftFormat(dualTypes);
                      return (
                        <div
                          key={mod.itemId || mod.projectId}
                          onClick={() => handleOpenModDetails(mod)}
                          className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-white/15"
                        >
                          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {mod.iconUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
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
                              {dual && (
                                <span
                                  className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-200 border border-amber-400/30"
                                  title="Este proyecto publica más de un formato en la versión del draft"
                                >
                                  Dual · {dualFormatBadgeLabel(dualTypes)}
                                </span>
                              )}
                              {canEditItems && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignFormat(mod.projectType || "mod");
                                    setAssignParent(orgParentForItem({ projectType: mod.projectType, side: mod.side }));
                                    setAssigning(mod);
                                  }}
                                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-[8rem]"
                                  title="Mover de categoría"
                                >
                                  {categoryDisplayLabel(child.id, child.label, layout)}
                                </button>
                              )}
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

                          {canEditItems && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditItem(decorateMod(mod));
                              }}
                              className="p-1.5 rounded-lg text-white/30 hover:text-orange-400 hover:bg-orange-500/10 transition-all active:scale-90"
                              title="Modificar tipo o lado del ítem"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onRemoveItem ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveItem(mod);
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
                    })}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
      </div>

      <DraftCreateCategoryModal
        open={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        layout={layout}
        assignParent={assignParent}
        setAssignParent={setAssignParent}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        onCreated={handleCategoryCreated}
        onRenameCategory={(childId, label) => {
          persistLayout(withCategoryLabel(layout, childId, label));
        }}
        lockedParent={(() => {
          const locked = orgParentForTypeFilter(typeFilter);
          if (locked !== "all") return locked;
          return parentFilter !== "all" ? parentFilter : undefined;
        })()}
      />

      {assigning && (
        <DraftOverlayPortal open onClose={() => setAssigning(null)}>
          <div
            className="relative z-[201] w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white">Mover categoría</h3>
            <p className="text-[10px] text-white/50">
              Organización del draft. El formato (mod, textura, datapack) solo cambia si el proyecto publica más de uno en {draftVersion || "esta versión"}.
            </p>
            {(() => {
              const dualTypes = projectFormats[assigning.projectId]?.types || [];
              const formatOptions = uniqueDraftFormats([assigning.projectType, ...dualTypes]);
              const lockedBranch = fixedOrgParentForContentType(assignFormat);
              const branch = lockedBranch ?? assignParent;
              const customChildren = (layout.children || []).filter(
                (child) => child.parent === branch && !MAP_CHILD_PRESETS.some((preset) => preset.slug === child.slug),
              );
              return (
                <>
            {formatOptions.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                  Dual · {dualFormatBadgeLabel(dualTypes.length > 1 ? dualTypes : formatOptions)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {formatOptions.map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => {
                        setAssignFormat(format);
                        const nextLocked = fixedOrgParentForContentType(format);
                        if (nextLocked) setAssignParent(nextLocked);
                      }}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${assignFormat === format ? "border-amber-400/40 bg-amber-500/15 text-amber-200" : "border-white/10 text-white/50"}`}
                    >
                      {formatDisplayLabel(format)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {lockedBranch ? (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[10px] font-bold uppercase text-orange-200">
                Rama: {MAP_PARENTS.find((p) => p.id === lockedBranch)?.label || lockedBranch} (fijo para este formato)
              </div>
            ) : (
            <div className="flex gap-1">
              {MAP_PARENTS.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => setAssignParent(parent.id)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase ${assignParent === parent.id ? "border-orange-400/40 bg-orange-500/15 text-orange-300" : "border-white/10 text-white/50"}`}
                >
                  {parent.label}
                </button>
              ))}
            </div>
            )}
            {customChildren.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customChildren.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      void commitAssign(layout, child.id, branch);
                    }}
                    className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2 py-1.5 text-[10px] font-bold text-indigo-200"
                  >
                    {categoryDisplayLabel(child.id, child.label, layout)}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {MAP_CHILD_PRESETS.map((preset) => (
                <button
                  key={preset.slug}
                  type="button"
                  onClick={() => {
                    const { layout: next } = addMapChild(layout, branch, preset.label);
                    void commitAssign(next, childCategoryId(branch, preset.slug), branch);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-left text-[10px] font-bold text-white/80"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva categoría"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
              />
              <button
                type="button"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  const { layout: next, child } = addMapChild(layout, branch, newCategoryName.trim());
                  void commitAssign(next, child.id, branch);
                }}
                className="rounded-xl bg-orange-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
              >
                Añadir
              </button>
            </div>
                </>
              );
            })()}
            <button type="button" onClick={() => setAssigning(null)} className="w-full py-2 text-[10px] text-white/40">
              Cancelar
            </button>
          </div>
        </DraftOverlayPortal>
      )}
    </motion.div>
  );
}
