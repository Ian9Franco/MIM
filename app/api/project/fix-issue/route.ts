import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { SOURCE_BASE, SUBCATEGORIES } from "@/lib/core/constants";
import { updateModOverride } from "@/lib/modding/projectConfig";
import { withApiGuard } from "@/lib/apiGuard";

const fixIssueBodySchema = z.object({
  projectName: z.string().min(1),
  version: z.string().min(1),
  loader: z.string().min(1),
  fileName: z.string().min(1),
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export const POST = withApiGuard({ bodySchema: fixIssueBodySchema }, async ({ body }) => {
  try {
    const { projectName, version, loader, fileName, action, payload } = body;
    const projectModsPath = path.join(SOURCE_BASE, "_projects", projectName.replace(/[<>:"/\\|?*]/g, "_"), "mods");
    const loaderPath = fs.existsSync(projectModsPath) ? projectModsPath : path.join(SOURCE_BASE, version, loader);
    if (!fs.existsSync(loaderPath)) return jsonError("Project mods directory not found", 404);

    let sourceFilePath = "";
    let sourceSub = "";
    for (const category of Object.keys(SUBCATEGORIES)) {
      const catPath = path.join(loaderPath, category);
      if (!fs.existsSync(catPath)) continue;
      for (const sub of fs.readdirSync(catPath)) {
        const subPath = path.join(catPath, sub);
        if (!fs.statSync(subPath).isDirectory()) continue;
        const potentialFile = path.join(subPath, fileName);
        if (fs.existsSync(potentialFile)) {
          sourceFilePath = potentialFile;
          sourceSub = sub;
          break;
        }
      }
      if (sourceFilePath) break;
    }
    if (!sourceFilePath) return jsonError("File not found in project", 404);

    if (action.startsWith("move_to_")) {
      const targetCategory = typeof payload?.targetCategory === "string" ? payload.targetCategory : "";
      const targetSub = typeof payload?.targetSub === "string" ? payload.targetSub : sourceSub;
      if (!targetCategory || !targetSub) return jsonError("Missing targetCategory/targetSub", 400);
      const targetPath = path.join(loaderPath, targetCategory, targetSub);
      if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
      fs.renameSync(sourceFilePath, path.join(targetPath, fileName));
      return NextResponse.json({ success: true, message: `Moved ${fileName} to ${targetCategory}/${targetSub}` });
    }
    if (action === "disable") {
      fs.renameSync(sourceFilePath, `${sourceFilePath}.disabled`);
      return NextResponse.json({ success: true, message: `Disabled ${fileName}` });
    }
    if (action === "override" && payload) updateModOverride(projectName, fileName, payload);
    if (action === "override") return NextResponse.json({ success: true, message: `Applied overrides to ${fileName}` });
    return jsonError(`Unknown action: ${action}`, 400);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/project/fix-issue] Error:", message);
    return jsonError(message, 500);
  }
});
