/**
 * /api/modrinth/discover — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the latest mods from Modrinth's search API.
 *
 * Query params:
 *   loader      — e.g. "forge", "fabric"
 *   gameVersion — e.g. "1.20.1"
 *   page        — 1-indexed page number (default: 1)
 *   pageSize    — results per page (default: 20)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";
const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const loader       = searchParams.get("loader") ?? "forge";
  const gameVersionsJson = searchParams.get("gameVersions");
  const gameVersions = gameVersionsJson ? JSON.parse(gameVersionsJson) : [];
  const categories   = searchParams.get("categories") ? JSON.parse(searchParams.get("categories")!) : [];
  const environments = searchParams.get("environments") ? JSON.parse(searchParams.get("environments")!) : [];
  const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize     = parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const sortParam    = searchParams.get("sort") ?? "relevance";
  const sort         = ["updated", "relevance", "downloads", "newest", "follows"].includes(sortParam) ? sortParam : "relevance";
  const projectType  = searchParams.get("projectType") ?? "mod";
  const q            = searchParams.get("q")?.trim() ?? "";
  const offset       = (page - 1) * pageSize;

  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  const apiKey = getApiKey("modrinth");
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  let queryText = q;
  const facetsArray: string[][] = [
    [`project_type:${projectType}`],
  ];

  // If search query is an author query (author:username)
  if (q.startsWith("author:")) {
    const authorName = q.replace(/^author:/i, "").trim();
    if (authorName) {
      try {
        const userProjectsRes = await fetch(`${MODRINTH_API}/user/${authorName}/projects`, { headers });
        if (userProjectsRes.ok) {
          const projects = await userProjectsRes.json();
          
          // Show the complete catalog of the creator without any restriction
          let filtered = [...(projects ?? [])];
          
          // 5. Paginate
          const totalHits = filtered.length;
          const paginated = filtered.slice(offset, offset + pageSize);
          
          // 6. Map to same ModHit structure as Search Hits
          const mods = paginated.map((p: any) => ({
            projectId:   p.id,
            slug:        p.slug,
            title:       p.title,
            description: p.description || "",
            iconUrl:     p.icon_url ?? null,
            author:      authorName, // We are searching for this author so set it!
            downloads:   p.downloads || 0,
            follows:     p.followers || 0,
            latestVersion: null,
            categories:  p.categories ?? [],
            dateCreated: p.published || "",
            url:         `https://modrinth.com/${p.project_type ?? "mod"}/${p.slug}`,
            projectType: p.project_type ?? "mod",
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
  if (projectType === "mod" && loader !== "unknown") {
    if (loader.includes(",")) {
      const loaders = loader.split(",");
      facetsArray.push(loaders.map((l: string) => `categories:${l.trim()}`));
    } else {
      facetsArray.push([`categories:${loader}`]);
    }
  }

  // Categories (OR within categories group)
  if (categories.length > 0) {
    facetsArray.push(categories.map((cat: string) => `categories:${cat}`));
  }

  // Environments (OR within environments group)
  if (environments.length > 0) {
    environments.forEach((env: string) => {
      if (env === "client") {
        facetsArray.push(["client_side:required", "client_side:optional"]);
      } else if (env === "server") {
        facetsArray.push(["server_side:required", "server_side:optional"]);
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

    // Map to a clean, minimal shape
    // Removed strict project_type filter because Modrinth may tag some projects as 'mod' even if we faceted by 'datapack', resulting in 0 hits returned after filter.
    const mods = (data.hits ?? [])
      .map((h: any) => ({
        projectId:   h.project_id,
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
