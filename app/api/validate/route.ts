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

    // ── Collect mod files ─────────────────────────────────────────────────────
    // Priority: project-specific mods folder → global version/loader tree
    const safeName = (projectName as string).replace(/[<>:"/\\|?*]/g, "_").trim();
    const projectModsPath = path.join(SOURCE_BASE, "_projects", safeName, "mods");
    const loaderPath = fs.existsSync(projectModsPath)
      ? projectModsPath
      : path.join(SOURCE_BASE, version, loader as Loader);

    const validatorMods: ValidatorMod[] = [];
    const overrides = loadProjectConfig(projectName);

    if (!fs.existsSync(loaderPath)) {
      // No mods found — return a perfect report (nothing to validate)
      return NextResponse.json(
        validatePack({
          mods: [],
          version,
          loader: loader as Loader,
          buildTarget: buildTarget as BuildTarget,
          sinytraActive,
        })
      );
    }

    // Walk categories and sub-categories
    for (const category of Object.keys(SUBCATEGORIES)) {
      const catPath = path.join(loaderPath, category);
      if (!fs.existsSync(catPath)) continue;

      for (const sub of fs.readdirSync(catPath)) {
        const subPath = path.join(catPath, sub);
        if (!fs.statSync(subPath).isDirectory()) continue;

        for (const file of fs.readdirSync(subPath)) {
          if (!file.endsWith(".jar")) continue;
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
            // If a JAR can't be scanned, add it as an unknown mod — don't fail the whole report
            console.warn(`[/api/validate] Could not scan ${file}:`, err);
            validatorMods.push({
              fileName:    file,
              modName:     file,
              modId:       "unknown",
              loader:      "unknown",
              gameVersion: "unknown",
              projectType: "unknown",
              category,
              sub,
            });
          }
        }
      }
    }

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
