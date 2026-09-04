/**
 * /api/open-folder — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Abre una carpeta en el explorador de archivos nativo del sistema operativo.
 * Crea la carpeta si no existe. Soporta Windows, macOS y Linux.
 *
 * Body: { folderPath: string }
 *   Valor especial: "downloads" → abre ~/Downloads del usuario.
 * Respuesta: { success: true, path: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import os from "os";
import { getSettings } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const { folderPath } = await req.json();

    if (!folderPath) {
      return NextResponse.json({ error: "Missing folderPath" }, { status: 400 });
    }

    let resolvedPath = path.resolve(folderPath);

    if (folderPath === "downloads") {
      resolvedPath = getSettings().downloadsPath || path.join(os.homedir(), "Downloads");
    } else if (folderPath === "minecraft") {
      resolvedPath = getSettings().minecraftPath || path.join(os.homedir(), "AppData", "Roaming", ".minecraft");
    } else if (folderPath === "mods") {
      const mcPath = getSettings().minecraftPath || path.join(os.homedir(), "AppData", "Roaming", ".minecraft");
      resolvedPath = path.join(mcPath, "mods");
    } else if (folderPath === "resourcepacks") {
      const mcPath = getSettings().minecraftPath || path.join(os.homedir(), "AppData", "Roaming", ".minecraft");
      resolvedPath = path.join(mcPath, "resourcepacks");
    } else if (folderPath === "shaderpacks") {
      const mcPath = getSettings().minecraftPath || path.join(os.homedir(), "AppData", "Roaming", ".minecraft");
      resolvedPath = path.join(mcPath, "shaderpacks");
    }

    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }

    // Open the folder in the native file explorer
    let command = "";
    if (os.platform() === "win32") {
      // explorer.exe returns exit code 1 if it succeeds in opening an existing window, so we ignore errors
      command = `explorer "${resolvedPath}"`;
    } else if (os.platform() === "darwin") {
      command = `open "${resolvedPath}"`;
    } else {
      command = `xdg-open "${resolvedPath}"`;
    }

    exec(command, (error) => {
      // Ignore exit code 1 on Windows
      if (error && !(os.platform() === "win32" && error.code === 1)) {
        console.error("[/api/open-folder] Error opening folder:", error);
      }
    });

    return NextResponse.json({ success: true, path: resolvedPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/open-folder] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  }
);
