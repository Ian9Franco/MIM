/**
 * aduana.ts — Módulo de deduplicación de descargas de MIM
 * ─────────────────────────────────────────────────────────────────────────────
 * "Aduana": antes de que un archivo entre al sistema, se verifica si ya existe.
 *
 * ## Reglas de deduplicación
 *
 * 1. **Versiones distintas NUNCA se confunden** — la comparación es siempre por
 *    hash criptográfico (SHA-512 > SHA-1). Si el hash difiere, son archivos
 *    distintos, sin importar que tengan el mismo nombre o el mismo `projectId`.
 *    Sodium 0.5.8 y Sodium 0.5.11 tienen hashes distintos → nunca se bloquean.
 *
 * 2. **Búsqueda por nombre = hint, nunca decisión final** — el nombre de archivo
 *    se usa SOLO como atajos para encontrar candidatos rápidamente. La decisión
 *    final siempre es por hash. Si no hay hashes disponibles, NO se deduplica
 *    (es mejor re-descargar que bloquear una versión incorrecta).
 *
 * 3. **Scope por proyecto** — el resultado devuelve DÓNDE se encontró el archivo.
 *    Las rutas de descarga usan esa información para decidir:
 *      - ¿Está en Downloads? → re-emitir al watcher (permite multi-proyecto)
 *      - ¿Está en sourceBase/buildsBase? → copiar a Downloads (ahorra internet)
 *      - ¿Está en minecraftMods (MIMu)? → ya instalado, notificar diferente
 *
 * 4. **Caché de hashes en memoria** — evita re-leer disco en requests paralelos.
 *    Se invalida automáticamente si el archivo cambia (mtime + size).
 *
 * 5. **Límite de profundidad** — evita explosión de recursión en carpetas grandes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface AduanaHashes {
  sha1?: string;
  sha512?: string;
  md5?: string;
}

export type AduanaLocation =
  | "downloads"       // ya estaba en la carpeta Downloads del usuario
  | "library"         // encontrado en sourceBase (librería principal de MIM)
  | "builds"          // encontrado en buildsBase
  | "staging"         // encontrado en stagingPath
  | "minecraft_mods"  // encontrado en .minecraft/mods (MIMu: ya instalado)
  | "minecraft_rp"    // encontrado en .minecraft/resourcepacks
  | "minecraft_sp"    // encontrado en .minecraft/shaderpacks
  | "unknown";        // otro directorio extra

export interface AduanaResult {
  /** true si se encontró un archivo con el mismo hash exacto */
  found: boolean;
  filePath?: string;
  /** Dónde se encontró el archivo */
  location?: AduanaLocation;
  /** true si la coincidencia fue confirmada por hash criptográfico */
  matchedByHash: boolean;
}

// ── Caché de hashes en memoria ────────────────────────────────────────────────

interface HashCacheEntry {
  sha1: string;
  sha512: string;
  mtime: number;
  size: number;
}

const hashCache = new Map<string, HashCacheEntry>();

/** Archivos > 500 MB no se hashean (evitar OOM en jars de modpacks grandes) */
const MAX_HASH_FILE_SIZE = 500 * 1024 * 1024;

/** Profundidad máxima de recursión al escanear directorios */
const DEFAULT_MAX_DEPTH = 4;

/** Extensiones de archivo que gestiona MIM */
const MANAGED_EXTENSIONS = /\.(jar|zip|mrpack|litemod)$/i;

// ── Colector de archivos ──────────────────────────────────────────────────────

export function collectFiles(
  dir: string,
  bucket: string[],
  depth: number = DEFAULT_MAX_DEPTH
): void {
  if (depth < 0 || !dir || !fs.existsSync(dir)) return;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        collectFiles(path.join(dir, entry.name), bucket, depth - 1);
      } else if (entry.isFile() && MANAGED_EXTENSIONS.test(entry.name)) {
        bucket.push(path.join(dir, entry.name));
      }
    }
  } catch {
    // Directorio inaccesible (permisos, junction point, etc.)
  }
}

/** @deprecated Usa `collectFiles`. Alias de compatibilidad. */
export const collectJarFiles = collectFiles;

// ── Cálculo de hashes con caché ───────────────────────────────────────────────

function getFileHashes(filePath: string): HashCacheEntry | null {
  try {
    const stat = fs.statSync(filePath);
    const cached = hashCache.get(filePath);

    if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
      return cached;
    }

    if (stat.size > MAX_HASH_FILE_SIZE) {
      console.warn(`[aduana] Skipping hash for oversized file: ${path.basename(filePath)} (${Math.round(stat.size / 1024 / 1024)}MB)`);
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    const entry: HashCacheEntry = {
      sha1:   crypto.createHash("sha1").update(buffer).digest("hex"),
      sha512: crypto.createHash("sha512").update(buffer).digest("hex"),
      mtime:  stat.mtimeMs,
      size:   stat.size,
    };
    hashCache.set(filePath, entry);
    return entry;
  } catch {
    return null;
  }
}

function hashesMatch(fileHashes: HashCacheEntry, wanted: AduanaHashes): boolean {
  // SHA-512 tiene prioridad (más fuerte). Si coincide, es definitivo.
  if (wanted.sha512 && fileHashes.sha512 === wanted.sha512) return true;
  // SHA-1 como fallback (CurseForge a veces solo provee sha1)
  if (wanted.sha1 && fileHashes.sha1 === wanted.sha1) return true;
  return false;
}

// ── Configuración de directorios ──────────────────────────────────────────────

