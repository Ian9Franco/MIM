/**
 * /api/library — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns every classified mod for a given version+loader combination.
 *
 * Query params: ?version=1.20.1&loader=forge
 *
 * Response:
 *   { library: LibraryEntry[] }
 *
 * Changes from original:
 *   - isValidLoader() validation added — rejects unknown loaders before hitting disk
 *   - `any[]` replaced with explicit LibraryEntry interface
 *   - scanMod error catch now logs fileName so failures are traceable
 *   - Early return on missing loaderPath wrapped in isValidLoader guard to avoid
 *     returning empty library for a typo'd loader silently
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE, CATEGORIES, isValidLoader } from "@/lib/constants";
import { scanMod } from "@/lib/scanner";
import type { ModMeta } from "@/lib/scanner";
import path from "path";
import fs from "fs";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LibraryEntry {
  path: string;
  fileName: string;
  category: string;
  sub: string;
  meta: ModMeta;
}

// Fallback meta when scanMod throws (file unreadable / not a valid JAR)
const UNKNOWN_META: ModMeta = {
  modId: "unknown",
  modName: "unknown",
  modVersion: "unknown",
  gameVersion: "unknown",
  loader: "unknown",
  isCompatibleWithConnector: false,
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version");
  const loader = searchParams.get("loader");

  // ── Validate params ──────────────────────────────────────────────────────────
  if (!version || !loader) {
    return NextResponse.json(
      { error: "Missing required query params: version, loader" },
      { status: 400 }
    );
  }

  // Validate loader before touching disk — avoids returning empty library
  // for a typo'd loader with no indication of what went wrong.
  if (!isValidLoader(loader)) {
    return NextResponse.json(
      { error: `Invalid loader "${loader}". Must be one of: forge, neoforge, fabric` },
      { status: 400 }
    );
  }

  const loaderPath = path.join(SOURCE_BASE, version, loader);

  // Version+loader combination doesn't exist yet — not an error, just empty
  if (!fs.existsSync(loaderPath)) {
    return NextResponse.json({ library: [] });
  }

  // ── Walk the category tree ────────────────────────────────────────────────────
  const library: LibraryEntry[] = [];

  for (const category of CATEGORIES) {
    const catPath = path.join(loaderPath, category);
    if (!fs.existsSync(catPath)) continue;

    for (const sub of fs.readdirSync(catPath)) {
      const subPath = path.join(catPath, sub);
      if (!fs.statSync(subPath).isDirectory()) continue;

      for (const file of fs.readdirSync(subPath)) {
        if (!file.endsWith(".jar")) continue;

        const filePath = path.join(subPath, file);
        let meta: ModMeta = UNKNOWN_META;

        try {
          meta = scanMod(filePath);
        } catch {
          // JAR may be corrupted or locked — include the entry with fallback meta
          // so the library still shows the file exists.
          console.warn(`[/api/library] scanMod failed for: ${file}`);
        }

        library.push({ path: filePath, fileName: file, category, sub, meta });
      }
    }
  }

  return NextResponse.json({ library });
}