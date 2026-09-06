/**
 * /api/minecraft/delete — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Elimina contenido instalado (mods, resourcepacks, shaderpacks, datapacks)
 * estrictamente dentro del directorio de Minecraft configurado.
 *
 * Body: { path?: string, paths?: string[] }
 * Respuesta: { success: true, message: string } | { error: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { mimMsg } from "@/lib/core/voice";
import { getSettings } from "@/lib/core/settings";
import fs from "fs";
import path from "path";
import { withApiGuard } from "@/lib/apiGuard";
import { resolveWithin, UnsafePathError } from "@/lib/security/safePaths";

const deleteMinecraftContentSchema = z.object({
  path: z.string().min(1).optional(),
  paths: z.array(z.string().min(1)).min(1).optional(),
}).refine(({ path: p, paths }) => Boolean(p) || Boolean(paths?.length), {
  message: "Either path or paths is required",
});

const ALLOWED_TOP_DIRS = new Set([
  "mods",
  "resourcepacks",
  "shaderpacks",
  "datapacks",
]);

function resolveMinecraftTarget(minecraftRoot: string, candidate: string): string {
  if (!path.isAbsolute(candidate) && !path.win32.isAbsolute(candidate)) {
    throw new UnsafePathError();
  }

  const root = path.resolve(minecraftRoot);
  const target = path.resolve(candidate);
  const relation = path.relative(root, target);

  if (
    !relation ||
    relation === ".." ||
    relation.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relation)
  ) {
    throw new UnsafePathError();
  }

  const segments = relation.split(/[\\/]/);
  const topDir = segments[0]?.toLowerCase();

  // Content directly inside mods, resourcepacks, shaderpacks, datapacks
  const isDirectCategory = topDir && ALLOWED_TOP_DIRS.has(topDir);

  // Content inside saves/<world>/datapacks/<datapack>
  const isWorldDatapack =
    topDir === "saves" &&
    segments.length >= 4 &&
    segments[2]?.toLowerCase() === "datapacks";

  if (!isDirectCategory && !isWorldDatapack) {
    throw new UnsafePathError("Destino no permitido dentro de Minecraft");
  }

  return resolveWithin(root, relation);
}

export const POST = withApiGuard(
  { bodySchema: deleteMinecraftContentSchema },
  async ({ body }) => {
    const { path: singlePath, paths } = body;

    try {
      const { minecraftPath } = getSettings();
      const requestedPaths = paths ?? (singlePath ? [singlePath] : []);
      const targetPaths = requestedPaths.map((candidate) =>
        resolveMinecraftTarget(minecraftPath, candidate)
      );

      let deletedCount = 0;
      let failedCount = 0;

      for (const targetPath of targetPaths) {
        try {
          if (fs.existsSync(targetPath)) {
            const stat = fs.statSync(targetPath);
            if (stat.isDirectory()) {
              fs.rmSync(targetPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(targetPath);
            }
            deletedCount++;
          }
        } catch (error) {
          console.error(`[/api/minecraft/delete] Failed to delete ${targetPath}:`, error);
          failedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: mimMsg.deleteDone(deletedCount, failedCount),
      });
    } catch (error: unknown) {
      if (error instanceof UnsafePathError) {
        return NextResponse.json(
          { error: "Invalid minecraft content path" },
          { status: 400 }
        );
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[/api/minecraft/delete] Unhandled error:", message);
      return NextResponse.json(
        { error: mimMsg.internalError("/api/minecraft/delete") },
        { status: 500 }
      );
    }
  }
);
