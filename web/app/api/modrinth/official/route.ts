import { NextResponse } from "next/server";

export async function GET() {
  try {
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

    const data = await res.json();
    
    // Slice first 10 project IDs to get preview icons
    const allProjectIds = new Set<string>();
    const collectionsWithPreview = data.map((coll: any) => {
      const pIds = coll.projects || [];
      const previewIds = pIds.slice(0, 10);
      previewIds.forEach((id: string) => allProjectIds.add(id));
      return { ...coll, previewIds };
    });
    
    const idArray = Array.from(allProjectIds);
    const projectsMap: Record<string, any> = {};
    
    if (idArray.length > 0) {
      const resProjects = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(idArray)}`, {
        headers
      });
      if (resProjects.ok) {
        const projects = await resProjects.json();
        projects.forEach((p: any) => {
          projectsMap[p.id] = { iconUrl: p.icon_url };
        });
      }
    }
    
    const finalCollections = collectionsWithPreview.map((coll: any) => {
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
    
    // Sort collections by creation date descending
    finalCollections.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    return NextResponse.json({ collections: finalCollections });
  } catch (err: any) {
    console.error("[Modrinth Official Proxy Fail]:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch collections" }, { status: 500 });
  }
}
