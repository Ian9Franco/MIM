/**
 * Desktop packaged runtime: pin user data under MIM_PORTABLE_DIR and recover
 * settings/secrets from install-dir or legacy index paths after updates.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { mimIndexLayout, samePath } from "./mimIndex/layout";

export function isDesktopRuntime(): boolean {
  return process.env.MIM_DESKTOP_RUNTIME === "1";
}

/** Canonical per-user data root for packaged Desktop (Electron sets MIM_PORTABLE_DIR). */
export function getDesktopDataRoot(): string {
  if (process.env.MIM_PORTABLE_DIR) return path.resolve(process.env.MIM_PORTABLE_DIR);
  return path.join(os.homedir(), ".mim-index");
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isWeakSettingsFile(filePath: string): boolean {
  const data = readJsonFile(filePath);
  if (!data) return true;
  const keys = Object.keys(data).filter((key) => key !== "mimIndexPath" && key !== "validated");
  return keys.length === 0;
}

function isWeakSecretsFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;
  try {
    const envelope = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
      values?: Record<string, string>;
    };
    const values = envelope?.values;
    if (!values || typeof values !== "object") return true;
    return !Object.values(values).some((value) => typeof value === "string" && value.length > 0);
  } catch {
    return true;
  }
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.desktop-migrate.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmp, filePath);
}

function copyFileIfDestWeak(from: string, to: string): boolean {
  if (!fs.existsSync(from) || !fs.statSync(from).isFile()) return false;
  if (samePath(from, to)) return false;
  const destWeak = to.endsWith("mim-secrets.enc.json")
    ? isWeakSecretsFile(to)
    : isWeakSettingsFile(to);
  if (!destWeak) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return true;
}

function listAlternateIndexRoots(canonical: string): string[] {
  const roots = new Set<string>();
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.join(cwd, ".mim-index"),
    path.join(cwd, "lib", ".mim-index"),
    path.join(cwd, "mim-index"),
    path.join(os.homedir(), ".mim-index"),
    path.join("D:", ".MIM", "source", ".mim-index"),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const resolved = path.resolve(candidate);
    if (fs.statSync(resolved).isFile()) continue;
    if (!samePath(resolved, canonical)) roots.add(resolved);
  }

  const canonicalSettings = readJsonFile(path.join(canonical, "mim-settings.json"));
  const storedIndex =
    typeof canonicalSettings?.mimIndexPath === "string" ? canonicalSettings.mimIndexPath.trim() : "";
  if (storedIndex) {
    const resolved = path.resolve(storedIndex);
    if (fs.existsSync(resolved) && !samePath(resolved, canonical)) roots.add(resolved);
  }

  for (const root of [...roots]) {
    const settings = readJsonFile(path.join(root, "mim-settings.json"));
    const indexPath =
      typeof settings?.mimIndexPath === "string" ? settings.mimIndexPath.trim() : "";
    if (indexPath) {
      const resolved = path.resolve(indexPath);
      if (fs.existsSync(resolved) && !samePath(resolved, canonical)) roots.add(resolved);
    }
  }

  return [...roots];
}

function mergePublicSettings(
  canonical: Record<string, unknown>,
  legacy: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...canonical };
  for (const [key, value] of Object.entries(legacy)) {
    if (key.endsWith("ApiKey")) continue;
    if (value === undefined || value === null || value === "") continue;
    if (merged[key] === undefined || merged[key] === null || merged[key] === "") {
      merged[key] = value;
    }
  }
  return merged;
}

let desktopMigrationDone = false;

/** Idempotent: pull settings/secrets into canonical desktop data dir. */
export function ensureDesktopDataMigrated(canonicalRoot = getDesktopDataRoot()): void {
  if (!isDesktopRuntime()) return;
  if (desktopMigrationDone) return;

  const canonical = path.resolve(canonicalRoot);
  const layout = mimIndexLayout(canonical);
  fs.mkdirSync(canonical, { recursive: true });

  let migrated = false;
  for (const legacyRoot of listAlternateIndexRoots(canonical)) {
    const legacyLayout = mimIndexLayout(legacyRoot);
    if (copyFileIfDestWeak(legacyLayout.settings, layout.settings)) migrated = true;
    if (copyFileIfDestWeak(legacyLayout.secrets, layout.secrets)) migrated = true;
  }

  const looseSettings = path.join(process.cwd(), "mim-settings.json");
  const looseSecrets = path.join(process.cwd(), "mim-secrets.enc.json");
  if (copyFileIfDestWeak(looseSettings, layout.settings)) migrated = true;
  if (copyFileIfDestWeak(looseSecrets, layout.secrets)) migrated = true;

  const canonicalData = readJsonFile(layout.settings) || {};
  let nextSettings: Record<string, unknown> = { ...canonicalData, mimIndexPath: canonical };

  for (const legacyRoot of listAlternateIndexRoots(canonical)) {
    const legacyData = readJsonFile(path.join(legacyRoot, "mim-settings.json"));
    if (legacyData) nextSettings = mergePublicSettings(nextSettings, legacyData);
  }
  const looseData = readJsonFile(looseSettings);
  if (looseData) nextSettings = mergePublicSettings(nextSettings, looseData);

  nextSettings.mimIndexPath = canonical;
  writeJsonAtomic(layout.settings, nextSettings);

  if (migrated) {
    console.log("[Settings] Recovered desktop data into", canonical);
  }

  desktopMigrationDone = true;
}

/** Test helper */
export function _resetDesktopMigrationGuardForTests(): void {
  desktopMigrationDone = false;
}
