import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const CF_LOADER_NAMES = ["forge", "fabric", "neoforge", "quilt", "cauldron", "liteloader"];

const querySchema = z.object({
  projectId: z.string().trim().min(1, "Missing or empty projectId parameter"),
});

interface CurseForgeCategory {
  name: string;
}

interface CurseForgeScreenshot {
  url: string;
  title?: string;
}

interface CurseForgeFileIndex {
  gameVersion: string;
}

interface CurseForgeRawFile {
  id?: number | string;
  fileName: string;
  displayName?: string;
  gameVersions?: string[];
  fileDate?: string;
  downloadCount?: number;
  releaseType: number;
}

interface CurseForgeDependency {
  modId: number;
  relationType: number;
}

interface CurseForgeMod {
  id: number;
  name: string;
  classId?: number;
  dateModified?: string;
  dateReleased?: string;
  links?: {
    wikiUrl?: string;
    sourceUrl?: string;
    issuesUrl?: string;
  };
  logo?: {
    thumbnailUrl?: string;
    url?: string;
  };
  authors?: Array<{ name: string }>;
  categories?: CurseForgeCategory[];
  screenshots?: CurseForgeScreenshot[];
  latestFilesIndexes?: CurseForgeFileIndex[];
  dependencies?: CurseForgeDependency[];
  summary?: string;
  slug?: string;
}

function isMinecraftVersion(value: string) {
  return /^\d+(?:\.\d+){1,3}(?:[-+][\w.-]+)?$/.test(value);
}

