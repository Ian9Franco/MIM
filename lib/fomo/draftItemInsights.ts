export type DraftInsightItem = {
  id: string;
  project_id: string;
  source?: string;
  mod_name?: string;
  dependencies?: Array<{ project_id?: string; dependency_type?: string; title?: string }>;
};

export type DuplicateGroup = {
  key: string;
  reason: "project" | "name";
  items: DraftInsightItem[];
};

export type MissingDependency = {
  fromId: string;
  fromName: string;
  fromSource?: string;
  project_id: string;
  title?: string;
};

export type DraftItemInsights = {
  duplicates: DuplicateGroup[];
  missing: MissingDependency[];
};

function normalizeName(value?: string) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isDraftContentDep(projectId: string): boolean {
  const id = projectId.trim().toLowerCase();
  return !["minecraft", "java", "fabricloader", "fabric-loader", "forge", "neoforge", "quilt_loader", "quilt-loader"].includes(id);
}

export function analyzeDraftItems(items: DraftInsightItem[]): DraftItemInsights {
  const byProject = new Map<string, DraftInsightItem[]>();
  const byName = new Map<string, DraftInsightItem[]>();
  const present = new Set(items.map((item) => String(item.project_id)));

  for (const item of items) {
    const projectKey = `${item.source || "unknown"}::${item.project_id}`;
    const projectGroup = byProject.get(projectKey) || [];
    projectGroup.push(item);
    byProject.set(projectKey, projectGroup);

    const nameKey = normalizeName(item.mod_name);
    if (!nameKey) continue;
    const nameGroup = byName.get(nameKey) || [];
    nameGroup.push(item);
    byName.set(nameKey, nameGroup);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, group] of byProject) {
    if (group.length > 1) duplicates.push({ key, reason: "project", items: group });
  }
  for (const [key, group] of byName) {
    const sources = new Set(group.map((item) => item.source || "unknown"));
    const ids = new Set(group.map((item) => item.project_id));
    if (sources.size > 1 && ids.size > 1) {
      duplicates.push({ key: `name:${key}`, reason: "name", items: group });
    }
  }

  const missing: MissingDependency[] = [];
  const seenMissing = new Set<string>();
  for (const item of items) {
    for (const dep of item.dependencies || []) {
      if ((dep.dependency_type || "required") !== "required") continue;
      const depId = String(dep.project_id || "");
      if (!depId || !isDraftContentDep(depId) || present.has(depId)) continue;
      const missKey = `${item.id}:${depId}`;
      if (seenMissing.has(missKey)) continue;
      seenMissing.add(missKey);
      missing.push({
        fromId: item.id,
        fromName: item.mod_name || item.project_id,
        fromSource: item.source,
        project_id: depId,
        title: dep.title,
      });
    }
  }

  return { duplicates, missing };
}
