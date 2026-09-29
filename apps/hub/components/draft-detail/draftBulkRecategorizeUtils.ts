import { fixedOrgParentForContentType, type MapParentId } from "@/lib/fomo/draftMapLayout";
import type { ModHit } from "../SpotlightMarquees";

export function draftItemSelectionKey(mod: ModHit): string {
  return String(mod.itemId ?? mod.projectId);
}

export function fixedBranchForMods(mods: ModHit[]): MapParentId | null {
  const fixed = mods.map((m) => fixedOrgParentForContentType(m.projectType));
  if (fixed.length === 0) return null;
  if (fixed.every((f) => f === fixed[0])) return fixed[0];
  return null;
}

export function sideToMapParent(side?: string): MapParentId {
  if (side === "client" || side === "server") return side;
  return "both";
}

export function initialBulkBranch(mods: ModHit[], fixedForAll: MapParentId | null): MapParentId {
  if (fixedForAll) return fixedForAll;
  if (mods.length === 0) return "both";
  return sideToMapParent(mods[0].side);
}
