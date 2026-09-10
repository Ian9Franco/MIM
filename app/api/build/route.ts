/**
 * /api/build — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Dispara una build de tipo "alluser" o "allhost" usando el módulo builder.
 * Copia los mods del source tree a la carpeta de builds del proyecto.
 *
 * Body: { version: string, loader: string, projectName: string, buildType: "alluser" | "allhost" }
 * Respuesta: resultado del builder (lista de archivos copiados, errores, etc.)
 *
 * - alluser: solo mods marcados como "user" (cliente)
 * - allhost: todos los mods (cliente + servidor)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAllUser, buildAllHost, autoPromoteDependencies } from "@/lib/modding/builder";
import { SOURCE_BASE, BUILDS_BASE, isValidLoader } from "@/lib/core/constants";
import { mimMsg } from "@/lib/core/voice";
import type { Loader } from "@/lib/core/constants";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

const BUILD_TYPES = ["alluser", "allhost"] as const;
type BuildType = (typeof BUILD_TYPES)[number];

const buildBodySchema = z.object({
  version: z.string().min(1),
  loader: z.string().refine(isValidLoader, {
    message: 'Loader no válido. Debe ser: forge, neoforge o fabric',
  }),
  projectName: z.string().min(1),
  buildType: z.enum(BUILD_TYPES),
});

export const POST = withApiGuard(
  { bodySchema: buildBodySchema },
  async ({ body }) => {
  try {
    const { version, loader, projectName, buildType } = body;

    // ── Sanitize projectName — strip Windows/Linux illegal path characters ─────
    // Strips: < > : " / \ | ? *
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, "_").trim();

    // Guard: sanitization may produce an empty string (e.g. projectName = "???")
    if (!safeName) {
      return NextResponse.json(
        { error: mimMsg.buildPathEmpty() },
        { status: 400 }
      );
    }

    const buildPath = path.join(BUILDS_BASE, safeName);

    // ── Pre-Build: Auto-Promote Dependencies ──────────────────────────────────
    const projectModsPath = path.join(SOURCE_BASE, "_projects", safeName, "mods");
    const loaderPath = fs.existsSync(projectModsPath)
      ? projectModsPath
      : path.join(SOURCE_BASE, version, loader);
    
    // Auto-promote libraries required by .essential from .local/.server to .essential
    autoPromoteDependencies(loaderPath);

    // ── Dispatch to the appropriate builder ────────────────────────────────────
    const result =
      (buildType as BuildType) === "allhost"
        ? buildAllHost(SOURCE_BASE, buildPath, version, loader as Loader)
        : buildAllUser(SOURCE_BASE, buildPath, version, loader as Loader);

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/build] Unhandled error:", message);
    return NextResponse.json({ error: mimMsg.internalError("/api/build") }, { status: 500 });
  }

  }
);