/**
 * /api/delete — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Elimina un archivo del sistema de archivos por su ruta absoluta.
 * Usado para descartar archivos de Downloads que el usuario no quiere clasificar.
 *
 * Body: { path: string } | { paths: string[] }
 * Respuesta: { success: true } | { error: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { mimMsg } from "@/lib/core/voice";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

const deleteBodySchema = z.object({
  path: z.string().min(1).optional(),
  paths: z.array(z.string().min(1)).min(1).optional(),
}).refine(({ path, paths }) => Boolean(path) || Boolean(paths?.length), {
  message: "Either path or paths is required",
});

export const POST = withApiGuard(
  { bodySchema: deleteBodySchema },
  async ({ body }) => {
    const { path, paths } = body;

    try {
      const targetPaths = paths ?? (path ? [path] : []);
      let deletedCount = 0;
      let failedCount = 0;

      for (const p of targetPaths) {
        try {
          if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            deletedCount++;
          }
        } catch (e) {
          console.error(`[/api/delete] Failed to delete ${p}:`, e);
          failedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: mimMsg.deleteDone(deletedCount, failedCount)
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/delete] Unhandled error:", message);
      return NextResponse.json({ error: mimMsg.internalError("/api/delete") }, { status: 500 });
    }
  }
);
