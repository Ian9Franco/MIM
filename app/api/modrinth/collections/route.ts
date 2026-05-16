/**
 * /api/modrinth/collections — GET / POST
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import { 
  buildHeaders, tryFetchUserCollections, getAuthorName 
} from "@/services/modrinth/CollectionService";

const MODRINTH_API = "https://api.modrinth.com/v2";
const MODRINTH_API_V3 = "https://api.modrinth.com/v3";

function mapCollection(coll: any) {
  return {
    id: coll.id,
    name: coll.name ?? coll.title ?? "Colección sin nombre",
    description: coll.description ?? "",
    projectCount: Array.isArray(coll.projects) ? coll.projects.length : (coll.project_count ?? 0),
    iconUrl: coll.icon_url ?? null,
    source: "modrinth",
    webUrl: `https://modrinth.com/collection/${coll.slug || coll.id}`,
    visibility: coll.status ?? "unknown",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");
  const headers = buildHeaders() || { "User-Agent": "MIM-App/1.0" };

  try {
    if (collectionId && collectionId !== "followed-projects") {
      const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { headers });
      if (!res.ok) return NextResponse.json({ error: "No se pudo cargar la colección" }, { status: 502 });
      const collection = await res.json();
      const pIds = collection.projects || [];
      const pRes = await fetch(`${MODRINTH_API}/projects?ids=${JSON.stringify(pIds)}`, { headers });
      const projects = await pRes.json();
      const mods = await Promise.all(projects.map(async (m: any) => ({
        projectId: m.id, slug: m.slug, title: m.title, description: m.description,
        iconUrl: m.icon_url, author: await getAuthorName(m.id, headers),
        downloads: m.downloads, follows: m.followers, categories: m.categories,
        url: `https://modrinth.com/project/${m.slug}`, projectType: m.project_type
      })));
      return NextResponse.json({ mods });
    }

    const profileRes = await fetch(`${MODRINTH_API}/user`, { headers });
    if (!profileRes.ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const profile = await profileRes.json();
    const remoteCollections = await tryFetchUserCollections(profile.id, headers);
    return NextResponse.json({ collections: remoteCollections.map(mapCollection), username: profile.username });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const headers = buildHeaders();
  if (!headers) return NextResponse.json({ error: "Sin token" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, collectionId, gameVersion, loader } = body;

    if (action === "create") {
      const res = await fetch(`${MODRINTH_API_V3}/collection`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: body.name, status: "private" })
      });
      return NextResponse.json({ collection: mapCollection(await res.json()) });
    }

    if (action === "add_project") {
      const { projectId } = body;
      const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, {
        method: "PATCH", 
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ add_projects: [projectId] })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[Modrinth API] Error adding project:", errorData);
        return NextResponse.json({ error: errorData.error || "No se pudo añadir el proyecto" }, { status: res.status });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "remove_project") {
      const { projectId } = body;
      const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, {
        method: "PATCH", 
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ remove_projects: [projectId] })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[Modrinth API] Error removing project:", errorData);
        return NextResponse.json({ error: errorData.error || "No se pudo eliminar el proyecto" }, { status: res.status });
      }
      return NextResponse.json({ success: true });
    }

    if (!collectionId) return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    
    // Default action: Download collection (existing logic)
    const collRes = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { headers });
    if (!collRes.ok) return NextResponse.json({ error: "No se pudo cargar la colección para descargar" }, { status: collRes.status });
    
    const collection = await collRes.json();
    const projectIds = collection.projects || [];

    const downloadsDir = path.join(os.homedir(), "Downloads");
    const queued = [];
    const failed = [];

    for (const pId of projectIds) {
      try {
        const vRes = await fetch(`${MODRINTH_API}/project/${pId}/version?game_versions=["${gameVersion}"]&loaders=["${loader}"]`, { headers });
        const versions = await vRes.json();
        if (versions.length > 0) {
          const file = versions[0].files[0];
          const dl = await fetch(file.url);
          const dest = path.join(downloadsDir, file.filename);
          fs.writeFileSync(dest, Buffer.from(await dl.arrayBuffer()));
          queued.push({ projectId: pId, filename: file.filename });
        }
      } catch (e) { failed.push({ projectId: pId, reason: String(e) }); }
    }
    return NextResponse.json({ queued, failed });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const headers = buildHeaders();
  if (!headers) return NextResponse.json({ error: "Sin token" }, { status: 401 });
  const { collectionId } = await req.json();
  const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { method: "DELETE", headers });
  return NextResponse.json({ success: res.ok });
}
