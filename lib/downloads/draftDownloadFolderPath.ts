import {
  categoryDisplayLabel,
  MAP_CHILD_PRESETS,
  orgParentForItem,
  parseChildCategoryId,
  resolveItemChildId,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";

const BRANCH_FOLDER: Record<MapParentId, string> = {
  client: "client",
  server: "server",
  both: "both",
};

function sanitizeFolderSegment(label: string): string {
  const cleaned = label
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  return cleaned || "Sin_categoria";
}

function emptyLayout(): DraftMapLayout {
  return { categories: {}, labels: {}, children: [] };
}

/** Relative path under Downloads: `{client|server|both}/{Category label}`. */
export function draftDownloadRelativePath(
  item: { category?: string; side?: string; content_type?: string },
  mapLayout?: DraftMapLayout | null,
): string {
  const branch = orgParentForItem(item);
  const layout = mapLayout || emptyLayout();
  const childId = resolveItemChildId(item);
  const parsed = parseChildCategoryId(childId);
  const preset = parsed
    ? MAP_CHILD_PRESETS.find((entry) => entry.slug === parsed.slug)
    : undefined;
  const label = categoryDisplayLabel(
    childId,
    preset?.label || parsed?.slug || "Otros",
    layout,
  );
  const categoryFolder = sanitizeFolderSegment(label);
  return `${BRANCH_FOLDER[branch]}/${categoryFolder}`;
}
