import { useState, useCallback } from "react";
import { CURSEFORGE_CATEGORIES } from "@/constants/app";

export function useFomoFiltersManager(p: any) {
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const isCurseForge = p.source === "curseforge";

  const toggleFilter = useCallback((list: string[], setFn: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setFn(list.filter(x => x !== item));
    } else {
      setFn([...list, item]);
    }
  }, [isCurseForge, p.projectType]);

  const clear = useCallback(() => {
    p.onCategories([]); p.onEnvironments([]); p.onVersions(["1.20.1"]); p.onQuery(""); p.onOnlyExclusives(false);
  }, [p]);

  return { expandedCats, setExpandedCats, toggleFilter, clear, isCurseForge };
}
