/**
 * /api/project/open — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Crea la estructura de carpetas de un proyecto (resourcepacks, shaderpacks,
 * datapacks, config) y la abre en el explorador de archivos del SO.
 *
 * Body: { version: string, projectName: string }
 * Respuesta: { success: true, path: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE } from "@/lib/core/constants";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { version, projectName } = await req.json();

    if (!version || !projectName) {
      return NextResponse.json({ error: "Missing version or projectName" }, { status: 400 });
    }

    const safeName = projectName.replace(/[<>:"/\\|?*]/g, "_").trim();
    if (!safeName) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
    }

    const projectPath = path.join(SOURCE_BASE, "_projects", safeName);
    
    // Create necessary folders
    fs.mkdirSync(path.join(projectPath, "resourcepacks"), { recursive: true });
    fs.mkdirSync(path.join(projectPath, "shaderpacks"), { recursive: true });
    fs.mkdirSync(path.join(projectPath, "datapacks"), { recursive: true });
    fs.mkdirSync(path.join(projectPath, "config"), { recursive: true });

    // Open the folder in the native file explorer
    let command = "";
    if (os.platform() === "win32") {
      command = `explorer "${projectPath}"`;
    } else if (os.platform() === "darwin") {
      command = `open "${projectPath}"`;
    } else {
      command = `xdg-open "${projectPath}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.error("[/api/project/open] Error opening folder:", error);
      }
    });

    return NextResponse.json({ success: true, path: projectPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/project/open] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
