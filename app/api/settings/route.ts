/**
 * /api/settings — GET / POST
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  — Devuelve la configuración actual de la app (sourceBase, buildsBase, etc.)
 * POST — Guarda y devuelve la nueva configuración.
 *
 * Body POST: Objeto parcial con los campos a actualizar.
 * Respuesta: Settings completo persistido en disco.
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
