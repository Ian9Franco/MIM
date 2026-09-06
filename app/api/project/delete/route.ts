/**
 * /api/project/delete — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Elimina físicamente la carpeta completa de un proyecto en SOURCE_BASE/_projects
 *
 * Body: { projectName: string }
 * Respuesta: { success: true }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { SOURCE_BASE } from "@/lib/core/constants";
import fs from "fs";
import path from "path";
import { withApiGuard } from "@/lib/apiGuard";
import {
  assertPathSegment,
  resolveWithin,
  UnsafePathError,
} from "@/lib/security/safePaths";

const deleteProjectBodySchema = z.object({
  projectName: z.string().min(1),
});

export const POST = withApiGuard(
  { bodySchema: deleteProjectBodySchema },
  async ({ body }) => {
    const { projectName } = body;

    try {
      assertPathSegment(projectName);
      const projectsRoot = path.join(SOURCE_BASE, "_projects");
      const projectPath = resolveWithin(projectsRoot, projectName);

      if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
        console.log(`[/api/project/delete] Deleted physical project folder: ${projectPath}`);
      } else {
        console.log(`[/api/project/delete] Project folder not found, skipping physical delete: ${projectPath}`);
      }

      return NextResponse.json({ success: true });
    } catch (e: unknown) {
      if (e instanceof UnsafePathError) {
        return NextResponse.json({ error: "Invalid project name or path" }, { status: 400 });
      }

      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/project/delete] Unhandled error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
