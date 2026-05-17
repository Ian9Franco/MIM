import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.modrinth.com/v3/user/modrinth/collections", {
      headers: {
        "User-Agent": "MIM-App/1.0 (contact@mim.local)",
        "Content-Type": "application/json"
      },
      next: { revalidate: 3600 } // Cache the response for 1 hour to respect rate-limiting
    });

    if (!res.ok) {
      console.error("[Modrinth Official Proxy] Modrinth API returned error status:", res.status);
      return NextResponse.json({ error: `Modrinth API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    
    // Extract first 10 project IDs from each collection to show previews
    const allProjectIds = new Set<string>();
    const collectionsWithPreview = data.map((coll: any) => {
      const pIds = coll.projects || [];
      const previewIds = pIds.slice(0, 20);
      previewIds.forEach((id: string) => allProjectIds.add(id));
      return { ...coll, previewIds };
    });
    
    // Fetch project details for all preview IDs
    const idArray = Array.from(allProjectIds);
    let projectsMap: Record<string, any> = {};
    
    if (idArray.length > 0) {
      const resProjects = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(idArray)}`, {
        headers: { "User-Agent": "MIM-App/1.0 (contact@mim.local)" }
      });
      if (resProjects.ok) {
        const projects = await resProjects.json();
        projects.forEach((p: any) => {
          projectsMap[p.id] = { iconUrl: p.icon_url };
        });
      }
    }
    
    // Map icons back to collections
    const finalCollections = collectionsWithPreview.map((coll: any) => {
      const previewIcons = coll.previewIds.map((id: string) => projectsMap[id]?.iconUrl).filter(Boolean);
      return {
        ...coll,
        previewIcons: previewIcons.slice(0, 20)
      };
    });
    
    return NextResponse.json(finalCollections);
  } catch (err: any) {
    console.error("[Modrinth Official Proxy] Fetch failed:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch official collections" }, { status: 500 });
  }
}
