import fs from "fs";
import path from "path";
import crypto from "crypto";

export function collectJarFiles(dir: string, bucket: string[]) {
  if (!fs.existsSync(dir)) return;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectJarFiles(fullPath, bucket);
        continue;
      }
      if (/\.(jar|zip)$/i.test(entry.name)) {
        bucket.push(fullPath);
      }
    }
  } catch (err) {
    // Ignore unreadable directories
  }
}

export function findExistingByHash(downloadsDir: string, sourceBase: string, hashes?: Record<string, string>) {
  if (!hashes?.sha1 && !hashes?.sha512) return null;

  const candidates: string[] = [];
  collectJarFiles(downloadsDir, candidates);
  collectJarFiles(sourceBase, candidates);

  for (const filePath of candidates) {
    try {
      const buffer = fs.readFileSync(filePath);
      if (hashes.sha512) {
        const sha512 = crypto.createHash("sha512").update(buffer).digest("hex");
        if (sha512 === hashes.sha512) return filePath;
      }
      if (hashes.sha1) {
        const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");
        if (sha1 === hashes.sha1) return filePath;
      }
    } catch {
      // Ignore unreadable files while scanning for duplicates.
    }
  }

  return null;
}
