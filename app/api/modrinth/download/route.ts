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
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";

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
    const { url, filename, hashes } = await req.json();

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
    const safeFilename = path.basename(filename as string);
    if (!safeFilename || safeFilename === ".") {
      return NextResponse.json(
        { error: "Invalid filename after sanitization" },
        { status: 400 }
      );
    }

    const downloadsDir = path.join(os.homedir(), "Downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const existingPath = findExistingByHash(downloadsDir, hashes);
    if (existingPath) {
      return NextResponse.json({
        success: true,
        skipped: true,
        existingPath,
        reason: "already_exists",
      });
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

    console.log(`[/api/modrinth/download] Saved: ${path.basename(targetPath)}`);
    return NextResponse.json({ success: true, targetPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/download] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
