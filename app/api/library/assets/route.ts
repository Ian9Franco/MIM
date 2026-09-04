import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import { SOURCE_BASE } from "@/lib/core/constants";
import { scanMod } from "@/lib/scanner";
import type { ModMeta } from "@/lib/scanner";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

interface AssetEntry {
  path: string;
  fileName: string;
  projectType: "shader" | "resourcepack";
  meta: ModMeta;
}

const UNKNOWN_META = (fileName: string, type: "shader" | "resourcepack"): ModMeta => ({
  modId: fileName,
  modName: fileName,
  modVersion: "unknown",
  gameVersion: "unknown",
  loader: "unknown",
  projectType: type,
  isCompatibleWithConnector: false,
});

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("project");

    const settings = getSettings();
    const minecraftPath = settings.minecraftPath;

    const shaders: AssetEntry[] = [];
    const resourcepacks: AssetEntry[] = [];

    // 1. Scan Shaderpacks
    const shadersDir = path.join(minecraftPath, "shaderpacks");
    if (fs.existsSync(shadersDir)) {
      try {
        const files = fs.readdirSync(shadersDir);
        for (const file of files) {
          const filePath = path.join(shadersDir, file);
          if (fs.statSync(filePath).isFile() && (file.endsWith(".zip") || file.endsWith(".jar"))) {
            let meta: ModMeta;
            try {
              meta = scanMod(filePath);
            } catch {
              meta = UNKNOWN_META(file, "shader");
            }
            shaders.push({
              path: filePath,
              fileName: file,
              projectType: "shader",
              meta,
            });
          }
        }
      } catch (e) {
        console.warn("[assets-scan] Error scanning shaders:", e);
      }
    }

    // 2. Scan Global Resourcepacks
    const globalRpDir = path.join(minecraftPath, "resourcepacks");
    if (fs.existsSync(globalRpDir)) {
      try {
        const files = fs.readdirSync(globalRpDir);
        for (const file of files) {
          const filePath = path.join(globalRpDir, file);
          if (fs.statSync(filePath).isFile() && file.endsWith(".zip")) {
            let meta: ModMeta;
            try {
              meta = scanMod(filePath);
            } catch {
              meta = UNKNOWN_META(file, "resourcepack");
            }
            resourcepacks.push({
              path: filePath,
              fileName: file,
              projectType: "resourcepack",
              meta,
            });
          }
        }
      } catch (e) {
        console.warn("[assets-scan] Error scanning global resourcepacks:", e);
      }
    }

    // 3. Scan Project Resourcepacks (if active project is provided)
    if (projectName) {
      const projectRpDir = path.join(SOURCE_BASE, "_projects", projectName, "resourcepacks");
      if (fs.existsSync(projectRpDir)) {
        try {
          const files = fs.readdirSync(projectRpDir);
          for (const file of files) {
            const filePath = path.join(projectRpDir, file);
            // Avoid duplicate entries if they have the exact same file path or name
            if (fs.statSync(filePath).isFile() && file.endsWith(".zip")) {
              if (resourcepacks.some((rp) => rp.fileName === file)) continue;

              let meta: ModMeta;
              try {
                meta = scanMod(filePath);
              } catch {
                meta = UNKNOWN_META(file, "resourcepack");
              }
              resourcepacks.push({
                path: filePath,
                fileName: file,
                projectType: "resourcepack",
                meta,
              });
            }
          }
        } catch (e) {
          console.warn("[assets-scan] Error scanning project resourcepacks:", e);
        }
      }
    }

    return NextResponse.json({ shaders, resourcepacks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  }
);
