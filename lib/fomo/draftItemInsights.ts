export type DraftInsightItem = {
  id: string;
  project_id: string;
  source?: string;
  slug?: string;
  mod_name?: string;
  dependencies?: Array<{
    project_id?: string;
    projectId?: string;
    dependency_type?: string;
    dependencyType?: string;
    title?: string;
    slug?: string;
    url?: string;
  }>;
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
  slug?: string;
  url?: string;
};

export type DraftItemInsights = {
  duplicates: DuplicateGroup[];
  missing: MissingDependency[];
  presentKeys: string[];
};

function normalizeName(value?: string) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isDraftContentDep(projectId: string): boolean {
  const id = projectId.trim().toLowerCase();
  return !["minecraft", "java", "fabricloader", "fabric-loader", "forge", "neoforge", "quilt_loader", "quilt-loader"].includes(id);
}

function presenceKeys(items: Array<{ project_id?: string; slug?: string; mod_name?: string }>): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    const id = String(item.project_id || "").trim().toLowerCase();
    if (id) keys.add(id);
    const slug = String(item.slug || "").trim().toLowerCase();
    if (slug) keys.add(slug);
    const name = normalizeName(item.mod_name);
    if (name) keys.add(`name:${name}`);
  }
  return [...keys];
}

export function isDraftDependencyPresent(
  items: Array<{ project_id?: string; slug?: string; mod_name?: string }>,
  dep: { project_id?: string; projectId?: string; slug?: string; title?: string },
): boolean {
  return matchesPresentContent(presenceKeys(items), {
    projectId: dep.project_id || dep.projectId,
    slug: dep.slug,
    title: dep.title,
  });
}

export function matchesPresentContent(
  presentKeys: string[],
  candidate: { projectId?: string; slug?: string; title?: string },
): boolean {
  const keys = new Set(presentKeys);
  const id = String(candidate.projectId || "").trim().toLowerCase();
  const slug = String(candidate.slug || "").trim().toLowerCase();
  const name = normalizeName(candidate.title);
  if (id && keys.has(id)) return true;
  if (slug && keys.has(slug)) return true;
  if (name && keys.has(`name:${name}`)) return true;
  return false;
}

export function draftProjectPageUrl(
  source: string | undefined,
  projectId: string,
  slug?: string,
  explicitUrl?: string,
): string {
  const direct = (explicitUrl || "").trim();
  if (/^https?:\/\//i.test(direct)) return direct;
  const id = encodeURIComponent((slug || projectId || "").trim());
  if (!id) return "";
  if ((source || "").toLowerCase() === "curseforge") {
    return `https://www.curseforge.com/minecraft/mc-mods/${id}`;
  }
  return `https://modrinth.com/mod/${id}`;
}

export function analyzeDraftItems(items: DraftInsightItem[]): DraftItemInsights {
  const byProject = new Map<string, DraftInsightItem[]>();
  const byName = new Map<string, DraftInsightItem[]>();
  const present = presenceKeys(items);

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
      const dependencyType = dep.dependency_type || dep.dependencyType || "required";
      if (dependencyType !== "required") continue;
      const depId = String(dep.project_id || dep.projectId || "");
      if (!depId || !isDraftContentDep(depId) || isDraftDependencyPresent(items, dep)) continue;
      const missKey = `${item.id}:${depId}`;
      if (seenMissing.has(missKey)) continue;
      seenMissing.add(missKey);
      missing.push({
        fromId: item.id,
        fromName: item.mod_name || item.project_id,
        fromSource: item.source,
        project_id: depId,
        title: dep.title,
        slug: dep.slug,
        url: dep.url,
      });
    }
  }

  return { duplicates, missing, presentKeys: present };
}
