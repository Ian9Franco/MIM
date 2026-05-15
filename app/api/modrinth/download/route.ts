/**
 * /api/modrinth/download — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Descarga un archivo desde una URL remota y lo guarda en la carpeta Downloads
 * del usuario para que el watcher lo detecte e inicie el flujo de clasificación.
 *
 * Body: { url: string, filename: string, hashes?: { sha1?: string, sha512?: string } }
 * Respuesta: { success: true, targetPath: string }
 *           | { success: true, skipped: true, existingPath: string, reason: "already_exists" }
 *
 * Seguridad:
 *   - Solo permite URLs HTTPS (Modrinth siempre usa HTTPS).
 *   - filename sanitizado con path.basename para prevenir path traversal.
 *   - Guard de colisión: si el archivo ya existe, agrega sufijo timestamp.
 *   - Verificación de integridad SHA512/SHA1 tras la descarga.
 *   - Deduplicación por hash: si el archivo ya existe en Downloads o SOURCE_BASE, no descarga de nuevo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { enrichUpdatesCache } from "@/lib/cache-enricher";
import { watcherEmitter } from "@/lib/watcher";

function collectJarFiles(dir: string, bucket: string[]) {
  if (!fs.existsSync(dir)) return;
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
}

function findExistingByHash(downloadsDir: string, hashes?: Record<string, string>) {
  if (!hashes?.sha1 && !hashes?.sha512) return null;

  const candidates: string[] = [];
  collectJarFiles(downloadsDir, candidates);
  collectJarFiles(SOURCE_BASE, candidates);

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

export async function POST(req: NextRequest) {
  try {
    const { url, filename, hashes, iconUrl, projectId, loader, gameVersion, projectType, title } = await req.json();

    if (!url || !filename) {
      return NextResponse.json(
        { error: "Missing required fields: url, filename" },
        { status: 400 }
      );
    }

    // ── Validate URL scheme ────────────────────────────────────────────────────
    // Only allow HTTPS to prevent downloading over a plain-HTTP connection
    // that could be intercepted (Modrinth always serves HTTPS anyway).
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url as string);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTPS URLs are allowed" },
        { status: 400 }
      );
    }

    // ── Sanitize filename ──────────────────────────────────────────────────────
    // path.basename strips any directory components, preventing traversal like
    // "../../evil.jar" escaping the Downloads folder.
    let safeFilename = path.basename(filename as string);
    if (!/\.(jar|zip|mrpack)$/i.test(safeFilename)) {
      const pType = projectType || "mod";
      const ext = pType === "mod" ? ".jar" : pType === "modpack" ? ".mrpack" : ".zip";
      safeFilename = `${safeFilename}${ext}`;
    }
    if (!safeFilename || safeFilename === ".") {
      return NextResponse.json(
        { error: "Invalid filename after sanitization" },
        { status: 400 }
      );
    }

    const settings = getSettings();
    const downloadsDir = settings.downloadsPath;
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const existingPath = findExistingByHash(downloadsDir, hashes);
    if (existingPath) {
      // Si el archivo ya existe pero está en SOURCE_BASE (la librería) y NO en Downloads,
      // lo copiamos localmente a la carpeta Downloads para que el watcher lo detecte
      // y lo asigne/copie al proyecto activo. ¡Esto ahorra internet y soluciona la duplicidad!
      const isInDownloads = existingPath.toLowerCase().startsWith(downloadsDir.toLowerCase());
      if (!isInDownloads) {
        const ext = path.extname(safeFilename);
        const base = path.basename(safeFilename, ext);
        let targetPath = path.join(downloadsDir, safeFilename);

        if (fs.existsSync(targetPath)) {
          targetPath = path.join(downloadsDir, `${base}_${Date.now()}${ext}`);
        }

        try {
          fs.copyFileSync(existingPath, targetPath);
          console.log(`[/api/modrinth/download] Copied locally from library to Downloads: ${path.basename(targetPath)}`);
          
          enrichUpdatesCache({
            filePath: targetPath,
            projectId,
            iconUrl,
            loader,
            gameVersion,
            projectType,
            title,
            sha1: hashes?.sha1
          });

          return NextResponse.json({ success: true, targetPath, copiedLocally: true });
        } catch (copyErr) {
          console.error("[/api/modrinth/download] Failed to copy locally, proceeding to download:", copyErr);
          // Si falla, continúa para descargar normalmente
        }
      } else {
        enrichUpdatesCache({
          filePath: existingPath,
          projectId,
          iconUrl,
          loader,
          gameVersion,
          projectType,
          title,
          sha1: hashes?.sha1
        });

        watcherEmitter.emit("new_file", existingPath);

        return NextResponse.json({
          success: true,
          skipped: true,
          existingPath,
          reason: "already_exists",
        });
      }
    }

    // ── Collision guard ────────────────────────────────────────────────────────
    // Append a timestamp suffix if the file already exists in Downloads to
    // avoid silently overwriting a mod the user may have intentionally kept.
    const ext = path.extname(safeFilename);
    const base = path.basename(safeFilename, ext);
    let targetPath = path.join(downloadsDir, safeFilename);

    if (fs.existsSync(targetPath)) {
      targetPath = path.join(downloadsDir, `${base}_${Date.now()}${ext}`);
    }

    // ── Download ───────────────────────────────────────────────────────────────
    const res = await fetch(parsedUrl.toString());
    if (!res.ok) {
      throw new Error(
        `Remote fetch failed: ${res.status} ${res.statusText} — ${parsedUrl.hostname}`
      );
    }

    const buffer = await res.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    // ── Integrity check ────────────────────────────────────────────────────────
    if (hashes) {
      if (hashes.sha512) {
        const hash = crypto.createHash("sha512").update(nodeBuffer).digest("hex");
        if (hash !== hashes.sha512) throw new Error("SHA512 integrity check failed");
      } else if (hashes.sha1) {
        const hash = crypto.createHash("sha1").update(nodeBuffer).digest("hex");
        if (hash !== hashes.sha1) throw new Error("SHA1 integrity check failed");
      }
    }

    fs.writeFileSync(targetPath, nodeBuffer);

    enrichUpdatesCache({
      filePath: targetPath,
      projectId,
      iconUrl,
      loader,
      gameVersion,
      projectType,
      title,
      sha1: hashes?.sha1
    });

    console.log(`[/api/modrinth/download] Saved: ${path.basename(targetPath)}`);
    return NextResponse.json({ success: true, targetPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/download] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
