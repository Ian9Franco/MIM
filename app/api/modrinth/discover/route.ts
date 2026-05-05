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

const MODRINTH_API = "https://api.modrinth.com/v2";
const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const loader       = searchParams.get("loader") ?? "forge";
  const gameVersions = searchParams.get("gameVersions") ? JSON.parse(searchParams.get("gameVersions")!) : ["1.20.1"];
  const categories   = searchParams.get("categories") ? JSON.parse(searchParams.get("categories")!) : [];
  const environments = searchParams.get("environments") ? JSON.parse(searchParams.get("environments")!) : [];
  const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize     = parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const sortParam    = searchParams.get("sort") ?? "relevance";
  const sort         = ["updated", "relevance", "downloads", "newest"].includes(sortParam) ? sortParam : "relevance";
  const projectType  = searchParams.get("projectType") ?? "mod";
  const q            = searchParams.get("q")?.trim() ?? "";
  const offset       = (page - 1) * pageSize;

  const facetsArray: string[][] = [
    [`project_type:${projectType}`],
  ];

  // Game Versions (OR)
  if (projectType !== "datapack" && gameVersions.length > 0) {
    facetsArray.push(gameVersions.map((v: string) => `versions:${v}`));
  }

  // Loader (AND with the rest)
  if (projectType === "mod" && loader !== "unknown") {
    facetsArray.push([`categories:${loader}`]);
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

  // Debug log to see the final facets
  console.log("[Modrinth Discover] Final Facets:", JSON.stringify(facetsArray));

  const facets = JSON.stringify(facetsArray);

  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  if (process.env.MODRINTH_API_KEY) {
    headers["Authorization"] = process.env.MODRINTH_API_KEY;
  }

  try {
    const res = await fetch(
      `${MODRINTH_API}/search` +
        `?facets=${encodeURIComponent(facets)}` +
        `&index=${sort}` +
        (q ? `&query=${encodeURIComponent(q)}` : "") +
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
