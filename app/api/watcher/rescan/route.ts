import { NextResponse } from "next/server";
import { scanExistingFiles } from "@/lib/core/watcher";
import { scanMod, type ModMeta } from "@/lib/scanner";
import path from "path";
import os from "os";

export async function GET() {
  const downloadsPath = path.join(os.homedir(), "Downloads");
  const files = scanExistingFiles(downloadsPath);
  
  const pending = files.map(filePath => {
    const fileName = path.basename(filePath);
    let meta: ModMeta | { status: string; error: string };
    try {
      meta = scanMod(filePath);
    } catch (err) {
      console.warn(`[/api/watcher/rescan] Failed to scan mod file ${filePath}:`, err);
      meta = { status: "unverified", error: err instanceof Error ? err.message : String(err) };
    }
    return { path: filePath, fileName, meta };
  });

  return NextResponse.json({ pending });
}
