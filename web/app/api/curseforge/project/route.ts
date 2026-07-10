import { NextRequest, NextResponse } from "next/server";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const CF_LOADER_NAMES = ["forge", "fabric", "neoforge", "quilt", "cauldron", "liteloader"];

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
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const headers = {
      "Accept": "application/json",
      "x-api-key": apiKey,
    };

    let m: any;
    let numericId = projectId;

    if (isNaN(Number(projectId))) {
      // It's a slug! Search by slug first to resolve to numeric ID
      const searchRes = await fetch(`${CURSEFORGE_API}/mods/search?gameId=432&slug=${projectId}`, { headers });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
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
      const modData = await modRes.json();
      m = modData.data;
    }

    // 2. Fetch description HTML using resolved numeric ID
    const descRes = await fetch(`${CURSEFORGE_API}/mods/${numericId}/description`, { headers });
    const descData = await descRes.json().catch(() => ({ data: "" }));

    const filesRes = await fetch(`${CURSEFORGE_API}/mods/${numericId}/files?pageSize=50`, { headers });
    const filesData = filesRes.ok ? await filesRes.json().catch(() => ({ data: [] })) : { data: [] };
    const versions = (filesData.data || []).map((file: any) => {
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
    const cats = (m.categories || []).map((c: any) => c.name.toLowerCase());
    const isWorld = cats.some((c: any) => ["world gen", "biomes", "dimensions", "structures", "ores and resources"].includes(c));
    const isClient = cats.some((c: any) => ["optimization", "performance", "visuals", "cosmetic", "map and information", "chat"].includes(c));
    const isServer = cats.some((c: any) => ["server utility", "management"].includes(c));
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
      gallery: (m.screenshots || []).map((s: any) => ({
        url: s.url,
        title: s.title || ""
      })).filter((s: any) => s.url),
      game_versions: Array.from(new Set([
        ...(m.latestFilesIndexes?.map((idx: any) => idx.gameVersion) || []),
        ...versions.flatMap((v: any) => v.game_versions || []),
      ])) as string[],
      loaders: Array.from(new Set(versions.flatMap((v: any) => v.loaders || []))),
      versions,
    };

    // 3. Fetch dependencies in batch if any
    const cfDeps = m.dependencies || [];
    const depIds = cfDeps
      .filter((d: any) => d.relationType === 3) // 3 = RequiredDependency
      .map((d: any) => d.modId);

    let dependencies: any[] = [];
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
        const depsJson = await depsRes.json();
        dependencies = (depsJson.data || []).map((dep: any) => ({
          id: dep.id.toString(),
          title: dep.name,
          description: dep.summary || "",
          icon_url: dep.logo?.thumbnailUrl || dep.logo?.url || null,
          author: dep.authors?.[0]?.name || "Desconocido",
          project_type: "mod",
          categories: dep.categories?.map((c: any) => c.name) || [],
          slug: dep.slug,
          _source: "curseforge",
        }));
      }
    }

    return NextResponse.json({
      details: projectDetails,
      dependencies,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load project details" }, { status: 500 });
  }
}
