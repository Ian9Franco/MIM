/**
 * /api/local-collections — GET / POST / DELETE
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestiona colecciones locales de mods almacenadas en mim-collections.json.
 * Las colecciones locales son independientes de Modrinth y se guardan en disco.
 *
 * GET  — Lista todas las colecciones locales.
 * POST — Crea una colección, agrega o elimina un proyecto de una colección.
 *   actions: "create" | "add_project" | "remove_project"
 * DELETE — Elimina una colección local completa.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { SOURCE_BASE } from "@/lib/constants";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface LocalProject {
  projectId: string;
  [key: string]: unknown;
}

interface LocalCollection {
  id:           string;
  name:         string;
  description:  string;
  projectCount: number;
  projects:     LocalProject[];
  iconUrl:      string | null;
  isLocal:      boolean;
  source:       "local";
}

// ── Persistencia ──────────────────────────────────────────────────────────────

const OLD_ROOT_COLLECTIONS_FILE = path.join(process.cwd(), "mim-collections.json");
const OLD_INDEX_COLLECTIONS_FILE = path.join(process.cwd(), "mim-index", "collections.json");
const COLLECTIONS_FILE = path.join(SOURCE_BASE, ".mim-index", "collections.json");

// Migrate legacy file if it exists
if (!fs.existsSync(COLLECTIONS_FILE)) {
  try {
    fs.mkdirSync(path.dirname(COLLECTIONS_FILE), { recursive: true });
    if (fs.existsSync(OLD_INDEX_COLLECTIONS_FILE)) {
      fs.renameSync(OLD_INDEX_COLLECTIONS_FILE, COLLECTIONS_FILE);
      console.log("[collections] Legacy collections file successfully migrated from mim-index/ to SOURCE_BASE/.mim-index/");
    } else if (fs.existsSync(OLD_ROOT_COLLECTIONS_FILE)) {
      fs.renameSync(OLD_ROOT_COLLECTIONS_FILE, COLLECTIONS_FILE);
      console.log("[collections] Legacy collections file successfully migrated from root to SOURCE_BASE/.mim-index/");
    }
  } catch (e) {
    console.error("[collections] Failed to migrate legacy collections file:", e);
  }
}

/** Lee las colecciones desde el archivo JSON local. Devuelve [] si no existe o está corrupto. */
function getLocalCollections(): LocalCollection[] {
  if (!fs.existsSync(COLLECTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, "utf-8"));
  } catch {
    // Archivo corrupto o inválido — devolvemos vacío para no bloquear la app
    return [];
  }
}

/** Persiste el array de colecciones en el archivo JSON local. */
function saveLocalCollections(data: LocalCollection[]): void {
  fs.mkdirSync(path.dirname(COLLECTIONS_FILE), { recursive: true });
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ── GET — Listar colecciones ───────────────────────────────────────────────────

export async function GET() {
  const collections = getLocalCollections().map((coll) => ({
    ...coll,
    // Recalcular projectCount a partir del array real por si se desincronizó
    projectCount: Array.isArray(coll.projects) ? coll.projects.length : (coll.projectCount ?? 0),
    source: "local" as const,
  }));
  return NextResponse.json({ collections });
}

// ── POST — Acciones sobre colecciones ─────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const collections = getLocalCollections();

    // ── Crear nueva colección ────────────────────────────────────────────────
    if (body.action === "create") {
      const newColl: LocalCollection = {
        id:           "local_" + Date.now(),
        name:         body.name || "Nueva Colección",
        description:  body.description || "",
        projectCount: 0,
        projects:     [],
        iconUrl:      null,
        isLocal:      true,
        source:       "local",
      };
      collections.push(newColl);
      saveLocalCollections(collections);
      return NextResponse.json({ success: true, collection: newColl });
    }

    // ── Agregar proyecto a una colección ─────────────────────────────────────
    if (body.action === "add_project") {
      const coll = collections.find((c) => c.id === body.collectionId);
      if (!coll) {
        return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
      }
      if (!body.project?.projectId) {
        return NextResponse.json({ error: "Falta el proyecto a agregar" }, { status: 400 });
      }
      // Evitar duplicados
      if (!coll.projects.find((p) => p.projectId === body.project.projectId)) {
        coll.projects.push(body.project);
        coll.projectCount = coll.projects.length;
        saveLocalCollections(collections);
      }
      return NextResponse.json({ success: true });
    }

    // ── Eliminar proyecto de una colección ───────────────────────────────────
    if (body.action === "remove_project") {
      const coll = collections.find((c) => c.id === body.collectionId);
      if (!coll) {
        return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
      }
      coll.projects     = coll.projects.filter((p) => p.projectId !== body.projectId);
      coll.projectCount = coll.projects.length;
      saveLocalCollections(collections);
      return NextResponse.json({ success: true });
    }

    // ── Descargar colección local ───────────────────────────────────────────
    if (body.action === "download") {
      const { collectionId, gameVersion, loader } = body;
      const coll = collections.find((c) => c.id === collectionId);
      if (!coll) {
        return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
      }
      const projectIds = coll.projects.map((p) => p.projectId);
      
      const downloadsDir = path.join(os.homedir(), "Downloads");
      const queued = [];
      const failed = [];
      const headers = { "User-Agent": "MIM-App/1.0" };
      
      // Fetch all versions in parallel to save time
      const versionPromises = projectIds.map(async (pId) => {
        try {
          const vRes = await fetch(`https://api.modrinth.com/v2/project/${pId}/version`, { headers });
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
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/local-collections] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE — Eliminar colección completa ──────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    const { collectionId } = await req.json();

    if (!collectionId) {
      return NextResponse.json({ error: "Falta collectionId" }, { status: 400 });
    }

    const collections = getLocalCollections();
    const idx = collections.findIndex((c) => c.id === collectionId);

    if (idx === -1) {
      return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
    }

    const [deleted] = collections.splice(idx, 1);
    saveLocalCollections(collections);

    return NextResponse.json({ success: true, deleted: deleted.name });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/local-collections] DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
