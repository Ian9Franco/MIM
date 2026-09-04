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
import { SOURCE_BASE, CATEGORIES, isValidLoader } from "@/lib/core/constants";
import { scanMod } from "@/lib/scanner";
import type { ModMeta } from "@/lib/scanner";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";
import os from "os";
import AdmZip from "adm-zip";
import { withApiGuard } from "@/lib/apiGuard";

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

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

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
    ? path.join(SOURCE_BASE, "_projects", project, "mods")
    : path.join(SOURCE_BASE, version, loader!);

  // Helper to enrich meta from history
  function enrichMetaFromHistory(meta: ModMeta, fileName: string, history: any[]) {
    const hEntry = history.find((h: any) => h.fileName === fileName);
    if (hEntry) {
      if (!meta.iconBase64 && hEntry.iconUrl) meta.iconBase64 = hEntry.iconUrl;
      if (meta.modName === "unknown" && hEntry.title) meta.modName = hEntry.title;
      if (meta.gameVersion === "unknown" && hEntry.gameVersion) meta.gameVersion = hEntry.gameVersion;
      if (meta.loader === "unknown" && hEntry.loader) meta.loader = hEntry.loader;
      if (meta.projectType === "unknown" && hEntry.projectType) meta.projectType = hEntry.projectType;
      // Also enrich modId if it's unknown or just the filename, to allow Modrinth API to find it
      if ((meta.modId === "unknown" || meta.modId === fileName) && hEntry.projectId) meta.modId = hEntry.projectId;
    }
  }

  const HISTORY_FILE = path.join(SOURCE_BASE, ".mim-index", "download-history.json");
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try { 
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")); 
    } catch (err) {
      console.warn("[/api/library] Corrupted download-history.json, using empty array:", err);
    }
  }

  const library: LibraryEntry[] = [];

  // Version+loader combination doesn't exist yet — not an error, just empty
  if (fs.existsSync(loaderPath)) {
    // ── Walk the category tree ────────────────────────────────────────────────────
    for (const category of CATEGORIES) {
      const catPath = path.join(loaderPath, category);
      if (!fs.existsSync(catPath)) continue;

      for (const sub of fs.readdirSync(catPath)) {
        const subPath = path.join(catPath, sub);
        if (!fs.statSync(subPath).isDirectory()) continue;

        for (const file of fs.readdirSync(subPath)) {
          if (!file.endsWith(".jar")) continue;

          const filePath = path.join(subPath, file);
          let meta: ModMeta = { ...UNKNOWN_META };

          try {
            meta = scanMod(filePath);
          } catch {
            // JAR may be corrupted or locked — include the entry with fallback meta
            // so the library still shows the file exists.
            console.warn(`[/api/library] scanMod failed for: ${file}`);
          }

          enrichMetaFromHistory(meta, file, history);
          library.push({ path: filePath, fileName: file, category, sub, meta });
        }
      }
    }
  }

  // ── Read Resource Packs ──────────────────────────────────────────────────────
  const resourcePacksPath = project
    ? path.join(SOURCE_BASE, "_projects", project, "resourcepacks")
    : null;

  if (resourcePacksPath && fs.existsSync(resourcePacksPath)) {
    for (const file of fs.readdirSync(resourcePacksPath)) {
      if (!file.endsWith(".zip")) continue;

      const filePath = path.join(resourcePacksPath, file);
      let iconBase64 = undefined;

      try {
        const zip = new AdmZip(filePath);
        const packPng = zip.getEntry("pack.png");
        if (packPng) {
          const buffer = packPng.getData();
          iconBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
        }
      } catch (e) {
        console.warn(`[/api/library] Failed to read pack.png from ${file}`);
      }

      const meta: ModMeta = {
        modId: file, // Default to file name, will fallback to search
        modName: file.replace(".zip", ""),
        modVersion: "unknown",
        gameVersion: "unknown",
        loader: "unknown",
        projectType: "resourcepack",
        isCompatibleWithConnector: false,
        iconBase64,
      };

      enrichMetaFromHistory(meta, file, history);

      library.push({ 
        path: filePath, 
        fileName: file, 
        category: "resourcepacks", 
        sub: "", 
        meta 
      });
    }
  }

  // ── Read Datapacks ──────────────────────────────────────────────────────────
  const datapacksPath = project
    ? path.join(SOURCE_BASE, "_projects", project, "datapacks")
    : null;

  if (datapacksPath && fs.existsSync(datapacksPath)) {
    for (const file of fs.readdirSync(datapacksPath)) {
      if (!file.endsWith(".zip")) continue;

      const filePath = path.join(datapacksPath, file);
      let meta: ModMeta;
      
      try {
        meta = scanMod(filePath);
      } catch {
        meta = {
          modId: file,
          modName: file.replace(".zip", ""),
          modVersion: "unknown",
          gameVersion: "unknown",
          loader: "unknown",
          projectType: "datapack",
          isCompatibleWithConnector: false,
        };
      }

      enrichMetaFromHistory(meta, file, history);

      library.push({ 
        path: filePath, 
        fileName: file, 
        category: "datapacks", 
        sub: "", 
        meta 
      });
    }
  }

  // ── Read Shaders ────────────────────────────────────────────────────────────
  const shaderPacksPath = project
    ? path.join(SOURCE_BASE, "_projects", project, "shaderpacks")
    : path.join(getSettings().minecraftPath || path.join(os.homedir(), "AppData", "Roaming", ".minecraft"), "shaderpacks");

  if (fs.existsSync(shaderPacksPath)) {
    for (const file of fs.readdirSync(shaderPacksPath)) {
      if (!file.endsWith(".zip")) continue;

      const filePath = path.join(shaderPacksPath, file);
      const meta: ModMeta = {
        modId: file,
        modName: file.replace(".zip", ""),
        modVersion: "unknown",
        gameVersion: "unknown",
        loader: "unknown",
        projectType: "shader",
        isCompatibleWithConnector: false,
      };

      enrichMetaFromHistory(meta, file, history);

      library.push({ 
        path: filePath, 
        fileName: file, 
        category: "shaders", 
        sub: "", 
        meta 
      });
    }
  }

  return NextResponse.json({ library });

  }
);