/**
 * /api/delete — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Elimina archivos pendientes dentro de la carpeta Downloads configurada.
 * Usado para descartar archivos que el usuario no quiere clasificar.
 *
 * Body: { path: string } | { paths: string[] }
 * Respuesta: { success: true } | { error: string }
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

const deleteBodySchema = z.object({
  path: z.string().min(1).optional(),
  paths: z.array(z.string().min(1)).min(1).optional(),
}).refine(({ path, paths }) => Boolean(path) || Boolean(paths?.length), {
  message: "Either path or paths is required",
});

function resolveDownloadTarget(downloadsRoot: string, candidate: string): string {
  if (!path.isAbsolute(candidate) && !path.win32.isAbsolute(candidate)) {
    throw new UnsafePathError();
  }

  const root = path.resolve(downloadsRoot);
  const target = path.resolve(candidate);
  const relation = path.relative(root, target);

  if (!relation || relation.includes(path.sep)) {
    throw new UnsafePathError();
  }

  return resolveWithin(root, relation);
}

export const POST = withApiGuard(
  { bodySchema: deleteBodySchema },
  async ({ body }) => {
    const { path: singlePath, paths } = body;

    try {
      const { downloadsPath } = getSettings();
      const requestedPaths = paths ?? (singlePath ? [singlePath] : []);
      const targetPaths = requestedPaths.map((candidate) =>
        resolveDownloadTarget(downloadsPath, candidate)
      );
      let deletedCount = 0;
      let failedCount = 0;

      for (const targetPath of targetPaths) {
        try {
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            deletedCount++;
          }
        } catch (error) {
          console.error(`[/api/delete] Failed to delete ${targetPath}:`, error);
          failedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: mimMsg.deleteDone(deletedCount, failedCount)
      });
    } catch (error: unknown) {
      if (error instanceof UnsafePathError) {
        return NextResponse.json({ error: "Invalid download path" }, { status: 400 });
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[/api/delete] Unhandled error:", message);
      return NextResponse.json({ error: mimMsg.internalError("/api/delete") }, { status: 500 });
    }
  }
);
