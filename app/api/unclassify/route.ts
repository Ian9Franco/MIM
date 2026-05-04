/**
 * /api/unclassify — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Moves classified mods back to the user's Downloads folder.
 * Used when the user wants to re-classify or discard a mod.
 *
 * Body: { sourcePaths: string[] }
 *
 * Uses copy+delete for the same cross-drive reason as /api/classify.
 *
 * Changes from original:
 *   - Filename collision guard: if a file with the same name already exists in
 *     Downloads, the incoming file is renamed with a timestamp suffix instead of
 *     silently overwriting the existing one.
 *   - Missing source files accumulate in skipped[] and are returned in the body.
 *   - Structured console.warn/error with route prefix.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { sourcePaths } = await req.json();

    if (!sourcePaths || !Array.isArray(sourcePaths) || sourcePaths.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty sourcePaths array" },
        { status: 400 }
      );
    }

    const downloadsDir = path.join(os.homedir(), "Downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const moved: string[] = [];
    const skipped: string[] = [];

    for (const p of sourcePaths) {
      if (!fs.existsSync(p)) {
        console.warn(`[/api/unclassify] Source not found, skipping: ${p}`);
        skipped.push(p);
        continue;
      }

      const ext = path.extname(p);
      const base = path.basename(p, ext);
      let targetPath = path.join(downloadsDir, path.basename(p));

      // ── Collision guard ──────────────────────────────────────────────────────
      // If a file with the same name already exists in Downloads, append a
      // timestamp suffix to avoid silently overwriting it.
      if (fs.existsSync(targetPath)) {
        const timestamp = Date.now();
        targetPath = path.join(downloadsDir, `${base}_${timestamp}${ext}`);
        console.warn(
          `[/api/unclassify] Name collision — renaming to: ${path.basename(targetPath)}`
        );
      }

      // Cross-drive move (C: → D: or vice versa): copy then delete.
      fs.copyFileSync(p, targetPath);
      fs.unlinkSync(p);

      moved.push(targetPath);
    }

    return NextResponse.json({
      success: true,
      targetPaths: moved,
      ...(skipped.length > 0 && { skipped }),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/unclassify] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}