/**
 * /api/validate — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans all mods in the active project and runs the Pack Validator engine.
 * Called BEFORE /api/build to enforce the Build Gate.
 *
 * Body: {
 *   version:     string,
 *   loader:      "forge" | "neoforge" | "fabric",
 *   projectName: string,
 *   buildTarget: "alluser" | "allhost" | "both"
 *   sinytraActive?: boolean
 * }
 *
 * Response: PackHealthReport
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SOURCE_BASE, isValidLoader, SUBCATEGORIES } from "@/lib/constants";
import type { Loader } from "@/lib/constants";
import { scanMod } from "@/lib/scanner";
import { validatePack, type ValidatorMod } from "@/lib/packValidator";
import { loadProjectConfig } from "@/lib/projectConfig";

const BUILD_TARGETS = ["alluser", "allhost", "both"] as const;
type BuildTarget = (typeof BUILD_TARGETS)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      version,
      loader,
      projectName,
      buildTarget,
      sinytraActive = false,
    } = body;

    console.log(`[/api/validate] Request received for project: "${projectName}" (Target: ${buildTarget})`);

    // ── Validation of request params ─────────────────────────────────────────
    if (!version || !loader || !projectName || !buildTarget) {
      return NextResponse.json(
        { error: "Missing required fields: version, loader, projectName, buildTarget" },
        { status: 400 }
      );
    }

    if (!isValidLoader(loader)) {
      return NextResponse.json(
        { error: `Invalid loader "${loader}"` },
        { status: 400 }
      );
    }

    if (!(BUILD_TARGETS as readonly string[]).includes(buildTarget)) {
      return NextResponse.json(
        { error: `buildTarget must be "alluser", "allhost", or "both"` },
        { status: 400 }
      );
    }

    const validatorMods: ValidatorMod[] = [];
    
    const SETTINGS_FILE = path.join(SOURCE_BASE, ".mim-index", "settings.json");
    let settings: any = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }

    const isMimu = projectName === "MIMU";

    if (isMimu) {
      console.log(`[/api/validate] MIMU mode: Collecting mods from game folder`);
      const gameModsPath = settings.minecraftPath ? path.join(settings.minecraftPath, "mods") : "";
      
      if (gameModsPath && fs.existsSync(gameModsPath)) {
        const files = fs.readdirSync(gameModsPath).filter(f => f.endsWith(".jar"));
        console.log(`[/api/validate] Found ${files.length} mods in game folder`);
        
        for (const file of files) {
          const filePath = path.join(gameModsPath, file);
          try {
            const meta = scanMod(filePath);
            validatorMods.push({
              fileName:    file,
              modName:     meta.modName !== "unknown" ? meta.modName : file,
              modId:       meta.modId ?? "unknown",
              loader:      meta.loader ?? "unknown",
              gameVersion: meta.gameVersion ?? "unknown",
              projectType: meta.projectType ?? "mod",
              category:    "mods",
              sub:         "installed",
              dependencies:             meta.dependencies,
              conflicts:                meta.conflicts,
              providedIds:              (meta as any).providedIds,
              breaks:                   (meta as any).breaks,
              clientSide:               meta.clientSide,
              serverSide:               meta.serverSide,
              isCompatibleWithConnector: (meta as any).isCompatibleWithConnector,
            });
          } catch (err) {
            console.warn(`[/api/validate] Error scanning ${file}:`, err);
            validatorMods.push({
              fileName:    file, modName: file, modId: "unknown", loader: "unknown",
              gameVersion: "unknown", projectType: "unknown", category: "mods", sub: "installed",
            });
          }
        }
      }
    } else {
      // ── Collect mod files (Original logic) ─────────────────────────────────────────────────────
      const safeName = (projectName as string).replace(/[<>:"/\\|?*]/g, "_").trim();
      const projectModsPath = path.join(SOURCE_BASE, "_projects", safeName, "mods");
      const loaderPath = fs.existsSync(projectModsPath)
        ? projectModsPath
        : path.join(SOURCE_BASE, version, loader as Loader);

      const overrides = loadProjectConfig(projectName);

      if (fs.existsSync(loaderPath)) {
        console.log(`[/api/validate] Collecting mods from: ${loaderPath}`);
        for (const category of Object.keys(SUBCATEGORIES)) {
          const catPath = path.join(loaderPath, category);
          if (!fs.existsSync(catPath)) continue;

          for (const sub of fs.readdirSync(catPath)) {
            const subPath = path.join(catPath, sub);
            if (!fs.statSync(subPath).isDirectory()) continue;

            const files = fs.readdirSync(subPath).filter(f => f.endsWith(".jar"));
            
            for (const file of files) {
              const filePath = path.join(subPath, file);
              try {
                const meta = scanMod(filePath);
                const override = overrides.mods[file];
                const appliedMeta = override ? { ...meta, ...override } : meta;

                validatorMods.push({
                  fileName:    file,
                  modName:     appliedMeta.modName !== "unknown" ? appliedMeta.modName : file,
                  modId:       appliedMeta.modId ?? "unknown",
                  loader:      appliedMeta.loader ?? "unknown",
                  gameVersion: appliedMeta.gameVersion ?? "unknown",
                  projectType: appliedMeta.projectType ?? "mod",
                  category,
                  sub,
                  dependencies:             appliedMeta.dependencies,
                  conflicts:                appliedMeta.conflicts,
                  providedIds:              (appliedMeta as any).providedIds,
                  breaks:                   (appliedMeta as any).breaks,
                  clientSide:               appliedMeta.clientSide,
                  serverSide:               appliedMeta.serverSide,
                  isCompatibleWithConnector: (appliedMeta as any).isCompatibleWithConnector,
                });
              } catch (err) {
                console.warn(`[/api/validate] Error scanning ${file}:`, err);
                validatorMods.push({
                  fileName:    file, modName: file, modId: "unknown", loader: "unknown",
                  gameVersion: "unknown", projectType: "unknown", category, sub,
                });
              }
            }
          }
        }
      }
    }
    console.log(`[/api/validate] Total collected: ${validatorMods.length}`);


    // ── Run the validation engine ─────────────────────────────────────────────
    const isSinytraInstalled = validatorMods.some(m => m.modId === "connector" || m.fileName.toLowerCase().includes("connector-1."));
    const report = validatePack({
      mods: validatorMods,
      version,
      loader: loader as Loader,
      buildTarget: buildTarget as BuildTarget,
      sinytraActive: sinytraActive || isSinytraInstalled,
    });

    return NextResponse.json(report);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/validate] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
