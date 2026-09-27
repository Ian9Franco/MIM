"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, GitBranch, Minus, Pencil, Plus } from "lucide-react";
import type { DraftCatalogEntry } from "@/hooks/fomo/useDraftItemCatalog";
import type { DraftItemInsights } from "@/lib/fomo/draftItemInsights";
import {
  MAP_CARD_MIN_H,
  MAP_CARD_WIDTH,
  MAP_PARENT_HEIGHT,
  MAP_PARENT_WIDTH,
  MAP_PARENTS,
  MAP_WORLD_PAD,
  clampMapZoom,
  categoryDisplayLabel,
  isMapParentId,
  type DraftMapChild,
  type DraftMapLayout,
  type DraftMapPosition,
  type MapParentId,
  parseChildCategoryId,
  resolveCategoryPositions,
} from "@/lib/fomo/draftMapLayout";
import { roundedOrthogonalD, routeOrthogonalPath, type MapRect } from "@/lib/fomo/draftMapEdges";
import { FomoDropdown, FomoDropdownOption } from "@/components/fomo/shared/FomoDropdown";

type DraftItem = {
  id: string;
  project_id?: string;
  mod_name?: string;
  source?: string;
  category?: string;
  side?: string;
  version_id?: string;
  icon_url?: string;
  iconUrl?: string;
};

export type MapBoardFilter = "all" | "duplicates" | "missing" | `category:${string}`;

const PARENT_STYLE: Record<MapParentId, string> = {
  client: "border-blue-400/40 bg-blue-500/10",
  server: "border-red-400/40 bg-red-500/10",
  both: "border-emerald-400/40 bg-emerald-500/10",
};

function nodeSize(id: string, itemCount: number): { w: number; h: number } {
  if (isMapParentId(id)) return { w: MAP_PARENT_WIDTH, h: MAP_PARENT_HEIGHT };
  return { w: MAP_CARD_WIDTH, h: Math.max(MAP_CARD_MIN_H, 72 + itemCount * 78) };
}

