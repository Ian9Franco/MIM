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
import { getApiKey } from "@/lib/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";
const MODRINTH_API_V3 = "https://api.modrinth.com/v3";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CollectionEntry {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
  isLocal?: boolean;
  source?: "modrinth";
  webUrl?: string | null;
  visibility?: "private" | "unlisted" | "public" | "unknown";
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

/**
 * Construye headers con autenticación válida para Modrinth.
 *
 * Modrinth requiere el formato: `Authorization: mrp_<token>` para Personal Access Tokens.
 * Si el usuario proporciona solo el token sin prefijo, lo agregamos automáticamente.
 */
function buildHeaders(): Record<string, string> | null {
  let token = getApiKey("modrinth");
  if (!token) return null;

  // Asegurar formato correcto del token
  // Modrinth PATs deben tener prefijo 'mrp_'
  // OAuth tokens típicamente empiezan con algo diferente o son más largos
  if (!token.startsWith("mrp_") && !token.startsWith("Bearer ") && token.length < 100) {
    // Probablemente es un PAT sin prefijo
    token = `mrp_${token}`;
  }

  return {
    "User-Agent":    "MIM-App/1.0 (contact@mim.local)",
    "Authorization": token,
  };
}

async function tryFetchUserCollections(userId: string, headers: Record<string, string>) {
  const collections: any[] = [];
  const seenIds = new Set<string>();
  
  // 1. Fetch user's OWN collections from v3 API
  try {
    const res = await fetch(`${MODRINTH_API_V3}/user/${userId}/collections`, { headers, cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const coll of data) {
          if (!seenIds.has(coll.id)) {
            collections.push(coll);
            seenIds.add(coll.id);
          }
        }
      }
    } else {
      console.error("[Modrinth API] Error fetching user collections from v3:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[Modrinth API] Error fetching user collections from v3:", err);
  }

  // 2. Fetch FOLLOWED collections (as backup)
  try {
    const followsRes = await fetch(`${MODRINTH_API}/user/${userId}/follows`, { headers, cache: "no-store" });
    if (followsRes.ok) {
      const follows = await followsRes.json();
      const followedCollections = follows.filter((f: any) => f.object_type === "collection");
      
      for (const fc of followedCollections) {
        if (seenIds.has(fc.id)) continue; // Skip if already have it
        try {
          const cRes = await fetch(`${MODRINTH_API_V3}/collection/${fc.id}`, { headers, cache: "no-store" });
          if (cRes.ok) {
            const fullColl = await cRes.json();
            collections.push(fullColl);
            seenIds.add(fullColl.id);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("[Modrinth API] Error fetching followed collections:", err);
  }

  return collections;
}

function mapCollection(coll: any): CollectionEntry {
  return {
    id: coll.id,
    name: coll.name ?? coll.title ?? "Colección sin nombre",
    description: coll.description ?? "",
    projectCount: Array.isArray(coll.projects) ? coll.projects.length : (coll.project_count ?? 0),
    iconUrl: coll.icon_url ?? null,
    isLocal: false,
    source: "modrinth",
    webUrl: coll.slug
      ? `https://modrinth.com/collection/${coll.slug}`
      : coll.id
      ? `https://modrinth.com/collection/${coll.id}`
      : null,
    visibility: coll.status ?? "unknown",
  };
}

// ── GET — Listar colecciones del usuario autenticado ──────────────────────────

export async function GET(_req: NextRequest) {
  const { searchParams } = new URL(_req.url);
  const collectionId = searchParams.get("collectionId");
  const tokenHeaders = buildHeaders();

  // Si se pide una colección específica, es pública por definición (a menos que sea 'followed-projects' que sí requiere login)
  if (collectionId && collectionId !== "followed-projects") {
    const headers: Record<string, string> = tokenHeaders ?? {
      "User-Agent": "MIM-App/1.0 (contact@mim.local)",
    };

    try {
      const collectionRes = await fetch(`${MODRINTH_API_V3}/collection/${encodeURIComponent(collectionId)}`, { headers, cache: "no-store" });
      if (!collectionRes.ok) {
        const errorText = await collectionRes.text().catch(() => "");
        console.error(`[Modrinth API] Error fetching collection "${collectionId}":`, collectionRes.status, errorText);
        
        let status = 502;
        let errorMsg = "No se pudo cargar la colección";
        
        if (collectionRes.status === 404) {
          status = 404;
          errorMsg = `Colección no encontrada: "${collectionId}"`;
        } else if (collectionRes.status === 401 || collectionRes.status === 403) {
          status = collectionRes.status;
          errorMsg = "No autorizado para acceder a esta colección (es privada)";
        } else if (collectionRes.status === 429) {
          status = 429;
          errorMsg = "Límite de peticiones de Modrinth excedido";
        }
        
        return NextResponse.json({ error: errorMsg, details: errorText }, { status });
      }

      const collection = await collectionRes.json();
      const projectIds: string[] = Array.isArray(collection.projects) ? collection.projects : [];
      if (projectIds.length === 0) {
        return NextResponse.json({ mods: [] });
      }

      const projectsRes = await fetch(`${MODRINTH_API}/projects?ids=${JSON.stringify(projectIds)}`, { headers, cache: "no-store" });
      if (!projectsRes.ok) {
        const errorText = await projectsRes.text().catch(() => "");
        console.error(`[Modrinth API] Error fetching projects for collection "${collectionId}":`, projectsRes.status, errorText);
        
        let status = 502;
        let errorMsg = "No se pudieron cargar los proyectos de la colección";
        
        if (projectsRes.status === 429) {
          status = 429;
          errorMsg = "Límite de peticiones de Modrinth excedido";
        }
        
        return NextResponse.json({ error: errorMsg, details: errorText }, { status });
      }

      const projects = await projectsRes.json();
      const mods = await Promise.all(projects.map(async (m: any) => {
        let authorName = "Desconocido"; // Fallback para colecciones públicas
        try {
          const membersRes = await fetch(`${MODRINTH_API}/project/${m.id}/members`, { headers, cache: "force-cache" });
          if (membersRes.ok) {
            const members = await membersRes.json();
            const owner = members.find((member: any) => 
              member.role?.toLowerCase() === "owner" || member.is_owner === true
            );
            const primaryMember = owner || members[0];
            if (primaryMember?.user?.username) {
              authorName = primaryMember.user.username;
            }
          }
        } catch (err) {
          console.error(`[Modrinth API] Error resolving author for project ${m.id}:`, err);
        }

        return {
          projectId: m.id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          iconUrl: m.icon_url ?? null,
          author: authorName,
          downloads: m.downloads || 0,
          follows: m.followers || 0,
          latestVersion: null,
          categories: m.categories || [],
          dateCreated: m.published || "",
          url: `https://modrinth.com/project/${m.slug}`,
          projectType: m.project_type || "mod",
        };
      }));

      return NextResponse.json({ mods });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      console.error("[/api/modrinth/collections] GET Specific Collection — Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // A partir de aquí sí se requiere autenticación para interactuar con las colecciones del usuario logueado
  if (!tokenHeaders) {
    return NextResponse.json(
      {
        error:       "Token de Modrinth no configurado",
        instrucciones: "1. Andá a https://modrinth.com/settings/pats y creá un Personal Access Token. 2. Copialo y agregalo en los Ajustes del Sistema (Configuración) dentro de la sección Conectividad.",
        url: "https://modrinth.com/settings/pats",
      },
      { status: 401 }
    );
  }

  const headers = tokenHeaders;

  try {
    const profileRes = await fetch(`${MODRINTH_API}/user`, { headers });
    if (!profileRes.ok) {
      const errorText = await profileRes.text().catch(() => "");
      console.error("[Modrinth API] Error fetching user profile:", profileRes.status, errorText);
      
      // Si es 401, el token es inválido o expiró
      if (profileRes.status === 401) {
        return NextResponse.json(
          {
            error: "Token de Modrinth inválido o expirado",
            instrucciones: "1. Verificá que tu Personal Access Token sea válido en https://modrinth.com/settings/pats. 2. Si expiró, creá uno nuevo. 3. Actualizalo en los Ajustes de la aplicación (Configuración) dentro de Conectividad.",
            url: "https://modrinth.com/settings/pats",
            details: errorText
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `No se pudo obtener perfil de Modrinth: ${profileRes.status}`, details: errorText },
        { status: 502 }
      );
    }
    const profile = await profileRes.json();
    const userId: string = profile.id;
    const username: string = profile.username;

    // Si se pide los mods de 'followed-projects'
    if (collectionId === "followed-projects") {
      const followsRes = await fetch(`${MODRINTH_API}/user/${userId}/follows`, { headers });
      if (!followsRes.ok) {
        const errorText = await followsRes.text().catch(() => "");
        console.error(`[Modrinth API] Error fetching followed projects for user ${userId}:`, followsRes.status, errorText);
        return NextResponse.json({ error: "Error al cargar proyectos seguidos", details: errorText }, { status: 502 });
      }
      const follows = await followsRes.json();
      
      const mods = await Promise.all(follows.map(async (m: any) => {
        const pId = m.project_id || m.id;
        let authorName = "Desconocido";
        try {
          const membersRes = await fetch(`${MODRINTH_API}/project/${pId}/members`, { headers, cache: "force-cache" });
          if (membersRes.ok) {
            const members = await membersRes.json();
            const owner = members.find((member: any) => 
              member.role?.toLowerCase() === "owner" || member.is_owner === true
            );
            const primaryMember = owner || members[0];
            if (primaryMember?.user?.username) {
              authorName = primaryMember.user.username;
            }
          }
        } catch (err) {
          console.error(`[Modrinth API] Error resolving author for followed project ${pId}:`, err);
        }

        return {
          projectId: pId,
          slug: m.slug,
          title: m.title || m.name,
          description: m.description,
          iconUrl: m.icon_url || null,
          author: authorName, 
          downloads: m.downloads || 0,
          follows: m.followers || 0,
          latestVersion: null,
          categories: m.categories || [],
          dateCreated: m.published || "",
          url: `https://modrinth.com/project/${m.slug}`,
          projectType: m.project_type || "mod",
        };
      }));
      return NextResponse.json({ mods });
    }

    // Por defecto, devolver la lista de colecciones remotas + la virtual de seguidos.
    const followsRes = await fetch(`${MODRINTH_API}/user/${userId}/follows`, { headers });
    let projectCount = 0;
    if (followsRes.ok) {
      const follows = await followsRes.json();
      projectCount = follows.length || 0;
    }

    const remoteCollections = await tryFetchUserCollections(userId, headers);
    const collections = [
      ...remoteCollections.map(mapCollection),
      {
        id: "followed-projects",
        name: "Proyectos Seguidos",
        description: "Todos los mods que sigues en Modrinth.",
        projectCount,
        iconUrl: null,
        isLocal: false,
        source: "modrinth" as const,
        webUrl: "https://modrinth.com/dashboard/collections",
        visibility: "private" as const,
      }
    ];

    return NextResponse.json({ collections, username });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/modrinth/collections] GET — Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Descargar proyectos de una colección a Downloads ─────────────────

export async function POST(req: NextRequest) {
  const headers = buildHeaders();

  if (!headers) {
    return NextResponse.json(
      {
        error:         "MODRINTH_TOKEN no configurado",
        instrucciones: "1. Andá a https://modrinth.com/settings/pats y creá un Personal Access Token. 2. Agregalo en .env.local como MODRINTH_TOKEN=mrp_tu_token_aqui.",
        url: "https://modrinth.com/settings/pats",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { action, collectionId, gameVersion, loader, name, description } = body;

    if (action === "create") {
      const createRes = await fetch(`${MODRINTH_API_V3}/collection`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description ?? "Creada desde MIM",
          status: "private",
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.description || errorData.error || `Modrinth rechazó la creación (${createRes.status})` },
          { status: createRes.status }
        );
      }

      const collection = await createRes.json();
      return NextResponse.json({ collection: mapCollection(collection) });
    }

    if (action === "add_project") {
      const { projectId } = body;
      if (!collectionId || !projectId) {
        return NextResponse.json({ error: "Faltan collectionId o projectId" }, { status: 400 });
      }

      // 1. Get current projects
      const getRes = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, { headers });
      if (!getRes.ok) return NextResponse.json({ error: "No se pudo obtener la colección" }, { status: 502 });
      const current = await getRes.json();
      const projects = Array.isArray(current.projects) ? current.projects : [];

      if (projects.includes(projectId)) {
        return NextResponse.json({ message: "El proyecto ya está en la colección" });
      }

      // 2. Update with new project
      const patchRes = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projects: [...projects, projectId],
        }),
      });

      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        return NextResponse.json({ error: err.description || "Error al actualizar colección" }, { status: 502 });
      }

      return NextResponse.json({ success: true });
    }

    if (!collectionId || !gameVersion || !loader) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: collectionId, gameVersion, loader" },
        { status: 400 }
      );
    }

    // Obtener detalle de la colección (incluye lista de project IDs)
    const collectionRes = await fetch(
      `${MODRINTH_API_V3}/collection/${encodeURIComponent(collectionId)}`,
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
        // Obtener metadatos del proyecto (título + tipo) en un solo request
        let projectTitle = projectId;
        let projectType  = "mod";
        const projRes = await fetch(`${MODRINTH_API}/project/${projectId}`, { headers });
        if (projRes.ok) {
          const proj = await projRes.json();
          projectTitle = proj.title ?? projectId;
          projectType  = proj.project_type ?? "mod";
        }

        // Para no-mods (resourcepacks, shaders) omitimos el filtro de loader.
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

// ── DELETE — Eliminar una colección de Modrinth ─────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const headers = buildHeaders();

  if (!headers) {
    return NextResponse.json(
      {
        error:         "MODRINTH_TOKEN no configurado",
        instrucciones: "1. Andá a https://modrinth.com/settings/pats y creá un Personal Access Token. 2. Agregalo en .env.local como MODRINTH_TOKEN=mrp_tu_token_aqui.",
        url: "https://modrinth.com/settings/pats",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { collectionId } = body;

    if (!collectionId) {
      return NextResponse.json({ error: "Falta collectionId" }, { status: 400 });
    }

    // Llamar a la API de Modrinth v3 para eliminar la colección
    const deleteRes = await fetch(`${MODRINTH_API_V3}/collection/${collectionId}`, {
      method: "DELETE",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });

    if (!deleteRes.ok) {
      const errorData = await deleteRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.description || errorData.error || `Error ${deleteRes.status}` },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ success: true, message: "Colección eliminada" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/modrinth/collections] DELETE — Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
