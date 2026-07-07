import { NextRequest, NextResponse } from "next/server";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

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

    // 1. Fetch mod details
    const modRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}`, { headers });
    if (!modRes.ok) {
      return NextResponse.json({ error: `CurseForge API Error: ${modRes.status}` }, { status: modRes.status });
    }
    const modData = await modRes.json();
    const m = modData.data;

    // 2. Fetch description HTML
    const descRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}/description`, { headers });
    const descData = await descRes.json().catch(() => ({ data: "" }));

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
      gallery: (m.screenshots || []).map((s: any) => ({
        url: s.url,
        title: s.title || ""
      })).filter((s: any) => s.url),
      game_versions: Array.from(new Set(m.latestFilesIndexes?.map((idx: any) => idx.gameVersion) || [])) as string[],
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
