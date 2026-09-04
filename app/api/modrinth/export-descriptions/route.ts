import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { mimDB, type ModDescription } from "@/lib/storage/indexeddb";
import { storageMigration } from "@/lib/storage/storage-migration";
import { getApiKey } from "@/lib/core/settings";

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

const postBodySchema = z.object({
  mods: z.array(z.any()).min(1, "Missing or empty mods array"),
  loader: z.string().optional(),
  gameVersion: z.string().optional(),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    bodySchema: postBodySchema,
  },
  async ({ body }) => {
    try {
      const { mods, loader, gameVersion } = body;

      const headers: Record<string, string> = {
        "User-Agent": "MIM-App/1.0 (contact@mim.local)",
      };
      const apiKey = getApiKey("modrinth");
      if (apiKey) {
        headers["Authorization"] = apiKey;
      }

      // Initialize IndexedDB and migrate if needed
      await mimDB.init();
      
      // Check if migration is needed and perform it
      const migrationStatus = await storageMigration.getMigrationStatus();
      if (migrationStatus.needsMigration) {
        console.log('[export-descriptions] Performing migration to IndexedDB...');
        const migrationResult = await storageMigration.migrateAll();
        if (migrationResult.errors.length > 0) {
          console.warn('[export-descriptions] Migration completed with errors:', migrationResult.errors);
        }
      }

      const fetchDescription = async (mod: ModCheckInput): Promise<ModDescriptionResult> => {
        // Try to get from IndexedDB first
        const cached = await mimDB.getDescription(mod.fileName);
        if (cached) {
          return {
            fileName: cached.fileName,
            modName: cached.modName,
            projectId: cached.projectId,
            title: cached.title,
            description: cached.description,
            body: cached.body,
            url: cached.url,
            status: cached.status,
          };
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

            // Save to IndexedDB for future use
            const description: ModDescription = {
              fileName: result.fileName,
              modName: result.modName,
              projectId: result.projectId,
              title: result.title,
              description: result.description,
              body: result.body,
              url: result.url,
              status: result.status,
              lastUpdated: Date.now()
            };
            await mimDB.setDescription(description);
          }

          return result;
        } catch (e) {
          result.status = "error";
          
          // Save error status to cache to avoid repeated failed requests
          const errorDescription: ModDescription = {
            fileName: result.fileName,
            modName: result.modName,
            status: "error",
            lastUpdated: Date.now()
          };
          await mimDB.setDescription(errorDescription);
          
          return result;
        }
      };

      const allResults: ModDescriptionResult[] = [];
      for (const batch of chunkArray(mods as ModCheckInput[], CONCURRENCY_LIMIT)) {
        const batchResults = await Promise.all(batch.map(fetchDescription));
        allResults.push(...batchResults);
      }

      // Clean up expired cache entries periodically
      if (Math.random() < 0.1) { // 10% chance to clean up
        try {
          const cleaned = await mimDB.clearExpiredCache();
          if (cleaned > 0) {
            console.log(`[export-descriptions] Cleaned ${cleaned} expired cache entries`);
          }
        } catch (e) {
          console.warn('[export-descriptions] Failed to clean expired cache:', e);
        }
      }

      return NextResponse.json({ 
        message: "Descriptions processed successfully",
        count: allResults.length,
        data: allResults 
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/modrinth/export-descriptions] Unhandled error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

// GET endpoint for migration status and stats
export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
  },
  async () => {
    try {
      await mimDB.init();
      
      const migrationStatus = await storageMigration.getMigrationStatus();
      const storageStats = await mimDB.getStorageStats();

      return NextResponse.json({
        migration: migrationStatus,
        storage: storageStats,
        indexedDBAvailable: true
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/modrinth/export-descriptions] GET error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
