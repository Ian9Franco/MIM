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

/** Interval between SSE keepalive pings (ms). */
const KEEPALIVE_INTERVAL_MS = 30_000;

export async function GET(req: NextRequest) {
  const downloadsPath = path.join(os.homedir(), "Downloads");
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
      const processFile = async (filePath: string) => {
        const fileName = path.basename(filePath);
        let meta: Partial<ModMeta> = {};
        try {
          // Small delay to ensure the file has finished writing and is no longer locked
          // (especially important for larger shaders/resourcepacks)
          await new Promise(resolve => setTimeout(resolve, 500));
          meta = scanMod(filePath);
        } catch {
          console.warn(`[/api/watcher] scanMod failed for: ${fileName}`);
        }
        send({ path: filePath, fileName, meta });
      };

      // ── 1. Flush existing files ───────────────────────────────────────────────
      for (const filePath of existingFiles) {
        processFile(filePath);
      }

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