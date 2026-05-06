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

import { NextRequest, NextResponse } from "next/server";
import { buildAllUser, buildAllHost } from "@/lib/builder";
import { SOURCE_BASE, BUILDS_BASE, isValidLoader } from "@/lib/constants";
import type { Loader } from "@/lib/constants";
import path from "path";

const BUILD_TYPES = ["alluser", "allhost"] as const;
type BuildType = (typeof BUILD_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const { version, loader, projectName, buildType } = await req.json();

    // ── Validate required fields ───────────────────────────────────────────────
    if (!version || !loader || !projectName || !buildType) {
      return NextResponse.json(
        { error: "Missing required fields: version, loader, projectName, buildType" },
        { status: 400 }
      );
    }

    // ── Validate loader via shared helper (avoids duplicating the LOADERS cast) ─
    if (!isValidLoader(loader)) {
      return NextResponse.json(
        { error: `Invalid loader "${loader}". Must be one of: forge, neoforge, fabric` },
        { status: 400 }
      );
    }

    // ── Validate build type ────────────────────────────────────────────────────
    if (!(BUILD_TYPES as readonly string[]).includes(buildType)) {
      return NextResponse.json(
        { error: `buildType must be "alluser" or "allhost"` },
        { status: 400 }
      );
    }

    // ── Sanitize projectName — strip Windows/Linux illegal path characters ─────
    // Strips: < > : " / \ | ? *
    const safeName = (projectName as string).replace(/[<>:"/\\|?*]/g, "_").trim();

    // Guard: sanitization may produce an empty string (e.g. projectName = "???")
    if (!safeName) {
      return NextResponse.json(
        { error: "projectName is empty after sanitization" },
        { status: 400 }
      );
    }

    const buildPath = path.join(BUILDS_BASE, safeName);

    // ── Dispatch to the appropriate builder ────────────────────────────────────
    const result =
      (buildType as BuildType) === "allhost"
        ? buildAllHost(SOURCE_BASE, buildPath, version, loader as Loader)
        : buildAllUser(SOURCE_BASE, buildPath, version, loader as Loader);

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/build] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}