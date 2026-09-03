import { useState, useEffect, useRef } from "react";
import { SortOrder } from "../../constants/app";

export function useFomoFilters(defaultLoader: string, defaultGameVersion: string) {
  const [source, setSource] = useState<"modrinth" | "curseforge" | "all" | "chunk">("modrinth");
  const [loader, setLoader] = useState(defaultLoader);
  const [gameVersions, setGameVersions] = useState<string[]>([defaultGameVersion]);
  const [projectType, setProjectType] = useState("mod");
  const [categories, setCategories] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [query, setQuery] = useState("");
  const [sinytraActive, setSinytraActive] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyExclusives, setOnlyExclusives] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("fomo_discover_state");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.source) setSource(s.source);
        if (s.loader) setLoader(s.loader);
        if (s.gameVersions) setGameVersions(s.gameVersions);
        if (s.projectType) setProjectType(s.projectType);
        if (s.sortOrder) setSortOrder(s.sortOrder);
        if (s.query) setQuery(s.query);
        if (s.sinytraActive !== undefined) setSinytraActive(s.sinytraActive);
      } catch (e) {
        console.warn("[useFomoFilters] Corrupt fomo_discover_state in localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    const state = { source, loader, gameVersions, projectType, categories, environments, sortOrder, query, sinytraActive, page, onlyExclusives };
    localStorage.setItem("fomo_discover_state", JSON.stringify(state));
  }, [source, loader, gameVersions, projectType, categories, environments, sortOrder, query, sinytraActive, page, onlyExclusives]);

  return {
    source, setSource, loader, setLoader, gameVersions, setGameVersions,
    projectType, setProjectType, categories, setCategories, environments, setEnvironments,
    sortOrder, setSortOrder, query, setQuery, sinytraActive, setSinytraActive,
    page, setPage, onlyExclusives, setOnlyExclusives, collectionId, setCollectionId
  };
}
