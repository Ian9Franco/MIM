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
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { sourcePath, sourcePaths, targetCategory, version, modloader } =
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

    // ── Validate category+sub against the manifest ────────────────────────────
    // isValidCategory() is the shared SSOT from constants — prevents path traversal
    // by rejecting any combination not explicitly listed in SUBCATEGORIES.
    if (!isValidCategory(category, sub)) {
      return NextResponse.json(
        {
          error: `Invalid category/sub combination: "${category}" / "${sub}"`,
        },
        { status: 400 }
      );
    }

    // ── Create target directory ────────────────────────────────────────────────
    // path.join handles OS separators correctly; category already contains "."
    const targetDir = path.join(SOURCE_BASE, version, modloader, category, sub);
    fs.mkdirSync(targetDir, { recursive: true });

    const moved: string[] = [];
    const skipped: string[] = [];

    for (const p of pathsToProcess) {
      if (!fs.existsSync(p)) {
        // Accumulate missing files instead of silently continuing — client
        // can show a warning for each skipped path.
        console.warn(`[/api/classify] Source not found, skipping: ${p}`);
        skipped.push(p);
        continue;
      }

      const fileName = path.basename(p);
      const targetPath = path.join(targetDir, fileName);

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