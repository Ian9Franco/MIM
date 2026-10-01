import { throttledFetch } from "./downloadApiThrottle";

export type ResolveVersionInput = {
  source?: string;
  projectId: string;
  projectType?: string;
  loader?: string;
  gameVersion?: string;
  modName?: string;
};

export type ResolvedCompatibleVersion = {
  versionId: string;
  versionLabel?: string;
  publishedAt?: string;
};

export class ResolveCompatibleVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveCompatibleVersionError";
  }
}

function normalizeProjectType(projectType?: string): string {
  const raw = String(projectType || "mod").toLowerCase();
  if (raw === "resourcepack" || raw === "texture") return "resourcepack";
  if (raw === "shader" || raw === "shaderpack") return "shader";
  if (raw === "datapack" || raw === "data-pack") return "datapack";
  return "mod";
}

export async function resolveCompatibleVersion(input: ResolveVersionInput): Promise<ResolvedCompatibleVersion> {
  const projectId = String(input.projectId || "").trim();
  if (!projectId) throw new ResolveCompatibleVersionError("Falta project id");

  const source = String(input.source || "modrinth").toLowerCase();
  const projectType = normalizeProjectType(input.projectType);
  const loader = String(input.loader || "").toLowerCase();
  const gameVersion = String(input.gameVersion || "").trim();
  const label = input.modName || projectId;

  if (source === "curseforge") {
    const params = new URLSearchParams({ projectId, projectType });
    if (gameVersion) params.set("gameVersion", gameVersion);
    if (loader && projectType === "mod") params.set("loader", loader);
    const response = await throttledFetch("curseforge", `/api/curseforge/versions?${params.toString()}`);
    if (response.status === 429) throw new ResolveCompatibleVersionError("RateLimited");
    if (!response.ok) {
      throw new ResolveCompatibleVersionError(`CurseForge no respondió para ${label}`);
    }
    const data = await response.json();
    const versions = [...(data.versions || [])] as Array<{
      id?: string;
      versionNumber?: string;
      datePublished?: string;
    }>;
    versions.sort((a, b) => Date.parse(b.datePublished || "") - Date.parse(a.datePublished || ""));
    const picked = versions[0];
    if (!picked?.id) {
      throw new ResolveCompatibleVersionError(
        `Sin archivo para ${loader || "loader"} ${gameVersion || ""} en ${label}`,
      );
    }
    return {
      versionId: String(picked.id),
      versionLabel: picked.versionNumber,
      publishedAt: picked.datePublished,
    };
  }

  const params = new URLSearchParams();
  if (gameVersion) params.set("game_versions", JSON.stringify([gameVersion]));
  if (loader && projectType === "mod") params.set("loaders", JSON.stringify([loader]));
  const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
  const response = await throttledFetch("modrinth", url);
  if (response.status === 429) throw new ResolveCompatibleVersionError("RateLimited");
  if (!response.ok) {
    throw new ResolveCompatibleVersionError(`Modrinth no respondió para ${label}`);
  }
  const data = await response.json();
  const version = Array.isArray(data) ? data[0] : null;
  if (!version?.id) {
    throw new ResolveCompatibleVersionError(
      `Sin versión para ${loader || "loader"} ${gameVersion || ""} en ${label}`,
    );
  }
  return {
    versionId: String(version.id),
    versionLabel: version.version_number || version.name,
    publishedAt: version.date_published,
  };
}

export async function resolveCompatibleVersionsBatch<T extends ResolveVersionInput>(
  inputs: T[],
  concurrency = 2,
): Promise<Array<{ input: T; ok: true; resolved: ResolvedCompatibleVersion } | { input: T; ok: false; error: string }>> {
  const results: Array<
    { input: T; ok: true; resolved: ResolvedCompatibleVersion } | { input: T; ok: false; error: string }
  > = [];
  for (let index = 0; index < inputs.length; index += concurrency) {
    const chunk = inputs.slice(index, index + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (input) => {
        try {
          const resolved = await resolveCompatibleVersion(input);
          return { input, ok: true as const, resolved };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return { input, ok: false as const, error: message };
        }
      }),
    );
    results.push(...chunkResults);
  }
  return results;
}
