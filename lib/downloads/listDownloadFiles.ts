import fs from "fs";
import path from "path";

const RELEVANT = new Set([".jar", ".zip", ".mrpack"]);

export function isRelevantDownloadFile(filePath: string): boolean {
  return RELEVANT.has(path.extname(filePath).toLowerCase());
}

/** Lists jar/zip/mrpack under downloads root (recursive, skips hidden dirs). */
export function listDownloadFilesRecursive(downloadsPath: string): string[] {
  if (!fs.existsSync(downloadsPath)) return [];
  const out: string[] = [];

  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && isRelevantDownloadFile(full)) {
        out.push(full);
      }
    }
  };

  walk(downloadsPath);
  return out;
}
