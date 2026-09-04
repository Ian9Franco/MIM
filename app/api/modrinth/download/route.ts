/**
 * /api/modrinth/download — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Descarga un archivo desde una URL remota y lo guarda en la carpeta Downloads
 * del usuario para que el watcher lo detecte e inicie el flujo de clasificación.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { enrichUpdatesCache } from "@/lib/storage/cache-enricher";
import { watcherEmitter } from "@/lib/core/watcher";
import { findExisting, AduanaDirs } from "@/lib/fomo/aduana";

const bodySchema = z.object({
  url: z.string().url("Invalid URL format"),
  filename: z.string().min(1, "Missing filename"),
  hashes: z.object({
    sha1: z.string().optional(),
    sha512: z.string().optional(),
  }).optional(),
  iconUrl: z.string().optional().nullable(),
  projectId: z.string().optional(),
  loader: z.string().optional(),
  gameVersion: z.string().optional(),
  projectType: z.string().optional(),
  title: z.string().optional(),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    bodySchema,
  },
  async ({ body }) => {
    try {
      const { url, filename, hashes, iconUrl, projectId, loader, gameVersion, projectType, title } = body;

      // ── Validate URL scheme ────────────────────────────────────────────────────
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
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
      let safeFilename = path.basename(filename);
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

      // ── Aduana: deduplicación inteligente por hash ─────────────────────────
      const aduanaDirs: AduanaDirs = {
        downloadsDir,
        sourceBase:   settings.sourceBase,
        buildsBase:   settings.buildsBase,
        stagingPath:  settings.stagingPath,
        minecraftPath: settings.minecraftPath,
      };

      const dedup = findExisting(aduanaDirs, hashes, safeFilename);

      if (dedup.found && dedup.filePath && dedup.matchedByHash) {
        const existingPath = dedup.filePath;
        const cacheArgs = { filePath: existingPath, projectId, iconUrl: iconUrl ?? undefined, loader, gameVersion, projectType, title, sha1: hashes?.sha1 };

        switch (dedup.location) {
          case "downloads": {
            enrichUpdatesCache(cacheArgs);
            watcherEmitter.emit("new_file", existingPath);
            return NextResponse.json({ success: true, skipped: true, existingPath, reason: "already_in_downloads" });
          }

          case "minecraft_mods":
          case "minecraft_rp":
          case "minecraft_sp": {
            enrichUpdatesCache(cacheArgs);
            return NextResponse.json({ success: true, skipped: true, existingPath, reason: "already_installed_minecraft", location: dedup.location });
          }

          case "library":
          case "builds":
          case "staging":
          default: {
            const ext = path.extname(safeFilename);
            const base = path.basename(safeFilename, ext);
            let targetPath = path.join(downloadsDir, safeFilename);
            if (fs.existsSync(targetPath)) {
              targetPath = path.join(downloadsDir, `${base}_${Date.now()}${ext}`);
            }
            try {
              fs.copyFileSync(existingPath, targetPath);
              console.log(`[/api/modrinth/download] Dedup (${dedup.location}): ${path.basename(existingPath)} → ${path.basename(targetPath)}`);
              enrichUpdatesCache({ ...cacheArgs, filePath: targetPath });
              return NextResponse.json({ success: true, targetPath, copiedFromLibrary: true, location: dedup.location });
            } catch (copyErr) {
              console.error("[/api/modrinth/download] Copy failed, proceeding to fresh download:", copyErr);
            }
          }
        }
      }

      // ── Collision guard ────────────────────────────────────────────────────────
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
        iconUrl: iconUrl ?? undefined,
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
);
