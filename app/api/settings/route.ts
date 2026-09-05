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
  stagingPath: z.string().max(4096).optional(),
  validated: z.boolean().optional(),
  modrinthApiKey: z.string().max(4096).optional(),
  curseforgeApiKey: z.string().max(4096).optional(),
  virusTotalApiKey: z.string().max(4096).optional(),
  geminiApiKey: z.string().max(4096).optional(),
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

export const POST = withApiGuard(
  { bodySchema: settingsUpdateSchema },
  async ({ body }) => {
  const next = await saveSettings(body);
  return NextResponse.json(next);

  }
);
