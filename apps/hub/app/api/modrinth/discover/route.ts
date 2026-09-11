import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

const MODRINTH_API = "https://api.modrinth.com/v2";
const DEFAULT_PAGE_SIZE = 21;

const discoverQuerySchema = z.object({
  loader: z.string().optional().default("any"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(DEFAULT_PAGE_SIZE),
  sort: z.enum(["updated", "relevance", "downloads", "newest", "follows"]).optional().default("newest"),
  projectType: z.string().optional().default("mod"),
  q: z.string().optional().default(""),
  gameVersions: z.string().optional(),
  categories: z.string().optional(),
  environments: z.string().optional(),
});

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

interface ModrinthGalleryItem {
  url: string;
  title?: string;
  featured?: boolean;
}

interface ModrinthProjectItem {
  id: string;
  slug: string;
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  icon_url?: string | null;
  downloads?: number;
  followers?: number;
  categories?: string[];
  published?: string;
  project_type?: string;
  project_types?: string[];
  client_side?: string | null;
  server_side?: string | null;
  organization?: string;
  environment?: { client?: string | null; server?: string | null };
  gallery?: Array<string | ModrinthGalleryItem>;
}

interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url?: string | null;
  author: string;
  downloads: number;
  follows: number;
  latest_version?: string | null;
  categories?: string[];
  date_created: string;
  project_type?: string;
  client_side?: string;
  server_side?: string;
  featured_gallery?: string | null;
  gallery?: string[];
}

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema: discoverQuerySchema,
  },
  async ({ query }) => {
    const { loader, page, pageSize, sort, projectType, q, gameVersions: rawGv, categories: rawCat, environments: rawEnv } = query;

    let gameVersions: string[] = [];
    try {
      if (rawGv) gameVersions = JSON.parse(rawGv);
    } catch {
      gameVersions = [];
    }

    let categories: string[] = [];
    try {
      if (rawCat) categories = JSON.parse(rawCat);
    } catch {
      categories = [];
    }

    let environments: string[] = [];
    try {
      if (rawEnv) environments = JSON.parse(rawEnv);
    } catch {
      environments = [];
    }

  const offset = (page - 1) * pageSize;

  const headers: Record<string, string> = {
    "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
  };
  if (process.env.MODRINTH_API_KEY) {
    headers.Authorization = process.env.MODRINTH_API_KEY;
  }

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
          const mods = paginated.map((p: ModrinthProjectItem) => ({
            projectId:   p.id,
            externalProjectId: p.id,
            sourceProjectId: p.id,
            platformId: p.id,
            slug:        p.slug,
            title:       p.title || p.name || "",
            description: p.description || p.summary || "",
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
            gallery:     (p.gallery ?? []).map((img) => {
              const urlStr = typeof img === "string" ? img : img.url;
              return {
                url: urlStr,
                thumbnailUrl: urlStr,
                title: typeof img === "string" ? "" : img.title || "",
                featured: typeof img === "string" ? false : img.featured || false
              };
            }).filter((g) => g.url),
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

  // If search query is an organization query (organization:slug_or_id)
  if (q.startsWith("organization:")) {
    const orgIdOrSlug = q.replace(/^organization:/i, "").trim();
    if (orgIdOrSlug) {
      try {
        const orgProjectsRes = await fetch(`https://api.modrinth.com/v3/organization/${orgIdOrSlug}/projects`, { headers });
        if (orgProjectsRes.ok) {
          const projects = await orgProjectsRes.json();
          const filtered = [...(projects ?? [])];
          
          // Paginate
          const totalHits = filtered.length;
          const paginated = filtered.slice(offset, offset + pageSize);
          
          // Map to same ModHit structure as Search Hits, resolving V3 fields
          const mods = paginated.map((p: ModrinthProjectItem) => {
            const pType = (p.project_types && p.project_types[0]) || p.project_type || "mod";
            return {
              projectId:   p.id,
              externalProjectId: p.id,
              sourceProjectId: p.id,
              platformId: p.id,
              slug:        p.slug,
              title:       p.name || p.title || "",
              description: p.summary || p.description || "",
              iconUrl:     p.icon_url ?? null,
              author:      p.organization || orgIdOrSlug,
              downloads:   p.downloads || 0,
              follows:     p.followers || 0,
              latestVersion: null,
              categories:  p.categories ?? [],
              dateCreated: p.published || "",
              url:         `https://modrinth.com/${pType}/${p.slug}`,
              projectType: pType,
              client_side: p.client_side || (p.environment ? p.environment.client : null),
              server_side: p.server_side || (p.environment ? p.environment.server : null),
              gallery:     (p.gallery ?? []).map((img) => {
                const urlStr = typeof img === "string" ? img : img.url;
                return {
                  url: urlStr,
                  thumbnailUrl: urlStr,
                  title: typeof img === "string" ? "" : img.title || "",
                  featured: typeof img === "string" ? false : img.featured || false
                };
              }).filter((g) => g.url),
            };
          });
          
          return NextResponse.json({
            mods,
            total: totalHits,
            page,
            pageSize,
            totalPages: Math.ceil(totalHits / pageSize),
          });
        }
      } catch (err) {
        console.warn("[/api/modrinth/discover] Error fetching direct organization projects, falling back:", err);
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
      .map((h: ModrinthSearchHit) => ({
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
          ...(h.gallery ?? []).map((g) => ({
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
  }
);
