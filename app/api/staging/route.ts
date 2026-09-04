import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettings } from "@/lib/core/settings";
import { mimMsg } from "@/lib/core/voice";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

const stagingPostSchema = z.object({
  action: z.enum(["resolve", "clear"]),
  filePath: z.string().optional().nullable(),
});

export const GET = withApiGuard(
  {},
  async () => {

  try {
    const settings = getSettings();
    const stagingDir = settings.stagingPath;

    if (!fs.existsSync(stagingDir)) {
      return NextResponse.json({ files: [] });
    }

    const files: string[] = [];
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };

    scanDir(stagingDir);

    const fileInfos = files.map(f => ({
      path: f,
      name: path.basename(f),
      type: f.includes("shaderpacks") ? "shader" : f.includes("resourcepacks") ? "resourcepack" : "unknown",
      relPath: path.relative(stagingDir, f)
    }));

    return NextResponse.json({ files: fileInfos });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  }
);

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body payload" }, { status: 400 });
    }

    const parsed = stagingPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, filePath } = parsed.data;
    const settings = getSettings();
    const stagingDir = settings.stagingPath;
    const mcPath = settings.minecraftPath;

    if (action === "resolve") {
      if (!fs.existsSync(mcPath)) {
        return NextResponse.json({ error: mimMsg.stagingNoMinecraft() }, { status: 400 });
      }

      const filesToMove = filePath ? [filePath] : [];
      
      // If no specific file, move all
      if (filesToMove.length === 0) {
        const scanDir = (dir: string, bucket: string[]) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              scanDir(fullPath, bucket);
            } else {
              bucket.push(fullPath);
            }
          }
        };
        scanDir(stagingDir, filesToMove);
      }

      const moved: string[] = [];
      const errors: string[] = [];

      for (const f of filesToMove) {
        try {
          const rel = path.relative(stagingDir, f);
          const target = path.join(mcPath, rel);
          const targetDir = path.dirname(target);

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          fs.copyFileSync(f, target);
          fs.unlinkSync(f);
          moved.push(rel);
        } catch (e: unknown) {
          const eMsg = e instanceof Error ? e.message : String(e);
          errors.push(`${f}: ${eMsg}`);
        }
      }

      return NextResponse.json({ 
        success: true, 
        moved, 
        errors,
        message: mimMsg.stagingDone(moved.length, errors)
      });
    }

    if (action === "clear") {
      if (filePath) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } else {
        // Clear all (dangerous but requested)
        fs.rmSync(stagingDir, { recursive: true, force: true });
        fs.mkdirSync(stagingDir, { recursive: true });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: mimMsg.stagingInvalidAction() }, { status: 400 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[/api/staging POST] Error:", errorMsg);
    return NextResponse.json({ error: mimMsg.internalError("/api/staging") }, { status: 500 });
  }

  }
);
