/**
 * /api/project/transfer-category — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Copia mods de una categoría (o todos) entre dos proyectos locales
 * que comparten la misma versión de Minecraft.
 *
 * Body: { sourceProject: string, targetProject: string, version: string, category: string }
 * Respuesta: { success: true, count: number }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { SOURCE_BASE, CATEGORIES } from "@/lib/core/constants";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

function copyFolderRecursive(src: string, dest: string): number {
  if (!fs.existsSync(src)) return 0;
  let count = 0;

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyFolderRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return count;
}

const transferCategoryBodySchema = z.object({
  sourceProject: z.string().min(1),
  targetProject: z.string().min(1),
  version: z.string().min(1),
  category: z.string().min(1),
  loader: z.string().optional(),
});

export const POST = withApiGuard(
  { bodySchema: transferCategoryBodySchema },
  async ({ body }) => {
    try {
      const { sourceProject, targetProject, version, category, loader = "fabric" } = body;

      const safeSource = sourceProject === "__global__" ? "__global__" : sourceProject.replace(/[<>:"/\\|?*]/g, "_").trim();
      const safeTarget = targetProject.replace(/[<>:"/\\|?*]/g, "_").trim();
      const safeVersion = version.replace(/[<>:"/\\|?*]/g, "_").trim();
      const safeLoader = loader.replace(/[<>:"/\\|?*]/g, "_").trim();

      if (safeSource === safeTarget) {
        return NextResponse.json(
          { error: "Source and target project cannot be the same" },
          { status: 400 }
        );
      }

      // Determine source directory: either a project-specific mods folder or the global loader folder
      const sourceBaseDir = safeSource === "__global__"
        ? path.join(SOURCE_BASE, safeVersion, safeLoader)
        : path.join(SOURCE_BASE, "_projects", safeSource, "mods");

      const targetBaseDir = path.join(SOURCE_BASE, "_projects", safeTarget, "mods");

    if (!fs.existsSync(sourceBaseDir)) {
      const errorMsg = sourceProject === "__global__"
        ? `La librería global para ${version}/${loader} no existe o está vacía.`
        : `El proyecto origen "${sourceProject}" no tiene mods instalados.`;
        
      return NextResponse.json(
        { error: errorMsg },
        { status: 404 }
      );
    }

    let copiedCount = 0;

    if (category === "all") {
      // Transfer all categories
      for (const cat of CATEGORIES) {
        const srcCatDir = path.join(sourceBaseDir, cat);
        const destCatDir = path.join(targetBaseDir, cat);
        if (fs.existsSync(srcCatDir)) {
          copiedCount += copyFolderRecursive(srcCatDir, destCatDir);
        }
      }
    } else {
      // Transfer specific category (e.g. .local, .essential, .server)
      if (!CATEGORIES.includes(category as any)) {
        return NextResponse.json(
          { error: `Categoría inválida: ${category}` },
          { status: 400 }
        );
      }

      const srcCatDir = path.join(sourceBaseDir, category);
      const destCatDir = path.join(targetBaseDir, category);

      if (!fs.existsSync(srcCatDir)) {
        return NextResponse.json(
          { error: `La categoría "${category}" no existe en el proyecto origen.` },
          { status: 404 }
        );
      }

      copiedCount = copyFolderRecursive(srcCatDir, destCatDir);
    }

    console.log(`[/api/project/transfer-category] Transferred ${copiedCount} files from ${sourceProject} to ${targetProject}`);
    return NextResponse.json({ success: true, count: copiedCount });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/project/transfer-category] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  }
);
