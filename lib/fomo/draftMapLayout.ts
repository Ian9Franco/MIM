export type DraftMapPosition = { x: number; y: number };
export type MapParentId = "client" | "server" | "both";

export type DraftMapChild = {
  id: string;
  parent: MapParentId;
  slug: string;
  label: string;
};

export type DraftMapLayout = {
  categories: Record<string, DraftMapPosition>;
  labels: Record<string, string>;
  children: DraftMapChild[];
  itemOrder?: Record<string, string[]>;
};

export const MAP_PARENTS: { id: MapParentId; label: string }[] = [
  { id: "client", label: "Client" },
  { id: "server", label: "Server" },
  { id: "both", label: "Both" },
];

export const MAP_CHILD_PRESETS = [
  { slug: "core", label: "Librería / Core" },
  { slug: "performance", label: "Rendimiento" },
  { slug: "utility", label: "Utilidad / QoL" },
  { slug: "world", label: "Mundo" },
  { slug: "mobs", label: "Fauna y Jefes" },
  { slug: "tech", label: "Tecnología / Magia" },
  { slug: "building", label: "Construcción" },
  { slug: "other", label: "Otros / Sin Asignar" },
] as const;

export const MAP_CARD_WIDTH = 268;
export const MAP_PARENT_WIDTH = 220;
export const MAP_CARD_GAP_X = 28;
export const MAP_CARD_GAP_Y = 36;
export const MAP_CARD_MIN_H = 220;
export const MAP_GRID_COLS = 4;
export const MAP_ZOOM_MIN = 0.4;
export const MAP_ZOOM_MAX = 1.6;
export const MAP_WORLD_PAD = 96;
export const MAP_PARENT_HEIGHT = 88;

export function isMapParentId(value: string): value is MapParentId {
  return value === "client" || value === "server" || value === "both";
}

export function slugifyCategory(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "other";
}

export function childCategoryId(parent: MapParentId, slug: string): string {
  return `${parent}:${slugifyCategory(slug)}`;
}

export function parseChildCategoryId(id: string): { parent: MapParentId; slug: string } | null {
  const idx = id.indexOf(":");
  if (idx <= 0) return null;
  const parent = id.slice(0, idx);
  const slug = id.slice(idx + 1);
  if (!isMapParentId(parent) || !slug) return null;
  return { parent, slug };
}

export function itemParentId(side?: string): MapParentId {
  if (side === "client" || side === "server") return side;
  return "both";
}

export function normalizeDraftContentType(value?: string): string {
  const raw = String(value || "mod").toLowerCase();
  if (raw === "resourcepack" || raw === "texture" || raw === "texture-pack" || raw === "resource-pack") {
    return "resourcepack";
  }
  if (raw === "shader" || raw === "shaderpack") return "shader";
  if (raw === "datapack" || raw === "data-pack") return "datapack";
  return "mod";
}

/** alluser (client) vs allhost (server): texturas/shaders vs datapacks. Mods: null → side editable. */
export function fixedOrgParentForContentType(contentType?: string): MapParentId | null {
  const type = normalizeDraftContentType(contentType);
  if (type === "resourcepack" || type === "shader") return "client";
  if (type === "datapack") return "server";
  return null;
}

export function orgParentForItem(item: {
  side?: string;
  content_type?: string;
  projectType?: string;
}): MapParentId {
  const fixed = fixedOrgParentForContentType(item.content_type || item.projectType);
  if (fixed) return fixed;
  return itemParentId(item.side);
}

const CONTENT_TYPE_IDS = new Set(["mod", "resourcepack", "shader", "datapack"]);

export const DRAFT_CONTENT_TYPE_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "mod", label: "Mods" },
  { id: "resourcepack", label: "Texturas" },
  { id: "shader", label: "Shaders" },
  { id: "datapack", label: "Datapacks" },
] as const;

export type DraftContentTypeFilter = (typeof DRAFT_CONTENT_TYPE_FILTERS)[number]["id"];

export function orgParentForTypeFilter(typeFilter: DraftContentTypeFilter): MapParentId | "all" {
  if (typeFilter === "resourcepack" || typeFilter === "shader") return "client";
  if (typeFilter === "datapack") return "server";
  return "all";
}

