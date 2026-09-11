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

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import os from "os";
import { z } from "zod";
import { getSettings } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";

const openFolderBodySchema = z.object({
  folderPath: z.string().min(1),
});

export const POST = withApiGuard(
  { bodySchema: openFolderBodySchema },
  async ({ body }) => {
    try {
      const { folderPath } = body;

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

      // Open the folder in the native file explorer safely without shell execution
      if (os.platform() === "win32") {
        spawn("explorer.exe", [resolvedPath], { detached: true, stdio: "ignore" }).unref();
      } else if (os.platform() === "darwin") {
        spawn("open", [resolvedPath], { detached: true, stdio: "ignore" }).unref();
      } else {
        spawn("xdg-open", [resolvedPath], { detached: true, stdio: "ignore" }).unref();
      }

    return NextResponse.json({ success: true, path: resolvedPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/open-folder] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  }
);
