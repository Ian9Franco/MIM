import { normalizeDraftOrgCategory, parseChildCategoryId } from "@/lib/fomo/draftMapLayout";
import type { HomeDraftItem } from "./draftContract";

export function draftItemNeedsCategoryRepair(category?: string | null): boolean {
  const raw = (category || "").trim();
  if (!raw) return true;
  return !parseChildCategoryId(raw);
}

export function repairedOrgCategory(item: HomeDraftItem): string {
  return normalizeDraftOrgCategory(item.category, {
    content_type: item.content_type,
    projectType: item.project_type,
    side: item.side,
  });
}