export function resolveItemChildId(item: {
  side?: string;
  category?: string;
  content_type?: string;
  projectType?: string;
}): string {
  const parent = orgParentForItem(item);
  const raw = (item.category || "other").trim() || "other";
  const parsed = parseChildCategoryId(raw);
  if (parsed) return childCategoryId(parent, parsed.slug);
  if (CONTENT_TYPE_IDS.has(raw.toLowerCase())) return childCategoryId(parent, "other");
  return childCategoryId(parent, raw);
}

export function uncategorizedChildId(parent: MapParentId): string {
  return childCategoryId(parent, "other");
}

export function isUncategorizedChildId(id: string): boolean {
  return parseChildCategoryId(id)?.slug === "other";
}

export function itemMatchesTreeFilter(
  item: { side?: string; category?: string },
  parentFilter: MapParentId | "all",
  childFilter: string | "all",
): boolean {
  const childId = resolveItemChildId(item);
  const parsed = parseChildCategoryId(childId);
  if (parentFilter !== "all" && parsed?.parent !== parentFilter) return false;
  if (childFilter !== "all" && childId !== childFilter) return false;
  return true;
}

function parsePosition(value: unknown): DraftMapPosition | null {
  if (!value || typeof value !== "object") return null;
  const pos = value as Record<string, unknown>;
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function parseMapLayout(raw: unknown): DraftMapLayout {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const categoriesIn = source.categories && typeof source.categories === "object"
    ? (source.categories as Record<string, unknown>)
    : {};
  const labelsIn = source.labels && typeof source.labels === "object"
    ? (source.labels as Record<string, unknown>)
    : {};

  const categories: Record<string, DraftMapPosition> = {};
  for (const [id, value] of Object.entries(categoriesIn)) {
    const pos = parsePosition(value);
    if (pos) categories[id] = pos;
  }

  const labels: Record<string, string> = {};
  for (const [id, value] of Object.entries(labelsIn)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) labels[id] = trimmed;
  }

  const children: DraftMapChild[] = [];
  const seen = new Set<string>();
  const rawChildren: unknown[] = Array.isArray(source.children) ? [...source.children] : [];
  const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
  const rawEdges = Array.isArray(source.edges) ? source.edges : [];
  const parentByChild = new Map<string, MapParentId>();
  for (const edge of rawEdges) {
    if (!edge || typeof edge !== "object") continue;
    const row = edge as Record<string, unknown>;
    const from = String(row.from || row.source || row.parent || "");
    const to = String(row.to || row.target || row.child || "");
    if (isMapParentId(from) && to) parentByChild.set(to, from);
  }
  for (const node of rawNodes) {
    if (!node || typeof node !== "object") continue;
    const row = node as Record<string, unknown>;
    const rawId = String(row.id || "");
    if (!rawId) continue;
    const pos = parsePosition(row) || parsePosition(row.position);
    if (pos && !categories[rawId]) categories[rawId] = pos;
    if (typeof row.label === "string" && row.label.trim() && !labels[rawId]) {
      labels[rawId] = row.label.trim();
    }
    if (isMapParentId(rawId)) continue;
    const parsed = parseChildCategoryId(rawId);
    const parentRaw = String(row.parent || parentByChild.get(rawId) || "");
    const parent = isMapParentId(parentRaw) ? parentRaw : parsed?.parent;
    if (!parent) continue;
    rawChildren.push({
      id: parsed ? rawId : childCategoryId(parent, slugifyCategory(rawId)),
      parent,
      slug: parsed?.slug || slugifyCategory(String(row.slug || rawId)),
      label: labels[rawId] || String(row.label || rawId),
    });
  }
  for (const entry of rawChildren) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const parentRaw = String(row.parent || "");
    if (!isMapParentId(parentRaw)) continue;
    const slug = slugifyCategory(String(row.slug || row.id || row.label || "other"));
    const id = typeof row.id === "string" && parseChildCategoryId(row.id)
      ? row.id
      : childCategoryId(parentRaw, slug);
    if (seen.has(id)) continue;
    seen.add(id);
    children.push({
      id,
      parent: parentRaw,
      slug: parseChildCategoryId(id)?.slug || slug,
      label: String(row.label || labels[id] || slug),
    });
    if (categories[String(row.id)] && !categories[id]) categories[id] = categories[String(row.id)];
    if (labels[String(row.id)] && !labels[id]) labels[id] = labels[String(row.id)];
  }

  const itemOrder: Record<string, string[]> = {};
  const rawItemOrder = source.itemOrder && typeof source.itemOrder === "object"
    ? (source.itemOrder as Record<string, unknown>)
    : {};
  for (const [categoryId, value] of Object.entries(rawItemOrder)) {
    if (!Array.isArray(value)) continue;
    const ids = value.map((entry) => String(entry)).filter(Boolean);
    if (ids.length > 0) itemOrder[categoryId] = ids;
  }

  return ensureDefaultTree({ categories, labels, children, itemOrder });
}

