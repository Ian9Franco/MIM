/**
 * /api/modrinth/collections — GET / POST / DELETE
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import path from "path";
import fs from "fs";
import os from "os";
import { withApiGuard } from "@/lib/apiGuard";
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

const getQuerySchema = z.object({
  collectionId: z.string().trim().optional(),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema: getQuerySchema,
  },
  async ({ query }) => {
    const { collectionId } = query;
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
      } else if (collectionId === "followed-projects") {
        const profileRes = await fetch(`${MODRINTH_API}/user`, { headers });
        if (!profileRes.ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const profile = await profileRes.json();
        
        const res = await fetch(`${MODRINTH_API}/user/${profile.id}/follows`, { headers });
        if (!res.ok) return NextResponse.json({ error: "No se pudo cargar los proyectos seguidos" }, { status: res.status });
        const projects = await res.json();
        
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
      
      // Obtener seguidos para saber la cantidad y las miniaturas
      const followsRes = await fetch(`${MODRINTH_API}/user/${profile.id}/follows`, { headers });
      let followsCount = 0;
      let previewIcons: string[] = [];
      if (followsRes.ok) {
        const follows = await followsRes.json();
        followsCount = follows.length;
        previewIcons = follows.slice(0, 20).map((p: any) => p.icon_url).filter(Boolean);
      }

      const remoteCollections = await tryFetchUserCollections(profile.id, headers);
      
      // Recopilar todos los IDs de proyectos de todas las colecciones para traer iconos en masa
      const allProjectIds = new Set<string>();
      remoteCollections.forEach((coll: any) => {
        if (Array.isArray(coll.projects)) {
          coll.projects.slice(0, 20).forEach((id: string) => allProjectIds.add(id));
        }
      });
      
      // Traer proyectos en masa para obtener las URLs de los iconos
      const projectsMap: Record<string, string> = {};
      if (allProjectIds.size > 0) {
        const idsArray = Array.from(allProjectIds);
        const res = await fetch(`${MODRINTH_API}/projects?ids=${JSON.stringify(idsArray.slice(0, 100))}`, { headers });
        if (res.ok) {
          const projects = await res.json();
          projects.forEach((p: any) => {
            projectsMap[p.id] = p.icon_url;
          });
        }
      }

      const mappedColls = remoteCollections.map((coll: any) => {
        const mapped = mapCollection(coll);
        const collIcons = Array.isArray(coll.projects) 
          ? coll.projects.map((id: string) => projectsMap[id]).filter(Boolean).slice(0, 20)
          : [];
        return {
          ...mapped,
          previewIcons: collIcons
        };
      });

      mappedColls.unshift({
        id: "followed-projects",
        name: "Favoritos (Seguidos)",
        description: "Proyectos que sigues en Modrinth",
        projectCount: followsCount,
        iconUrl: null,
        previewIcons: previewIcons,
        source: "modrinth",
        webUrl: "https://modrinth.com/collection/following",
        visibility: "public",
      });

      return NextResponse.json({ collections: mappedColls, username: profile.username });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }
);

const postBodySchema = z.object({
  action: z.string().optional(),
  collectionId: z.string().optional(),
  projectId: z.string().optional(),
  name: z.string().optional(),
  gameVersion: z.string().optional(),
  loader: z.string().optional(),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    bodySchema: postBodySchema,
  },
  async ({ body }) => {
    const { action, collectionId, projectId, name } = body;
    const tokenHeaders = buildHeaders();
    
    // Validar token solo para acciones de escritura
    if (action === "create" || action === "add_project" || action === "remove_project") {
      if (!tokenHeaders) return NextResponse.json({ error: "Sin token" }, { status: 401 });
    }

    const headers = tokenHeaders || { "User-Agent": "MIM-App/1.0 (contact@mim.local)" };

    try {
      if (action === "create") {
        const res = await fetch(`${MODRINTH_API_V3}/collection`, {
          method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ name, status: "private" })
        });
        return NextResponse.json({ collection: mapCollection(await res.json()) });
      }

      if (action === "add_project") {
        if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        if (collectionId === "followed-projects") {
          const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/follow`, {
            method: "POST",
            headers: { ...headers }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.error || "No se pudo seguir el proyecto" }, { status: res.status });
          }
          return NextResponse.json({ success: true });
        }
        
        // 1. Obtener la colección actual para saber qué proyectos tiene
        const getRes = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { headers });
        if (!getRes.ok) return NextResponse.json({ error: "No se pudo obtener la colección" }, { status: getRes.status });
        const collection = await getRes.json();
        
        const currentProjects = collection.projects || [];
        if (!currentProjects.includes(projectId)) {
          currentProjects.push(projectId);
        }
        
        // 2. Guardar la lista completa actualizada
        const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, {
          method: "PATCH", 
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ projects: currentProjects })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[Modrinth API] Error adding project:", errorData);
          return NextResponse.json({ error: errorData.error || "No se pudo añadir el proyecto" }, { status: res.status });
        }
        return NextResponse.json({ success: true });
      }

      if (action === "remove_project") {
        if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        if (collectionId === "followed-projects") {
          const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/follow`, {
            method: "DELETE",
            headers: { ...headers }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.error || "No se pudo dejar de seguir el proyecto" }, { status: res.status });
          }
          return NextResponse.json({ success: true });
        }
        
        // 1. Obtener la colección actual
        const getRes = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { headers });
        if (!getRes.ok) return NextResponse.json({ error: "No se pudo obtener la colección" }, { status: getRes.status });
        const collection = await getRes.json();
        
        const currentProjects = collection.projects || [];
        const updatedProjects = currentProjects.filter((id: string) => id !== projectId);
        
        // 2. Guardar la lista completa actualizada
        const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, {
          method: "PATCH", 
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ projects: updatedProjects })
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

      // Fetch all versions in parallel to save time
      const versionPromises = projectIds.map(async (pId: string) => {
        try {
          const vRes = await fetch(`${MODRINTH_API}/project/${pId}/version`, { headers });
          if (!vRes.ok) throw new Error(`API error: ${vRes.status}`);
          const versions = await vRes.json();
          return { pId, versions };
        } catch (e) {
          return { pId, versions: [], error: String(e) };
        }
      });

      const results = await Promise.all(versionPromises);

      // Downloads are sequential (one by one) to avoid rate limits and congestion
      for (const result of results) {
        const { pId, versions, error } = result;
        
        if (error) {
          failed.push({ projectId: pId, reason: error });
          continue;
        }

        if (versions.length > 0) {
          try {
            const file = versions[0].files[0];
            const dl = await fetch(file.url);
            if (!dl.ok) throw new Error(`Download error: ${dl.status}`);
            const dest = path.join(downloadsDir, file.filename);
            fs.writeFileSync(dest, Buffer.from(await dl.arrayBuffer()));
            queued.push({ projectId: pId, filename: file.filename });
          } catch (e) { 
            failed.push({ projectId: pId, reason: String(e) }); 
          }
        } else {
          failed.push({ projectId: pId, reason: "No versions found" });
        }
      }

      return NextResponse.json({ queued, failed });
    } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
  }
);

const deleteBodySchema = z.object({
  collectionId: z.string().min(1, "Missing collectionId"),
});

export const DELETE = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    bodySchema: deleteBodySchema,
  },
  async ({ body }) => {
    const headers = buildHeaders();
    if (!headers) return NextResponse.json({ error: "Sin token" }, { status: 401 });
    const { collectionId } = body;
    const res = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { method: "DELETE", headers });
    return NextResponse.json({ success: res.ok });
  }
);
