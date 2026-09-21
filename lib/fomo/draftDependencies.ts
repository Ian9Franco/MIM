import type { VersionEntry } from "@/lib/core/types";

export interface DraftProjectRequest {
  projectId: string;
  title?: string;
  contentType?: string;
  versionId?: string;
}

export interface ResolvedDraftProject {
  project_id: string;
  mod_name: string;
  content_type: string;
  version_id: string;
  dependencies: { project_id: string; dependency_type: string; version_id?: string; title?: string }[];
}

/** Resolve the entire required graph before saving; optional dependencies stay optional. */
export async function resolveDraftDependencies(
  root: DraftProjectRequest,
  context: { source: "modrinth" | "curseforge"; version: string; loader: string },
  existingVersions = new Map<string, string>(),
  request: typeof fetch = fetch,
): Promise<ResolvedDraftProject[]> {
  const resolved = new Map<string, ResolvedDraftProject>();
  const queue = [root];
  while (queue.length) {
    const item = queue.shift()!;
    const pinned = item.versionId || existingVersions.get(item.projectId);
    if (item.versionId && existingVersions.has(item.projectId) && existingVersions.get(item.projectId) !== item.versionId) {
      throw new Error(`La versión de ${item.title || item.projectId} en el Draft no coincide con la dependencia requerida.`);
    }
    const previous = resolved.get(item.projectId);
    if (previous) {
      if (pinned && previous.version_id !== pinned) throw new Error(`Versiones incompatibles para ${item.title || item.projectId}.`);
      continue;
    }
    const params = new URLSearchParams({ projectId: item.projectId, gameVersion: context.version, loader: context.loader.toLowerCase(), projectType: item.contentType || "mod" });
    const response = await request(`/api/${context.source}/versions?${params}`);
    if (!response.ok) throw new Error(`No se pudieron resolver las dependencias de ${item.title || item.projectId}.`);
    const data = await response.json() as { versions: VersionEntry[] };
    const compatible = (data.versions || []).filter(v =>
      v.gameVersions.includes(context.version) &&
      (item.contentType && item.contentType !== "mod" || v.loaders.some(l => l.toLowerCase() === context.loader.toLowerCase()))
    );
    const version = pinned ? compatible.find(v => v.id === pinned) : compatible[0];
    if (!version) throw new Error(`No hay una versión compatible de ${item.title || item.projectId} para ${context.version} / ${context.loader}.`);
    const dependencies: ResolvedDraftProject["dependencies"] = [];
    for (const dep of version.dependencies || []) {
      let projectId = dep.projectId || "";
      if (!projectId && dep.versionId && context.source === "modrinth") {
        const depResponse = await request(`https://api.modrinth.com/v2/version/${encodeURIComponent(dep.versionId)}`);
        if (!depResponse.ok) throw new Error(`No se pudo resolver la dependencia ${dep.versionId}.`);
        projectId = (await depResponse.json()).project_id;
      }
      if (!projectId) {
        if (dep.dependencyType === "required") throw new Error(`Dependencia externa sin proyecto: ${dep.title || dep.fileName || "desconocida"}.`);
        continue;
      }
      dependencies.push({ project_id: projectId, dependency_type: dep.dependencyType, version_id: dep.versionId || undefined, title: dep.title });
      if (dep.dependencyType === "required") queue.push({ projectId, title: dep.title, contentType: dep.projectType || "mod", versionId: dep.versionId || undefined });
    }
    resolved.set(item.projectId, { project_id: item.projectId, mod_name: item.title || item.projectId, content_type: item.contentType || "mod", version_id: version.id, dependencies });
  }
  return [...resolved.values()];
}