export function DraftItemMapBoard({
  groupedMods,
  catalog,
  insights,
  isModern,
  layout,
  filter,
  renderCard,
  onDropCategory,
  onMoveCategory,
  onCreateChild,
  onSaveChild,
}: {
  groupedMods: Record<string, DraftItem[]>;
  catalog: Record<string, DraftCatalogEntry>;
  insights: DraftItemInsights;
  isModern: boolean;
  layout: DraftMapLayout;
  filter: MapBoardFilter;
  renderCard: (item: DraftItem) => React.ReactNode;
  onDropCategory: (category: string, itemId: string, parent: MapParentId) => void;
  onMoveCategory: (categoryId: string, position: DraftMapPosition) => void;
  onCreateChild: (parent: MapParentId, label: string) => void;
  onSaveChild: (childId: string, label: string, parent: MapParentId) => void;
}) {
  const duplicateIds = useMemo(
    () => new Set(insights.duplicates.flatMap((g) => g.items.map((i) => i.id))),
    [insights.duplicates],
  );
  const missingByFrom = useMemo(
    () => new Set(insights.missing.map((m) => m.fromId)),
    [insights.missing],
  );

  const visibleChildren = useMemo(() => {
    if (filter === "all") return layout.children;
    if (filter.startsWith("category:")) {
      const id = filter.slice("category:".length);
      if (id === "client" || id === "server" || id === "both") {
        return layout.children.filter((child) => child.parent === id);
      }
      return layout.children.filter((child) => child.id === id);
    }
    return layout.children.filter((child) => {
      const items = groupedMods[child.id] || [];
      if (filter === "duplicates") return items.some((item) => duplicateIds.has(item.id));
      return items.some((item) => missingByFrom.has(item.id));
    });
  }, [filter, layout.children, groupedMods, duplicateIds, missingByFrom]);

  const visibleParents = useMemo(() => {
    if (filter.startsWith("category:")) {
      const id = filter.slice("category:".length);
      const parsed = parseChildCategoryId(id);
      if (parsed) return MAP_PARENTS.filter((parent) => parent.id === parsed.parent);
      if (id === "client" || id === "server" || id === "both") return MAP_PARENTS.filter((parent) => parent.id === id);
    }
    const used = new Set(visibleChildren.map((child) => child.parent));
    if (filter === "all") return MAP_PARENTS;
    return MAP_PARENTS.filter((parent) => used.has(parent.id));
  }, [filter, visibleChildren]);

  const nodeIds = useMemo(
    () => [...visibleParents.map((parent) => parent.id), ...visibleChildren.map((child) => child.id)],
    [visibleParents, visibleChildren],
  );

  const [positions, setPositions] = useState<Record<string, DraftMapPosition>>(
    () => resolveCategoryPositions(nodeIds, layout),
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [editParent, setEditParent] = useState<MapParentId>("both");
  const [creatingFor, setCreatingFor] = useState<MapParentId | null>(null);
  const [newChildName, setNewChildName] = useState("");

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  useEffect(() => {
    setPositions(resolveCategoryPositions(nodeIds, layout));
  }, [nodeIds, layout]);

  const panDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const catDrag = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    latestX: number;
    latestY: number;
    moved: boolean;
  } | null>(null);
  const onMoveCategoryRef = useRef(onMoveCategory);
  onMoveCategoryRef.current = onMoveCategory;

  const sized = useMemo(() => {
    const sizes: Record<string, { w: number; h: number }> = {};
    for (const id of nodeIds) {
      sizes[id] = nodeSize(id, (groupedMods[id] || []).length);
    }
    return sizes;
  }, [nodeIds, groupedMods]);

  const world = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = 1100;
    let maxY = 800;
    for (const id of nodeIds) {
      const pos = positions[id] || { x: 0, y: 0 };
      const size = sized[id] || { w: MAP_CARD_WIDTH, h: MAP_CARD_MIN_H };
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size.w);
      maxY = Math.max(maxY, pos.y + size.h);
    }
    const originX = MAP_WORLD_PAD - minX;
    const originY = MAP_WORLD_PAD - minY;
    return {
      originX,
      originY,
      w: maxX - minX + MAP_WORLD_PAD * 2,
      h: maxY - minY + MAP_WORLD_PAD * 2,
    };
  }, [nodeIds, positions, sized]);

  const worldPos = (id: string) => {
    const pos = positions[id] || { x: 0, y: 0 };
    return { x: pos.x + world.originX, y: pos.y + world.originY };
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-map-scroll]")) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const worldX = (cursorX - currentPan.x) / currentZoom;
      const worldY = (cursorY - currentPan.y) / currentZoom;
      const step = event.ctrlKey || event.metaKey ? 0.12 : 0.08;
      const nextZoom = clampMapZoom(currentZoom + (event.deltaY < 0 ? step : -step));
      zoomRef.current = nextZoom;
      panRef.current = {
        x: cursorX - worldX * nextZoom,
        y: cursorY - worldY * nextZoom,
      };
      setZoom(nextZoom);
      setPan(panRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    return () => {
      const drag = catDrag.current;
      if (drag?.moved) {
        onMoveCategoryRef.current(drag.id, { x: drag.latestX, y: drag.latestY });
      }
    };
  }, []);

  const finishCatDrag = () => {
    const drag = catDrag.current;
    catDrag.current = null;
    if (!drag?.moved) return;
    onMoveCategory(drag.id, { x: drag.latestX, y: drag.latestY });
  };

  const beginNodeDrag = (id: string, e: React.PointerEvent) => {
    if (editingId === id) return;
    if ((e.target as HTMLElement).closest("[data-map-edit]")) return;
    e.stopPropagation();
    const current = positions[id] || { x: 24, y: 24 };
    catDrag.current = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
      latestX: current.x,
      latestY: current.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const obstacles: MapRect[] = useMemo(
    () =>
      nodeIds.map((id) => {
        const pos = worldPos(id);
        const size = sized[id] || { w: MAP_CARD_WIDTH, h: MAP_CARD_MIN_H };
        return { id, x: pos.x, y: pos.y, w: size.w, h: size.h };
      }),
    [nodeIds, positions, sized, world.originX, world.originY],
  );

  const dots = isModern
    ? "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-foreground) 12%, transparent) 1px, transparent 0)"
    : "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)";

  return (
    <div className="relative h-[min(62vh,640px)] min-h-[520px] max-h-[640px] w-full shrink-0">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-md">
        <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setZoom((z) => clampMapZoom(z - 0.1))} aria-label="Alejar">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="min-w-10 text-center text-[10px] font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setZoom((z) => clampMapZoom(z + 0.1))} aria-label="Acercar">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={viewportRef}
        className={`absolute inset-0 overflow-hidden rounded-2xl border ${
          isModern ? "border-border bg-muted/20" : "border-white/8 bg-black/20"
        }`}
        style={{ backgroundImage: dots, backgroundSize: "22px 22px" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-map-card]")) return;
          panDrag.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origX: pan.x,
            origY: pan.y,
          };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (catDrag.current && catDrag.current.pointerId === e.pointerId) {
            const drag = catDrag.current;
            const dx = (e.clientX - drag.startX) / zoom;
            const dy = (e.clientY - drag.startY) / zoom;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            const nextX = drag.origX + dx;
            const nextY = drag.origY + dy;
            drag.latestX = nextX;
            drag.latestY = nextY;
            setPositions((prev) => ({
              ...prev,
              [drag.id]: { x: nextX, y: nextY },
            }));
            return;
          }
          if (panDrag.current && panDrag.current.pointerId === e.pointerId) {
            setPan({
              x: panDrag.current.origX + (e.clientX - panDrag.current.startX),
              y: panDrag.current.origY + (e.clientY - panDrag.current.startY),
            });
          }
        }}
        onPointerUp={(e) => {
          if (catDrag.current?.pointerId === e.pointerId) finishCatDrag();
          if (panDrag.current?.pointerId === e.pointerId) panDrag.current = null;
        }}
        onPointerCancel={(e) => {
          if (catDrag.current?.pointerId === e.pointerId) finishCatDrag();
          if (panDrag.current?.pointerId === e.pointerId) panDrag.current = null;
        }}
      >
        <div
          className="absolute left-0 top-0 z-10 cursor-grab active:cursor-grabbing origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: world.w,
            height: world.h,
          }}
        >
          <svg className="absolute inset-0 pointer-events-none" width={world.w} height={world.h}>
            {visibleChildren.map((child) => {
              const fromPos = worldPos(child.parent);
              const toPos = worldPos(child.id);
              const parentSize = sized[child.parent] || { w: MAP_PARENT_WIDTH, h: MAP_PARENT_HEIGHT };
              const from = { x: fromPos.x + parentSize.w / 2, y: fromPos.y + parentSize.h };
              const to = { x: toPos.x + MAP_CARD_WIDTH / 2, y: toPos.y };
              const points = routeOrthogonalPath(from, to, obstacles, [child.parent, child.id]);
              return (
                <path
                  key={`${child.parent}-${child.id}`}
                  d={roundedOrthogonalD(points)}
                  fill="none"
                  stroke="rgba(187,150,228,0.55)"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {visibleParents.map((parent) => {
            const pos = worldPos(parent.id);
            const count = visibleChildren
              .filter((child) => child.parent === parent.id)
              .reduce((n, child) => n + (groupedMods[child.id]?.length || 0), 0);
            return (
              <section
                key={parent.id}
                data-map-card
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const itemId = e.dataTransfer.getData("text/draft-item-id");
                  if (itemId) onDropCategory(`${parent.id}:other`, itemId, parent.id);
                }}
                className={`absolute rounded-2xl border p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${PARENT_STYLE[parent.id]}`}
                style={{ left: pos.x, top: pos.y, width: MAP_PARENT_WIDTH }}
              >
                <header className="flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing" onPointerDown={(e) => beginNodeDrag(parent.id, e)}>
                  <h4 className="text-[12px] font-black uppercase tracking-wide">
                    {categoryDisplayLabel(parent.id, parent.label, layout)}
                  </h4>
                  <span className="text-[10px] font-bold text-primary/80">{count}</span>
                </header>
                {creatingFor === parent.id ? (
                  <div className="mt-2 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      placeholder="Nueva categoría"
                      className="min-w-0 flex-1 rounded-md border bg-black/30 px-1.5 py-1 text-[10px] outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newChildName.trim()) {
                          onCreateChild(parent.id, newChildName.trim());
                          setNewChildName("");
                          setCreatingFor(null);
                        }
                        if (e.key === "Escape") setCreatingFor(null);
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-md bg-primary px-2 text-[10px] font-bold text-white"
                      onClick={() => {
                        if (!newChildName.trim()) return;
                        onCreateChild(parent.id, newChildName.trim());
                        setNewChildName("");
                        setCreatingFor(null);
                      }}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold opacity-80 hover:opacity-100"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setCreatingFor(parent.id)}
                  >
                    + categoría
                  </button>
                )}
              </section>
            );
          })}

          {visibleChildren.map((col) => {
            const items = (groupedMods[col.id] || []).filter((item) => {
              if (filter === "duplicates") return duplicateIds.has(item.id);
              if (filter === "missing") return missingByFrom.has(item.id);
              return true;
            });
            const pos = worldPos(col.id);
            return (
              <section
                key={col.id}
                data-map-card
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const itemId = e.dataTransfer.getData("text/draft-item-id");
                  if (itemId) onDropCategory(col.id, itemId, col.parent);
                }}
                className={`absolute flex flex-col gap-2 rounded-2xl border p-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${
                  isModern ? "bg-card/95 border-border" : "bg-[#141418]/95 border-white/10"
                }`}
                style={{ left: pos.x, top: pos.y, width: MAP_CARD_WIDTH }}
              >
                <header
                  className="flex items-center justify-between gap-2 px-1.5 py-1 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => beginNodeDrag(col.id, e)}
                >
                  <h4 className={`min-w-0 truncate text-[11px] font-black uppercase tracking-wide ${isModern ? "text-foreground" : "text-white/80"}`}>
                    {col.label}
                  </h4>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-primary/80">{items.length}</span>
                    <button
                      type="button"
                      data-map-edit
                      aria-label="Editar categoría"
                      className="rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-white/10"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(col.id);
                        setDraftLabel(col.label);
                        setEditParent(col.parent);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </header>
                {editingId === col.id && (
                  <div
                    data-map-edit
                    className={`flex flex-col gap-2 rounded-xl border p-2 ${isModern ? "bg-background border-border" : "bg-black/40 border-white/15"}`}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      aria-label="Nombre de categoría"
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      className={`rounded-md border px-1.5 py-1 text-[11px] font-bold outline-none ${
                        isModern ? "bg-background border-border text-foreground" : "bg-black/40 border-white/15 text-white"
                      }`}
                    />
                    <div className="flex gap-1">
                      {MAP_PARENTS.map((parent) => (
                        <button
                          key={parent.id}
                          type="button"
                          onClick={() => setEditParent(parent.id)}
                          className={`flex-1 rounded-md border px-1 py-1 text-[9px] font-black uppercase ${
                            editParent === parent.id ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 opacity-70"
                          }`}
                        >
                          {parent.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="rounded-md px-2 py-1 text-[10px] opacity-70" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white"
                        onClick={() => {
                          onSaveChild(col.id, draftLabel, editParent);
                          setEditingId(null);
                        }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
                <div data-map-scroll className="flex max-h-[420px] flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5">
                  {items.length === 0 && (
                    <p className={`text-[10px] px-2 py-6 text-center border border-dashed rounded-xl ${isModern ? "text-muted-foreground border-border" : "text-white/30 border-white/10"}`}>
                      Soltá un mod acá
                    </p>
                  )}
                  {items.map((item) => {
                    const key = `${item.source || "modrinth"}::${item.project_id}`;
                    const entry = catalog[key];
                    const tags = entry?.tags || [];
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/draft-item-id", item.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="relative"
                      >
                        {(duplicateIds.has(item.id) || missingByFrom.has(item.id)) && (
                          <div className="absolute -top-1.5 left-2 z-10 flex gap-1">
                            {duplicateIds.has(item.id) && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">
                                <Copy className="w-2.5 h-2.5" /> Dup
                              </span>
                            )}
                            {missingByFrom.has(item.id) && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[8px] font-black uppercase text-red-300">
                                <GitBranch className="w-2.5 h-2.5" /> Dep
                              </span>
                            )}
                          </div>
                        )}
                        {renderCard(item)}
                        {tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1 px-1">
                            {tags.slice(0, 4).map((tag) => (
                              <span key={tag} title="Tag del proyecto (Modrinth/CurseForge)" className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DraftInsightsStrip({
  insights,
  catalog = {},
  catalogLoading,
  isModern,
  filter,
  children,
  onFilterChange,
}: {
  insights: DraftItemInsights;
  catalog?: Record<string, DraftCatalogEntry>;
  catalogLoading: boolean;
  isModern: boolean;
  filter: MapBoardFilter;
  children: DraftMapChild[];
  onFilterChange: (filter: MapBoardFilter) => void;
}) {
  const dupCount = insights.duplicates.reduce((n, g) => n + g.items.length, 0);
  const categoryValue = filter.startsWith("category:") ? filter.slice("category:".length) : "";
  const categoryLabel = MAP_PARENTS.find((p) => p.id === categoryValue)?.label
    || children.find((col) => col.id === categoryValue)?.label
    || "Categoría";

  const missingGroups = useMemo(() => {
    const groups = new Map<string, { projectId: string; title: string; requiredBy: string[] }>();
    for (const miss of insights.missing) {
      const key = `${miss.fromSource || "modrinth"}::${miss.project_id}`;
      const catalogTitle = catalog[key]?.title;
      const title = miss.title || catalogTitle || miss.project_id;
      const current = groups.get(miss.project_id) || { projectId: miss.project_id, title, requiredBy: [] };
      if (catalogTitle) current.title = catalogTitle;
      else if (miss.title) current.title = miss.title;
      if (!current.requiredBy.includes(miss.fromName)) current.requiredBy.push(miss.fromName);
      groups.set(miss.project_id, current);
    }
    return [...groups.values()];
  }, [insights.missing, catalog]);

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-[10px] ${isModern ? "border-border bg-muted/40" : "border-white/10 bg-white/4"}`}>
        {catalogLoading && <span className="opacity-60">Leyendo tags y versiones de los mods…</span>}
        <button type="button" onClick={() => onFilterChange("all")} className={`rounded-lg border px-2 py-1 font-bold ${filter === "all" ? "border-primary/40 bg-primary/15 text-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
          Todos
        </button>
        <button type="button" onClick={() => onFilterChange("duplicates")} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold text-amber-300 ${filter === "duplicates" ? "border-amber-400/40 bg-amber-500/15" : "border-transparent opacity-80 hover:opacity-100"}`}>
          <Copy className="w-3 h-3" /> {insights.duplicates.length} duplicados ({dupCount})
        </button>
        <button type="button" onClick={() => onFilterChange("missing")} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold text-red-300 ${filter === "missing" ? "border-red-400/40 bg-red-500/15" : "border-transparent opacity-80 hover:opacity-100"}`}>
          <AlertTriangle className="w-3 h-3" /> {missingGroups.length} deps faltantes
        </button>
        <FomoDropdown className="min-w-[9rem]" valueLabel={filter.startsWith("category:") ? categoryLabel : "Por rama"}>
          <FomoDropdownOption active={filter === "all"} onClick={() => onFilterChange("all")}>Todas</FomoDropdownOption>
          {MAP_PARENTS.map((parent) => (
            <FomoDropdownOption key={parent.id} active={filter === `category:${parent.id}`} onClick={() => onFilterChange(`category:${parent.id}`)}>
              {parent.label}
            </FomoDropdownOption>
          ))}
          {children.map((col) => (
            <FomoDropdownOption key={col.id} active={filter === `category:${col.id}`} onClick={() => onFilterChange(`category:${col.id}`)}>
              {MAP_PARENTS.find((p) => p.id === col.parent)?.label} / {col.label}
            </FomoDropdownOption>
          ))}
        </FomoDropdown>
      </div>
      {filter === "missing" && missingGroups.length > 0 && (
        <div className={`flex max-h-36 flex-col gap-1.5 overflow-y-auto custom-scrollbar rounded-xl border px-3 py-2 text-[11px] ${isModern ? "border-red-500/20 bg-red-500/5" : "border-red-500/20 bg-red-500/10"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-200/80">
            Faltan en el draft (los pide un mod que ya agregaste)
          </p>
          {missingGroups.map((group) => (
            <div key={group.projectId} className="flex items-start gap-1.5 text-red-200">
              <GitBranch className="w-3 h-3 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold">{group.title}</span>
                <span className="opacity-60"> — lo pide </span>
                <span className="truncate">{group.requiredBy.join(", ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
