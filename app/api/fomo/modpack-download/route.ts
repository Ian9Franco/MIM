/**
 * /api/fomo/modpack-download — POST
 * Resuelve URLs reales (Modrinth/CurseForge) y guarda cada mod en Downloads.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSettings, getApiKey } from "@/lib/core/settings";
import { enrichUpdatesCache } from "@/lib/storage/cache-enricher";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const MODRINTH_API = "https://api.modrinth.com/v2";

interface ManifestMod {
  id?: string;
  name?: string;
  fileName?: string;
  sha1?: string;
  platform?: string;
  _source?: "modrinth" | "curseforge";
  downloadUrl?: string;
}

function modrinthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  const apiKey = getApiKey("modrinth");
  if (apiKey) headers.Authorization = apiKey;
  return headers;
}

async function fetchModrinthVersion(
  projectId: string,
  loader: string,
  gameVersion: string
): Promise<{ url: string; filename: string; hashes?: Record<string, string> } | null> {
  const params = new URLSearchParams();
  params.set("game_versions", JSON.stringify([gameVersion]));
  params.set("loaders", JSON.stringify([loader]));

  let url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version?${params}`;
  let res = await fetch(url, { headers: modrinthHeaders(), cache: "no-store" });
  let versions = await res.json();

  if (Array.isArray(versions) && versions.length === 0) {
    url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version`;
    res = await fetch(url, { headers: modrinthHeaders(), cache: "no-store" });
    versions = await res.json();
  }

  if (!Array.isArray(versions) || versions.length === 0) return null;
  const v = versions[0];
  const file =
    v.files?.find((f: { primary?: boolean }) => f.primary) || v.files?.[0];
  if (!file?.url) return null;
  return { url: file.url, filename: file.filename, hashes: file.hashes };
}

const LOADER_TO_CF_ID: Record<string, number> = {
  forge: 1,
  fabric: 4,
  neoforge: 6,
  quilt: 5,
};

async function fetchCurseforgeVersion(
  slugOrId: string,
  loader: string,
  gameVersion: string
): Promise<{ url: string; filename: string; projectId: string } | null> {
  const apiKey = getApiKey("curseforge");
  if (!apiKey) return null;

  const headers = { "x-api-key": apiKey, Accept: "application/json" };

  let projectId = slugOrId;
  if (!/^\d+$/.test(slugOrId)) {
    const searchRes = await fetch(
      `https://api.curseforge.com/v1/mods/search?gameId=432&searchFilter=${encodeURIComponent(slugOrId)}&pageSize=8`,
      { headers }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const hit =
      searchData.data?.find(
        (m: { slug?: string; name?: string }) =>
          m.slug?.toLowerCase() === slugOrId.toLowerCase() ||
          m.name?.toLowerCase().includes(slugOrId.toLowerCase())
      ) || searchData.data?.[0];
    if (!hit?.id) return null;
    projectId = String(hit.id);
  }

  const filesRes = await fetch(
    `https://api.curseforge.com/v1/mods/${projectId}/files`,
    { headers }
  );
  if (!filesRes.ok) return null;
  const filesData = await filesRes.json();
  let files = filesData.data || [];

  if (gameVersion) {
    files = files.filter((f: { gameVersions?: string[] }) =>
      f.gameVersions?.includes(gameVersion)
    );
  }
  const loaderName = Object.keys(LOADER_TO_CF_ID).find(
    (k) => k.toLowerCase() === loader.toLowerCase()
  );
  if (loaderName) {
    const filtered = files.filter((f: { gameVersions?: string[] }) =>
      f.gameVersions?.some(
        (gv: string) => gv.toLowerCase() === loaderName.toLowerCase()
      )
    );
    if (filtered.length > 0) files = filtered;
  }

  const file = files.find((f: { fileName?: string }) => f.fileName?.endsWith(".jar")) || files[0];
  if (!file?.fileName) return null;

  let downloadUrl = file.downloadUrl as string | undefined;
  if (!downloadUrl && file.id) {
    const fileIdNum = Number(file.id);
    const prefix = Math.floor(fileIdNum / 1000);
    const suffix = fileIdNum % 1000;
    downloadUrl = `https://edge.forgecdn.net/files/${prefix}/${suffix}/${encodeURIComponent(file.fileName)}`;
  }
  if (!downloadUrl) return null;

  return { url: downloadUrl, filename: file.fileName, projectId };
}

async function resolveModDownload(
  mod: ManifestMod,
  loader: string,
  gameVersion: string
): Promise<{
  url: string;
  filename: string;
  source: "modrinth" | "curseforge";
  hashes?: Record<string, string>;
  projectId: string;
  title: string;
} | null> {
  const title = mod.name || mod.fileName || "mod";
  const slug = mod.id && mod.id !== "unknown" ? mod.id : null;

  if (mod.downloadUrl?.startsWith("https://")) {
    return {
      url: mod.downloadUrl,
      filename: mod.fileName || `${title}.jar`,
      source:
        mod._source === "curseforge" || mod.platform === "curseforge"
          ? "curseforge"
          : "modrinth",
      hashes: mod.sha1 ? { sha1: mod.sha1 } : undefined,
      projectId: slug || title,
      title,
    };
  }

  if (slug) {
    const mr = await fetchModrinthVersion(slug, loader, gameVersion);
    if (mr) {
      return { ...mr, source: "modrinth", projectId: slug, title };
    }
    const cf = await fetchCurseforgeVersion(slug, loader, gameVersion);
    if (cf) {
      return { ...cf, source: "curseforge", title };
    }
  }

  if (title && title !== "unknown") {
    const searchRes = await fetch(
      `${MODRINTH_API}/search?query=${encodeURIComponent(title)}&limit=3`,
      { headers: modrinthHeaders() }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      const hit = data.hits?.[0];
      if (hit?.project_id) {
        const mr = await fetchModrinthVersion(hit.project_id, loader, gameVersion);
        if (mr) {
          return { ...mr, source: "modrinth", projectId: hit.project_id, title };
        }
      }
    }
    const cf = await fetchCurseforgeVersion(title, loader, gameVersion);
    if (cf) return { ...cf, source: "curseforge", title };
  }

  return null;
}

async function writeToDownloads(
  url: string,
  filename: string,
  meta: {
    projectId?: string;
    title?: string;
    loader?: string;
    gameVersion?: string;
    hashes?: Record<string, string>;
  }
) {
  let safeFilename = path.basename(filename);
  if (!/\.(jar|zip|mrpack)$/i.test(safeFilename)) {
    safeFilename += ".jar";
  }

  const settings = getSettings();
  const downloadsDir = settings.downloadsPath;
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  let destPath = path.join(downloadsDir, safeFilename);
  if (fs.existsSync(destPath)) {
    const ext = path.extname(safeFilename);
    const base = path.basename(safeFilename, ext);
    destPath = path.join(downloadsDir, `${base}_${Date.now()}${ext}`);
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${safeFilename}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  const sha1 =
    meta.hashes?.sha1 ||
    crypto.createHash("sha1").update(buffer).digest("hex");

  enrichUpdatesCache({
    filePath: destPath,
    projectId: meta.projectId,
    loader: meta.loader,
    gameVersion: meta.gameVersion,
    projectType: "mod",
    title: meta.title,
    sha1,
  });

  return destPath;
}

export async function POST(req: NextRequest) {
  try {
    const { mods, loader, gameVersion } = await req.json();
    if (!Array.isArray(mods) || mods.length === 0) {
      return NextResponse.json({ error: "No mods in manifest" }, { status: 400 });
    }
    if (!loader || !gameVersion) {
      return NextResponse.json({ error: "Missing loader or gameVersion" }, { status: 400 });
    }

    const settings = getSettings();
    const results: { name: string; ok: boolean; error?: string }[] = [];

    for (const mod of mods as ManifestMod[]) {
      const name = mod.name || mod.fileName || mod.id || "unknown";
      try {
        const resolved = await resolveModDownload(mod, loader, gameVersion);
        if (!resolved) {
          results.push({ name, ok: false, error: "No se pudo resolver URL" });
          continue;
        }

        await writeToDownloads(resolved.url, resolved.filename, {
          projectId: resolved.projectId,
          title: resolved.title,
          loader,
          gameVersion,
          hashes: resolved.hashes,
        });
        results.push({ name, ok: true });
      } catch (e) {
        results.push({
          name,
          ok: false,
          error: e instanceof Error ? e.message : "Error",
        });
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);

    return NextResponse.json({
      success: succeeded > 0,
      succeeded,
      failed: failed.length,
      total: mods.length,
      downloadsPath: settings.downloadsPath,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
