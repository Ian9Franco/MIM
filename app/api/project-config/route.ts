/**
 * @fileoverview Project Config API
 * 
 * GET  /api/project-config?project=NAME — Obtener configuración del proyecto
 * POST /api/project-config — Actualizar configuración (incluyendo subcategorías)
 * 
 * Body POST:
 *   {
 *     project: string,
 *     action: "add_subcategory" | "remove_subcategory" | "reset_subcategories",
 *     category?: string,
 *     subcategory?: string
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  readProjectConfig,
  saveProjectConfig,
  addProjectSubcategory,
  removeProjectSubcategory,
  resetProjectSubcategories,
  getProjectSubcategories,
} from "@/lib/projectSubcategories";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  
  if (!project) {
    return NextResponse.json({ error: "Falta parámetro 'project'" }, { status: 400 });
  }
  
  try {
    const config = readProjectConfig(project);
    return NextResponse.json({ config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project, action, category, subcategory } = body;
    
    if (!project || !action) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: project, action" },
        { status: 400 }
      );
    }
    
    switch (action) {
      case "add_subcategory": {
        if (!category || !subcategory) {
          return NextResponse.json(
            { error: "Faltan category y subcategory" },
            { status: 400 }
          );
        }
        const added = addProjectSubcategory(project, category, subcategory);
        if (!added) {
          return NextResponse.json(
            { error: "La subcategoría ya existe" },
            { status: 409 }
          );
        }
        return NextResponse.json({
          success: true,
          subcategories: getProjectSubcategories(project),
        });
      }
      
      case "remove_subcategory": {
        if (!category || !subcategory) {
          return NextResponse.json(
            { error: "Faltan category y subcategory" },
            { status: 400 }
          );
        }
        const removed = removeProjectSubcategory(project, category, subcategory);
        if (!removed) {
          return NextResponse.json(
            { error: "La subcategoría no existe" },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          subcategories: getProjectSubcategories(project),
        });
      }
      
      case "reset_subcategories": {
        resetProjectSubcategories(project);
        return NextResponse.json({
          success: true,
          subcategories: getProjectSubcategories(project),
        });
      }
      
      case "update_config": {
        saveProjectConfig(project, body.config || {});
        return NextResponse.json({
          success: true,
          config: readProjectConfig(project),
        });
      }
      
      default:
        return NextResponse.json(
          { error: `Acción no válida: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
