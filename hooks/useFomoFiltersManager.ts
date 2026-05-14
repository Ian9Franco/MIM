import { useState, useCallback } from "react";
import { CURSEFORGE_CATEGORIES } from "@/constants/app";

export function useFomoFiltersManager(p: any) {
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const isCurseForge = p.source === "curseforge";

  const toggleFilter = useCallback((list: string[], setFn: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setFn(list.filter(x => x !== item));
    } else {
      if (isCurseForge) {
        const cfCats = CURSEFORGE_CATEGORIES[p.projectType as keyof typeof CURSEFORGE_CATEGORIES] || [];
        const parent = cfCats.find(c => typeof c !== 'string' && Array.isArray((c as any).sub) && (c as any).sub.includes(item));
        if (parent && typeof parent !== 'string' && !list.includes(parent.value)) {
          setFn([...list, parent.value, item]); return;
        }
      }
      setFn([...list, item]);
    }
  }, [isCurseForge, p.projectType]);

  const clear = useCallback(() => {
    p.onCategories([]); p.onEnvironments([]); p.onVersions(["1.20.1"]); p.onQuery(""); p.onOnlyExclusives(false);
  }, [p]);

  return { expandedCats, setExpandedCats, toggleFilter, clear, isCurseForge };
}
