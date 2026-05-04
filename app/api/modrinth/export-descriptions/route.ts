import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MODRINTH_API = "https://api.modrinth.com/v2";
const CONCURRENCY_LIMIT = 5;

interface ModCheckInput {
  path: string;
  fileName: string;
  meta?: {
    modName?: string;
    modId?: string;
    modVersion?: string;
  };
}

interface ModDescriptionResult {
  fileName: string;
  modName: string;
  projectId?: string;
  title?: string;
  description?: string;
  body?: string;
  url?: string;
  status: "success" | "unknown" | "error";
}

interface ModrinthHit {
  title: string;
  project_id: string;
}

function chunkArray<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const { mods, loader, gameVersion } = await req.json();

    if (!mods || !Array.isArray(mods) || mods.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty mods array" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "User-Agent": "MIM-App/1.0 (contact@mim.local)",
    };
    if (process.env.MODRINTH_API_KEY) {
      headers["Authorization"] = process.env.MODRINTH_API_KEY;
    }

    const outputPath = path.join(process.cwd(), "mod_descriptions.json");
    let existingData: ModDescriptionResult[] = [];
    try {
      const fileContent = await fs.readFile(outputPath, "utf8");
      existingData = JSON.parse(fileContent);
    } catch (e) {
      // File doesn't exist or is invalid
    }

    const existingMap = new Map<string, ModDescriptionResult>();
    for (const item of existingData) {
      existingMap.set(item.fileName, item);
    }

    const fetchDescription = async (mod: ModCheckInput): Promise<ModDescriptionResult> => {
      if (existingMap.has(mod.fileName)) {
        return existingMap.get(mod.fileName)!;
      }

      const nameToSearch =
        mod.meta?.modName && mod.meta.modName !== "unknown"
          ? mod.meta.modName
          : mod.fileName.replace(".jar", "");

      const result: ModDescriptionResult = {
        fileName: mod.fileName,
        modName: nameToSearch,
        status: "unknown",
      };

      try {
        let projectId: string | null = null;
        let projectData: any = null;

        // Step 1: Lookup by modId
        if (mod.meta?.modId && mod.meta.modId !== "unknown") {
          const res = await fetch(
            `${MODRINTH_API}/project/${encodeURIComponent(mod.meta.modId)}`,
            { headers }
          );
          if (res.ok) {
            projectData = await res.json();
            projectId = projectData.id;
          }
        }

        // Step 2: Search by name if not found
        if (!projectId) {
          const facets = [];
          if (loader) facets.push([`categories:${loader}`]);
          if (gameVersion) facets.push([`versions:${gameVersion}`]);
          
          const facetsStr = facets.length > 0 ? `&facets=${encodeURIComponent(JSON.stringify(facets))}` : "";

          const res = await fetch(
            `${MODRINTH_API}/search?query=${encodeURIComponent(nameToSearch)}${facetsStr}&limit=3`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.hits?.length > 0) {
              const exactMatch = (data.hits as ModrinthHit[]).find(
                (h) => h.title.toLowerCase() === nameToSearch.toLowerCase()
              );
              projectId = exactMatch
                ? exactMatch.project_id
                : (data.hits as ModrinthHit[])[0].project_id;
            }
          }

          // If we found a project ID via search, fetch its full details
          if (projectId) {
            const projRes = await fetch(`${MODRINTH_API}/project/${projectId}`, { headers });
            if (projRes.ok) {
              projectData = await projRes.json();
            }
          }
        }

        if (projectData) {
          result.projectId = projectData.id;
          result.title = projectData.title;
          result.description = projectData.description;
          
          let cleanBody = projectData.body || "";
          cleanBody = cleanBody.replace(/!\[.*?\]\(.*?\)/g, ""); // Remove markdown images
          cleanBody = cleanBody.replace(/<[^>]*>/g, ""); // Remove HTML tags
          cleanBody = cleanBody.replace(/\n\s*\n/g, "\n\n"); // Remove multiple empty lines
          result.body = cleanBody.trim();
          
          result.url = `https://modrinth.com/mod/${projectData.slug}`;
          result.status = "success";
        }

        return result;
      } catch (e) {
        result.status = "error";
        return result;
      }
    };

    const allResults: ModDescriptionResult[] = [];
    for (const batch of chunkArray(mods as ModCheckInput[], CONCURRENCY_LIMIT)) {
      const batchResults = await Promise.all(batch.map(fetchDescription));
      allResults.push(...batchResults);
    }

    // Merge into existing data map to avoid duplicates
    for (const res of allResults) {
      existingMap.set(res.fileName, res);
    }
    const updatedData = Array.from(existingMap.values());

    // Save the combined list to the JSON file
    await fs.writeFile(outputPath, JSON.stringify(updatedData, null, 2));

    return NextResponse.json({ 
      message: "Descriptions exported successfully",
      savedPath: outputPath,
      count: allResults.length,
      data: allResults 
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/export-descriptions] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
