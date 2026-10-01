import {
  childCategoryId,
  orgParentForItem,
  parseChildCategoryId,
  slugifyCategory,
  type MapParentId,
} from "./draftMapLayout";

export type DraftItemFieldPatch = {
  category?: string;
  side?: string;
  version_id?: string | null;
  content_type?: string;
};

export type CategoryAssignTarget = {
  ids: string[];
  category: string;
  side: string;
};

export function fingerprintCategorySide(category: string, side: string): string {
  return `${category}\0${side}`;
}

/** Groups ids that share the same persisted category + side for batch updates. */
export function buildCategoryAssignTargets(
  ids: string[],
  items: Array<{ id: string; side?: string; content_type?: string }>,
  category: string,
  sideOverride?: MapParentId,
): CategoryAssignTarget[] {
  const parsed = parseChildCategoryId(category);
  const slug = parsed?.slug || slugifyCategory(category);
  const byKey = new Map<string, CategoryAssignTarget>();

  for (const rawId of ids) {
    const id = String(rawId);
    const item = items.find((entry) => String(entry.id) === id);
    const parent = (sideOverride ||
      orgParentForItem({ side: item?.side, content_type: item?.content_type })) as MapParentId;
    const catId = childCategoryId(parent, slug);
    const key = `${catId}\0${parent}`;
    const existing = byKey.get(key);
    if (existing) existing.ids.push(id);
    else byKey.set(key, { ids: [id], category: catId, side: parent });
  }

  return [...byKey.values()];
}

export function patchDraftItemsInList<T extends { id?: string }>(
  items: T[],
  ids: string[],
  patch: DraftItemFieldPatch | ((item: T) => DraftItemFieldPatch),
): T[] {
  const idSet = new Set(ids.map(String));
  return items.map((item) => {
    if (!idSet.has(String(item.id || ""))) return item;
    const delta = typeof patch === "function" ? patch(item) : patch;
    return { ...item, ...delta };
  });
}

export function mergePreservingDraftItemPresentation<T extends {
  id: string;
  icon_url?: string | null;
  iconUrl?: string | null;
}>(
  incoming: T[],
  previous: T[],
): T[] {
  const prevById = new Map(previous.map((row) => [String(row.id), row]));
  return incoming.map((row) => {
    const prev = prevById.get(String(row.id));
    if (!prev) return row;
    const icon_url = row.icon_url || prev.icon_url;
    const iconUrl = row.iconUrl || prev.iconUrl;
    if (icon_url === row.icon_url && iconUrl === row.iconUrl) return row;
    return { ...row, icon_url, iconUrl };
  });
}

export function mergeDraftItemFromRealtime<T extends { id: string }>(
  items: T[],
  event: "INSERT" | "UPDATE" | "DELETE",
  row: T | null,
): T[] {
  if (event === "DELETE") {
    const id = row ? String(row.id) : "";
    if (!id) return items;
    return items.filter((item) => String(item.id) !== id);
  }
  if (!row) return items;
  const id = String(row.id);
  const idx = items.findIndex((item) => String(item.id) === id);
  if (idx === -1) return [...items, row];
  return items.map((item, index) => (index === idx ? { ...item, ...row } : item));
}

/** Tracks in-flight category/side writes to ignore matching realtime echoes. */
export class DraftPendingMutations {
  private pending = new Map<string, string>();

  track(itemIds: string[], fingerprint: string): void {
    for (const id of itemIds) this.pending.set(String(id), fingerprint);
  }

  clear(itemIds: string[]): void {
    for (const id of itemIds) this.pending.delete(String(id));
  }

  /** Returns true when the remote row should be merged into local state. */
  shouldApplyRemoteUpdate(itemId: string, row: { category?: string; side?: string }): boolean {
    const expected = this.pending.get(String(itemId));
    if (!expected) return true;
    const remoteFp = fingerprintCategorySide(String(row.category || ""), String(row.side || "both"));
    if (remoteFp === expected) {
      this.pending.delete(String(itemId));
      return false;
    }
    this.pending.delete(String(itemId));
    return true;
  }
}

export async function persistCategoryAssignTargets(
  supabase: {
    from: (table: string) => {
      update: (payload: Record<string, string>) => {
        in: (
          column: string,
          values: string[],
        ) => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  },
  targets: CategoryAssignTarget[],
): Promise<{ error: Error | null }> {
  const results = await Promise.all(
    targets.map((target) =>
      supabase
        .from("draft_items")
        .update({ category: target.category, side: target.side })
        .in("id", target.ids),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return { error: new Error(failed.error.message) };
  return { error: null };
}

export type DraftItemRowLike = {
  id: string;
  project_id?: string;
  mod_name?: string;
  name?: string;
  category?: string;
  side?: string;
  content_type?: string;
  version_id?: string | null;
  source?: string;
  icon_url?: string | null;
};

export function patchHomeDraftListItems<
  TDraft extends { id: string; items?: TItem[] | null },
  TItem extends { id?: string; category?: string; side?: string },
>(
  drafts: TDraft[],
  draftId: string,
  itemIds: string[],
  patch: DraftItemFieldPatch,
): TDraft[] {
  return drafts.map((draft) => {
    if (draft.id !== draftId || !draft.items?.length) return draft;
    return {
      ...draft,
      items: patchDraftItemsInList(draft.items, itemIds, patch),
    };
  });
}

export function mergeModHitFromDraftItemRow<T extends {
  itemId?: string;
  projectId: string;
  title?: string;
  orgCategory?: string;
  side?: string;
  projectType?: string;
  versionId?: string | null;
  iconUrl?: string | null;
}>(
  mods: T[],
  event: "INSERT" | "UPDATE" | "DELETE",
  row: DraftItemRowLike | null,
): T[] {
  if (event === "DELETE") {
    const id = row ? String(row.id) : "";
    if (!id) return mods;
    return mods.filter((mod) => String(mod.itemId || "") !== id);
  }
  if (!row?.id) return mods;
  const itemId = String(row.id);
  const idx = mods.findIndex((mod) => String(mod.itemId || "") === itemId);
  const fallback = {
    projectId: String(row.project_id || ""),
    title: String(row.mod_name || row.name || row.project_id || ""),
    orgCategory: String(row.category || ""),
    side: String(row.side || "both"),
    projectType: String(row.content_type || "mod"),
    versionId: row.version_id ?? null,
    iconUrl: row.icon_url ?? null,
  };
  if (idx === -1) {
    return [...mods, { ...fallback, itemId } as T];
  }
  return mods.map((mod, index) => {
    if (index !== idx) return mod;
    return {
      ...mod,
      itemId,
      orgCategory: row.category ?? mod.orgCategory,
      side: row.side ?? mod.side,
      projectType: row.content_type ?? mod.projectType,
      versionId: row.version_id ?? mod.versionId,
      title: row.mod_name || row.name || mod.title,
    };
  });
}
