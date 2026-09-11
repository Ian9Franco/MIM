/**
 * /api/project/transfer-category — POST
 * Copia mods de una categoría (o todos) entre dos proyectos locales
 * que comparten la misma versión de Minecraft.
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
    if (entry.isDirectory()) count += copyFolderRecursive(srcPath, destPath);
    else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function sanitizeSegment(value: string) {
  return value.replace(/[<>:"/\\|?*]/g, "_").trim();
}

const transferCategoryBodySchema = z.object({
  sourceProject: z.string().min(1),
  targetProject: z.string().min(1),
  version: z.string().min(1),
  category: z.string().min(1),
  loader: z.string().optional(),
});

export const POST = withApiGuard({ bodySchema: transferCategoryBodySchema }, async ({ body }) => {
  try {
    const { sourceProject, targetProject, version, category, loader = "fabric" } = body;
    const safeSource = sourceProject === "__global__" ? "__global__" : sanitizeSegment(sourceProject);
    const safeTarget = sanitizeSegment(targetProject);
    if (safeSource === safeTarget) {
      return NextResponse.json({ error: "Source and target project cannot be the same" }, { status: 400 });
    }

    const sourceBaseDir = safeSource === "__global__"
      ? path.join(SOURCE_BASE, sanitizeSegment(version), sanitizeSegment(loader))
      : path.join(SOURCE_BASE, "_projects", safeSource, "mods");
    const targetBaseDir = path.join(SOURCE_BASE, "_projects", safeTarget, "mods");
    if (!fs.existsSync(sourceBaseDir)) {
      const errorMsg = sourceProject === "__global__"
        ? `La librería global para ${version}/${loader} no existe o está vacía.`
        : `El proyecto origen "${sourceProject}" no tiene mods instalados.`;
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    if (category !== "all" && !(CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: `Categoría inválida: ${category}` }, { status: 400 });
    }

    let copiedCount = 0;
    for (const cat of category === "all" ? CATEGORIES : [category]) {
      const srcCatDir = path.join(sourceBaseDir, cat);
      if (!fs.existsSync(srcCatDir)) {
        if (category !== "all") {
          return NextResponse.json({ error: `La categoría "${category}" no existe en el proyecto origen.` }, { status: 404 });
        }
        continue;
      }
      copiedCount += copyFolderRecursive(srcCatDir, path.join(targetBaseDir, cat));
    }

    console.log(`[/api/project/transfer-category] Transferred ${copiedCount} files from ${sourceProject} to ${targetProject}`);
    return NextResponse.json({ success: true, count: copiedCount });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/project/transfer-category] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
