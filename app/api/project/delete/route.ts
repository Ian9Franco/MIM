/**
 * /api/project/delete — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Elimina físicamente la carpeta completa de un proyecto en SOURCE_BASE/_projects
 * 
 * Body: { projectName: string }
 * Respuesta: { success: true }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE } from "@/lib/core/constants";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const { projectName } = await req.json();

    if (!projectName) {
      return NextResponse.json({ error: "Missing projectName" }, { status: 400 });
    }

    const safeName = projectName.replace(/[<>:"/\\|?*]/g, "_").trim();
    if (!safeName) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
    }

    const projectPath = path.join(SOURCE_BASE, "_projects", safeName);

    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
      console.log(`[/api/project/delete] Deleted physical project folder: ${projectPath}`);
    } else {
      console.log(`[/api/project/delete] Project folder not found, skipping physical delete: ${projectPath}`);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/project/delete] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  }
);
