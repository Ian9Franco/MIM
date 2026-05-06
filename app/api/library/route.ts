/**
 * /api/library — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Devuelve todos los mods clasificados para una combinación de versión+loader.
 * Recorre el árbol de categorías en el SOURCE_BASE y escanea cada JAR.
 *
 * Query params: ?version=1.20.1&loader=forge
 * Respuesta: { library: LibraryEntry[] }
 *
 * Si la combinación version+loader no existe aún, devuelve library vacío (no error).
 * Si scanMod falla en un archivo (JAR corrupto o bloqueado), incluye la entrada
 * con meta de fallback para que el archivo siga apareciendo en la librería.
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
  projectType: "unknown",
  isCompatibleWithConnector: false,
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version");
  const loader = searchParams.get("loader");
  const project = searchParams.get("project");

  if (!version) {
    return NextResponse.json(
      { error: "Missing required query param: version" },
      { status: 400 }
    );
  }

  if (!project && !loader) {
    return NextResponse.json(
      { error: "Missing required query param: loader (when project is not specified)" },
      { status: 400 }
    );
  }

  if (loader && !isValidLoader(loader)) {
    return NextResponse.json(
      { error: `Invalid loader "${loader}". Must be one of: forge, neoforge, fabric` },
      { status: 400 }
    );
  }

  const loaderPath = project
    ? path.join(SOURCE_BASE, version, "_projects", project, "mods")
    : path.join(SOURCE_BASE, version, loader);

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