export function defaultParentPosition(parent: MapParentId): DraftMapPosition {
  if (parent === "client") return { x: 48, y: 40 };
  if (parent === "server") return { x: 420, y: 40 };
  return { x: 792, y: 40 };
}

export function defaultChildPosition(parent: MapParentId, index: number): DraftMapPosition {
  const origin = defaultParentPosition(parent);
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: origin.x + col * (MAP_CARD_WIDTH + 16) - 24,
    y: origin.y + 110 + row * (MAP_CARD_MIN_H + MAP_CARD_GAP_Y),
  };
}

export function defaultCategoryPosition(index: number): DraftMapPosition {
  const col = index % MAP_GRID_COLS;
  const row = Math.floor(index / MAP_GRID_COLS);
  return {
    x: 24 + col * (MAP_CARD_WIDTH + MAP_CARD_GAP_X),
    y: 24 + row * (MAP_CARD_MIN_H + MAP_CARD_GAP_Y),
  };
}

export function ensureDefaultTree(layout: DraftMapLayout): DraftMapLayout {
  const categories = { ...layout.categories };
  const labels = { ...layout.labels };
  const children = [...layout.children];
  const seen = new Set(children.map((child) => child.id));

  for (const parent of MAP_PARENTS) {
    if (!categories[parent.id]) categories[parent.id] = defaultParentPosition(parent.id);
    if (!labels[parent.id]) labels[parent.id] = parent.label;
    const otherId = childCategoryId(parent.id, "other");
    if (!seen.has(otherId)) {
      children.push({ id: otherId, parent: parent.id, slug: "other", label: "Otros / Sin Asignar" });
      seen.add(otherId);
    }
    if (!categories[otherId]) {
      const siblings = children.filter((child) => child.parent === parent.id);
      categories[otherId] = defaultChildPosition(parent.id, Math.max(0, siblings.length - 1));
    }
  }

  return { categories, labels, children, itemOrder: layout.itemOrder };
}

export function resolveCategoryPositions(
  ids: string[],
  layout: DraftMapLayout,
): Record<string, DraftMapPosition> {
  const next: Record<string, DraftMapPosition> = {};
  ids.forEach((id, index) => {
    if (isMapParentId(id)) {
      next[id] = layout.categories[id] || defaultParentPosition(id);
      return;
    }
    const parsed = parseChildCategoryId(id);
    if (parsed) {
      const siblings = layout.children.filter((child) => child.parent === parsed.parent);
      const siblingIndex = Math.max(0, siblings.findIndex((child) => child.id === id));
      next[id] = layout.categories[id] || defaultChildPosition(parsed.parent, siblingIndex);
      return;
    }
    next[id] = layout.categories[id] || defaultCategoryPosition(index);
  });
  return next;
}

export function categoryDisplayLabel(
  id: string,
  fallback: string,
  layout: DraftMapLayout,
): string {
  if (layout.labels[id]) return layout.labels[id];
  const child = layout.children.find((entry) => entry.id === id);
  if (child?.label) return child.label;
  const parsed = parseChildCategoryId(id);
  if (parsed) {
    const preset = MAP_CHILD_PRESETS.find((entry) => entry.slug === parsed.slug);
    if (preset) return preset.label;
  }
  return fallback;
}

export function withCategoryPosition(
  layout: DraftMapLayout,
  id: string,
  position: DraftMapPosition,
): DraftMapLayout {
  return {
    ...layout,
    categories: { ...layout.categories, [id]: position },
  };
}

