import { useState, useEffect } from "react";
import { SortOrder } from "../../constants/app";

export function useFomoFilters(defaultLoader = "unknown", defaultGameVersion = "") {
  const [source, setSource] = useState<"modrinth" | "curseforge" | "all" | "chunk">("all");
  const [loader, setLoader] = useState(defaultLoader);
  const [gameVersions, setGameVersions] = useState<string[]>(
    defaultGameVersion ? [defaultGameVersion] : []
  );
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
    const migratedSource = localStorage.getItem("fomo_discover_source_default_v2") === "1";
    const migratedDefaultsV3 = localStorage.getItem("fomo_discover_defaults_v3") === "1";
    localStorage.setItem("fomo_discover_source_default_v2", "1");
    if (!migratedDefaultsV3) {
      localStorage.setItem("fomo_discover_defaults_v3", "1");
    }
    if (saved) {
      try {
        const s = JSON.parse(saved);
        const nextSource = !migratedSource && s.source === "modrinth" ? "all" : s.source;
        if (nextSource) setSource(nextSource);
        if (!migratedDefaultsV3 && s.loader === "forge" && Array.isArray(s.gameVersions) && s.gameVersions.includes("1.20.1")) {
          setLoader("unknown");
          setGameVersions([]);
        } else {
          if (s.loader) setLoader(s.loader);
          if (s.gameVersions) setGameVersions(s.gameVersions);
        }
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
