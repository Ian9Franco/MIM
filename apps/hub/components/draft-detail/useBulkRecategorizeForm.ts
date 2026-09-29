import { useEffect, useMemo, useState } from "react";
import { parseChildCategoryId, type MapParentId } from "@/lib/fomo/draftMapLayout";
import { fixedBranchForMods, initialBulkBranch } from "./draftBulkRecategorizeUtils";
import type { ModHit } from "../SpotlightMarquees";

export function useBulkRecategorizeForm(open: boolean, mods: ModHit[]) {
  const [branch, setBranch] = useState<MapParentId>("both");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const fixedForAll = useMemo(() => fixedBranchForMods(mods), [mods]);
  const activeBranch = fixedForAll ?? branch;

  useEffect(() => {
    if (!open) return;
    setNewCategoryName("");
    setBranch(initialBulkBranch(mods, fixedForAll));
    setCategoryId("");
  }, [open, mods, fixedForAll]);

  useEffect(() => {
    if (!open || !categoryId) return;
    const parsed = parseChildCategoryId(categoryId);
    if (parsed && parsed.parent !== activeBranch) setCategoryId("");
  }, [activeBranch, categoryId, open]);

  return {
    branch,
    setBranch,
    categoryId,
    setCategoryId,
    newCategoryName,
    setNewCategoryName,
    fixedForAll,
    activeBranch,
    canSave: Boolean(categoryId.trim()),
  };
}
