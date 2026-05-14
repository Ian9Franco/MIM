import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { SOURCE_BASE, SUBCATEGORIES } from "@/lib/constants";
import { updateModOverride } from "@/lib/projectConfig";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectName, version, loader, fileName, action, payload } = body;

    if (!projectName || !version || !loader || !fileName || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const projectModsPath = path.join(SOURCE_BASE, "_projects", projectName.replace(/[<>:"/\\|?*]/g, "_"), "mods");
    const loaderPath = fs.existsSync(projectModsPath)
      ? projectModsPath
      : path.join(SOURCE_BASE, version, loader);

    if (!fs.existsSync(loaderPath)) {
      return NextResponse.json({ error: "Project mods directory not found" }, { status: 404 });
    }

    // Find the file in the loaderPath
    let sourceFilePath = "";
    let sourceCategory = "";
    let sourceSub = "";

    for (const category of Object.keys(SUBCATEGORIES)) {
      const catPath = path.join(loaderPath, category);
      if (!fs.existsSync(catPath)) continue;

      const subs = fs.readdirSync(catPath);
      for (const sub of subs) {
        const subPath = path.join(catPath, sub);
        if (!fs.statSync(subPath).isDirectory()) continue;

        const potentialFile = path.join(subPath, fileName);
        if (fs.existsSync(potentialFile)) {
          sourceFilePath = potentialFile;
          sourceCategory = category;
          sourceSub = sub;
          break;
        }
      }
      if (sourceFilePath) break;
    }

    if (!sourceFilePath) {
      return NextResponse.json({ error: "File not found in project" }, { status: 404 });
    }

    if (action.startsWith("move_to_")) {
      const targetCategory = payload?.targetCategory;
      const targetSub = payload?.targetSub || sourceSub;

      if (!targetCategory || !targetSub) {
        return NextResponse.json({ error: "Missing targetCategory/targetSub" }, { status: 400 });
      }

      const targetPath = path.join(loaderPath, targetCategory, targetSub);
      if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

      fs.renameSync(sourceFilePath, path.join(targetPath, fileName));
      return NextResponse.json({ success: true, message: `Moved ${fileName} to ${targetCategory}/${targetSub}` });
    } 
    
    if (action === "disable") {
      fs.renameSync(sourceFilePath, sourceFilePath + ".disabled");
      return NextResponse.json({ success: true, message: `Disabled ${fileName}` });
    } 
    
    if (action === "override") {
      updateModOverride(projectName, fileName, payload);
      return NextResponse.json({ success: true, message: `Applied overrides to ${fileName}` });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/project/fix-issue] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
