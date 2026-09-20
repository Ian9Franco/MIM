/**
 * Boot hook for versioned MIM index migrations.
 * Must not call getSettings() — getSettings() calls this.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { getDefaultSourceBase, getPortableDir } from "../settings";
import { mimIndexLayout } from "./layout";
import { runSinceramiento01, type SinceramientoReport } from "./sinceramiento01";

let ranThisProcess = false;

function inferSourceBase(destIndex: string): string {
  const settingsFile = path.join(destIndex, "mim-settings.json");
  if (fs.existsSync(settingsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
      if (typeof data.sourceBase === "string" && data.sourceBase.trim()) {
        return path.resolve(data.sourceBase.trim());
      }
    } catch {
      // fall through to default
    }
  }
  return getDefaultSourceBase();
}

export function ensureSinceramiento01(options?: { force?: boolean }): SinceramientoReport | null {
  if (ranThisProcess && !options?.force) {
    const dest = getPortableDir();
    const marker = mimIndexLayout(dest).marker;
    if (fs.existsSync(marker)) {
      try {
        return JSON.parse(fs.readFileSync(marker, "utf-8")) as SinceramientoReport;
      } catch {
        return null;
      }
    }
    return null;
  }

  const destIndex = getPortableDir();
  const tmp = path.resolve(os.tmpdir());
  const destIsTemp = path.resolve(destIndex).toLowerCase().startsWith(tmp.toLowerCase());
  const report = runSinceramiento01({
    destIndex,
    sourceBase: destIsTemp ? destIndex : inferSourceBase(destIndex),
    cwd: destIsTemp ? destIndex : process.cwd(),
    homedir: destIsTemp ? destIndex : os.homedir(),
    extraLegacyIndexes: destIsTemp ? [] : undefined,
    force: options?.force,
  });
  ranThisProcess = true;
  return report;
}

/** Test helper — clears the in-process guard. */
export function _resetSinceramientoGuardForTests(): void {
  ranThisProcess = false;
}
