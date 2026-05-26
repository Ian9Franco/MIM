import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";

function getRegistryPath(projectName?: string) {
  const settings = getSettings();
  if (projectName) {
    const projectPath = path.join(settings.libraryPath, ".projects", projectName);
    return path.join(projectPath, ".fomo-registry.json");
  } else {
    // MIMU (Contenido Instalado) -> .minecraft
    return path.join(settings.minecraftPath, ".fomo-registry.json");
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const versionId = searchParams.get("versionId");
    const projectName = searchParams.get("projectName") || undefined;
    const fileName = searchParams.get("fileName");

    if (!projectId || !versionId) {
      return NextResponse.json({ error: "Missing projectId or versionId" }, { status: 400 });
    }

    const regPath = getRegistryPath(projectName);
    if (!fs.existsSync(regPath)) {
      return NextResponse.json({ exists: false });
    }

    const registry = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    let exists = registry[projectId] === versionId;

    // Physical check: to avoid false positives if user deleted the file
    if (exists && fileName) {
      const baseDir = path.dirname(regPath);
      let foundOnDisk = false;
      
      const scanDir = (dir: string, depth = 0) => {
        if (foundOnDisk || depth > 4) return;
        if (!fs.existsSync(dir)) return;
        
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === fileName) {
              foundOnDisk = true;
              return;
            }
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              scanDir(path.join(dir, entry.name), depth + 1);
            }
          }
        } catch (e) {
          // ignore
        }
      };

      // In MIMU, scan mods, resourcepacks, shaderpacks. In MIM, scan the project dir.
      if (!projectName) {
        scanDir(path.join(baseDir, "mods"));
        scanDir(path.join(baseDir, "resourcepacks"));
        scanDir(path.join(baseDir, "shaderpacks"));
      } else {
        scanDir(baseDir);
      }

      if (!foundOnDisk) {
        exists = false;
        // Purge the invalid entry so it doesn't stay stuck
        delete registry[projectId];
        fs.writeFileSync(regPath, JSON.stringify(registry, null, 2), "utf-8");
      }
    }

    return NextResponse.json({ exists });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, versionId, projectName } = body;

    if (!projectId || !versionId) {
      return NextResponse.json({ error: "Missing projectId or versionId" }, { status: 400 });
    }

    const regPath = getRegistryPath(projectName);
    const dir = path.dirname(regPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let registry: Record<string, string> = {};
    if (fs.existsSync(regPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(regPath, "utf-8"));
      } catch (e) {
        registry = {};
      }
    }

    registry[projectId] = versionId;
    fs.writeFileSync(regPath, JSON.stringify(registry, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
