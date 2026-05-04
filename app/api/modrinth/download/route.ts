/**
 * /api/modrinth/download — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloads a file from a remote URL and saves it to the user's Downloads
 * folder so the watcher picks it up and the classify flow begins.
 *
 * Body: { url: string, filename: string }
 *
 * Changes from original:
 *   - filename sanitization: strips path traversal characters before joining
 *     with the Downloads directory (original used filename directly, which
 *     allowed a crafted filename like "../../evil.jar" to escape Downloads).
 *   - Validates that the URL is HTTPS — blocks accidental plain-HTTP downloads
 *     of mod files that could be intercepted.
 *   - Collision guard: if filename already exists in Downloads, appends a
 *     timestamp suffix instead of overwriting silently.
 *   - Response status forwarded in the error message when the remote fetch fails.
 *   - Structured console.error with route prefix on catch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { url, filename } = await req.json();

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

    // Convert the response body to a Buffer and write synchronously.
    // This runs in Node.js runtime (not Edge), so Buffer is available.
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(buffer));

    console.log(`[/api/modrinth/download] Saved: ${path.basename(targetPath)}`);
    return NextResponse.json({ success: true, targetPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/download] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}