export interface AduanaDirs {
  /** Destino principal de la descarga (carpeta Downloads del usuario) */
  downloadsDir: string;
  /** Librería principal de MIM (.MIM/source) */
  sourceBase?: string;
  /** Carpeta de builds (.MIM/builds) */
  buildsBase?: string;
  /** Staging (.mim-index/staging) */
  stagingPath?: string;
  /** Ruta base de .minecraft (para MIMu) */
  minecraftPath?: string;
}

function classifyPath(filePath: string, dirs: AduanaDirs): AduanaLocation {
  const fp = filePath.toLowerCase();
  if (dirs.minecraftPath) {
    const mc = dirs.minecraftPath.toLowerCase();
    if (fp.startsWith(path.join(mc, "mods").toLowerCase()))        return "minecraft_mods";
    if (fp.startsWith(path.join(mc, "resourcepacks").toLowerCase())) return "minecraft_rp";
    if (fp.startsWith(path.join(mc, "shaderpacks").toLowerCase()))   return "minecraft_sp";
  }
  if (dirs.downloadsDir && fp.startsWith(dirs.downloadsDir.toLowerCase())) return "downloads";
  if (dirs.sourceBase   && fp.startsWith(dirs.sourceBase.toLowerCase()))   return "library";
  if (dirs.buildsBase   && fp.startsWith(dirs.buildsBase.toLowerCase()))   return "builds";
  if (dirs.stagingPath  && fp.startsWith(dirs.stagingPath.toLowerCase()))   return "staging";
  return "unknown";
}

// ── API principal ─────────────────────────────────────────────────────────────

/**
 * Busca si un archivo ya existe en cualquiera de las ubicaciones conocidas del
 * sistema MIM, usando hash criptográfico como única fuente de verdad.
 *
 * ## Garantías
 * - **Nunca** confunde versiones distintas (hashes distintos → archivos distintos)
 * - **Nunca** bloquea si no hay hashes disponibles (sin hashes = sin dedup)
 * - **Sí** detecta el mismo archivo en cualquier directorio del sistema
 * - **Sí** detecta mods ya instalados en .minecraft/mods (MIMu)
 *
 * @param dirs          Directorios del sistema a escanear
 * @param hashes        Hashes del archivo remoto (sha1, sha512)
 * @param targetFilename Nombre del archivo destino (solo como hint de búsqueda rápida)
 */
export function findExisting(
  dirs: AduanaDirs,
  hashes?: AduanaHashes,
  targetFilename?: string
): AduanaResult {
  // Sin hashes → no podemos garantizar que sea el mismo archivo. No deduplicar.
  if (!hashes?.sha1 && !hashes?.sha512) {
    return { found: false, matchedByHash: false };
  }

  const allScanDirs: Array<{ dir: string }> = [
    { dir: dirs.downloadsDir },
    ...(dirs.sourceBase   ? [{ dir: dirs.sourceBase }]   : []),
    ...(dirs.buildsBase   ? [{ dir: dirs.buildsBase }]   : []),
    ...(dirs.stagingPath  ? [{ dir: dirs.stagingPath }]  : []),
    // MIMu: escanear carpetas de contenido de .minecraft
    ...(dirs.minecraftPath ? [
      { dir: path.join(dirs.minecraftPath, "mods") },
      { dir: path.join(dirs.minecraftPath, "resourcepacks") },
      { dir: path.join(dirs.minecraftPath, "shaderpacks") },
    ] : []),
  ].filter(({ dir }) => !!dir);

  // ── Paso 1: búsqueda rápida por nombre de archivo ──────────────────────────
  // El nombre del archivo incluye la versión (ej: sodium-mc1.20.1-0.5.8+.jar),
  // así que si el nombre coincide Y el hash también coincide, es una dedup
  // segura sin tener que escanear todo el directorio.
  if (targetFilename) {
    const safeName = path.basename(targetFilename);
    for (const { dir } of allScanDirs) {
      if (!fs.existsSync(dir)) continue;
      const candidate = path.join(dir, safeName);
      if (fs.existsSync(candidate)) {
        const fileHashes = getFileHashes(candidate);
        if (fileHashes && hashesMatch(fileHashes, hashes)) {
          return {
            found: true,
            filePath: candidate,
            location: classifyPath(candidate, dirs),
            matchedByHash: true,
          };
        }
        // Mismo nombre pero hash distinto → versión diferente. Seguimos buscando
        // (podría haber otra copia con el hash correcto en otro directorio).
      }
    }
  }

  // ── Paso 2: escaneo completo por hash ─────────────────────────────────────
  // Solo llega aquí si la búsqueda por nombre no encontró coincidencia exacta.
  // Escanea todos los archivos de todos los directorios y compara por hash.
  const candidates: string[] = [];
  for (const { dir } of allScanDirs) {
    collectFiles(dir, candidates);
  }

  for (const filePath of candidates) {
    const fileHashes = getFileHashes(filePath);
    if (!fileHashes) continue;
    if (hashesMatch(fileHashes, hashes)) {
      return {
        found: true,
        filePath,
        location: classifyPath(filePath, dirs),
        matchedByHash: true,
      };
    }
  }

  return { found: false, matchedByHash: false };
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Limpia la caché de hashes. Útil en tests o tras operaciones masivas de disco. */
export function clearHashCache(): void {
  hashCache.clear();
}

export function getHashCacheStats() {
  return { size: hashCache.size };
}

/**
 * @deprecated Usa `findExisting` con el objeto `AduanaDirs`.
 * Wrapper de compatibilidad hacia atrás.
 */
export function findExistingByHash(
  downloadsDir: string,
  sourceBase: string,
  hashes?: AduanaHashes,
  targetFilename?: string
): string | null {
  const result = findExisting({ downloadsDir, sourceBase }, hashes, targetFilename);
  return result.found ? (result.filePath ?? null) : null;
}
