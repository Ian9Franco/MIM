import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListPlus, Blend, Image, Glasses, Database, Puzzle, Trash2, Search, CheckSquare, Square, LayoutGrid, List, Tag, Map as MapIcon, Pencil, X } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";
import { openProjectDetailsInFomo } from "@/lib/fomo/fomoProjectNavigation";
import { analyzeDraftItems } from "@/lib/fomo/draftItemInsights";
import {
  MAP_CHILD_PRESETS,
  MAP_PARENTS,
  addMapChild,
  categoryDisplayLabel,
  childCategoryId,
  slugifyCategory,
  groupItemsByChildId,
  isUncategorizedChildId,
  itemMatchesTreeFilter,
  itemParentId,
  orgParentForItem,
  orgParentForTypeFilter,
  parseChildCategoryId,
  reparentMapChild,
  removeMapChild,
  resolveItemChildId,
  visibleMapChildren,
  withCategoryLabel,
  withCategoryPosition,
  withItemsAssignedToCategory,
  type DraftContentTypeFilter,
  type DraftMapLayout,
  type DraftMapPosition,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";
import { resolveSessionMapLayout, writeDraftMapLayoutCache } from "@/lib/fomo/draftMapLayoutCache";
import { useDraftItemCatalog } from "@/hooks/fomo/useDraftItemCatalog";
import { DraftItemMapBoard, DraftInsightsStrip, type MapBoardFilter } from "./DraftItemMapBoard";
import { DraftOverlayPortal } from "./DraftCreateCategoryModal";
import { DraftCategoryFilterBar } from "./DraftCategoryFilterBar";
import { DraftCreateCategoryModal } from "./DraftCreateCategoryModal";
import { FomoDropdown, FomoDropdownOption } from "@/components/fomo/shared/FomoDropdown";

const TYPE_CONFIG = {
  mod:          { label: "Mods",      icon: Puzzle,   color: "text-primary",      bg: "bg-primary/15",    border: "border-primary/20" },
  resourcepack: { label: "Texturas",  icon: Image,    color: "text-amber-400",    bg: "bg-amber-500/15",  border: "border-amber-500/20" },
  shader:       { label: "Shaders",   icon: Glasses,  color: "text-purple-400",   bg: "bg-purple-500/15", border: "border-purple-500/20" },
  datapack:     { label: "Datapacks", icon: Database,  color: "text-emerald-400",  bg: "bg-emerald-500/15",border: "border-emerald-500/20" },
} as const;

const SIDE_STYLES = {
  client: { label: "Client", cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  server: { label: "Server", cls: "bg-red-500/15 text-red-400 border-red-500/25" },
  both:   { label: "Both",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
} as const;

export const MOD_CATEGORIES = [
  { id: "core", label: "Librería / Core" },
  { id: "performance", label: "Rendimiento" },
  { id: "utility", label: "Utilidad / QoL" },
  { id: "world", label: "Mundo" },
  { id: "mobs", label: "Fauna y Jefes" },
  { id: "tech", label: "Tecnología / Magia" },
  { id: "building", label: "Construcción" },
  { id: "other", label: "Otros / Sin Asignar" },
] as const;

export function DraftItemsTab({
  draftItems,
  isModern,
  selectedItems,
  setSelectedItems,
  fetchDraftInfo,
  draftLoader = "",
  draftVersion = "",
  draftId,
  mapLayout,
}: {
  draftItems: any[];
  isModern: boolean;
  selectedItems: Set<string>;
  setSelectedItems: (items: Set<string>) => void;
  fetchDraftInfo: (silent?: boolean) => void;
  draftLoader?: string;
  draftVersion?: string;
  draftId: string;
  mapLayout?: unknown;
}) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [mapOpen, setMapOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DraftContentTypeFilter>("all");
  const [parentFilter, setParentFilter] = useState<MapParentId | "all">("all");
  const [childFilter, setChildFilter] = useState<string | "all">("all");
  const [mapFilter, setMapFilter] = useState<MapBoardFilter>("all");
  const [groupEditId, setGroupEditId] = useState<string | null>(null);
  const [groupEditLabel, setGroupEditLabel] = useState("");
  const [layout, setLayout] = useState<DraftMapLayout>(() => resolveSessionMapLayout(mapLayout, draftId));
  const layoutDirtyRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDraftIdRef = useRef(draftId);

  const flushPersistLayout = useCallback((next: DraftMapLayout) => {
    writeDraftMapLayoutCache(draftId, next);
    void supabase.from("drafts").update({ map_layout: next }).eq("id", draftId).then(({ error }) => {
      if (error) {
        console.error("Error saving map layout", error);
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "No se pudo guardar el mapa de categorías.", type: "error" },
        }));
        return;
      }
      layoutDirtyRef.current = false;
    });
  }, [draftId]);

  const schedulePersistLayout = useCallback((next: DraftMapLayout) => {
    layoutDirtyRef.current = true;
    writeDraftMapLayoutCache(draftId, next);
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => flushPersistLayout(next), 300);
  }, [draftId, flushPersistLayout]);

  const persistLayout = useCallback((next: DraftMapLayout) => {
    setLayout(next);
    schedulePersistLayout(next);
  }, [schedulePersistLayout]);

  useEffect(() => {
    if (lastDraftIdRef.current !== draftId) {
      lastDraftIdRef.current = draftId;
      layoutDirtyRef.current = false;
      setLayout(resolveSessionMapLayout(mapLayout, draftId));
      return;
    }
    if (layoutDirtyRef.current) return;
    setLayout(resolveSessionMapLayout(mapLayout, draftId));
  }, [mapLayout, draftId]);

  useEffect(() => () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
  }, []);
  useEffect(() => {
    const locked = orgParentForTypeFilter(typeFilter);
    if (locked !== "all") setParentFilter(locked);
  }, [typeFilter]);
  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [assignParent, setAssignParent] = useState<MapParentId>("both");

  const handleUpdateSide = async (itemId: string, side: string) => {
    try {
      const parent = itemParentId(side);
      const item = draftItems.find((entry) => entry.id === itemId);
      const slug = parseChildCategoryId(String(item?.category || ""))?.slug
        || slugifyCategory(String(item?.category || "other"));
      const updates = { side: parent, category: childCategoryId(parent, slug) };
      const { error } = await supabase.from("draft_items").update(updates).eq("id", itemId);
      if (error) throw error;
      fetchDraftInfo(true);
    } catch (err) {
      console.error("Error updating side", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al actualizar el lado del item.", type: "error" }
      }));
    }
  };

  const handleMoveCategory = (categoryId: string, position: DraftMapPosition) => {
    setLayout((prev) => {
      const next = withCategoryPosition(prev, categoryId, position);
      schedulePersistLayout(next);
      return next;
    });
  };

  const handleCreateChild = (parent: MapParentId, label: string) => {
    const { layout: next } = addMapChild(layout, parent, label);
    persistLayout(next);
  };

  const handleRemoveChild = async (childId: string) => {
    const result = removeMapChild(layout, childId);
    if (!result.ok) {
      if (result.reason === "protected") {
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Sin categoría no se puede eliminar.", type: "warning" },
        }));
      }
      return;
    }
    if (!window.confirm("¿Eliminar esta categoría? Los items pasan a Sin categoría.")) return;
    persistLayout(result.layout);
    try {
      const { error } = await supabase.from("draft_items").update({ category: result.otherId, side: result.parent }).eq("draft_id", draftId).eq("category", result.fromId);
      if (error) throw error;
      fetchDraftInfo(true);
    } catch (err) {
      console.error("Error removing category", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "No se pudieron reasignar los items de la categoría.", type: "error" },
      }));
    }
  };

  const handleSaveChild = async (childId: string, label: string, nextParent: MapParentId) => {
    const next = withCategoryLabel(layout, childId, label);
    const result = reparentMapChild(next, childId, nextParent);
    if (result.ok) {
      persistLayout(result.layout);
      const ids = draftItems
        .filter((item) => resolveItemChildId(item) === result.fromId || item.category === result.fromId)
        .map((item) => String(item.id));
      if (ids.length === 0) return;
      try {
        const { error } = await supabase.from("draft_items").update({ category: result.toId, side: nextParent }).in("id", ids);
        if (error) throw error;
        fetchDraftInfo(true);
      } catch (err) {
        console.error("Error reparenting category", err);
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "No se pudieron mover los mods de la categoría.", type: "error" },
        }));
      }
      return;
    }
    persistLayout(next);
  };

  const handleUpdateCategory = async (category: string, idsOverride?: string[], silent = false, side?: MapParentId) => {
    const ids = idsOverride || Array.from(selectedItems);
    if (ids.length === 0) return;
    const parsed = parseChildCategoryId(category);
    const slug = parsed?.slug || slugifyCategory(category);
    setLayout((prev) => {
      let next = prev;
      for (const id of ids) {
        const item = draftItems.find((entry) => entry.id === id);
        const parent = side || orgParentForItem({ side: item?.side, content_type: item?.content_type });
        next = withItemsAssignedToCategory(next, childCategoryId(parent, slug), [id]);
      }
      schedulePersistLayout(next);
      return next;
    });
    try {
      for (const id of ids) {
        const item = draftItems.find((entry) => entry.id === id);
        const parent = side || orgParentForItem({ side: item?.side, content_type: item?.content_type });
        const catId = childCategoryId(parent, slug);
        const { error } = await supabase.from("draft_items").update({ category: catId, side: parent }).eq("id", id);
        if (error) throw error;
      }
      fetchDraftInfo(true);
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
      if (!idsOverride) setSelectedItems(new Set());
      if (!silent) {
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Categoría asignada a los mods seleccionados.", type: "success" }
        }));
      }
    } catch (err) {
      console.error("Error updating category", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al actualizar la categoría.", type: "error" }
      }));
    }
  };

  const handleUpdateVersion = async (itemId: string, versionId: string) => {
    try {
      const { error } = await supabase.from("draft_items").update({ version_id: versionId }).eq("id", itemId);
      if (error) throw error;
      fetchDraftInfo(true);
    } catch (err) {
      console.error("Error updating version", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al actualizar la versión.", type: "error" }
      }));
    }
  };

  const handleDeleteItems = async (ids: string[]) => {
    try {
      const { error } = await supabase.from("draft_items").delete().in("id", ids);
      if (!error) {
        setSelectedItems(new Set());
        fetchDraftInfo(true);
        window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
      }
    } catch (err) {
      console.error("[DraftItemsTab] Error deleting draft items:", err);
    }
  };

  const handleOpenDetails = (item: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    openProjectDetailsInFomo(
      item.project_id,
      item.source === "curseforge" ? "curseforge" : "modrinth",
      {
        title: item.mod_name || item.project_id,
        projectType: item.content_type || "mod",
      },
    );
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return draftItems.filter((item) => {
      if (typeFilter !== "all" && (item.content_type || "mod") !== typeFilter) return false;
      if (!itemMatchesTreeFilter(item, parentFilter, childFilter)) return false;
      if (!q) return true;
      return (item.mod_name || item.project_id || "").toLowerCase().includes(q)
        || (item.source || "").toLowerCase().includes(q);
    });
  }, [draftItems, search, typeFilter, parentFilter, childFilter]);

  const mapGroups = useMemo(
    () => groupItemsByChildId(filteredItems, layout),
    [filteredItems, layout],
  );

  const groupedMods = useMemo(() => {
    const result: Record<string, any[]> = {};
    for (const [id, items] of Object.entries(mapGroups)) {
      if (items.length > 0) result[id] = items;
    }
    return result;
  }, [mapGroups]);

  const insights = useMemo(
    () =>
      analyzeDraftItems(
        draftItems.map((item) => ({
          id: String(item.id),
          project_id: String(item.project_id || item.projectId || ""),
          source: item.source,
          mod_name: item.mod_name,
          dependencies: item.dependencies || [],
        })),
      ),
    [draftItems],
  );

  const catalogTargets = useMemo(
    () => [
      ...draftItems,
      ...insights.missing.map((item) => ({
        project_id: item.project_id,
        source: item.fromSource || "modrinth",
      })),
    ],
    [draftItems, insights.missing],
  );
  const { catalog, loading: catalogLoading } = useDraftItemCatalog(catalogTargets, catalogTargets.length > 0);

  const totalCount = draftItems.length;
  const selectedCount = selectedItems.size;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const mapChildren = useMemo(
    () => visibleMapChildren(layout, Object.keys(mapGroups)),
    [layout, mapGroups],
  );

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

  const txt = isModern ? "text-foreground" : "text-white";
  const txtSub = isModern ? "text-muted-foreground" : "text-white/50";
  const cardBg = isModern ? "bg-card border-border/60" : "bg-white/[0.03] border-white/[0.06]";
  const cardHover = isModern ? "hover:border-primary/40 hover:shadow-sm" : "hover:border-white/15 hover:bg-white/[0.05]";

  const renderItemCard = (item: any, type: string) => {
    const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.mod;
    const Icon = cfg.icon;
    const isSelected = selectedItems.has(item.id);
    const side = item.side || "both";
    const sideStyle = SIDE_STYLES[side as keyof typeof SIDE_STYLES] || SIDE_STYLES.both;

    const iconUrl = item.icon_url || item.iconUrl;

    const compact = viewMode !== "list";
    const catalogKey = `${item.source || "modrinth"}::${item.project_id || item.projectId}`;
    const entry = catalog[catalogKey];
    const sourceTags = entry?.tags || [];
    const compatibleVersions = (entry?.versions || []).filter((v) => {
      const versionOk = !draftVersion || v.gameVersions.includes(draftVersion);
      const loaderOk = !draftLoader || v.loaders.some((l) => l.toLowerCase() === draftLoader.toLowerCase());
      return versionOk && loaderOk;
    }).slice(0, 12);

    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => handleOpenDetails(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenDetails(item);
          }
        }}
        className={`group relative flex cursor-pointer ${compact ? "flex-col items-start gap-1.5 p-2.5" : "items-center gap-3 px-3 py-2"} rounded-xl border transition-all duration-200 ${
          isSelected
            ? `${cfg.bg} ${cfg.border} border`
            : `${cardBg} ${cardHover}`
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const next = new Set(selectedItems);
            if (next.has(item.id)) next.delete(item.id);
            else next.add(item.id);
            setSelectedItems(next);
          }}
          className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer ${
            compact ? "absolute top-2.5 right-2.5" : ""
          } ${
            isSelected
              ? "bg-primary border-primary text-white"
              : `${isModern ? "border-border/80 hover:border-primary/50" : "border-white/15 hover:border-white/30"}`
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Icon */}
        <div className={compact ? "mb-0.5" : "shrink-0"}>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
          )}
        </div>

        <div className={`flex flex-col min-w-0 ${compact ? "w-full" : "flex-1"}`}>
          <span className={`text-xs md:text-sm font-semibold truncate ${txt}`} title={item.mod_name || item.project_id}>
            {item.mod_name || item.project_id}
          </span>
          <span className={`text-[9px] md:text-[10px] ${txtSub} truncate`}>
            {item.source}
          </span>
          {sourceTags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {sourceTags.slice(0, 3).map((tag) => (
                <span key={tag} title="Tag del proyecto" className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold text-emerald-300">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Category Badge & Delete */}
        <div className={`flex items-center gap-1.5 ${compact ? "w-full justify-between mt-auto pt-1.5 border-t " + (isModern ? "border-border/50" : "border-white/10") : "shrink-0"}`}>
          
          <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItems(new Set([item.id]));
                setAssignParent(orgParentForItem({ side: item.side, content_type: item.content_type || type }));
                setIsCategoryModalOpen(true);
              }}
              className={`text-[9px] font-bold px-1.5 py-1 rounded-lg border transition-colors truncate max-w-[90px] ${
                isModern 
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20" 
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
              }`}
              title="Categoría del draft (no reemplaza los tags del mod)"
            >
              {categoryDisplayLabel(resolveItemChildId(item), item.category || "Draft", layout)}
            </button>

          {type === "mod" && compatibleVersions.length > 0 && (
            <div onClick={(e) => e.stopPropagation()} className="min-w-0 max-w-[7.5rem]">
              <FomoDropdown
                fullWidth
                valueLabel={
                  <span className="truncate">
                    {compatibleVersions.find((v) => v.id === item.version_id)?.name || "Versión"}
                  </span>
                }
              >
                {compatibleVersions.map((v) => (
                  <FomoDropdownOption
                    key={v.id}
                    active={v.id === item.version_id}
                    onClick={() => handleUpdateVersion(item.id, v.id)}
                  >
                    {v.name}
                  </FomoDropdownOption>
                ))}
              </FomoDropdown>
            </div>
          )}

          {type === "mod" ? (
            <select
              value={side}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleUpdateSide(item.id, e.target.value)}
              className={`text-[10px] font-bold px-1.5 py-1 rounded-lg border outline-none cursor-pointer appearance-none text-center ${sideStyle.cls}`}
            >
              <option value="both">Both</option>
              <option value="client">Client</option>
              <option value="server">Server</option>
            </select>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
              type === "datapack"
                ? SIDE_STYLES.server.cls
                : SIDE_STYLES.client.cls
            }`}>
              {type === "datapack" ? "Server" : "Client"}
            </span>
          )}
          
          
          <div className={`flex items-center gap-1 shrink-0 ${compact ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-all`}>
            {/* Open Details */}
            <button
              onClick={(e) => handleOpenDetails(item, e)}
              className={`p-1 rounded-lg cursor-pointer shrink-0 ${
                isModern ? "hover:bg-primary/10 text-muted-foreground hover:text-primary" : "bg-primary/10 text-primary/50 hover:text-primary hover:bg-primary/20"
              }`}
              title="Ver Detalles"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Delete (single) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItems([item.id]);
              }}
              className={`p-1 rounded-lg cursor-pointer shrink-0 ${
                isModern ? "hover:bg-red-500/10 text-muted-foreground hover:text-red-500" : "bg-red-500/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/20"
              }`}
              title="Eliminar del Draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-bold ${txt}`}>
            Items
            {totalCount > 0 && (
              <span className={`ml-2 text-sm font-normal ${txtSub}`}>{totalCount}</span>
            )}
          </h3>

          {/* Search */}
          {totalCount > 0 && (
            <div className={`relative flex items-center`}>
              <Search className={`absolute left-2.5 w-3.5 h-3.5 ${txtSub} pointer-events-none`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className={`pl-8 pr-3 py-1.5 rounded-lg text-xs w-40 border outline-none transition-all focus:w-52 focus:border-primary/50 ${
                  isModern ? "bg-background border-border text-foreground placeholder:text-muted-foreground" : "bg-black/30 border-white/10 text-white placeholder:text-white/30"
                }`}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {totalCount > 0 && (
            <div className={`flex items-center rounded-lg p-0.5 border ${isModern ? "border-border bg-muted/50" : "border-white/10 bg-black/20"}`}>
              <button
                onClick={() => setMapOpen(true)}
                title="Mapa"
                className={`p-1 rounded-md transition-colors ${mapOpen ? (isModern ? "bg-background shadow-sm text-foreground" : "bg-white/10 text-white") : txtSub}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Lista"
                className={`p-1 rounded-md transition-colors ${viewMode === "list" ? (isModern ? "bg-background shadow-sm text-foreground" : "bg-white/10 text-white") : txtSub}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                title="Tarjetas"
                className={`p-1 rounded-md transition-colors ${viewMode === "grid" ? (isModern ? "bg-background shadow-sm text-foreground" : "bg-white/10 text-white") : txtSub}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Select all / delete selected */}
          {totalCount > 0 && (
            <>
              <button
                onClick={() => {
                  if (allSelected) {
                    setSelectedItems(new Set());
                  } else {
                    setSelectedItems(new Set(draftItems.map(i => i.id)));
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  isModern ? "border-border text-muted-foreground hover:text-foreground hover:bg-muted" : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {allSelected ? "Deseleccionar" : "Seleccionar todo"}
              </button>

              {selectedCount > 0 && (
                <>
                  <button
                    onClick={() => {
                      const first = draftItems.find((item) => selectedItems.has(item.id));
                      setAssignParent(orgParentForItem({ side: first?.side, content_type: first?.content_type }));
                      setIsCategoryModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Asignar Categoría
                  </button>
                  <button
                    onClick={() => handleDeleteItems(Array.from(selectedItems))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar {selectedCount}
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("fomo-switch-tab", { detail: { tab: "discover" } }))}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl ${isModern ? "border-border" : "border-white/10"}`}>
          <Blend className="w-10 h-10 text-primary/30 mb-4" />
          <p className={`text-sm font-bold ${txtSub}`}>El draft está vacío</p>
          <p className={`text-xs mt-1 max-w-xs text-center ${isModern ? "text-muted-foreground/60" : "text-white/30"}`}>
            Agrega mods, texturas, shaders o datapacks desde Discover.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="relative z-20 shrink-0 overflow-visible">
          <DraftCategoryFilterBar
            typeFilter={typeFilter}
            parentFilter={parentFilter}
            childFilter={childFilter}
            mapChildren={mapChildren}
            layout={layout}
            isModern={isModern}
            onTypeFilter={setTypeFilter}
            onParentFilter={setParentFilter}
            onChildFilter={setChildFilter}
            canEditCategories
            onCreateCategory={openCreateCategory}
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
          {filteredItems.length === 0 ? (
            <div className={`py-10 text-center rounded-xl ${txtSub} text-sm`}>
              Sin resultados para los filtros actuales.
            </div>
          ) : (
            <>
          <DraftInsightsStrip
            insights={insights}
            catalog={catalog}
            catalogLoading={catalogLoading}
            isModern={isModern}
            filter={mapFilter}
            mapChildren={mapChildren}
            onFilterChange={setMapFilter}
          />
          <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-8">
              <div className="flex flex-col gap-8">
                {MAP_PARENTS.map((parent) => {
                  const kids = mapChildren.filter((child) => child.parent === parent.id && (groupedMods[child.id]?.length || 0) > 0);
                  if (kids.length === 0) return null;
                  return (
                    <div key={parent.id} className="flex flex-col gap-4">
                      <h3 className={`text-sm font-black uppercase tracking-wider ${txt}`}>{categoryDisplayLabel(parent.id, parent.label, layout)}</h3>
                      {kids.map((child) => {
                        const items = groupedMods[child.id] || [];
                        return (
                          <div key={child.id} className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 pl-2">
                              <Tag className="w-3.5 h-3.5 text-primary/60" />
                              {groupEditId === child.id ? (
                                <input
                                  autoFocus
                                  value={groupEditLabel}
                                  onChange={(e) => setGroupEditLabel(e.target.value)}
                                  onBlur={() => {
                                    handleSaveChild(child.id, groupEditLabel, child.parent);
                                    setGroupEditId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveChild(child.id, groupEditLabel, child.parent);
                                      setGroupEditId(null);
                                    }
                                    if (e.key === "Escape") setGroupEditId(null);
                                  }}
                                  className={`min-w-0 flex-1 max-w-xs rounded-md border px-2 py-1 text-xs ${isModern ? "bg-background border-border" : "bg-black/30 border-white/10"}`}
                                />
                              ) : (
                                <h4 className={`text-sm font-bold ${txt}`}>{categoryDisplayLabel(child.id, child.label, layout)}</h4>
                              )}
                              <span className={`text-[10px] font-bold ${txtSub}`}>({items.length})</span>
                              <button
                                type="button"
                                title="Renombrar categoría"
                                className="p-1 rounded-md opacity-60 hover:opacity-100"
                                onClick={() => {
                                  setGroupEditId(child.id);
                                  setGroupEditLabel(categoryDisplayLabel(child.id, child.label, layout));
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!isUncategorizedChildId(child.id) && (
                                <button
                                  type="button"
                                  title="Eliminar categoría"
                                  className="p-1 rounded-md opacity-60 hover:opacity-100 hover:text-red-400"
                                  onClick={() => handleRemoveChild(child.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <div className={`${viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-1.5"}`}>
                              {items.map((item) => renderItemCard(item, item.content_type || "mod"))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
        </div>
            </>
          )}
        </div>
      )}

      <DraftOverlayPortal open={mapOpen} onClose={() => setMapOpen(false)}>
        <div
          className={`flex h-[min(94vh,980px)] w-[min(96vw,1440px)] flex-col overflow-hidden rounded-2xl border shadow-2xl ${isModern ? "border-border bg-background text-foreground" : "border-white/10 bg-[#121212] text-white"}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Mapa del draft"
        >
          <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${isModern ? "border-border" : "border-white/10"}`}>
            <div>
              <p className="text-sm font-black">Mapa del draft</p>
              <p className={`text-[11px] ${txtSub}`}>Arrastrá mods entre categorías y ramas. Renombrá o eliminá un hijo desde su tarjeta.</p>
            </div>
            <button
              type="button"
              onClick={() => setMapOpen(false)}
              className={`rounded-lg p-2 ${isModern ? "hover:bg-muted" : "hover:bg-white/10"}`}
              aria-label="Cerrar mapa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <DraftItemMapBoard
              fill
              groupedMods={mapGroups}
              catalog={catalog}
              insights={insights}
              isModern={isModern}
              layout={{ ...layout, children: mapChildren }}
              filter={mapFilter}
              renderCard={(item) => renderItemCard(item, item.content_type || "mod")}
              onDropCategory={(category, itemId, parent) => handleUpdateCategory(category, [itemId], true, parent)}
              onMoveCategory={handleMoveCategory}
              onCreateChild={handleCreateChild}
              onSaveChild={handleSaveChild}
              onRemoveChild={handleRemoveChild}
            />
          </div>
        </div>
      </DraftOverlayPortal>

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

      {/* Category Assignment Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-5 md:p-6 rounded-3xl shadow-2xl border flex flex-col gap-5 ${isModern ? "bg-card border-border shadow-[0_20px_60px_rgba(13,39,80,0.16)]" : "bg-[#121214] border-white/10"}`}>
            <div>
              <h3 className={`text-lg font-black flex items-center gap-2 ${txt}`}>
                <Tag className="w-5 h-5 text-indigo-400" />
                Asignar Categoría
              </h3>
              <p className={`text-xs mt-1 ${txtSub}`}>
                Categoría del draft (organización interna). No reescribe los tags del mod.
              </p>
            </div>

            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              <div className="flex gap-2">
                {MAP_PARENTS.map((parent) => (
                  <button
                    key={parent.id}
                    type="button"
                    onClick={() => setAssignParent(parent.id)}
                    className={`flex-1 rounded-xl border px-2 py-2 text-[10px] font-black uppercase ${assignParent === parent.id ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 opacity-70"}`}
                  >
                    {parent.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MAP_CHILD_PRESETS.map((preset) => (
                  <button
                    key={preset.slug}
                    onClick={() => {
                      const { layout: next } = addMapChild(layout, assignParent, preset.label);
                      persistLayout(next);
                      handleUpdateCategory(childCategoryId(assignParent, preset.slug), undefined, false, assignParent);
                    }}
                    className={`px-3 py-2 text-xs font-bold text-left rounded-xl border transition-colors ${
                      isModern
                        ? "bg-muted/30 border-border/50 text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {mapChildren.filter((child) => child.parent === assignParent && !MAP_CHILD_PRESETS.some((preset) => preset.slug === child.slug)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mapChildren.filter((child) => child.parent === assignParent && !MAP_CHILD_PRESETS.some((preset) => preset.slug === child.slug)).map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleUpdateCategory(child.id, undefined, false, assignParent)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Custom Category */}
            <div className={`pt-4 border-t flex flex-col gap-2 ${isModern ? "border-border/50" : "border-white/10"}`}>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${txtSub}`}>Crear Nueva Categoría</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Vehículos..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      const { layout: next, child } = addMapChild(layout, assignParent, newCategoryName.trim());
                      persistLayout(next);
                      handleUpdateCategory(child.id, undefined, false, assignParent);
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none focus:border-indigo-500/50 transition-colors ${
                    isModern ? "bg-background border-border text-foreground placeholder:text-muted-foreground" : "bg-black/30 border-white/10 text-white placeholder:text-white/30"
                  }`}
                />
                <button
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    const { layout: next, child } = addMapChild(layout, assignParent, newCategoryName.trim());
                    persistLayout(next);
                    handleUpdateCategory(child.id, undefined, false, assignParent);
                  }}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  Añadir
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${isModern ? "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
