import { SOURCE_BASE } from "@/lib/core/constants";
import { getApiKey } from "@/lib/core/settings";
import path from "path";
import * as fsSync from "fs";

/**
 * @fileoverview UpdateService — Lógica de comparación de versiones y caché para Modrinth.
 * ─────────────────────────────────────────────────────────────────────────────
 * Este servicio centraliza la normalización de versiones, consulta de metadatos
 * remotos (iconos, categorías, actualizaciones) y la gestión de la caché remota
 * para optimizar el uso de la API de Modrinth.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MODRINTH_API = "https://api.modrinth.com/v2";
const REMOTE_CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "remote-cache.json");

/**
 * Normaliza versiones de Minecraft y mods para una comparación precisa.
 * Elimina prefijos 'v', etiquetas de loader y versiones de Minecraft incrustadas.
 */
export function normalizeVersion(v: string): string {
  if (!v) return "";
  let clean = v.toLowerCase().replace(/^v/, "")
    .replace(/[-+](fabric|forge|neoforge|quilt|snapshot|alpha|beta|dev|local|all)/gi, "")
    .replace(/[-+](mc)?1\.(1[6-9]|2\d)(\.\d+)?/gi, "")
    .replace(/[_-]/g, ".").replace(/[^0-9.]/g, "");
  
  return clean.split(".").map(s => s.replace(/^0+/, "") || "0").join(".")
    .replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".");
}

/**
 * Compara si la versión 'latest' es numéricamente superior a 'current'.
 */
export function hasRealUpdate(latest: string, current: string): boolean {
  const nL = normalizeVersion(latest);
  const nC = normalizeVersion(current);
  if (!nL || !nC) return latest !== current;
  if (nL === nC) return false;

  const pL = nL.split(".").map(Number);
  const pC = nC.split(".").map(Number);
  for (let i = 0; i < Math.max(pL.length, pC.length); i++) {
    const vL = pL[i] || 0;
    const vC = pC[i] || 0;
    if (vL > vC) return true;
    if (vL < vC) return false;
  }
  return false;
}

/**
 * Gestiona la caché remota persistente de Modrinth.
 */
export const updateCache = {
  get: () => {
    if (fsSync.existsSync(REMOTE_CACHE_FILE)) {
      try { return JSON.parse(fsSync.readFileSync(REMOTE_CACHE_FILE, "utf-8")); } catch { return { entries: {} }; }
    }
    return { entries: {} };
  },
  save: (data: any) => {
    try {
      fsSync.mkdirSync(path.dirname(REMOTE_CACHE_FILE), { recursive: true });
      fsSync.writeFileSync(REMOTE_CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch {}
  }
};

/**
 * Realiza la búsqueda y consulta de un mod individual en Modrinth.
 * Obtiene icono, categorías y verifica si hay una versión superior disponible.
 */
export async function checkModUpdate(mod: any, loader: string, gameVersion: string, headers: any, hashToProject: Record<string, any>) {
  const sha1 = mod.meta?.sha1;
  const hashData = sha1 ? hashToProject[sha1] : null;
  let projectId = (hashData && typeof hashData === 'object') ? hashData.project_id : hashData;

  if (!projectId && mod.meta?.modId && mod.meta.modId !== "unknown") {
    projectId = mod.meta.modId;
  }

  if (!projectId) {
    return { path: mod.path, status: "unknown" };
  }

  try {
    // 1. Obtener proyecto para conseguir icon_url y categorías
    const pRes = await fetch(`${MODRINTH_API}/project/${projectId}`, { headers });
    if (!pRes.ok) return { path: mod.path, status: "unknown" };
    const pData = await pRes.json();

    // 2. Obtener versiones compatibles
    const queryParams = new URLSearchParams({
      loaders: JSON.stringify([loader]),
      game_versions: JSON.stringify([gameVersion])
    });

    const vRes = await fetch(`${MODRINTH_API}/project/${projectId}/version?${queryParams}`, { headers });
    let status = "up_to_date";
    let latestVersion = mod.meta?.modVersion || "unknown";

    if (vRes.ok) {
      const vData = await vRes.json();
      if (vData && vData.length > 0) {
        latestVersion = vData[0].version_number;
        if (hasRealUpdate(latestVersion, mod.meta?.modVersion || "")) {
          status = "update_available";
        }
      }
    }

    const result = {
      path: mod.path,
      status,
      projectId: pData.id,
      slug: pData.slug,
      iconUrl: pData.icon_url || undefined,
      categories: pData.categories || [],
      latestVersion,
      currentVersion: mod.meta?.modVersion,
      gameVersions: pData.game_versions || [],
      loaders: pData.loaders || []
    };

    // Si tenemos la información específica de la versión resuelta por hash, la usamos con prioridad
    // para evitar que mods de otras versiones parezcan compatibles/incompatibles erróneamente
    if (sha1 && hashToProject[sha1] && typeof hashToProject[sha1] === 'object') {
      const vInfo: any = hashToProject[sha1];
      result.gameVersions = vInfo.game_versions || result.gameVersions;
      result.loaders = vInfo.loaders || result.loaders;
    }

    // Guardar en caché bajo SHA1, FilePath y FileName para asegurar hits tras clasificar
    const cache = updateCache.get();
    const now = Date.now();
    const fileName = path.basename(mod.path);
    const keySha1 = sha1 ? `${sha1}-${loader}-${gameVersion}` : null;
    const keyPath = `${mod.path}-${loader}-${gameVersion}`;
    const keyFileName = `${fileName}-${loader}-${gameVersion}`;

    if (!cache.entries) cache.entries = {};
    if (keySha1) cache.entries[keySha1] = { cachedAt: now, result };
    cache.entries[keyPath] = { cachedAt: now, result };
    cache.entries[keyFileName] = { cachedAt: now, result };

    updateCache.save(cache);
    return result;
  } catch (err) {
    return { path: mod.path, status: "unknown" };
  }
}
