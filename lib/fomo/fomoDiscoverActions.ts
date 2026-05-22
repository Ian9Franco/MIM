import type { FomoDiscoverPendingAction } from "@/components/fomo/sidebar/fomoSidebarTypes";

export type SearchProjectDetail = {
  query: string;
  projectId?: string;
  platform?: string;
  projectType?: string;
  source?: "modrinth" | "curseforge" | "all";
  loader?: string;
  gameVersions?: string[];
};

/** Aplica búsqueda en Explorar (ambas plataformas, cualquier versión). */
export function applyDiscoverSearch(
  discover: {
    setSource: (s: "modrinth" | "curseforge" | "all") => void;
    setProjectType: (t: string) => void;
    setLoader: (l: string) => void;
    setGameVersions: (v: string[]) => void;
    setPage: (p: number) => void;
    setQuery: (q: string) => void;
  },
  detail: SearchProjectDetail
) {
  discover.setSource((detail.source as "modrinth" | "curseforge" | "all") || "all");
  discover.setProjectType(detail.projectType || "mod");
  discover.setLoader(detail.loader || "all");
  discover.setGameVersions(detail.gameVersions ?? []);
  discover.setPage(1);
  discover.setQuery(detail.query || "");
}

export function runPendingDiscoverAction(
  action: FomoDiscoverPendingAction,
  discover: {
    setSource: (s: "modrinth" | "curseforge" | "all") => void;
    setProjectType: (t: string) => void;
    setLoader: (l: string) => void;
    setGameVersions: (v: string[]) => void;
    setPage: (p: number) => void;
    setQuery: (q: string) => void;
    handleOpenLiveProject: (mod: unknown) => void;
    handleOpenProjectById: (id: string, platform?: string) => void;
  },
  setMode: (m: import("@/components/fomo/sidebar/fomoSidebarTypes").FomoMode) => void
) {
  switch (action.type) {
    case "openMod":
      if (action.mod) discover.handleOpenLiveProject(action.mod);
      break;
    case "search":
      setMode("discover");
      discover.setQuery(action.query);
      break;
    case "author":
      setMode("discover");
      discover.setSource("all");
      discover.setQuery(`author:${action.author}`);
      break;
    case "projectId":
      discover.handleOpenProjectById(action.id, action.platform);
      break;
    case "searchProject":
      setMode("discover");
      applyDiscoverSearch(discover, action);
      break;
  }
}