function mapReleaseType(value: number) {
  if (value === 2) return "beta";
  if (value === 3) return "alpha";
  return "release";
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CURSEFORGE_API_KEY no configurada" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ projectId: searchParams.get("projectId") });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid projectId parameter" },
      { status: 400 }
    );
  }

  const { projectId } = parsed.data;

  try {
    const headers = {
      "Accept": "application/json",
      "x-api-key": apiKey,
    };

    let m: CurseForgeMod | undefined;
    let numericId = projectId;

    if (isNaN(Number(projectId))) {
      // It's a slug! Search by slug first to resolve to numeric ID
      const searchRes = await fetch(`${CURSEFORGE_API}/mods/search?gameId=432&slug=${projectId}`, { headers });
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as { data?: CurseForgeMod[] };
        m = searchData.data?.[0];
        if (m) {
          numericId = m.id.toString();
        } else {
          return NextResponse.json({ error: `CurseForge mod slug not found: ${projectId}` }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: `CurseForge API Error searching slug: ${searchRes.status}` }, { status: searchRes.status });
      }
    } else {
      // 1. Fetch mod details by numeric ID
      const modRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}`, { headers });
      if (!modRes.ok) {
        return NextResponse.json({ error: `CurseForge API Error: ${modRes.status}` }, { status: modRes.status });
      }
      const modData = (await modRes.json()) as { data: CurseForgeMod };
      m = modData.data;
    }

    if (!m) {
      return NextResponse.json({ error: `CurseForge mod not found: ${projectId}` }, { status: 404 });
    }

    // 2. Fetch description HTML using resolved numeric ID
    const descRes = await fetch(`${CURSEFORGE_API}/mods/${numericId}/description`, { headers });
    const descData = ((await descRes.json().catch(() => ({ data: "" }))) as { data?: string });

    const filesRes = await fetch(`${CURSEFORGE_API}/mods/${numericId}/files?pageSize=50`, { headers });
    const filesData = filesRes.ok ? ((await filesRes.json().catch(() => ({ data: [] }))) as { data?: CurseForgeRawFile[] }) : { data: [] };
    const versions = (filesData.data || []).map((file: CurseForgeRawFile) => {
      const rawVersions = Array.isArray(file.gameVersions) ? file.gameVersions : [];
      const loaders = rawVersions
        .map((value: string) => value.toLowerCase())
        .filter((value: string) => CF_LOADER_NAMES.includes(value));
      const gameVersions = rawVersions.filter((value: string) => isMinecraftVersion(value));

      return {
        id: file.id?.toString() || file.fileName,
        name: file.displayName || file.fileName || "Version",
        version_number: file.displayName || file.fileName || "Version",
        game_versions: gameVersions,
        loaders,
        date_published: file.fileDate || null,
        downloads: file.downloadCount || 0,
        version_type: mapReleaseType(file.releaseType),
        platform: "CurseForge",
      };
    });

    // Infer client/server side requirements based on categories
    const cats = (m.categories || []).map((c: CurseForgeCategory) => c.name.toLowerCase());
    const isWorld = cats.some((c: string) => ["world gen", "biomes", "dimensions", "structures", "ores and resources"].includes(c));
    const isClient = cats.some((c: string) => ["optimization", "performance", "visuals", "cosmetic", "map and information", "chat"].includes(c));
    const isServer = cats.some((c: string) => ["server utility", "management"].includes(c));
    const client_side = isWorld ? "required" : (isClient ? "required" : (isServer ? "optional" : "unknown"));
    const server_side = isWorld ? "required" : (isClient ? "unsupported" : (isServer ? "required" : "unknown"));

    // Mapped project details
    const projectDetails = {
      id: m.id.toString(),
      title: m.name,
      body: descData.data || "",
      client_side,
      server_side,
      license: { name: "Custom / All Rights Reserved", id: "custom" },
      wiki_url: m.links?.wikiUrl || null,
      source_url: m.links?.sourceUrl || null,
      issues_url: m.links?.issuesUrl || null,
      discord_url: null,
      icon_url: m.logo?.thumbnailUrl || m.logo?.url || null,
      authors: m.authors || [],
      project_type: m.classId === 12 ? "resourcepack" : m.classId === 6552 ? "shader" : m.classId === 6945 ? "datapack" : m.classId === 4471 ? "modpack" : "mod",
      updated_at: m.dateModified || m.dateReleased || versions[0]?.date_published || null,
      gallery: (m.screenshots || []).map((s: CurseForgeScreenshot) => ({
        url: s.url,
        title: s.title || ""
      })).filter((s: { url: string }) => s.url),
      game_versions: Array.from(new Set([
        ...(m.latestFilesIndexes?.map((idx: CurseForgeFileIndex) => idx.gameVersion) || []),
        ...versions.flatMap((v: { game_versions: string[] }) => v.game_versions || []),
      ])),
      loaders: Array.from(new Set(versions.flatMap((v: { loaders: string[] }) => v.loaders || []))),
      versions,
    };

    // 3. Fetch dependencies in batch if any
    const cfDeps = m.dependencies || [];
    const relationToDependencyType = (relationType: number) => {
      if (relationType === 2) return "optional";
      if (relationType === 3) return "required";
      if (relationType === 5) return "incompatible";
      return "embedded";
    };
    const dependencyTypeById = new Map(
      cfDeps.map((d: CurseForgeDependency) => [String(d.modId), relationToDependencyType(d.relationType)])
    );
    const depIds = Array.from(
      new Set(
        cfDeps
          .filter((d: CurseForgeDependency) => [2, 3, 5].includes(d.relationType))
          .map((d: CurseForgeDependency) => d.modId)
      )
    );

    let dependencies: Array<{
      id: string;
      project_id: string;
      dependency_type: string;
      title: string;
      description: string;
      icon_url: string | null;
      author: string;
      project_type: string;
      categories: string[];
      slug: string;
      _source: string;
    }> = [];

    if (depIds.length > 0) {
      const depsRes = await fetch(`${CURSEFORGE_API}/mods`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modIds: depIds }),
      });

      if (depsRes.ok) {
        const depsJson = (await depsRes.json()) as { data?: CurseForgeMod[] };
        dependencies = (depsJson.data || []).map((dep: CurseForgeMod) => ({
          id: dep.id.toString(),
          project_id: dep.id.toString(),
          dependency_type: dependencyTypeById.get(String(dep.id)) || "required",
          title: dep.name,
          description: dep.summary || "",
          icon_url: dep.logo?.thumbnailUrl || dep.logo?.url || null,
          author: dep.authors?.[0]?.name || "Desconocido",
          project_type: "mod",
          categories: dep.categories?.map((c: CurseForgeCategory) => c.name) || [],
          slug: dep.slug || "",
          _source: "curseforge",
        }));
      }
    }

    return NextResponse.json({
      details: projectDetails,
      dependencies,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load project details";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
