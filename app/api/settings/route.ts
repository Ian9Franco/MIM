/**
 * /api/settings — GET / POST
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  — Devuelve la configuración pública actual y el estado de credenciales.
 * POST — Guarda preferencias públicas y actualiza credenciales sin devolver secretos.
 *
 * Body POST: Objeto parcial con los campos a actualizar.
 * Respuesta: configuración pública redacted; las credenciales persistidas no se exponen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, getPublicSettings, saveSettings, isSettingsValid } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";

const settingsUpdateSchema = z.object({
  sourceBase: z.string().max(4096).optional(),
  buildsBase: z.string().max(4096).optional(),
  downloadsPath: z.string().max(4096).optional(),
  minecraftPath: z.string().max(4096).optional(),
  mimIndexPath: z.string().max(4096).optional(),
  stagingPath: z.string().max(4096).optional(),
  validated: z.boolean().optional(),
  modrinthApiKey: z.string().max(4096).optional(),
  curseforgeApiKey: z.string().max(4096).optional(),
  virusTotalApiKey: z.string().max(4096).optional(),
  geminiApiKey: z.string().max(4096).optional(),
  openrouterApiKey: z.string().max(4096).optional(),
}).strict();

export const GET = withApiGuard(
  {},
  async () => {

  const settings = getSettings();
  return NextResponse.json({
    ...getPublicSettings(),
    isValid: isSettingsValid(settings)
  });

  }
);

function settingsSaveErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  if (/safeStorage is not available/i.test(raw)) {
    return "No se pudo cifrar la clave en este equipo. El almacenamiento seguro del sistema no está disponible.";
  }
  if (/Secret store is not initialized/i.test(raw)) {
    return "El almacén de claves no está listo. Reiniciá MIM Desktop e intentá de nuevo.";
  }
  if (/Timed out while persisting secrets/i.test(raw)) {
    return "Se agotó el tiempo al guardar la clave cifrada. Reintentá.";
  }
  if (raw && raw.length <= 300 && !raw.includes("\n")) return raw;
  return "No se pudieron guardar los ajustes.";
}

export const POST = withApiGuard(
  { bodySchema: settingsUpdateSchema },
  async ({ body }) => {
    try {
      const next = await saveSettings(body);
      return NextResponse.json(next);
    } catch (error) {
      console.error("[settings] No se pudieron guardar los ajustes:", error);
      return NextResponse.json(
        { error: settingsSaveErrorMessage(error) },
        { status: 500 },
      );
    }
  }
);
