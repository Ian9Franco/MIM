import { NextRequest, NextResponse } from "next/server";

const MODRINTH_API = "https://api.modrinth.com/v2";
const DEFAULT_PAGE_SIZE = 21;

const MODRINTH_CATEGORIES = [
  "adventure", "cursed", "decoration", "economy", "equipment", "food", 
  "game_mechanics", "library", "magic", "management", "minigame", "mobs", 
  "optimization", "social", "storage", "technology", "transportation", 
  "utility", "world_generation"
];

const RESOURCEPACK_FILTERS = {
  resolutions: ["8x or lower", "16x", "32x", "48x", "64x", "128x", "256x", "512x or higher"],
  categories: ["combat", "cursed", "decoration", "modded", "realistic", "simplistic", "themed", "tweaks", "utility", "vanilla-like"],
  features: ["audio", "blocks", "core-shaders", "entities", "environment", "equipment", "fonts", "gui", "items", "locale", "models"]
};

const SHADER_FILTERS = {
  categories: ["cartoon", "cursed", "fantasy", "realistic", "semi-realistic", "vanilla-like"],
  features: ["atmosphere", "bloom", "colored-lighting", "foliage", "path-tracing", "pbr", "reflections", "shadows"],
  performance: ["potato", "low", "medium", "high", "screenshot"],
  loaders: ["iris", "optifine", "vanilla"]
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const loader       = searchParams.get("loader") ?? "any";
  const gameVersionsJson = searchParams.get("gameVersions");
  const gameVersions = gameVersionsJson ? JSON.parse(gameVersionsJson) : [];
  const categories   = searchParams.get("categories") ? JSON.parse(searchParams.get("categories")!) : [];
  const environments = searchParams.get("environments") ? JSON.parse(searchParams.get("environments")!) : [];
  const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize     = parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const sortParam    = searchParams.get("sort") ?? "newest";
  const sort         = ["updated", "relevance", "downloads", "newest", "follows"].includes(sortParam) ? sortParam : "newest";
  const projectType  = searchParams.get("projectType") ?? "mod";
  const q            = searchParams.get("q")?.trim() ?? "";
  const offset       = (page - 1) * pageSize;

  const headers: Record<string, string> = {
    "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
  };

  const queryText = q;
  const facetsArray: string[][] = [];
  if (projectType && projectType !== "any" && projectType !== "all") {
    facetsArray.push([`project_type:${projectType}`]);
  }

  // If search query is an author query (author:username)
  if (q.startsWith("author:")) {
    const authorName = q.replace(/^author:/i, "").trim();
    if (authorName) {
      try {
        const userProjectsRes = await fetch(`${MODRINTH_API}/user/${authorName}/projects`, { headers });
        if (userProjectsRes.ok) {
          const projects = await userProjectsRes.json();
          
          // Show the complete catalog of the creator without any restriction
          const filtered = [...(projects ?? [])];
          
          // Paginate
          const totalHits = filtered.length;
          const paginated = filtered.slice(offset, offset + pageSize);
          
          // Map to same ModHit structure as Search Hits
          const mods = paginated.map((p: any) => ({
            projectId:   p.id,
            externalProjectId: p.id,
            sourceProjectId: p.id,
            platformId: p.id,
            slug:        p.slug,
            title:       p.title,
            description: p.description || "",
            iconUrl:     p.icon_url ?? null,
            author:      authorName,
            downloads:   p.downloads || 0,
            follows:     p.followers || 0,
            latestVersion: null,
            categories:  p.categories ?? [],
            dateCreated: p.published || "",
            url:         `https://modrinth.com/${p.project_type ?? "mod"}/${p.slug}`,
            projectType: p.project_type ?? "mod",
            client_side: p.client_side,
            server_side: p.server_side,
            gallery:     (p.gallery ?? []).map((img: any) => {
              const urlStr = typeof img === "string" ? img : img.url;
              return {
                url: urlStr,
                thumbnailUrl: urlStr,
                title: typeof img === "string" ? "" : img.title || "",
                featured: typeof img === "string" ? false : img.featured || false
              };
            }).filter((g: any) => g.url),
          }));
          
          return NextResponse.json({
            mods,
            total: totalHits,
            page,
            pageSize,
            totalPages: Math.ceil(totalHits / pageSize),
          });
        }
      } catch (err) {
        console.warn("[/api/modrinth/discover] Error fetching direct user projects, falling back:", err);
      }
    }
  }

  // Game Versions (OR)
  if (projectType !== "datapack" && gameVersions.length > 0) {
    facetsArray.push(gameVersions.map((v: string) => `versions:${v}`));
  }

  // Loader (AND with the rest)
  if (projectType === "mod" && loader !== "unknown" && loader !== "all" && loader !== "any") {
    if (loader.includes(",")) {
      const loaders = loader.split(",");
      facetsArray.push(loaders.map((l: string) => `categories:${l.trim()}`));
    } else {
      facetsArray.push([`categories:${loader}`]);
    }
  }

  // Categories (OR within categories group)
  if (categories.length > 0) {
    let validCategories = categories;
    if (projectType === "mod" || projectType === "datapack" || projectType === "modpack") {
      validCategories = categories.filter((cat: string) => MODRINTH_CATEGORIES.includes(cat));
    } else if (projectType === "resourcepack") {
      const allRP = [...RESOURCEPACK_FILTERS.resolutions, ...RESOURCEPACK_FILTERS.categories, ...RESOURCEPACK_FILTERS.features];
      validCategories = categories.filter((cat: string) => allRP.includes(cat));
    } else if (projectType === "shader") {
      const allShader = [...SHADER_FILTERS.categories, ...SHADER_FILTERS.features, ...SHADER_FILTERS.performance, ...SHADER_FILTERS.loaders];
      validCategories = categories.filter((cat: string) => allShader.includes(cat));
    }
    
    if (validCategories.length > 0) {
      facetsArray.push(validCategories.map((cat: string) => `categories:${cat}`));
    }
  }

  // Environments (Strict Client-Only / Server-Only logic)
  if (environments.length > 0) {
    environments.forEach((env: string) => {
      if (env === "client") {
        facetsArray.push(["client_side:required", "client_side:optional"]);
        facetsArray.push(["server_side:unsupported"]);
      } else if (env === "server") {
        facetsArray.push(["server_side:required", "server_side:optional"]);
        facetsArray.push(["client_side:unsupported"]);
      } else if (env === "both") {
        facetsArray.push(["client_side:required", "client_side:optional"]);
        facetsArray.push(["server_side:required", "server_side:optional"]);
      }
    });
  }

  const facets = JSON.stringify(facetsArray);

  try {
    const res = await fetch(
      `${MODRINTH_API}/search` +
        `?facets=${encodeURIComponent(facets)}` +
        `&index=${sort}` +
        (queryText ? `&query=${encodeURIComponent(queryText)}` : "") +
        `&limit=${pageSize}` +
        `&offset=${offset}`,
      { headers }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Modrinth API error", status: res.status }, { status: 502 });
    }

    const data = await res.json();

    const mods = (data.hits ?? [])
      .map((h: any) => ({
        projectId:   h.project_id,
        externalProjectId: h.project_id,
        sourceProjectId: h.project_id,
        platformId: h.project_id,
        slug:        h.slug,
        title:       h.title,
        description: h.description,
        iconUrl:     h.icon_url ?? null,
        author:      h.author,
        downloads:   h.downloads,
        follows:     h.follows,
        latestVersion: h.latest_version ?? null,
        categories:  h.categories ?? [],
        dateCreated: h.date_created,
        url:         `https://modrinth.com/${h.project_type ?? "mod"}/${h.slug}`,
        projectType: h.project_type ?? "mod",
        client_side: h.client_side,
        server_side: h.server_side,
        gallery:     [
          ...(h.featured_gallery ? [{
            url: h.featured_gallery,
            thumbnailUrl: h.featured_gallery,
            title: "Featured",
            featured: true
          }] : []),
          ...(h.gallery ?? []).map((g: any) => ({
            url: g,
            thumbnailUrl: g,
            title: "",
            featured: false
          }))
        ],
      }));

    return NextResponse.json({
      mods,
      total: data.total_hits ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((data.total_hits ?? 0) / pageSize),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/discover] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
