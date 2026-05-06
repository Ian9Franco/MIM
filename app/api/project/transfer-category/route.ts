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

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE, CATEGORIES } from "@/lib/constants";
import path from "path";
import fs from "fs";

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

export async function POST(req: NextRequest) {
  try {
    const { sourceProject, targetProject, version, category, loader } = await req.json();

    if (!sourceProject || !targetProject || !version || !category) {
      return NextResponse.json(
        { error: "Missing required fields: sourceProject, targetProject, version, category" },
        { status: 400 }
      );
    }

    if (sourceProject === targetProject) {
      return NextResponse.json(
        { error: "Source and target project cannot be the same" },
        { status: 400 }
      );
    }

    // Determine source directory: either a project-specific mods folder or the global loader folder
    const sourceBaseDir = sourceProject === "__global__"
      ? path.join(SOURCE_BASE, version, loader)
      : path.join(SOURCE_BASE, version, "_projects", sourceProject, "mods");

    const targetBaseDir = path.join(SOURCE_BASE, version, "_projects", targetProject, "mods");

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
