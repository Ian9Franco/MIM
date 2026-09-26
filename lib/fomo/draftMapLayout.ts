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

export function resolveItemChildId(item: { side?: string; category?: string }): string {
  const parent = itemParentId(item.side);
  const raw = (item.category || "other").trim() || "other";
  const parsed = parseChildCategoryId(raw);
  if (parsed) return childCategoryId(parsed.parent, parsed.slug);
  return childCategoryId(parent, raw);
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

  return ensureDefaultTree({ categories, labels, children });
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

  return { categories, labels, children };
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
  return { categories, labels, children };
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
  return { ok: true, layout: relocateCategoryLayout(layout, childId, toId), fromId: childId, toId };
}

export function clampMapZoom(value: number): number {
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, value));
}
