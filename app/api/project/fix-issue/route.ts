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

interface FoundModFile {
  sourceFilePath: string;
  sourceCategory: string;
  sourceSub: string;
}

function resolveLoaderPath(projectName: string, version: string, loader: string): string | null {
  const projectModsPath = path.join(SOURCE_BASE, "_projects", projectName.replace(/[<>:"/\\|?*]/g, "_"), "mods");
  const loaderPath = fs.existsSync(projectModsPath)
    ? projectModsPath
    : path.join(SOURCE_BASE, version, loader);
  return fs.existsSync(loaderPath) ? loaderPath : null;
}

function findModFile(loaderPath: string, fileName: string): FoundModFile | null {
  for (const category of Object.keys(SUBCATEGORIES)) {
    const catPath = path.join(loaderPath, category);
    if (!fs.existsSync(catPath)) continue;

    for (const sub of fs.readdirSync(catPath)) {
      const subPath = path.join(catPath, sub);
      if (!fs.statSync(subPath).isDirectory()) continue;

      const potentialFile = path.join(subPath, fileName);
      if (fs.existsSync(potentialFile)) {
        return { sourceFilePath: potentialFile, sourceCategory: category, sourceSub: sub };
      }
    }
  }
  return null;
}

function handleMoveAction(
  loaderPath: string,
  fileName: string,
  sourceFilePath: string,
  sourceSub: string,
  payload: Record<string, unknown> | undefined,
): NextResponse {
  const targetCategory = typeof payload?.targetCategory === "string" ? payload.targetCategory : "";
  const targetSub = typeof payload?.targetSub === "string" ? payload.targetSub : sourceSub;

  if (!targetCategory || !targetSub) {
    return NextResponse.json({ error: "Missing targetCategory/targetSub" }, { status: 400 });
  }

  const targetPath = path.join(loaderPath, targetCategory, targetSub);
  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

  fs.renameSync(sourceFilePath, path.join(targetPath, fileName));
  return NextResponse.json({ success: true, message: `Moved ${fileName} to ${targetCategory}/${targetSub}` });
}

function handleFixAction(
  action: string,
  projectName: string,
  fileName: string,
  loaderPath: string,
  found: FoundModFile,
  payload: Record<string, unknown> | undefined,
): NextResponse {
  if (action.startsWith("move_to_")) {
    return handleMoveAction(loaderPath, fileName, found.sourceFilePath, found.sourceSub, payload);
  }

  if (action === "disable") {
    fs.renameSync(found.sourceFilePath, `${found.sourceFilePath}.disabled`);
    return NextResponse.json({ success: true, message: `Disabled ${fileName}` });
  }

  if (action === "override") {
    if (payload) {
      updateModOverride(projectName, fileName, payload);
    }
    return NextResponse.json({ success: true, message: `Applied overrides to ${fileName}` });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

export const POST = withApiGuard(
  { bodySchema: fixIssueBodySchema },
  async ({ body }) => {
    try {
      const { projectName, version, loader, fileName, action, payload } = body;
      const loaderPath = resolveLoaderPath(projectName, version, loader);
      if (!loaderPath) {
        return NextResponse.json({ error: "Project mods directory not found" }, { status: 404 });
      }

      const found = findModFile(loaderPath, fileName);
      if (!found) {
        return NextResponse.json({ error: "File not found in project" }, { status: 404 });
      }

      return handleFixAction(action, projectName, fileName, loaderPath, found, payload);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/project/fix-issue] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
);
