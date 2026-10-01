import { normalizeDraftContentType, orgParentForItem, type MapParentId } from "./draftMapLayout";

export type DraftDownloadBranch = "all" | MapParentId;

export type DraftDownloadScopeItem = {
  id?: string;
  project_id?: string;
  side?: string;
  content_type?: string;
};

/** Items included when downloading a draft branch for test (playable semantics). */
export function draftItemsForDownloadBranch<T extends DraftDownloadScopeItem>(
  items: T[],
  branch: DraftDownloadBranch,
): T[] {
  const withProject = items.filter((item) => item.project_id);
  if (branch === "all") return withProject;

  if (branch === "both") {
    return withProject.filter((item) => {
      const type = normalizeDraftContentType(item.content_type);
      if (type !== "mod") return false;
      const side = (item.side || "both").toLowerCase();
      return side === "both";
    });
  }

  if (branch === "client") {
    return withProject.filter((item) => {
      const parent = orgParentForItem({ side: item.side, content_type: item.content_type });
      return parent === "client" || parent === "both";
    });
  }

  // server — server-side mods + both-side mods + datapacks (orgParent server)
  return withProject.filter((item) => {
    const parent = orgParentForItem({ side: item.side, content_type: item.content_type });
    return parent === "server" || parent === "both";
  });
}
