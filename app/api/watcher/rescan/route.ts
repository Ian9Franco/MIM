import { NextResponse } from "next/server";
import { scanExistingFiles } from "@/lib/watcher";
import { scanMod } from "@/lib/scanner";
import path from "path";
import os from "os";

export async function GET() {
  const downloadsPath = path.join(os.homedir(), "Downloads");
  const files = scanExistingFiles(downloadsPath);
  
  const pending = files.map(filePath => {
    const fileName = path.basename(filePath);
    let meta = {};
    try {
      meta = scanMod(filePath);
    } catch {}
    return { path: filePath, fileName, meta };
  });

  return NextResponse.json({ pending });
}