export function withCategoryLabel(
  layout: DraftMapLayout,
  id: string,
  label: string,
): DraftMapLayout {
  const labels = { ...layout.labels };
  const trimmed = label.trim();
  if (trimmed) labels[id] = trimmed;
  else delete labels[id];
  const children = layout.children.map((child) => (
    child.id === id ? { ...child, label: trimmed || child.label } : child
  ));
  return { ...layout, labels, children };
}

export function addMapChild(
  layout: DraftMapLayout,
  parent: MapParentId,
  label: string,
): { layout: DraftMapLayout; child: DraftMapChild } {
  const slug = slugifyCategory(label);
  const id = childCategoryId(parent, slug);
  const existing = layout.children.find((child) => child.id === id);
  if (existing) return { layout, child: existing };
  const siblings = layout.children.filter((child) => child.parent === parent);
  const child: DraftMapChild = { id, parent, slug, label: label.trim() || slug };
  return {
    child,
    layout: {
      ...layout,
      children: [...layout.children, child],
      labels: { ...layout.labels, [id]: child.label },
      categories: {
        ...layout.categories,
        [id]: layout.categories[id] || defaultChildPosition(parent, siblings.length),
      },
    },
  };
}

export function relocateCategoryLayout(
  layout: DraftMapLayout,
  fromId: string,
  toId: string,
): DraftMapLayout {
  if (fromId === toId) return layout;
  const categories = { ...layout.categories };
  const labels = { ...layout.labels };
  if (categories[fromId] && !categories[toId]) categories[toId] = categories[fromId];
  delete categories[fromId];
  if (labels[fromId]) {
    labels[toId] = labels[fromId];
    delete labels[fromId];
  }
  const parsed = parseChildCategoryId(toId);
  const children = layout.children.map((child) => {
    if (child.id !== fromId) return child;
    return {
      ...child,
      id: toId,
      parent: parsed?.parent || child.parent,
      slug: parsed?.slug || child.slug,
      label: labels[toId] || child.label,
    };
  });
  const itemOrder = { ...(layout.itemOrder || {}) };
  if (itemOrder[fromId]) {
    itemOrder[toId] = itemOrder[fromId];
    delete itemOrder[fromId];
  }
  return { categories, labels, children, itemOrder };
}

export function mergeMapLayout(base: DraftMapLayout, overlay: DraftMapLayout): DraftMapLayout {
  const mergedChildren = [...base.children];
  const seen = new Set(mergedChildren.map((child) => child.id));
  for (const child of overlay.children) {
    if (seen.has(child.id)) continue;
    mergedChildren.push(child);
    seen.add(child.id);
  }
  return ensureDefaultTree({
    categories: { ...base.categories, ...overlay.categories },
    labels: { ...base.labels, ...overlay.labels },
    children: mergedChildren.map((child) => {
      const fromOverlay = overlay.children.find((entry) => entry.id === child.id);
      return fromOverlay ? { ...child, ...fromOverlay } : child;
    }),
    itemOrder: { ...(base.itemOrder || {}), ...(overlay.itemOrder || {}) },
  });
}

export function groupItemsByChildId<T extends { id: string; side?: string; category?: string; position?: number; mod_name?: string; project_id?: string }>(
  items: T[],
  layout: DraftMapLayout,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const child of layout.children) groups[child.id] = [];
  for (const parent of MAP_PARENTS) {
    const fallback = uncategorizedChildId(parent.id);
    if (!groups[fallback]) groups[fallback] = [];
  }
  for (const item of items) {
    const id = resolveItemChildId(item);
    if (!groups[id]) groups[id] = [];
    groups[id].push(item);
  }
  for (const id of Object.keys(groups)) {
    groups[id] = sortItemsInCategory(groups[id], id, layout);
  }
  return groups;
}

export function visibleMapChildren(layout: DraftMapLayout, groupIds: string[]): DraftMapChild[] {
  const extra = groupIds.filter((id) => !layout.children.some((child) => child.id === id));
  const inferred = extra.map((id) => {
    const parsed = parseChildCategoryId(id);
    const slug = parsed?.slug || id;
    const preset = MAP_CHILD_PRESETS.find((entry) => entry.slug === slug);
    return {
      id,
      parent: (parsed?.parent || "both") as MapParentId,
      slug,
      label: categoryDisplayLabel(id, preset?.label || slug, layout),
    };
  });
  return [...layout.children, ...inferred];
}

