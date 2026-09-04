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
import { getSettings, saveSettings, isSettingsValid } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";

export const GET = withApiGuard(
  {},
  async () => {

  const settings = getSettings();
  return NextResponse.json({
    ...settings,
    isValid: isSettingsValid(settings)
  });

  }
);

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as Request;

  const body = await req.json();
  const next = saveSettings(body);
  return NextResponse.json(next);

  }
);
