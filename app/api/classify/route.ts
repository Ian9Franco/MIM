/**
 * /api/classify — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Mueve uno o más archivos de mod desde Downloads al árbol de source categorizado.
 *
 * Body:
 *   sourcePaths: string[]  — array de rutas absolutas (preferido)
 *   sourcePath?: string    — ruta única (legado, sigue siendo soportado)
 *   targetCategory: string — formato: "category\sub" (delimitador backslash)
 *   version: string        — ej: "1.20.1"
 *   modloader: string      — ej: "forge"
 *   projectName?: string   — nombre del proyecto para resourcepacks/shaders/datapacks
 *
 * Usa copy+delete en lugar de fs.rename porque rename falla en movimientos
 * cross-drive en Windows (C: → D:).
 *
 * El tipo del archivo se detecta automáticamente con scanMod():
 *   - resourcepack / shader / datapack → carpeta del proyecto (_projects/{name})
 *   - mod / desconocido               → árbol estándar ({version}/{loader}/{category}/{sub})
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE, isValidCategory } from "@/lib/constants";
import { getProjectSubcategories } from "@/lib/projectSubcategories";
import { scanMod } from "@/lib/scanner";
import { getSettings } from "@/lib/settings";
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
    const settings = getSettings();

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
          // Check if we should move to game folder or project folder
          // Based on user request, tweaks uses the game's resourcepacks folder
          const gameRpDir = path.join(settings.minecraftPath, "resourcepacks");
          if (fs.existsSync(settings.minecraftPath)) {
            finalTargetDir = gameRpDir;
          } else {
            finalTargetDir = path.join(settings.stagingPath, "resourcepacks");
          }
        } else if (meta.projectType === "shader") {
          const shaderpacksDir = path.join(settings.minecraftPath, "shaderpacks");
          if (fs.existsSync(settings.minecraftPath)) {
            finalTargetDir = shaderpacksDir;
          } else {
            finalTargetDir = path.join(settings.stagingPath, "shaderpacks");
          }
        } else if (meta.projectType === "datapack") {
          if (!projectName) throw new Error("projectName required for datapack classification");
          finalTargetDir = path.join(SOURCE_BASE, "_projects", projectName, "datapacks");
        } else {
          // It's a mod (or unknown) — use isolated or standard library path
          finalTargetDir = projectName
            ? path.join(SOURCE_BASE, "_projects", projectName, "mods", category, sub)
            : path.join(SOURCE_BASE, version, modloader, category, sub);
        }
      } catch (e) {
        console.warn(`[/api/classify] Scan failed, falling back to mod path: ${p}`, e);
        finalTargetDir = projectName
          ? path.join(SOURCE_BASE, "_projects", projectName, "mods", category, sub)
          : path.join(SOURCE_BASE, version, modloader, category, sub);
      }

      if (!fs.existsSync(finalTargetDir)) {
        fs.mkdirSync(finalTargetDir, { recursive: true });
      }
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