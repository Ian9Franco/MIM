/**
 * /api/classify — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Moves one or more mod files from Downloads into the categorized source tree.
 *
 * Body:
 *   sourcePaths: string[]      — array of absolute paths (preferred)
 *   sourcePath?: string        — single path (legacy, still supported)
 *   targetCategory: string     — format: ".essential\fauna" (backslash delimiter)
 *   version: string            — e.g. "1.20.1"
 *   modloader: string          — e.g. "forge"
 *
 * Uses copy+delete instead of fs.rename because rename fails cross-drive
 * on Windows (C: → D:).
 *
 * Changes from original:
 *   - targetCategory parsing replaced: split("\\") → indexOf + slice with
 *     explicit guard when the separator is absent (avoids silent empty-string split)
 *   - isValidCategory() from constants used instead of manual double-check
 *   - Missing source files accumulate in skipped[] instead of silently continuing;
 *     skipped paths are returned in the response body for client awareness
 *   - Structured console.warn/error with route prefix
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE, isValidCategory } from "@/lib/constants";
import { getProjectSubcategories } from "@/lib/projectSubcategories";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { sourcePath, sourcePaths, targetCategory, version, modloader, projectName } =
      await req.json();

    // Support both single-path (legacy) and batch array
    const pathsToProcess: string[] =
      sourcePaths ?? (sourcePath ? [sourcePath] : []);

    // ── Validate required fields ───────────────────────────────────────────────
    if (
      pathsToProcess.length === 0 ||
      !targetCategory ||
      !version ||
      !modloader
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: sourcePaths (or sourcePath), targetCategory, version, modloader",
        },
        { status: 400 }
      );
    }

    // ── Parse targetCategory ───────────────────────────────────────────────────
    // Format is always "category\sub" (backslash delimiter).
    // Using indexOf+slice instead of split("\\") because split produces ["category", ""]
    // when there is no backslash, hiding the malformed input instead of rejecting it.
    const sepIdx = (targetCategory as string).indexOf("\\");
    if (sepIdx === -1) {
      return NextResponse.json(
        {
          error: `Invalid targetCategory format. Expected "category\\sub", received: "${targetCategory}"`,
        },
        { status: 400 }
      );
    }

    const category = (targetCategory as string).slice(0, sepIdx);
    const sub = (targetCategory as string).slice(sepIdx + 1);

    // ── Validate category+sub ──────────────────────────────────────────────────
    // Primero verificar contra las subcategorías por defecto
    let isValid = isValidCategory(category, sub);
    
    // Si no es válida por defecto, verificar contra las subcategorías del proyecto
    if (!isValid && projectName) {
      const projectSubs = getProjectSubcategories(projectName);
      isValid = projectSubs[category]?.includes(sub) ?? false;
    }
    
    if (!isValid) {
      return NextResponse.json(
        {
          error: `Invalid category/sub combination: "${category}" / "${sub}"`,
        },
        { status: 400 }
      );
    }

    const moved: string[] = [];
    const skipped: string[] = [];

    // Import scanner for on-the-fly type detection
    const { scanMod } = require("@/lib/scanner");

    for (const p of pathsToProcess) {
      if (!fs.existsSync(p)) {
        console.warn(`[/api/classify] Source not found, skipping: ${p}`);
        skipped.push(p);
        continue;
      }

      // ── Determine Target Path ───────────────────────────────────────────────
      let finalTargetDir = "";
      
      try {
        const meta = scanMod(p);
        if (meta.projectType === "resourcepack") {
          if (!projectName) throw new Error("projectName required for resourcepack classification");
          finalTargetDir = path.join(SOURCE_BASE, version, "_projects", projectName, "resourcepacks");
        } else if (meta.projectType === "shader") {
          if (!projectName) throw new Error("projectName required for shader classification");
          finalTargetDir = path.join(SOURCE_BASE, version, "_projects", projectName, "shaderpacks");
        } else if (meta.projectType === "datapack") {
          if (!projectName) throw new Error("projectName required for datapack classification");
          finalTargetDir = path.join(SOURCE_BASE, version, "_projects", projectName, "datapacks");
        } else {
          // It's a mod (or unknown) — use standard library path
          finalTargetDir = path.join(SOURCE_BASE, version, modloader, category, sub);
        }
      } catch (e) {
        console.warn(`[/api/classify] Scan failed, falling back to mod path: ${p}`, e);
        finalTargetDir = path.join(SOURCE_BASE, version, modloader, category, sub);
      }

      fs.mkdirSync(finalTargetDir, { recursive: true });
      const fileName = path.basename(p);
      const targetPath = path.join(finalTargetDir, fileName);

      // If the file is already exactly where it's supposed to be, skip to avoid truncation/deletion
      if (path.resolve(p) === path.resolve(targetPath)) {
        moved.push(targetPath);
        continue;
      }

      // Cross-drive move: copy first, then delete source.
      // fs.rename throws EXDEV when src and dest are on different drives (C: → D:).
      fs.copyFileSync(p, targetPath);
      fs.unlinkSync(p);

      moved.push(targetPath);
    }

    return NextResponse.json({
      success: true,
      targetPaths: moved,
      // Only include skipped key when there are entries — cleaner response body
      ...(skipped.length > 0 && { skipped }),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/classify] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}