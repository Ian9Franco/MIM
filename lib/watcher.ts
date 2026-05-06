/**
 * MIM – Download Watcher
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses chokidar to monitor the user's Downloads folder for new .jar / .zip
 * files and emits them via a shared EventEmitter so the SSE route can forward
 * them to the browser in real time.
 *
 * Singleton pattern: only one chokidar instance is created per process
 * lifetime.  Multiple SSE clients can subscribe to the same emitter.
 *
 * Lifecycle:
 *   startWatcher(path)   — idempotent, safe to call on every SSE connection
 *   stopWatcher()        — cleanly closes chokidar (call on server shutdown)
 *   scanExistingFiles()  — synchronous initial scan for the SSE "catch-up" flush
 * ─────────────────────────────────────────────────────────────────────────────
 */

import chokidar, { FSWatcher } from "chokidar";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

// ── Shared Event Bus ──────────────────────────────────────────────────────────

/**
 * All SSE handlers subscribe to this emitter.
 * Event: "new_file"  →  payload: string (absolute file path)
 */
export const watcherEmitter = new EventEmitter();

// Raise the max listeners limit to avoid Node's default warning when many SSE
// clients connect simultaneously (each adds one listener).
watcherEmitter.setMaxListeners(50);

// ── Singleton Watcher ─────────────────────────────────────────────────────────

/** Internal chokidar instance — null until startWatcher() is called. */
let watcher: FSWatcher | null = null;

/** The path currently being watched (used for guard checks). */
let watchedPath: string | null = null;

// ── File Filter ───────────────────────────────────────────────────────────────

/** Returns true for file extensions MIM cares about. */
function isRelevantFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".jar" || ext === ".zip";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns an array of existing .jar / .zip absolute paths found in
 * `downloadsPath` right now.  Called once per SSE connection to send an
 * immediate "catch-up" flush to the newly connected client.
 */
export function scanExistingFiles(downloadsPath: string): string[] {
  if (!fs.existsSync(downloadsPath)) return [];

  return fs
    .readdirSync(downloadsPath)
    .filter(isRelevantFile)
    .map((f) => path.join(downloadsPath, f));
}

/**
 * Starts the chokidar watcher on `downloadsPath`.
 * Idempotent: calling it multiple times with the same path is safe and cheap.
 *
 * The watcher does NOT emit events for files that already exist when it starts
 * (ignoreInitial: true) — those are handled by scanExistingFiles().
 * It only emits for files that appear *after* the watcher is running.
 *
 * awaitWriteFinish ensures we don't try to scan a partially-downloaded file.
 */
export function startWatcher(downloadsPath: string): void {
  // Guard: already watching this path → nothing to do
  if (watcher && watchedPath === downloadsPath) return;

  // Guard: path changed (unusual but possible) → tear down the old watcher
  if (watcher) {
    console.warn("[watcher] Downloads path changed — restarting watcher.");
    void watcher.close();
    watcher = null;
  }

  watcher = chokidar.watch(downloadsPath, {
    // Ignore hidden files and directories (e.g. .DS_Store, .Trash)
    ignored: /(^|[/\\])\../,
    persistent: true,
    // Existing files are served via scanExistingFiles() — don't re-emit them
    ignoreInitial: true,
    awaitWriteFinish: {
      // Wait until the file stops growing before emitting — avoids scanning
      // a partially-downloaded file that would fail to open as a ZIP.
      stabilityThreshold: 1500, // ms of no size change
      pollInterval: 200,        // how often to check (ms)
    },
  });

  watcher.on("add", (filePath: string) => {
    if (isRelevantFile(filePath)) {
      console.log(`[watcher] New file detected: ${path.basename(filePath)}`);
      watcherEmitter.emit("new_file", filePath);
    }
  });

  watcher.on("unlink", (filePath: string) => {
    if (isRelevantFile(filePath)) {
      console.log(`[watcher] File removed: ${path.basename(filePath)}`);
      watcherEmitter.emit("deleted_file", filePath);
    }
  });

  watcher.on("error", (err: unknown) => {
    console.error("[watcher] chokidar error:", err);
  });

  watchedPath = downloadsPath;
  console.log(`[watcher] Watching: ${downloadsPath}`);
}

/**
 * Stops the chokidar watcher and cleans up internal state.
 * Call this in your server shutdown handler to avoid resource leaks.
 *
 * @example
 *   process.on("SIGTERM", () => { stopWatcher(); process.exit(0); });
 */
export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
    watchedPath = null;
    console.log("[watcher] Stopped.");
  }
}