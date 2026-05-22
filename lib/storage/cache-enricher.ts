import fs from "fs";
import path from "path";
import crypto from "crypto";
import { SOURCE_BASE } from "@/lib/core/constants";

const REMOTE_CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "remote-cache.json");

export function enrichUpdatesCache(options: {
  filePath: string;
  projectId?: string;
  iconUrl?: string;
  loader?: string;
  gameVersion?: string;
  sha1?: string;
  projectType?: string;
  title?: string;
}) {
  const { filePath, projectId, iconUrl, loader, gameVersion, sha1: providedSha1, projectType, title } = options;

  if (!filePath || !fs.existsSync(filePath)) return;
  if (!iconUrl && !projectId) return;

  try {
    // 1. Calculate SHA1 if not provided
    let sha1 = providedSha1;
    if (!sha1) {
      try {
        const buffer = fs.readFileSync(filePath);
        sha1 = crypto.createHash("sha1").update(buffer).digest("hex");
      } catch (err) {
        console.error("[cache-enricher] Failed to calculate SHA1 for:", filePath, err);
      }
    }

    // 2. Load the current remote cache
    let cache: { version: number; entries: Record<string, any> } = { version: 1, entries: {} };
    if (fs.existsSync(REMOTE_CACHE_FILE)) {
      try {
        cache = JSON.parse(fs.readFileSync(REMOTE_CACHE_FILE, "utf-8"));
      } catch (e) {
        console.error("[cache-enricher] Error loading remote cache file, resetting cache", e);
      }
    }

    if (!cache.entries) {
      cache.entries = {};
    }

    // 3. Prepare the result object
    const result = {
      path: filePath,
      status: "updated" as const,
      projectId: projectId || undefined,
      slug: path.basename(filePath, ".jar"),
      iconUrl: iconUrl || undefined,
      projectType: projectType || undefined,
      title: title || undefined,
    };

    const cachedAt = Date.now();
    const activeLoader = loader || "forge";
    const activeVersion = gameVersion || "1.20.1";

    // 4. Inject entries under combinations of keys to ensure high-hit probability
    const keysToUpdate: string[] = [];
    
    if (sha1) {
      keysToUpdate.push(`${sha1}-${activeLoader}-${activeVersion}`);
    }
    keysToUpdate.push(`${filePath}-${activeLoader}-${activeVersion}`);

    for (const key of keysToUpdate) {
      cache.entries[key] = {
        cachedAt,
        result,
      };
    }

    // 5. Ensure folder exists and write synchronously
    fs.mkdirSync(path.dirname(REMOTE_CACHE_FILE), { recursive: true });
    fs.writeFileSync(REMOTE_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    console.log(`[cache-enricher] Successfully cached remote metadata for ${path.basename(filePath)} (iconUrl: ${iconUrl})`);
  } catch (err) {
    console.error("[cache-enricher] Failed to enrich updates cache:", err);
  }
}
