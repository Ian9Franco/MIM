import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SOURCE_BASE } from "@/lib/core/constants";
import { loadProjectConfig } from "@/lib/modding/projectConfig";
import { scanMod } from "@/lib/scanner";

/**
 * Intelligent Auto-Categorization API
 * 
 * Reorganizes mod files into .local, .server, or .essential folders
 * based on their metadata (stored in mim-project.json or scanned from JAR).
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project } = body;
    
    if (!project) {
      return NextResponse.json({ error: "Falta parámetro 'project'" }, { status: 400 });
    }
    
    const projectDir = path.join(SOURCE_BASE, "_projects", project);
    const modsDir = path.join(projectDir, "mods");
    
    if (!fs.existsSync(modsDir)) {
      return NextResponse.json({ error: "No se encontró la carpeta de mods del proyecto" }, { status: 404 });
    }
    
    const config = loadProjectConfig(project);
    const moves: string[] = [];
    
    const categories = [".local", ".server", ".essential"];
    
    // 1. Walk through all JARs in all categories
    for (const cat of categories) {
      const catPath = path.join(modsDir, cat);
      if (!fs.existsSync(catPath)) continue;
      
      const subcategories = fs.readdirSync(catPath);
      for (const sub of subcategories) {
        const subPath = path.join(catPath, sub);
        if (!fs.statSync(subPath).isDirectory()) continue;
        
        const files = fs.readdirSync(subPath);
        for (const file of files) {
          if (!file.endsWith(".jar")) continue;
          
          const fullPath = path.join(subPath, file);
          
          // 2. Determine target environment
          let environment: "client" | "server" | "both" = "both";
          
          // Try to find in metadata first (using filename or scanned modId if we had it)
          // We'll scan first to get the real ModID for better mapping
          let modId = "";
          let clientSide = "";
          let serverSide = "";
          
          try {
            const meta = scanMod(fullPath);
            modId = meta.modId;
            clientSide = meta.clientSide || "";
            serverSide = meta.serverSide || "";
          } catch (e) {
            console.warn(`[auto-categorize] Could not scan ${file}:`, e);
          }
          
          const override = config.mods?.[modId] || config.mods?.[file] || {};
          
          if (override.environment) {
            environment = override.environment;
          } else if (clientSide === "none") {
            environment = "server";
          } else if (serverSide === "none") {
            environment = "client";
          } else {
            // Default to 'both' if unsure or both sides supported
            environment = "both";
          }
          
          // 3. Determine target category folder
          const targetCat = environment === "client" ? ".local" : environment === "server" ? ".server" : ".essential";
          
          if (targetCat !== cat) {
            const targetSubPath = path.join(modsDir, targetCat, sub);
            const targetFullPath = path.join(targetSubPath, file);
            
            if (!fs.existsSync(targetSubPath)) fs.mkdirSync(targetSubPath, { recursive: true });
            
            fs.renameSync(fullPath, targetFullPath);
            moves.push(`${file}: ${cat} -> ${targetCat}`);
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      moves,
      message: `Se han movido ${moves.length} mods a sus carpetas de entorno correspondientes.`
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
