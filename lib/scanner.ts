/**
 * @fileoverview MIM – Mod Scanner Orchestrator.
 * ─────────────────────────────────────────────────────────────────────────────
 * Lector de metadatos para archivos .jar (Zip). Utiliza buffers en memoria 
 * para analizar el contenido interno de los archivos sin necesidad de 
 * extracción física a disco, optimizando la velocidad de escaneo masivo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AdmZip from "adm-zip";
import fs from "fs";
import crypto from "crypto";
import { gameVersionFromFilename, normalizeModVersion } from "./scanner/utils";
import { parseForgeToml } from "./scanner/parsers";

/**
 * ModMeta: Interfaz unificada para los metadatos de cualquier loader.
 */
export interface ModMeta {
  modId: string;
  modName: string;
  modVersion: string;
  gameVersion: string;
  loader: string; // forge, fabric, neoforge, quilt, unknown
  projectType: string; // mod, resourcepack, shader, datapack
  isCompatibleWithConnector: boolean; // Predicción para Sinytra
  author?: string;
  iconBase64?: string; // Icono del mod extraído como Base64
  sha1?: string;
  providedIds?: string[];
  dependencies?: string[];
  conflicts?: string[];
  breaks?: string[];
}

const UNKNOWN = "unknown";
const DEFAULT_META: ModMeta = { 
  modId: UNKNOWN, 
  modName: UNKNOWN, 
  modVersion: UNKNOWN, 
  gameVersion: UNKNOWN, 
  loader: UNKNOWN, 
  projectType: UNKNOWN, 
  isCompatibleWithConnector: false 
};

/**
 * scanMod: Punto de entrada principal para el escaneo de un archivo.
 * Envuelve el proceso de lectura en crudo con validaciones de existencia.
 */
export function scanMod(filePath: string): ModMeta {
  if (!fs.existsSync(filePath)) throw new Error(`[Scanner] Archivo no encontrado: ${filePath}`);
  return scanModRaw(filePath);
}

/**
 * scanModRaw: Realiza el análisis profundo del archivo .jar.
 * 1. Calcula el hash SHA-1 para identificación unívoca.
 * 2. Abre el archivo como un Zip y busca archivos de metadatos específicos.
 * 3. Delega el parsing según el loader detectado.
 */
function scanModRaw(filePath: string): ModMeta {
  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");
  const zip = new AdmZip(fileBuffer);
  const entries = zip.getEntries();
  
  /**
   * findEntry: Helper para búsqueda de archivos insensibles a mayúsculas
   * y compatibles con estructuras de carpetas internas.
   */
  const findEntry = (name: string) => entries.find(e => 
    e.entryName.toLowerCase() === name.toLowerCase() || 
    e.entryName.toLowerCase().endsWith("/" + name.toLowerCase())
  );

  // ESTRATEGIA 1: Loader de la familia Forge (NeoForge/Forge)
  // Utilizan archivos .toml en META-INF
  const forgeEntry = findEntry("META-INF/neoforge.mods.toml") || findEntry("META-INF/mods.toml");
  if (forgeEntry) {
    const parsed = parseForgeToml(forgeEntry.getData().toString("utf8"));
    const loader = forgeEntry.entryName.includes("neoforge") ? "neoforge" : "forge";
    return { ...DEFAULT_META, ...parsed, loader, projectType: "mod", sha1 } as ModMeta;
  }

  // ESTRATEGIA 2: Loader de la familia Fabric (Fabric/Quilt)
  // Utilizan archivos .json en la raíz
  const fabricEntry = findEntry("fabric.mod.json") || findEntry("quilt.mod.json");
  if (fabricEntry) {
    try {
      const data = JSON.parse(fabricEntry.getData().toString("utf8"));
      const isQuilt = fabricEntry.entryName.includes("quilt");
      const ql = isQuilt ? (data.quilt_loader || {}) : data;
      
      return { 
        ...DEFAULT_META, 
        loader: isQuilt ? "quilt" : "fabric", 
        projectType: "mod", 
        modId: ql.id || data.id || UNKNOWN, 
        modName: (ql.metadata?.name || data.name) || UNKNOWN, 
        modVersion: normalizeModVersion(ql.version || data.version || UNKNOWN), 
        isCompatibleWithConnector: !isQuilt, 
        sha1 
      };
    } catch { 
      return { ...DEFAULT_META, loader: "fabric", sha1 }; 
    }
  }

  // ESTRATEGIA 3: Heurística para Packs y Shaders
  // Se basa en la presencia de carpetas 'assets', 'shaders' o archivos 'pack.mcmeta'
  const isShader = entries.some(e => e.entryName.startsWith("shaders/"));
  const isPack = entries.some(e => e.entryName.startsWith("assets/")) || findEntry("pack.mcmeta");
  
  return { 
    ...DEFAULT_META, 
    projectType: isShader ? "shader" : isPack ? "resourcepack" : "mod", 
    gameVersion: gameVersionFromFilename(filePath) || UNKNOWN, 
    sha1 
  };
}