export function sortItemsInCategory<T extends { id: string; position?: number; mod_name?: string; project_id?: string }>(
  items: T[],
  categoryId: string,
  layout: DraftMapLayout,
): T[] {
  const order = layout.itemOrder?.[categoryId] || [];
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const idA = String(a.id);
    const idB = String(b.id);
    const rankA = rank.has(idA) ? rank.get(idA)! : Number.MAX_SAFE_INTEGER;
    const rankB = rank.has(idB) ? rank.get(idB)! : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    const posA = Number(a.position) || 0;
    const posB = Number(b.position) || 0;
    if (posA !== posB) return posA - posB;
    return String(a.mod_name || a.project_id || "").localeCompare(String(b.mod_name || b.project_id || ""));
  });
}

export function withItemsAssignedToCategory(
  layout: DraftMapLayout,
  categoryId: string,
  itemIds: string[],
): DraftMapLayout {
  if (itemIds.length === 0) return layout;
  const itemOrder = { ...(layout.itemOrder || {}) };
  const idSet = new Set(itemIds.map(String));
  for (const [catId, list] of Object.entries(itemOrder)) {
    itemOrder[catId] = list.filter((id) => !idSet.has(id));
    if (itemOrder[catId].length === 0) delete itemOrder[catId];
  }
  const nextList = [...(itemOrder[categoryId] || [])];
  for (const id of itemIds) {
    const sid = String(id);
    const existing = nextList.indexOf(sid);
    if (existing >= 0) nextList.splice(existing, 1);
    nextList.push(sid);
  }
  itemOrder[categoryId] = nextList;
  return { ...layout, itemOrder };
}

export function removeMapChild(
  layout: DraftMapLayout,
  childId: string,
): { ok: true; layout: DraftMapLayout; fromId: string; otherId: string; parent: MapParentId } | { ok: false; reason: "missing" | "protected" | "invalid" } {
  const parsed = parseChildCategoryId(childId);
  if (!parsed) return { ok: false, reason: "invalid" };
  if (parsed.slug === "other") return { ok: false, reason: "protected" };
  if (!layout.children.some((child) => child.id === childId)) return { ok: false, reason: "missing" };
  const otherId = uncategorizedChildId(parsed.parent);
  const children = layout.children.filter((child) => child.id !== childId);
  const categories = { ...layout.categories };
  delete categories[childId];
  const labels = { ...layout.labels };
  delete labels[childId];
  const itemOrder = { ...(layout.itemOrder || {}) };
  const moved = itemOrder[childId] || [];
  delete itemOrder[childId];
  itemOrder[otherId] = [...(itemOrder[otherId] || []), ...moved.filter((id) => !(itemOrder[otherId] || []).includes(id))];
  return {
    ok: true,
    fromId: childId,
    otherId,
    parent: parsed.parent,
    layout: ensureDefaultTree({ categories, labels, children, itemOrder }),
  };
}

export function reparentMapChild(
  layout: DraftMapLayout,
  childId: string,
  nextParent: MapParentId,
): { ok: true; layout: DraftMapLayout; fromId: string; toId: string } | { ok: false; reason: "missing" | "exists" | "same" } {
  const child = layout.children.find((entry) => entry.id === childId);
  if (!child) return { ok: false, reason: "missing" };
  const toId = childCategoryId(nextParent, child.slug);
  if (toId === childId) return { ok: false, reason: "same" };
  if (layout.children.some((entry) => entry.id === toId)) return { ok: false, reason: "exists" };
  const next = relocateCategoryLayout(layout, childId, toId);
  const itemOrder = { ...(next.itemOrder || {}) };
  if (itemOrder[childId]) {
    itemOrder[toId] = itemOrder[childId];
    delete itemOrder[childId];
  }
  return { ok: true, layout: { ...next, itemOrder }, fromId: childId, toId };
}

export function clampMapZoom(value: number): number {
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, value));
}
