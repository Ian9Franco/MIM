/**
 * MIM — Security Scan API
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/security/scan
 *
 * Performs behavioral risk analysis on JAR and ZIP files using the Threat
 * Detection Engine (bytecode patterns + VirusTotal hash lookup).
 * Both .jar and .zip are ZIP containers and can be scanned.
 *
 * Body (single file):
 *   { "filePath": "D:\\.mine\\source\\...\\mod.jar" }
 *
 * Body (batch):
 *   { "filePaths": ["path1.jar", "path2.zip", ...] }
 *
 * GET /api/security/scan?project=<name>&version=<ver>&loader=<ldr>
 *   Returns all scannable file paths for a project so the UI can do a
 *   single batch scan call instead of N individual calls.
 *
 * Response (batch):
 *   { success: true, batch: true, results: [{fileName, filePath, result}...], worstResult }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { scanSecurity, scanSecurityBatch } from "@/lib/security/security-scanner";
import { getSettings } from "@/lib/core/settings";
import { SOURCE_BASE, CATEGORIES } from "@/lib/core/constants";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

// ── Allowed extensions ───────────────────────────────────────────────────────

const SCANNABLE_EXTENSIONS = [".jar", ".zip"];

function isScannableFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SCANNABLE_EXTENSIONS.includes(ext);
}

// ── Request Validation ──────────────────────────────────────────────────────────

interface SingleScanRequest {
  filePath: string;
  localOnly?: boolean;
}

interface BatchScanRequest {
  filePaths: string[];
  localOnly?: boolean;
}

function isValidRequest(body: unknown): body is SingleScanRequest | BatchScanRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.filePath === "string") return true;
  if (Array.isArray(b.filePaths) && b.filePaths.every(p => typeof p === "string")) return true;
  return false;
}

// ── Path Security ───────────────────────────────────────────────────────────────

function isAllowedPath(filePath: string): boolean {
  const settings = getSettings();
  const allowedRoots = [
    settings.sourceBase,
    settings.buildsBase,
    settings.downloadsPath,
    settings.minecraftPath,   // resourcepacks, shaderpacks
    settings.stagingPath,     // staging fallback for resourcepacks/shaderpacks
    path.join(process.cwd(), "public"),
  ];

  const normalizedPath = path.normalize(filePath).toLowerCase();
  return allowedRoots.some(root => {
    const normalizedRoot = path.normalize(root).toLowerCase();
    return normalizedPath.startsWith(normalizedRoot);
  });
}

// ── GET Handler — List all scannable files for a project ────────────────────────

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const version = searchParams.get("version");
  const loader  = searchParams.get("loader");

  // Health-check mode (no params)
  if (!project && !version) {
    return NextResponse.json({
      status: "Security Scan API ready",
      scannableExtensions: SCANNABLE_EXTENSIONS,
      endpoints: {
        GET:  "/api/security/scan?project=&version=&loader= — List all scannable files",
        POST: "/api/security/scan — Scan single file or batch",
      },
    });
  }

  if (!project || !version) {
    return NextResponse.json(
      { success: false, error: "project and version are required" },
      { status: 400 }
    );
  }

  const settings = getSettings();
  const scannable: { fileName: string; filePath: string; type: "jar" | "zip"; assetType: string }[] = [];

  const isMimu = project === "MIMU";

  if (isMimu) {
    console.log(`[/api/security/scan] MIMU mode: Collecting files from game folder`);
    
    // ── 1. Game mods (.minecraft/mods) ──────────────────────
    const gameModsPath = settings.minecraftPath ? path.join(settings.minecraftPath, "mods") : "";
    if (gameModsPath && fs.existsSync(gameModsPath)) {
      for (const file of fs.readdirSync(gameModsPath)) {
        if (!file.endsWith(".jar")) continue;
        scannable.push({ fileName: file, filePath: path.join(gameModsPath, file), type: "jar", assetType: "mod" });
      }
    }

    // ── 2. Game Resource Packs (.minecraft/resourcepacks) ──────────────────
    const gameRpPath = settings.minecraftPath ? path.join(settings.minecraftPath, "resourcepacks") : "";
    if (gameRpPath && fs.existsSync(gameRpPath)) {
      for (const file of fs.readdirSync(gameRpPath)) {
        if (!file.endsWith(".zip") && !file.endsWith(".jar")) continue;
        const fp = path.join(gameRpPath, file);
        if (fs.statSync(fp).isFile()) {
          scannable.push({ fileName: file, filePath: fp, type: "zip", assetType: "resourcepack" });
        }
      }
    }

    // ── 3. Game Datapacks (.minecraft/saves/*/datapacks) ──────────────────
    const savesPath = settings.minecraftPath ? path.join(settings.minecraftPath, "saves") : "";
    if (savesPath && fs.existsSync(savesPath)) {
      try {
        const worlds = fs.readdirSync(savesPath);
        for (const world of worlds) {
          const worldPath = path.join(savesPath, world);
          if (!fs.statSync(worldPath).isDirectory()) continue;
          
          const dpPath = path.join(worldPath, "datapacks");
          if (fs.existsSync(dpPath)) {
            for (const file of fs.readdirSync(dpPath)) {
              if (!file.endsWith(".zip") && !file.endsWith(".jar")) continue;
              const fp = path.join(dpPath, file);
              if (fs.statSync(fp).isFile()) {
                scannable.push({ 
                  fileName: `${file} (Mundo: ${world})`, 
                  filePath: fp, 
                  type: "zip", 
                  assetType: "datapack" 
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not read saves directory for datapacks:", e);
      }
    }
  } else {
    // ── 1. Project mods (JARs from _projects/<name>/mods) ──────────────────────
    const projectModsPath = path.join(settings.sourceBase, "_projects", project, "mods");
    if (fs.existsSync(projectModsPath)) {
      for (const cat of CATEGORIES) {
        const catPath = path.join(projectModsPath, cat);
        if (!fs.existsSync(catPath)) continue;
        for (const sub of fs.readdirSync(catPath)) {
          const subPath = path.join(catPath, sub);
          if (!fs.statSync(subPath).isDirectory()) continue;
          for (const file of fs.readdirSync(subPath)) {
            if (!file.endsWith(".jar")) continue;
            scannable.push({ fileName: file, filePath: path.join(subPath, file), type: "jar", assetType: "mod" });
          }
        }
      }
    }

    // ── 2. Version+loader shared mods (JARs) ───────────────────────────────────
    if (loader) {
      const loaderPath = path.join(settings.sourceBase, version, loader);
      if (fs.existsSync(loaderPath)) {
        for (const cat of CATEGORIES) {
          const catPath = path.join(loaderPath, cat);
          if (!fs.existsSync(catPath)) continue;
          for (const sub of fs.readdirSync(catPath)) {
            const subPath = path.join(catPath, sub);
            if (!fs.statSync(subPath).isDirectory()) continue;
            for (const file of fs.readdirSync(subPath)) {
              if (!file.endsWith(".jar")) continue;
              const fp = path.join(subPath, file);
              if (!scannable.some(s => s.filePath === fp)) {
                scannable.push({ fileName: file, filePath: fp, type: "jar", assetType: "mod" });
              }
            }
          }
        }
      }
    }

    // ── 3. Resource Packs — SOURCE_BASE/_projects/<name>/resourcepacks ──────────
    const rpDir = path.join(settings.sourceBase, "_projects", project, "resourcepacks");
    if (fs.existsSync(rpDir)) {
      for (const file of fs.readdirSync(rpDir)) {
        if (!file.endsWith(".zip") && !file.endsWith(".jar")) continue;
        const fp = path.join(rpDir, file);
        if (fs.statSync(fp).isFile()) {
          scannable.push({ fileName: file, filePath: fp, type: "zip", assetType: "resourcepack" });
        }
      }
    }

    // ── 5. Datapacks — SOURCE_BASE/_projects/<name>/datapacks/ ─────────────────
    const datapackDir = path.join(settings.sourceBase, "_projects", project, "datapacks");
    if (fs.existsSync(datapackDir)) {
      for (const file of fs.readdirSync(datapackDir)) {
        if (!file.endsWith(".zip") && !file.endsWith(".jar")) continue;
        const fp = path.join(datapackDir, file);
        if (fs.statSync(fp).isFile()) {
          scannable.push({ fileName: file, filePath: fp, type: "zip", assetType: "datapack" });
        }
      }
    }
  }

  // ── 4. Shaders — .minecraft/shaderpacks (or staging fallback) ───────────────
  const shaderDir = fs.existsSync(settings.minecraftPath)
    ? path.join(settings.minecraftPath, "shaderpacks")
    : path.join(settings.stagingPath, "shaderpacks");

  if (fs.existsSync(shaderDir)) {
    for (const file of fs.readdirSync(shaderDir)) {
      if (!file.endsWith(".zip") && !file.endsWith(".jar")) continue;
      const fp = path.join(shaderDir, file);
      if (fs.statSync(fp).isFile()) {
        scannable.push({ fileName: file, filePath: fp, type: "zip", assetType: "shader" });
      }
    }
  }

  // ── 6. Newly downloaded files waiting in downloadsPath (Descargas) ─────────
  if (settings.downloadsPath && fs.existsSync(settings.downloadsPath)) {
    try {
      const files = fs.readdirSync(settings.downloadsPath);
      for (const file of files) {
        if (!file.endsWith(".jar") && !file.endsWith(".zip")) continue;
        const fp = path.join(settings.downloadsPath, file);
        if (fs.statSync(fp).isFile()) {
          if (!scannable.some(s => s.filePath === fp)) {
            scannable.push({
              fileName: `${file} (Descargas)`,
              filePath: fp,
              type: file.endsWith(".jar") ? "jar" : "zip",
              assetType: file.endsWith(".jar") ? "mod" : "zip"
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not read downloads directory for scanning:", e);
    }
  }

  // ── 7. Staging files (temporary/incoming files) ───────────────────────────
  if (settings.stagingPath && fs.existsSync(settings.stagingPath)) {
    try {
      const scanStagingRecursive = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const resPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanStagingRecursive(resPath);
          } else if (entry.isFile()) {
            if (!entry.name.endsWith(".jar") && !entry.name.endsWith(".zip")) continue;
            if (!scannable.some(s => s.filePath === resPath)) {
              scannable.push({
                fileName: `${entry.name} (Staging)`,
                filePath: resPath,
                type: entry.name.endsWith(".jar") ? "jar" : "zip",
                assetType: entry.name.endsWith(".jar") ? "mod" : "zip"
              });
            }
          }
        }
      };
      scanStagingRecursive(settings.stagingPath);
    } catch (e) {
      console.warn("Could not read staging directory for scanning:", e);
    }
  }

  return NextResponse.json({ success: true, scannable, total: scannable.length });

  }
);

// ── POST Handler ─────────────────────────────────────────────────────────────────

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const body = await req.json();

    if (!isValidRequest(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Provide 'filePath' or 'filePaths'" },
        { status: 400 }
      );
    }

    // Handle batch scan
    if ("filePaths" in body) {
      const invalidPaths = body.filePaths.filter(p => !isAllowedPath(p));
      if (invalidPaths.length > 0) {
        return NextResponse.json(
          { success: false, error: "Path traversal detected", invalidPaths },
          { status: 403 }
        );
      }

      const nonScannable = body.filePaths.filter(p => !isScannableFile(p));
      if (nonScannable.length > 0) {
        return NextResponse.json(
          { success: false, error: `Only ${SCANNABLE_EXTENSIONS.join(", ")} files can be scanned`, nonScannable },
          { status: 400 }
        );
      }

      const nonExistent = body.filePaths.filter(p => !fs.existsSync(p));
      if (nonExistent.length > 0) {
        return NextResponse.json(
          { success: false, error: "Files not found", nonExistent },
          { status: 404 }
        );
      }

      const batchResult = await scanSecurityBatch(body.filePaths, body.localOnly);
      return NextResponse.json({ success: true, batch: true, results: batchResult });
    }

    // Handle single file scan
    const filePath = (body as SingleScanRequest).filePath;

    if (!isAllowedPath(filePath)) {
      return NextResponse.json(
        { success: false, error: "Access denied: Path outside allowed directories" },
        { status: 403 }
      );
    }

    if (!isScannableFile(filePath)) {
      return NextResponse.json(
        { success: false, error: `Only ${SCANNABLE_EXTENSIONS.join(", ")} files can be scanned` },
        { status: 400 }
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "File not found", path: filePath },
        { status: 404 }
      );
    }

    console.log(`[/api/security/scan] Scanning: ${path.basename(filePath)} (LocalOnly: ${!!body.localOnly})`);
    const result = await scanSecurity(filePath, body.localOnly);
    console.log(`[/api/security/scan] Score: ${result.riskScore} (${result.riskLevel})`);

    return NextResponse.json({ success: true, batch: false, result });

  } catch (error) {
    console.error("[/api/security/scan] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }

  }
);
