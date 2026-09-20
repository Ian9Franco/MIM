/**
 * sinceramiento_01 — detect legacy MIM index roots, copy useful files
 * into the canonical layout, then delete the allowlisted zombies.
 */

import fs from "fs";
import os from "os";
import path from "path";
import {
  LEGACY_INDEX_RELOCATIONS,
  SINCERAMIENTO_01_ID,
  ensureDirForWrite,
  isEmptyDir,
  mimIndexLayout,
  samePath,
  type MimIndexLayout,
} from "./layout";

export interface SinceramientoSkip {
  path: string;
  reason: string;
}

export interface SinceramientoMove {
  from: string;
  to: string;
}

export interface SinceramientoReport {
  id: string;
  ranAt: string;
  dest: string;
  migrated: SinceramientoMove[];
  deleted: string[];
  skipped: SinceramientoSkip[];
}

export interface SinceramientoInput {
  destIndex: string;
  sourceBase: string;
  cwd: string;
  homedir?: string;
  extraLegacyIndexes?: string[];
  force?: boolean;
}

function destIsTemporary(destIndex: string): boolean {
  return isUnderTmp(destIndex);
}

function isUnderTmp(candidate: string): boolean {
  const tmp = path.resolve(os.tmpdir());
  return path.resolve(candidate).toLowerCase().startsWith(tmp.toLowerCase());
}

/** Dest in tmpdir may only inspect other tmpdir paths (tests / isolated boot). */
function allowTouch(input: SinceramientoInput, candidate: string): boolean {
  if (!destIsTemporary(input.destIndex)) return true;
  return isUnderTmp(candidate);
}

function listLegacyIndexCandidates(input: SinceramientoInput): string[] {
  const destTemp = destIsTemporary(input.destIndex);
  const extra = (input.extraLegacyIndexes ?? (
    destTemp ? [] : [path.join("D:", ".MIM", "source", ".mim-index")]
  )).filter((candidate) => allowTouch(input, candidate));
  const home = input.homedir || os.homedir();
  const homeRoots = allowTouch(input, home) ? [path.join(home, ".mim-index")] : [];
  const sourceRoots = allowTouch(input, input.sourceBase)
    ? [path.join(input.sourceBase, ".mim-index")]
    : [];
  const cwdRoots = allowTouch(input, input.cwd)
    ? [
        path.join(input.cwd, ".mim-index"),
        path.join(input.cwd, "lib", ".mim-index"),
        path.join(input.cwd, "mim-index"),
      ]
    : [];
  return [...homeRoots, ...extra, ...sourceRoots, ...cwdRoots];
}

function copyFileIfAbsent(
  from: string,
  to: string,
  report: SinceramientoReport,
): void {
  if (!fs.existsSync(from) || !fs.statSync(from).isFile()) return;
  if (samePath(from, to)) return;
  if (fs.existsSync(to)) {
    report.skipped.push({ path: from, reason: "canonical-wins" });
    return;
  }
  ensureDirForWrite(to);
  fs.copyFileSync(from, to);
  report.migrated.push({ from, to });
}

function copyDirIfAbsent(
  from: string,
  to: string,
  report: SinceramientoReport,
): void {
  if (!fs.existsSync(from) || !fs.statSync(from).isDirectory()) return;
  if (samePath(from, to)) return;
  const entries = fs.readdirSync(from, { withFileTypes: true });
  if (entries.length === 0) return;
  for (const entry of entries) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirIfAbsent(src, dest, report);
    } else if (entry.isFile()) {
      copyFileIfAbsent(src, dest, report);
    }
  }
}

function relocateLegacyIndex(
  legacyRoot: string,
  layout: MimIndexLayout,
  report: SinceramientoReport,
): void {
  if (!fs.existsSync(legacyRoot) || !fs.statSync(legacyRoot).isDirectory()) return;
  if (samePath(legacyRoot, layout.root)) return;

  for (const rule of LEGACY_INDEX_RELOCATIONS) {
    const from = path.join(legacyRoot, rule.from);
    const to = layout[rule.to];
    if (!fs.existsSync(from)) continue;
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      copyDirIfAbsent(from, to, report);
    } else {
      copyFileIfAbsent(from, to, report);
    }
  }
}

function shouldTouchCwd(input: SinceramientoInput): boolean {
  if (!destIsTemporary(input.destIndex)) return true;
  const tmp = path.resolve(os.tmpdir());
  return path.resolve(input.cwd).toLowerCase().startsWith(tmp.toLowerCase());
}

function migrateLooseCwdFiles(cwd: string, layout: MimIndexLayout, report: SinceramientoReport): void {
  copyFileIfAbsent(path.join(cwd, "mim-settings.json"), layout.settings, report);
  copyFileIfAbsent(path.join(cwd, "mim-collections.json"), layout.collections, report);
}

