import { NextRequest, NextResponse } from "next/server";
import { loadProjectConfig, updateModOverride } from "@/lib/modding/projectConfig";
import { withApiGuard } from "@/lib/apiGuard";

/**
 * Project Mod Metadata API
 * 
 * GET  /api/project-config/metadata?project=NAME — Get mod overrides for a project
 * POST /api/project-config/metadata — Update mod overrides
 * 
 * Body POST:
 * {
 *   project: string,
 *   modId: string,
 *   override: {
 *     environment?: "client" | "server" | "both",
 *     projectType?: "mod" | "library" | "resourcepack" | "shader",
 *     tags?: string[],
 *     notes?: string,
 *     customName?: string
 *   }
 * }
 */

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  
  if (!project) {
    return NextResponse.json({ error: "Falta parámetro 'project'" }, { status: 400 });
  }
  
  try {
    const config = loadProjectConfig(project);
    return NextResponse.json({ mods: config.mods || {} });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  }
);

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const body = await req.json();
    const { project, modId, override } = body;
    
    if (!project || !modId || !override) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: project, modId, override" },
        { status: 400 }
      );
    }
    
    updateModOverride(project, modId, override);
    
    return NextResponse.json({
      success: true,
      mods: loadProjectConfig(project).mods
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  }
);
