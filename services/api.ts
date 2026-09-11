import type { CollectionEntry, ModHit } from "@/lib/core/types";

export async function fetchCollections(): Promise<{ collections: CollectionEntry[], error: string | null }> {
  try {
    let combined: CollectionEntry[] = [];
    
    // 1. Local collections
    const resLocal = await fetch("/api/local-collections");
    if (resLocal.ok) {
      const data = await resLocal.json();
      combined = [...(data.collections || [])];
    }

    // 2. Modrinth collections
    const resModrinth = await fetch("/api/modrinth/collections");
    if (resModrinth.ok) {
      const data = await resModrinth.json();
      combined = [...combined, ...(data.collections || [])];
    }

    return { collections: combined, error: null };
  } catch {
    return { collections: [], error: "Error al conectar con el servidor" };
  }
}

export async function fetchCollectionMods(id: string): Promise<{ mods: ModHit[], error: string | null }> {
  try {
    // If it's a local collection, we need to fetch projects by IDs
    if (id.startsWith("local_")) {
      const resLocal = await fetch("/api/local-collections");
      if (resLocal.ok) {
        const data = await resLocal.json();
        const coll = (data.collections as CollectionEntry[] || []).find((c) => c.id === id);
        if (coll && coll.projects && coll.projects.length > 0) {
          const pIds = coll.projects.map((p) => p.projectId);
          return await fetchModsByIds(pIds);
        }
      }
      return { mods: [], error: null };
    }

    let res = await fetch(`/api/modrinth/collections?collectionId=${id}`);
    
    // Retry once if 404 (common in dev with Turbopack/slow FS)
    if (res.status === 404) {
      await new Promise(resolve => setTimeout(resolve, 500));
      res = await fetch(`/api/modrinth/collections?collectionId=${id}`);
    }

    if (res.ok) {
      const data = await res.json();
      return { mods: data.mods || [], error: null };
    }
    return { mods: [], error: "No se pudieron cargar los mods" };
  } catch {
    return { mods: [], error: "Error de red" };
  }
}

export async function fetchModsByIds(ids: string[]): Promise<{ mods: ModHit[], error: string | null }> {
  if (!ids || ids.length === 0) return { mods: [], error: null };
  try {
    const res = await fetch(`/api/modrinth/projects?ids=${JSON.stringify(ids)}`);
    if (res.ok) {
      const data = await res.json();
      return { mods: data.mods || [], error: null };
    }
    return { mods: [], error: "No se pudieron cargar los proyectos" };
  } catch {
    return { mods: [], error: "Error de red" };
  }
}

export async function createCollection(
  name: string,
  mod?: ModHit | null,
  target: "local" | "modrinth" = "local"
): Promise<{ collection: CollectionEntry | null, error: string | null }> {
  try {
    const endpoint = target === "modrinth" ? "/api/modrinth/collections" : "/api/local-collections";
    const body = { action: "create", name, description: target === "modrinth" ? "Creada desde MIM" : "Mi colección local" };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { collection } = await res.json();
      if (mod) {
        await addModToCollection(collection.id, mod, target);
      }
      return { collection, error: null };
    }
    const data = await res.json().catch(() => ({}));
    return { collection: null, error: data.error || "Error al crear colección" };
  } catch {
    return { collection: null, error: "Error de red" };
  }
}

export async function addModToCollection(collId: string, mod: ModHit, target: "local" | "modrinth" = "local"): Promise<{ error: string | null }> {
  try {
    const endpoint = target === "modrinth" ? "/api/modrinth/collections" : "/api/local-collections";
    const body = target === "modrinth"
      ? { action: "add_project", collectionId: collId, projectId: mod.projectId }
      : { action: "add_project", collectionId: collId, project: mod };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { error: null };
    const data = await res.json().catch(() => ({}));
    return { error: data.error || "Error al añadir a la colección" };
  } catch {
    return { error: "Error de red" };
  }
}

export async function downloadCollection(collId: string, loader: string, gameVersion: string): Promise<{ count: number, skipped: number, error: string | null }> {
  try {
    const isLocal = collId.startsWith("local_");
    const endpoint = isLocal ? "/api/local-collections" : "/api/modrinth/collections";
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: collId, loader, gameVersion, action: isLocal ? "download" : undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      const skipped = data.failed?.length || 0;
      return { count: data.queued?.length || 0, skipped, error: null };
    }
    const data = await res.json().catch(() => ({}));
    return { count: 0, skipped: 0, error: data.error || "Error al descargar colección" };
  } catch {
    return { count: 0, skipped: 0, error: "Error de red" };
  }
}

export async function fetchOfficialCollections(): Promise<{ collections: CollectionEntry[], error: string | null }> {
  try {
    let res = await fetch("/api/modrinth/official");
    
    // Retry once if 404 (common in dev with Turbopack/slow FS)
    if (res.status === 404) {
      await new Promise(resolve => setTimeout(resolve, 500));
      res = await fetch("/api/modrinth/official");
    }

    if (!res.ok) throw new Error(`Server proxy error: ${res.status}`);
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON returned from server proxy");
    }

    if (!Array.isArray(data)) {
      throw new Error("Expected array of collections");
    }

    const mapped: Array<CollectionEntry & { created?: string }> = data.map((c: Record<string, unknown>) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      description: String(c.description || ""),
      projectCount: Array.isArray(c.projects) ? c.projects.length : (typeof c.project_count === "number" ? c.project_count : 0),
      iconUrl: typeof c.icon_url === "string" ? c.icon_url : null,
      isLocal: false,
      source: "modrinth" as const,
      webUrl: `https://modrinth.com/collection/${String(c.slug || c.id || "")}`,
      visibility: (typeof c.status === "string" ? c.status : "public") as "private" | "unlisted" | "public" | "unknown",
      created: typeof c.created === "string" ? c.created : undefined,
      previewIcons: Array.isArray(c.previewIcons) ? (c.previewIcons as string[]) : undefined
    }));
    
    // Sort by created descending so the latest month (Vol. XX) is first
    mapped.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
    
    return { collections: mapped, error: null };
  } catch (err) {
    console.error("fetchOfficialCollections failed:", err);
    return { collections: [], error: "No se pudieron cargar las colecciones oficiales" };
  }
}

export async function fetchCurseForgeFeatured(): Promise<{ featured: ModHit[], popular: ModHit[], recentlyUpdated: ModHit[], error: string | null }> {
  try {
    const res = await fetch("/api/curseforge/featured");
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return { 
      featured: data.featured || [], 
      popular: data.popular || [], 
      recentlyUpdated: data.recentlyUpdated || [], 
      error: null 
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al cargar destacados de CurseForge";
    return { featured: [], popular: [], recentlyUpdated: [], error: message };
  }
}

export async function fetchCurseForgePicks(): Promise<{ picks: CollectionEntry[], error: string | null }> {
  try {
    const res = await fetch("/api/curseforge/picks");
    if (!res.ok) throw new Error("Error fetching picks");
    const data = await res.json();
    return { picks: data.picks || [], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al cargar CurseForge Picks";
    return { picks: [], error: message };
  }
}

export async function fetchCurseForgePickMods(slug: string): Promise<{ mods: ModHit[], error: string | null }> {
  try {
    const res = await fetch(`/api/curseforge/picks/${slug}`);
    if (!res.ok) throw new Error("Error fetching pick mods");
    const data = await res.json();
    return { mods: data.mods || [], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al cargar mods del pick";
    return { mods: [], error: message };
  }
}

export const api = {
  collections: {
    sync: async () => [],
  }
};
