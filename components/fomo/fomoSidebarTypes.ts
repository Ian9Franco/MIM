export type FomoMode =
  | "spotlight"
  | "showcases"
  | "discover"
  | "collections"
  | "followed"
  | "community";

export type FomoDiscoverPendingAction =
  | { type: "openMod"; mod: unknown }
  | { type: "search"; query: string }
  | { type: "author"; author: string }
  | { type: "projectId"; id: string; platform?: string; title?: string; projectType?: string }
  | {
      type: "searchProject";
      query: string;
      projectId?: string;
      platform?: string;
      projectType?: string;
      source?: "modrinth" | "curseforge" | "all";
      loader?: string;
      gameVersions?: string[];
    };
