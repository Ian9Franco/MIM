import fs from "fs";
import path from "path";
import { resolveWithin } from "@/lib/security/safePaths";

export function resolveDownloadDirectory(downloadsDir: string, subdir?: string): string {
  if (!subdir?.trim()) return downloadsDir;
  const target = resolveWithin(downloadsDir, subdir.replace(/\\/g, "/"));
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

export function pickDownloadFilePath(
  downloadsDir: string,
  filename: string,
  subdir?: string,
): string {
  const safeFilename = path.basename(filename);
  const dir = resolveDownloadDirectory(downloadsDir, subdir);
  const ext = path.extname(safeFilename);
  const base = path.basename(safeFilename, ext);
  let targetPath = path.join(dir, safeFilename);
  if (fs.existsSync(targetPath)) {
    targetPath = path.join(dir, `${base}_${Date.now()}${ext}`);
  }
  return targetPath;
}
