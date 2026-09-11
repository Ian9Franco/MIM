import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

interface ModrinthProject {
  id: string;
  title: string;
  description: string;
  icon_url: string | null;
  author?: string;
  project_type: string;
  categories?: string[];
  slug: string;
  gallery?: unknown[];
}

interface ModrinthCollection {
  id: string;
  name: string;
  description?: string;
  projects?: string[];
  project_count?: number;
  icon_url?: string | null;
  slug?: string;
  status?: string;
  created: string;
}

const querySchema = z.object({
  id: z.string().trim().optional(),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query: { id: collectionId } }) => {

    const headers: Record<string, string> = {
      "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
      "Content-Type": "application/json"
    };
    if (process.env.MODRINTH_API_KEY) {
      headers.Authorization = process.env.MODRINTH_API_KEY;
    }

    const res = await fetch("https://api.modrinth.com/v3/user/modrinth/collections", {
      headers,
      next: { revalidate: 3600 } // Cache output for 1 hour
    });

    if (!res.ok) {
      console.error("[Modrinth Proxy Error] returned:", res.status);
      return NextResponse.json({ error: `Modrinth API error: ${res.status}` }, { status: 502 });
    }

    const data = ((await res.json()) as ModrinthCollection[]);
    
    // Sort collections by creation date descending so the latest is first
    data.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // If a specific collection ID is requested, only fetch and return the mods of that collection
    if (collectionId) {
      const targetColl = data.find((c) => c.id === collectionId);
      if (!targetColl) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }
      const projectIds = targetColl.projects || [];
      let mods: Array<{
        projectId: string;
        title: string;
        description: string;
        iconUrl: string | null;
        author: string;
        projectType: string;
        categories?: string[];
        url: string;
        _source: string;
        gallery?: unknown[];
      }> = [];

      if (projectIds.length > 0) {
        const resProjects = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(projectIds.slice(0, 15))}`, {
          headers
        });
        if (resProjects.ok) {
          const projects = ((await resProjects.json()) as ModrinthProject[]);
          mods = projects.map((m) => ({
            projectId: m.id,
            title: m.title,
            description: m.description,
            iconUrl: m.icon_url,
            author: m.author || "Creador",
            projectType: m.project_type,
            categories: m.categories,
            url: `https://modrinth.com/${m.project_type}/${m.slug}`,
            _source: "modrinth",
            gallery: m.gallery
          }));
        }
      }
      return NextResponse.json({ mods });
    }

    // Default flow: Fetch all collections and load the mods of the latest collection
    const latestColl = data[0];
    let latestFeaturedMods: Array<{
      projectId: string;
      title: string;
      description: string;
      iconUrl: string | null;
      author: string;
      projectType: string;
      categories?: string[];
      url: string;
      _source: string;
      gallery?: unknown[];
    }> = [];

    if (latestColl && latestColl.projects && latestColl.projects.length > 0) {
      const resProjects = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(latestColl.projects.slice(0, 15))}`, {
        headers
      });
      if (resProjects.ok) {
        const projects = ((await resProjects.json()) as ModrinthProject[]);
        latestFeaturedMods = projects.map((m) => ({
          projectId: m.id,
          title: m.title,
          description: m.description,
          iconUrl: m.icon_url,
          author: m.author || "Creador",
          projectType: m.project_type,
          categories: m.categories,
          url: `https://modrinth.com/${m.project_type}/${m.slug}`,
          _source: "modrinth",
          gallery: m.gallery
        }));
      }
    }

    // Build preview icons for collections list
    const allProjectIds = new Set<string>();
    const collectionsWithPreview = data.map((coll) => {
      const pIds = coll.projects || [];
      const previewIds = pIds.slice(0, 10);
      previewIds.forEach((id: string) => allProjectIds.add(id));
      return { ...coll, previewIds };
    });
    
    const idArray = Array.from(allProjectIds);
    const projectsMap: Record<string, { iconUrl: string | null }> = {};
    
    if (idArray.length > 0) {
      const resProjects = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(idArray)}`, {
        headers
      });
      if (resProjects.ok) {
        const projects = ((await resProjects.json()) as ModrinthProject[]);
        projects.forEach((p) => {
          projectsMap[p.id] = { iconUrl: p.icon_url };
        });
      }
    }
    
    const finalCollections = collectionsWithPreview.map((coll) => {
      const previewIcons = coll.previewIds.map((id: string) => projectsMap[id]?.iconUrl).filter(Boolean);
      return {
        id: coll.id,
        name: coll.name,
        description: coll.description,
        projectCount: Array.isArray(coll.projects) ? coll.projects.length : (coll.project_count ?? 0),
        iconUrl: coll.icon_url,
        isLocal: false,
        source: "modrinth",
        webUrl: `https://modrinth.com/collection/${coll.slug || coll.id}`,
        visibility: coll.status,
        created: coll.created,
        previewIcons: previewIcons.slice(0, 10)
      };
    });
    
    return NextResponse.json({
      collections: finalCollections,
      latestFeaturedMods
    });
  }
);
