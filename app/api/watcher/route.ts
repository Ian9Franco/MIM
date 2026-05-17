/**
 * /api/watcher — GET (Server-Sent Events)
 * ─────────────────────────────────────────────────────────────────────────────
 * Abre un stream SSE persistente para notificar archivos nuevos en Downloads.
 *
 * Al conectarse:
 *   1. Envía inmediatamente todos los archivos .jar/.zip existentes en Downloads.
 *   2. Mantiene el stream abierto y envía nuevos archivos conforme chokidar los detecta.
 *
 * Cada evento SSE tiene el shape: { path, fileName, meta }
 *   - meta: resultado de scanMod() — puede estar vacío si el JAR está corrupto.
 *
 * El cliente puede desconectarse en cualquier momento — la señal de abort elimina
 * el listener del watcherEmitter para prevenir memory leaks.
 *
 * Keepalive: envía un ping SSE (":") cada 30s para prevenir que proxies y browsers
 * cierren conexiones SSE inactivas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { watcherEmitter, startWatcher, scanExistingFiles } from "@/lib/watcher";
import { scanMod, ModMeta } from "@/lib/scanner";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import { getSettings } from "@/lib/settings";
import { SOURCE_BASE } from "@/lib/constants";

const REMOTE_CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "remote-cache.json");

function readCachedMeta(filePath: string): { projectType?: string; title?: string } {
  try {
    if (!fs.existsSync(REMOTE_CACHE_FILE)) return {};
    const cache = JSON.parse(fs.readFileSync(REMOTE_CACHE_FILE, "utf-8"));
    // Try matching by filePath first
    for (const entry of Object.values(cache.entries || {}) as any[]) {
      if (entry?.result?.path === filePath) {
        return { projectType: entry.result.projectType, title: entry.result.title };
      }
    }
    // Try matching by sha1
    try {
      const buffer = fs.readFileSync(filePath);
      const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");
      for (const [key, entry] of Object.entries(cache.entries || {}) as any[]) {
        if (key.startsWith(sha1) && (entry as any)?.result) {
          const r = (entry as any).result;
          return { projectType: r.projectType, title: r.title };
        }
      }
    } catch { /* ignore hash errors */ }
  } catch { /* ignore cache read errors */ }
  return {};
}

// Cleanup raw filename for display when modName is unknown (removes version suffixes, dashes, extensions)
function cleanFilenameForDisplay(fileName: string): string {
  return fileName
    .replace(/\.(jar|zip|mrpack)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+v?\d[\d.]*[\w.-]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Interval between SSE keepalive pings (ms). */
const KEEPALIVE_INTERVAL_MS = 30_000;

export async function GET(req: NextRequest) {
  const { downloadsPath } = getSettings();
  startWatcher(downloadsPath);

  // Snapshot existing files before the stream opens to avoid a race where
  // a file appears between the scan and the first watcher event.
  const existingFiles = scanExistingFiles(downloadsPath);

  const stream = new ReadableStream({
    start(controller) {
      // ── Helpers ──────────────────────────────────────────────────────────────

      /** Encodes and enqueues one SSE data frame. */
      const send = (data: object) =>
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
        );

      /** Sends an SSE comment frame — keeps the connection alive through proxies. */
      const sendPing = () =>
        controller.enqueue(new TextEncoder().encode(":\n\n"));

      /**
       * Scans the JAR and sends the event.
       * Never throws — a scan failure still produces an event with empty meta
       * so the frontend can display the file in the pending list.
       */
      const processFile = async (filePath: string, delayMs = 500) => {
        const fileName = path.basename(filePath);
        let meta: Partial<ModMeta> = {};
        let retries = 3;
        while (retries > 0) {
          try {
            if (delayMs > 0) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            meta = scanMod(filePath);
            break; // Éxito
          } catch (e) {
            retries--;
            if (retries === 0) {
              console.warn(`[/api/watcher] scanMod failed after retries for: ${fileName}`);
            } else {
              delayMs = 1000; // Esperar más en el siguiente intento
            }
          }
        }
        // If scanMod couldn't determine projectType or modName (e.g. ZIPs for textures/datapacks),
        // read both from the remote cache that was set during download.
        const cached = readCachedMeta(filePath);
        if (cached.projectType && cached.projectType !== "mod" && (!meta.projectType || meta.projectType === "mod")) {
          meta.projectType = cached.projectType;
        }
        if (cached.title && (!meta.modName || meta.modName === "unknown")) {
          meta.modName = cached.title;
        }
        // Last resort: clean up filename for display
        if (!meta.modName || meta.modName === "unknown") {
          meta.modName = cleanFilenameForDisplay(fileName);
        }
        send({ path: filePath, fileName, meta });
      };

      // ── 1. Flush existing files ───────────────────────────────────────────────
      // Process existing files sequentially without delay to avoid blocking the event loop or hammering Disk I/O
      const flushExistingFiles = async () => {
        for (const filePath of existingFiles) {
          await processFile(filePath, 0);
        }
      };
      void flushExistingFiles();

      // ── 2. Subscribe to events ────────────────────────────────────────────────
      const listener = (filePath: string) => processFile(filePath);
      const deleteListener = (filePath: string) => {
        send({ type: "deleted", path: filePath });
      };

      watcherEmitter.on("new_file", listener);
      watcherEmitter.on("deleted_file", deleteListener);

      // ── 3. Keepalive ping ─────────────────────────────────────────────────────
      // Browsers and reverse proxies close idle SSE connections after ~60 s.
      // A comment frame (":\n\n") resets the timeout without triggering a client event.
      const keepalive = setInterval(sendPing, KEEPALIVE_INTERVAL_MS);

      // ── 4. Cleanup on client disconnect ───────────────────────────────────────
      req.signal.addEventListener("abort", () => {
        watcherEmitter.off("new_file", listener);
        watcherEmitter.off("deleted_file", deleteListener);
        clearInterval(keepalive);
        // Formally close the stream so Node releases the underlying resources.
        try {
          controller.close();
        } catch {
          // Already closed — safe to ignore.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx not to buffer the SSE stream (must be "no" as a string)
      "X-Accel-Buffering": "no",
    },
  });
}