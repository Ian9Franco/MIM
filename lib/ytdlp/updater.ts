/**
 * lib/ytdlp/updater.ts — yt-dlp Binary Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles version checking and safe binary updates for the bundled yt-dlp.
 * 
 * Strategy:
 *   1. Check current version via `yt-dlp --version`
 *   2. Compare against latest GitHub release tag
 *   3. Download to a temp file first, then rename (avoids Windows file locks)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const YTDLP_RELEASES_URL = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";

/** Directory and path of the bundled binary */
const BIN_DIR = path.join(process.cwd(), "standalone");
const BIN_NAME = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

export interface YtdlpVersionInfo {
  current: string;
  latest: string;
  needsUpdate: boolean;
  binExists: boolean;
}

/**
 * Returns the current installed yt-dlp version.
 * Format: "2025.01.15" or "unknown" if binary not found / errored.
 */
async function getCurrentVersion(): Promise<string> {
  if (!fs.existsSync(BIN_PATH)) return "not-installed";
  try {
    const { stdout } = await execFileAsync(BIN_PATH, ["--version"], {
      timeout: 10_000,
    });
    return stdout.trim();
  } catch (err) {
    console.warn("[ytdlp-updater] Failed to get current version:", err);
    return "unknown";
  }
}

/**
 * Fetches the latest release tag from GitHub.
 * Returns the tag name (e.g. "2025.06.01") or "unknown" on failure.
 */
async function getLatestVersion(): Promise<string> {
  try {
    const res = await fetch(YTDLP_RELEASES_URL, {
      headers: { "User-Agent": "MIM-App/1.0" },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return data.tag_name || "unknown";
  } catch (err) {
    console.warn("[ytdlp-updater] Failed to fetch latest version:", err);
    return "unknown";
  }
}

/**
 * Check if an update is available without performing any download.
 */
export async function checkYtdlpUpdate(): Promise<YtdlpVersionInfo> {
  const [current, latest] = await Promise.all([
    getCurrentVersion(),
    getLatestVersion(),
  ]);

  const binExists = fs.existsSync(BIN_PATH);

  // Can't determine update status if either version is unknown
  if (current === "unknown" || latest === "unknown") {
    return { current, latest, needsUpdate: false, binExists };
  }

  // If not installed, definitely needs update (first install)
  if (current === "not-installed") {
    return { current, latest, needsUpdate: true, binExists: false };
  }

  return {
    current,
    latest,
    needsUpdate: current !== latest,
    binExists,
  };
}

/**
 * Downloads and replaces the yt-dlp binary.
 * 
 * Uses a safe temp-file-then-rename strategy to avoid Windows file lock issues:
 *   1. Download to `yt-dlp.exe.tmp`
 *   2. Rename old binary to `yt-dlp.exe.old` (backup)
 *   3. Rename temp to `yt-dlp.exe`
 *   4. Delete `.old` backup
 */
export async function updateYtdlp(): Promise<{
  success: boolean;
  newVersion: string;
  error?: string;
}> {
  try {
    // 1. Get release info
    const releaseRes = await fetch(YTDLP_RELEASES_URL, {
      headers: { "User-Agent": "MIM-App/1.0" },
    });
    if (!releaseRes.ok) {
      throw new Error(`Failed to fetch release info: ${releaseRes.status}`);
    }
    const release = await releaseRes.json();

    // 2. Find the correct asset for this platform
    const assetName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
    const asset = release.assets?.find((a: any) => a.name === assetName);
    if (!asset) {
      throw new Error(`Asset "${assetName}" not found in release ${release.tag_name}`);
    }

    console.log(`[ytdlp-updater] Downloading ${assetName} from release ${release.tag_name}...`);

    // 3. Download the binary
    const binaryRes = await fetch(asset.browser_download_url);
    if (!binaryRes.ok) {
      throw new Error(`Failed to download binary: ${binaryRes.status}`);
    }
    const buffer = Buffer.from(await binaryRes.arrayBuffer());

    // 4. Ensure directory exists
    if (!fs.existsSync(BIN_DIR)) {
      fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    // 5. Safe write: temp file → rename
    const tmpPath = BIN_PATH + ".tmp";
    const oldPath = BIN_PATH + ".old";

    // Write to temp first
    fs.writeFileSync(tmpPath, buffer);

    // Set permissions on Linux/Mac
    if (process.platform !== "win32") {
      fs.chmodSync(tmpPath, 0o755);
    }

    // Backup old binary if it exists
    if (fs.existsSync(BIN_PATH)) {
      try {
        // Remove previous backup if exists
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        fs.renameSync(BIN_PATH, oldPath);
      } catch (renameErr) {
        // Windows might have the file locked — try a copy-based approach
        console.warn("[ytdlp-updater] Could not rename old binary, trying direct overwrite");
      }
    }

    // Move temp to final
    fs.renameSync(tmpPath, BIN_PATH);

    // Clean up backup
    try {
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch {
      // Non-critical, leave the .old file
    }

    // Clean up temp in case rename failed
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // Non-critical
    }

    // 6. Verify
    const newVersion = await getCurrentVersion();
    console.log(`[ytdlp-updater] Updated to ${newVersion}`);

    return { success: true, newVersion };
  } catch (err: any) {
    console.error("[ytdlp-updater] Update failed:", err);
    return { success: false, newVersion: "unknown", error: err.message };
  }
}

/** Get the path to the yt-dlp binary */
export function getYtdlpPath(): string {
  return BIN_PATH;
}
