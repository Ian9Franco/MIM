/**
 * /api/modrinth/collections — GET / POST
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  — Lista las colecciones del usuario autenticado en Modrinth.
 * POST — Descarga todos los proyectos de una colección directamente
 *         a la carpeta Downloads para que el watcher los procese.
 *
 * Requiere la variable de entorno MODRINTH_TOKEN (token OAuth del usuario),
 * distinto de MODRINTH_API_KEY (que es la API key de la app).
 *
 * GET — sin body, sin params.
 * Respuesta: { collections: CollectionEntry[] }
 *
 * POST — Body: { collectionId: string, gameVersion: string, loader: string }
 * Respuesta: { queued: QueuedFile[], failed: FailedFile[] }
 *
 * Diseño:
 *   - Las colecciones son listas curadas de proyectos. Un proyecto puede tener
 *     múltiples versiones; esta ruta descarga la versión más reciente compatible
 *     con gameVersion + loader del proyecto activo.
 *   - Si el token del usuario no está configurado, la ruta devuelve 401 con
 *     instrucciones claras en lugar de 500.
 *   - La descarga es secuencial (no paralela) para respetar rate limits.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

const MODRINTH_API = "https://api.modrinth.com/v2";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CollectionEntry {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
}

interface QueuedFile {
  projectId: string;
  projectTitle: string;
  filename: string;
  savedPath: string;
}

interface FailedFile {
  projectId: string;
  reason: string;
}

// ── Helper: construir headers con token de usuario ────────────────────────────

function buildHeaders(): Record<string, string> | null {
  const token = process.env.MODRINTH_TOKEN || process.env.MODRINTH_API_KEY;
  if (!token) return null;

  return {
    "User-Agent":    "MIM-App/1.0 (contact@mim.local)",
    "Authorization": token,
  };
}

// ── GET — Listar colecciones del usuario autenticado ──────────────────────────

export async function GET(_req: NextRequest) {
  const headers = buildHeaders();

  if (!headers) {
    return NextResponse.json(
      {
        error:       "MODRINTH_TOKEN no configurado",
        instrucciones: "Agregá MODRINTH_TOKEN=tu_token_aqui en .env.local para habilitar sincronización de colecciones.",
      },
      { status: 401 }
    );
  }

  try {
    const profileRes = await fetch(`${MODRINTH_API}/user`, { headers });
    if (!profileRes.ok) {
      return NextResponse.json(
        { error: `No se pudo obtener perfil de Modrinth: ${profileRes.status}` },
        { status: 502 }
      );
    }
    const profile = await profileRes.json();
    const userId: string = profile.id;
    const username: string = profile.username;

    // Si se pide los mods de 'followed-projects'
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId");

    if (collectionId === "followed-projects") {
      const followsRes = await fetch(`${MODRINTH_API}/user/${userId}/follows`, { headers });
      if (!followsRes.ok) {
        return NextResponse.json({ error: "Error al cargar proyectos seguidos" }, { status: 502 });
      }
      const follows = await followsRes.json();
      
      const mods = follows.map((m: any) => ({
        projectId: m.id || m.project_id,
        slug: m.slug,
        title: m.title || m.name,
        description: m.description,
        iconUrl: m.icon_url || null,
        author: "Modrinth", 
        downloads: m.downloads || 0,
        follows: m.followers || 0,
        latestVersion: null,
        categories: m.categories || [],
        dateCreated: m.published || "",
        url: `https://modrinth.com/project/${m.slug}`,
        projectType: m.project_type || "mod",
      }));
      return NextResponse.json({ mods });
    }

    // Por defecto, devolver la lista de colecciones (sólo la virtual de seguidos)
    const followsRes = await fetch(`${MODRINTH_API}/user/${userId}/follows`, { headers });
    let projectCount = 0;
    if (followsRes.ok) {
      const follows = await followsRes.json();
      projectCount = follows.length || 0;
    }

    const collections = [
      {
        id: "followed-projects",
        name: "Proyectos Seguidos",
        description: "Todos los mods que sigues en Modrinth.",
        projectCount,
        iconUrl: null,
      }
    ];

    return NextResponse.json({ collections, username });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/modrinth/collections] GET — Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Descargar proyectos de una colección a Downloads -- aca necesito que la app lea mi .env donde tengo mi key───────────────────

export async function POST(req: NextRequest) {
  const headers = buildHeaders();

  if (!headers) {
    return NextResponse.json(
      {
        error:         "MODRINTH_TOKEN no configurado",
        instrucciones: "Agregá MODRINTH_TOKEN=tu_token_aqui en .env.local.",
      },
      { status: 401 }
    );
  }

  try {
    const { collectionId, gameVersion, loader } = await req.json();

    if (!collectionId || !gameVersion || !loader) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: collectionId, gameVersion, loader" },
        { status: 400 }
      );
    }

    // Obtener detalle de la colección (incluye lista de project IDs)
    const collectionRes = await fetch(
      `${MODRINTH_API}/collection/${encodeURIComponent(collectionId)}`,
      { headers }
    );

    if (collectionRes.status === 404) {
      return NextResponse.json(
        { error: `Colección no encontrada: "${collectionId}"` },
        { status: 404 }
      );
    }
    if (!collectionRes.ok) {
      return NextResponse.json(
        { error: `Error al obtener colección: ${collectionRes.status}` },
        { status: 502 }
      );
    }

    const collection = await collectionRes.json();
    const projectIds: string[] = collection.projects ?? [];

    if (projectIds.length === 0) {
      return NextResponse.json({ queued: [], failed: [], message: "La colección está vacía" });
    }

    // Preparar Downloads
    const downloadsDir = path.join(os.homedir(), "Downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const queued:  QueuedFile[]  = [];
    const failed: FailedFile[] = [];

    // Procesar cada proyecto de forma secuencial para no exceder rate limits
    for (const projectId of projectIds) {
      try {
        // Obtener título del proyecto para el log
        let projectTitle = projectId;
        const projRes = await fetch(`${MODRINTH_API}/project/${projectId}`, { headers });
        if (projRes.ok) {
          const proj = await projRes.json();
          projectTitle = proj.title ?? projectId;
        }

        // Buscar versión más reciente compatible con gameVersion + loader
        // Para no-mods (resourcepacks, shaders) omitimos el filtro de loader.
        const projectType = projRes.ok ? (await (await fetch(`${MODRINTH_API}/project/${projectId}`, { headers })).json()).project_type : "mod";
        const loadersParam = projectType === "mod" ? `&loaders=["${loader}"]` : "";

        const versionsRes = await fetch(
          `${MODRINTH_API}/project/${projectId}/version` +
          `?game_versions=["${gameVersion}"]${loadersParam}`,
          { headers }
        );

        if (!versionsRes.ok) {
          failed.push({ projectId, reason: `No se encontraron versiones (${versionsRes.status})` });
          continue;
        }

        const versions = await versionsRes.json();
        if (!Array.isArray(versions) || versions.length === 0) {
          failed.push({ projectId, reason: `Sin versiones compatibles con ${gameVersion}` });
          continue;
        }

        // El índice 0 es la versión más nueva (Modrinth ordena desc por fecha)
        const latestVersion = versions[0];
        const primaryFile = latestVersion.files?.find((f: any) => f.primary) ?? latestVersion.files?.[0];

        if (!primaryFile?.url || !primaryFile?.filename) {
          failed.push({ projectId, reason: "La versión no tiene archivo descargable" });
          continue;
        }

        // Guard de colisión: no sobreescribir archivos existentes en Downloads
        const ext  = path.extname(primaryFile.filename);
        const base = path.basename(primaryFile.filename, ext);
        let targetPath = path.join(downloadsDir, primaryFile.filename);
        if (fs.existsSync(targetPath)) {
          targetPath = path.join(downloadsDir, `${base}_${Date.now()}${ext}`);
          console.warn(`[/api/modrinth/collections] Colisión detectada → renombrando a: ${path.basename(targetPath)}`);
        }

        // Descargar el archivo
        const downloadRes = await fetch(primaryFile.url);
        if (!downloadRes.ok) {
          failed.push({ projectId, reason: `Descarga fallida: ${downloadRes.status}` });
          continue;
        }

        const buffer = await downloadRes.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(buffer));

        console.log(`[/api/modrinth/collections] Guardado: ${path.basename(targetPath)}`);
        queued.push({
          projectId,
          projectTitle,
          filename: path.basename(targetPath),
          savedPath: targetPath,
        });
      } catch (e: unknown) {
        const reason = e instanceof Error ? e.message : "Error desconocido";
        console.error(`[/api/modrinth/collections] Error en proyecto ${projectId}:`, reason);
        failed.push({ projectId, reason });
      }
    }

    return NextResponse.json({ queued, failed });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/modrinth/collections] POST — Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}