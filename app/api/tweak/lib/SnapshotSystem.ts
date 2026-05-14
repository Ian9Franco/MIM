import fs from "fs";
import path from "path";
import crypto from "crypto";

export function calculateModpackHash(projectDir: string): string {
  const modsDir = path.join(projectDir, "mods");
  if (!fs.existsSync(modsDir)) return "no-mods";
  try {
    const files: string[] = [];
    const subs = fs.readdirSync(modsDir);
    for (const sub of subs) {
      const subPath = path.join(modsDir, sub);
      if (fs.statSync(subPath).isDirectory()) files.push(...fs.readdirSync(subPath).filter(f => f.endsWith(".jar")));
      else if (sub.endsWith(".jar")) files.push(sub);
    }
    return crypto.createHash("md5").update(files.sort().join(",")).digest("hex").slice(0, 12);
  } catch { return "error"; }
}

export function getModCount(projectDir: string): number {
  let count = 0;
  const modsDir = path.join(projectDir, "mods");
  if (fs.existsSync(modsDir)) {
    try {
      const subs = fs.readdirSync(modsDir);
      for (const sub of subs) {
        const subPath = path.join(modsDir, sub);
        if (fs.statSync(subPath).isDirectory()) count += fs.readdirSync(subPath).filter(f => f.endsWith(".jar")).length;
        else if (sub.endsWith(".jar")) count++;
      }
    } catch {}
  }
  return count;
}