function migrateFomoRegistries(
  input: SinceramientoInput,
  report: SinceramientoReport,
): void {
  if (!allowTouch(input, input.sourceBase)) return;
  const sourceBase = input.sourceBase;
  const legacyProjects = path.join(sourceBase, ".projects");
  const canonicalProjects = path.join(sourceBase, "_projects");
  if (!fs.existsSync(legacyProjects) || !fs.statSync(legacyProjects).isDirectory()) return;
  if (samePath(legacyProjects, canonicalProjects)) return;

  for (const entry of fs.readdirSync(legacyProjects, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const registry = path.join(legacyProjects, entry.name, ".fomo-registry.json");
    const dest = path.join(canonicalProjects, entry.name, ".fomo-registry.json");
    copyFileIfAbsent(registry, dest, report);
  }
}

function canDeleteZombie(target: string, input: SinceramientoInput, dest: string): boolean {
  if (!fs.existsSync(target)) return false;
  if (!allowTouch(input, target)) return false;
  if (samePath(target, dest)) return false;
  if (samePath(target, input.sourceBase)) return false;
  if (samePath(target, path.join(input.sourceBase, "_projects"))) return false;
  if (samePath(target, input.cwd)) return false;
  const base = path.basename(target).toLowerCase();
  if (base === "_projects" || base === "mods" || base === ".minecraft" || base === "downloads") return false;
  return true;
}

function removeEmptyLazyDirs(layout: MimIndexLayout, report: SinceramientoReport): void {
  for (const dir of [layout.staging, layout.playerRescue]) {
    if (isEmptyDir(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      report.deleted.push(dir);
    }
  }
}

function removeZombie(target: string, input: SinceramientoInput, dest: string, report: SinceramientoReport): void {
  if (!canDeleteZombie(target, input, dest)) {
    report.skipped.push({ path: target, reason: "protected" });
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
  report.deleted.push(target);
}

function persistMimIndexPath(layout: MimIndexLayout): void {
  let data: Record<string, unknown> = {};
  if (fs.existsSync(layout.settings)) {
    try {
      data = JSON.parse(fs.readFileSync(layout.settings, "utf-8"));
    } catch {
      data = {};
    }
  }
  data.mimIndexPath = layout.root;
  ensureDirForWrite(layout.settings);
  const tmp = `${layout.settings}.${process.pid}.sinceramiento.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmp, layout.settings);
}

function writeMarker(layout: MimIndexLayout, report: SinceramientoReport): void {
  ensureDirForWrite(layout.marker);
  fs.writeFileSync(layout.marker, JSON.stringify(report, null, 2), "utf-8");
}

export function readSinceramientoMarker(destIndex: string): SinceramientoReport | null {
  const marker = mimIndexLayout(destIndex).marker;
  if (!fs.existsSync(marker)) return null;
  try {
    return JSON.parse(fs.readFileSync(marker, "utf-8")) as SinceramientoReport;
  } catch {
    return null;
  }
}

export function runSinceramiento01(input: SinceramientoInput): SinceramientoReport {
  const dest = path.resolve(input.destIndex);
  const layout = mimIndexLayout(dest);
  const report: SinceramientoReport = {
    id: SINCERAMIENTO_01_ID,
    ranAt: new Date().toISOString(),
    dest,
    migrated: [],
    deleted: [],
    skipped: [],
  };

  if (!input.force && fs.existsSync(layout.marker)) {
    const existing = readSinceramientoMarker(dest);
    if (existing) return existing;
  }

  ensureDirForWrite(layout.root);

  for (const candidate of listLegacyIndexCandidates(input)) {
    relocateLegacyIndex(candidate, layout, report);
  }
  if (shouldTouchCwd(input)) {
    migrateLooseCwdFiles(input.cwd, layout, report);
  }
  migrateFomoRegistries(input, report);

  persistMimIndexPath(layout);

  for (const candidate of listLegacyIndexCandidates(input)) {
    if (!fs.existsSync(candidate)) continue;
    if (samePath(candidate, dest)) continue;
    removeZombie(candidate, input, dest, report);
  }

  const legacyProjects = path.join(input.sourceBase, ".projects");
  if (fs.existsSync(legacyProjects) && !samePath(legacyProjects, path.join(input.sourceBase, "_projects"))) {
    removeZombie(legacyProjects, input, dest, report);
  }

  if (shouldTouchCwd(input)) {
    for (const loose of [
      path.join(input.cwd, "mim-settings.json"),
      path.join(input.cwd, "mim-collections.json"),
    ]) {
      if (fs.existsSync(loose) && !samePath(loose, layout.settings) && !samePath(loose, layout.collections)) {
        fs.unlinkSync(loose);
        report.deleted.push(loose);
      }
    }
  }

  removeEmptyLazyDirs(layout, report);
  writeMarker(layout, report);
  return report;
}
