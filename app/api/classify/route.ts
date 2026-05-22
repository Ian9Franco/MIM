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
import { SOURCE_BASE, isValidCategory } from "@/lib/core/constants";
import { MimClassifier } from "@/lib/classifier";
import { getProjectSubcategories } from "@/lib/modding/projectSubcategories";
import { scanMod } from "@/lib/scanner";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";

export async function POST(req: NextRequest) {
  try {
    const { sourcePath, sourcePaths, targetCategory, version, modloader, projectName, projectType, isCopy, forceParentCategory, environment, toGame, worldName } =
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

      let finalTargetDir = "";
      const isZip = p.toLowerCase().endsWith(".zip");
      const isAuto = targetCategory === "auto";


      
      if (!finalTargetDir) {
        let finalCategory = category;
        let finalSub = sub;
        let confidence = 1.0;
        let matchedRules: string[] = [];
        try {
          let meta: any = {};
        let retries = 3;
        let delayMs = 500;
        while (retries > 0) {
          try {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            meta = scanMod(p);
            break;
          } catch (e) {
            retries--;
            if (retries === 0) throw e; // Propagar el error si fallan todos los reintentos
            delayMs = 1000;
          }
        }
        
        const REMOTE_CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "remote-cache.json");
        let cachedProjectType: string | undefined = undefined;
        if (fs.existsSync(REMOTE_CACHE_FILE)) {
          try {
            const cache = JSON.parse(fs.readFileSync(REMOTE_CACHE_FILE, "utf-8"));
            const cacheEntries = cache.entries || {};
            for (const entry of Object.values(cacheEntries) as any[]) {
              if (entry?.result?.path === p && entry?.result?.projectType) {
                cachedProjectType = entry.result.projectType;
                break;
              }
            }
          } catch (e) {
            console.error("[/api/classify] Error reading remote cache", e);
          }
        }

        // Detección de tipo por contenido (misma lógica que scanner.ts, fuente de verdad)
        let effectiveProjectType: string = "unknown";
        
        const isJarFile = p.toLowerCase().endsWith(".jar");
        const isZipFile = p.toLowerCase().endsWith(".zip");

        if (isJarFile) {
          // JARs siempre son mods
          effectiveProjectType = "mod";
        } else if (isZipFile && fs.existsSync(p)) {
          try {
            const zip = new AdmZip(p);
            const lowerNames = zip.getEntries().map(e => e.entryName.toLowerCase());
            console.log(`[/api/classify] First 10 entries of ${p}:`, lowerNames.slice(0, 10));
            
            const hasShaders = lowerNames.some(n => n.includes("shaders/") || n.includes("shader/") || n.endsWith(".vsh") || n.endsWith(".fsh"));
            const hasShadersOutsideAssets = lowerNames.some(n => (n.includes("shaders/") || n.includes("shader/")) && !n.includes("assets/"));
            const hasAssetsAtRoot = lowerNames.some(n => n.startsWith("assets/"));
            const hasDataAtRoot   = lowerNames.some(n => n.startsWith("data/"));
            const hasMetaInf      = lowerNames.some(n => n.includes("meta-inf/"));
            const hasDev          = lowerNames.some(n => n.includes("dev/"));
            const hasPackMcmeta   = lowerNames.some(n => n.endsWith("pack.mcmeta"));
            
            // Un shaderpack tiene shaders fuera de assets o no tiene pack.mcmeta pero tiene shaders
            const isShaderByContent = hasShadersOutsideAssets || (hasShaders && !hasPackMcmeta);
            
            const hasMetaInfAtRoot = lowerNames.some(n => n.startsWith("meta-inf/"));
            const hasDevAtRoot     = lowerNames.some(n => n.startsWith("dev/"));
            const isDefinitelyDatapack = hasMetaInfAtRoot || hasDevAtRoot;
            
            if (isShaderByContent) {
              effectiveProjectType = "shader";
            } else if (isDefinitelyDatapack) {
              effectiveProjectType = "datapack";
            } else if (hasDataAtRoot) {
              effectiveProjectType = "datapack";
            } else if (hasAssetsAtRoot) {
              effectiveProjectType = "resourcepack";
            } else if (hasPackMcmeta) {
              effectiveProjectType = "resourcepack";
            } else {
              effectiveProjectType = "unknown";
            }
            console.log(`[/api/classify] ZIP inspection ${p}: effectiveType=${effectiveProjectType}, hasShaders=${hasShaders}, hasAssets=${hasAssetsAtRoot}, hasData=${hasDataAtRoot}, META-INF=${hasMetaInf}, dev=${hasDev}`);
          } catch (e) {
            console.warn(`[/api/classify] Error inspecting zip ${p}:`, e);
          }
        }

        console.log(`[/api/classify] File: ${p}, Effective Type: ${effectiveProjectType}, toGame: ${toGame}, worldName: ${worldName}`);

        // Forzado por nombre como red de seguridad (los shaders suelen tener nombres muy claros)
        const fileNameLower = path.basename(p).toLowerCase();
        if (fileNameLower.includes("shader") || fileNameLower.includes("complementary") || fileNameLower.includes("photon")) {
          effectiveProjectType = "shader";
          console.log(`[/api/classify] Forced effectiveType to shader by name fallback for ${p}`);
        }

        if (effectiveProjectType === "resourcepack") {
          if (toGame && settings.minecraftPath) {
            finalTargetDir = path.join(settings.minecraftPath, "resourcepacks");
          } else {
            if (!projectName) throw new Error("projectName required for resourcepack classification");
            finalTargetDir = path.join(SOURCE_BASE, "_projects", projectName, "resourcepacks");
          }
        } else if (effectiveProjectType === "shader") {
          if (toGame) {
            // MIMU: siempre a shaderpacks del juego
            finalTargetDir = path.join(settings.minecraftPath, "shaderpacks");
          } else if (projectName) {
            // MIM: a shaderpacks del proyecto
            finalTargetDir = path.join(SOURCE_BASE, "_projects", projectName, "shaderpacks");
          } else {
            finalTargetDir = path.join(settings.minecraftPath, "shaderpacks");
          }
        } else if (effectiveProjectType === "datapack") {
          if (toGame && settings.minecraftPath && worldName) {
            finalTargetDir = path.join(settings.minecraftPath, "saves", worldName, "datapacks");
          } else {
            if (!projectName) throw new Error("projectName required for datapack classification");
            finalTargetDir = path.join(SOURCE_BASE, "_projects", projectName, "datapacks");
          }
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
                clientSide: meta.clientSide,
                serverSide: meta.serverSide,
                environment: (environment as any)
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
      }
      
      console.log(`[/api/classify] Moving ${path.basename(p)} to ${finalTargetDir}`);

      if (!fs.existsSync(finalTargetDir)) {
        fs.mkdirSync(finalTargetDir, { recursive: true });
      }

      // ── Replace previous versions of the same modId (Global Project Scan) ────────────────
      try {
        const currentMeta = scanMod(p);
        if (currentMeta && currentMeta.modId && currentMeta.modId !== "unknown") {
          const projectRoot = toGame && settings.minecraftPath
            ? path.join(settings.minecraftPath, "mods")
            : projectName 
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