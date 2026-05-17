import type { CollectionEntry, ModHit } from "@/lib/types";

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
  } catch (err) {
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
        const coll = data.collections.find((c: any) => c.id === id);
        if (coll && coll.projects && coll.projects.length > 0) {
          const pIds = coll.projects.map((p: any) => p.projectId);
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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

    const mapped = data.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      projectCount: Array.isArray(c.projects) ? c.projects.length : (c.project_count ?? 0),
      iconUrl: c.icon_url,
      isLocal: false,
      source: "modrinth" as const,
      webUrl: `https://modrinth.com/collection/${c.slug || c.id}`,
      visibility: c.status,
      created: c.created,
      previewIcons: c.previewIcons
    }));
    
    // Sort by created descending so the latest month (Vol. XX) is first
    mapped.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
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
  } catch (err: any) {
    return { featured: [], popular: [], recentlyUpdated: [], error: err.message || "Error al cargar destacados de CurseForge" };
  }
}

export async function fetchCurseForgePicks(): Promise<{ picks: CollectionEntry[], error: string | null }> {
  try {
    const res = await fetch("/api/curseforge/picks");
    if (!res.ok) throw new Error("Error fetching picks");
    const data = await res.json();
    return { picks: data.picks || [], error: null };
  } catch (err: any) {
    return { picks: [], error: err.message || "Error al cargar CurseForge Picks" };
  }
}

export async function fetchCurseForgePickMods(slug: string): Promise<{ mods: ModHit[], error: string | null }> {
  try {
    const res = await fetch(`/api/curseforge/picks/${slug}`);
    if (!res.ok) throw new Error("Error fetching pick mods");
    const data = await res.json();
    return { mods: data.mods || [], error: null };
  } catch (err: any) {
    return { mods: [], error: err.message || "Error al cargar mods del pick" };
  }
}

export const api = {
  collections: {
    sync: async () => [],
  }
};
