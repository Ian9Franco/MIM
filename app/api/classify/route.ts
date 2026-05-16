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
import { MimClassifier } from "@/lib/classifier";
import { getProjectSubcategories } from "@/lib/projectSubcategories";
import { scanMod } from "@/lib/scanner";
import { getSettings } from "@/lib/settings";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { sourcePath, sourcePaths, targetCategory, version, modloader, projectName, projectType, isCopy, forceParentCategory, environment, toGame } =
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

    // ── Parse targetCategory (Skip backslash parsing if "auto") ────────────────
    const isAuto = targetCategory === "auto";
    let category = "";
    let sub = "";

    if (!isAuto) {
      const sepIdx = (targetCategory as string).indexOf("\\");
      if (sepIdx === -1) {
        return NextResponse.json(
          {
            error: `Invalid targetCategory format. Expected "category\\\\sub", received: "${targetCategory}"`,
          },
          { status: 400 }
        );
      }

      category = (targetCategory as string).slice(0, sepIdx);
      sub = (targetCategory as string).slice(sepIdx + 1);

      // ── Validate category+sub ──────────────────────────────────────────────────
      let isValid = isValidCategory(category, sub);
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
      let finalCategory = category;
      let finalSub = sub;
      let confidence = 1.0;
      let matchedRules: string[] = [];
      
      try {
        const meta = scanMod(p);
        const effectiveProjectType = projectType || meta.projectType;

        if (effectiveProjectType === "resourcepack") {
          if (toGame && settings.minecraftPath) {
            finalTargetDir = path.join(settings.minecraftPath, "resourcepacks");
          } else {
            if (!projectName) throw new Error("projectName required for resourcepack classification");
            finalTargetDir = path.join(SOURCE_BASE, "_projects", projectName, "resourcepacks");
          }
        } else if (effectiveProjectType === "shader") {
          const shaderpacksDir = path.join(settings.minecraftPath, "shaderpacks");
          if (settings.minecraftPath && fs.existsSync(settings.minecraftPath)) {
            finalTargetDir = shaderpacksDir;
          } else {
            console.log(`[/api/classify] Minecraft path not found, routing shader to staging: ${settings.stagingPath}`);
            finalTargetDir = path.join(settings.stagingPath, "shaderpacks");
          }
        } else if (effectiveProjectType === "datapack") {
          if (!projectName) throw new Error("projectName required for datapack classification");
          finalTargetDir = path.join(SOURCE_BASE, "_projects", projectName, "datapacks");
        } else {
          // Explicit or Automatic Mod Classification
          if (toGame && settings.minecraftPath) {
            finalTargetDir = path.join(settings.minecraftPath, "mods");
          } else {
            if (isAuto) {
              // Run semantic classification engine
              const clRes = MimClassifier.classify({
                fileName: path.basename(p),
                modName: meta.modName !== "unknown" ? meta.modName : undefined,
                categories: meta.categories,
                clientSide: meta.clientSide,
                serverSide: meta.serverSide,
                environment: (environment as any) || meta.environment // Use environment from body
              });
              finalCategory = forceParentCategory || clRes.category;
              finalSub = clRes.sub;
              confidence = clRes.confidence;
              matchedRules = clRes.matchedRules;
              console.log(`[/api/classify] Auto-classified ${path.basename(p)} to ${finalCategory}\\${finalSub} (Confidence: ${confidence * 100}%, Rules: ${matchedRules.join(', ') || 'none'})`);
            }

            finalTargetDir = projectName
              ? path.join(SOURCE_BASE, "_projects", projectName, "mods", finalCategory, finalSub)
              : path.join(SOURCE_BASE, version, modloader, finalCategory, finalSub);
          }
        }
      } catch (e) {
        console.warn(`[/api/classify] Scan failed, falling back to default/explicit path: ${p}`, e);
        if (isAuto) {
          finalCategory = forceParentCategory || ".essential";
          finalSub = "vanilla + & qol";
        }
        finalTargetDir = projectName
          ? path.join(SOURCE_BASE, "_projects", projectName, "mods", finalCategory, finalSub)
          : path.join(SOURCE_BASE, version, modloader, finalCategory, finalSub);
      }

      if (!fs.existsSync(finalTargetDir)) {
        fs.mkdirSync(finalTargetDir, { recursive: true });
      }

      // ── Replace previous versions of the same modId (Global Project Scan) ────────────────
      try {
        const currentMeta = scanMod(p);
        if (currentMeta && currentMeta.modId && currentMeta.modId !== "unknown") {
          const projectRoot = projectName 
            ? path.join(SOURCE_BASE, "_projects", projectName, "mods")
            : path.join(SOURCE_BASE, version, modloader);

          if (fs.existsSync(projectRoot)) {
            const scanAndDelete = (dir: string) => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  scanAndDelete(fullPath);
                } else if (entry.isFile() && entry.name.endsWith(".jar")) {
                  if (path.resolve(fullPath) === path.resolve(p)) continue;
                  try {
                    const dfMeta = scanMod(fullPath);
                    if (dfMeta && dfMeta.modId && dfMeta.modId.toLowerCase() === currentMeta.modId.toLowerCase()) {
                      console.log(`[/api/classify] Replacing modId "${currentMeta.modId}" found at: ${fullPath}`);
                      fs.unlinkSync(fullPath);
                    }
                  } catch {}
                }
              }
            };
            scanAndDelete(projectRoot);
          }
        }
      } catch (e) {
        // Ignore errors during metadata replacement check
      }

      const fileName = path.basename(p);
      const targetPath = path.join(finalTargetDir, fileName);

      // If the file is already exactly where it's supposed to be, skip to avoid truncation/deletion
      if (path.resolve(p) === path.resolve(targetPath)) {
        moved.push(targetPath);
        continue;
      }

      try {
        fs.copyFileSync(p, targetPath);
        if (!isCopy) {
          fs.unlinkSync(p);
        }
        moved.push(targetPath);
      } catch (err: any) {
        console.error(`[/api/classify] Failed to move file: ${fileName}. Error: ${err.message}`);
        skipped.push(p);
      }
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