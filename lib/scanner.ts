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
import { evaluateCandidates, ScanCandidate } from "./scanner/scoring";

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
  clientSide?: string;
  serverSide?: string;
  confidence?: "high" | "medium" | "low";
  warnings?: string[];
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
  const candidates: ScanCandidate[] = [];
  
  const findEntry = (name: string) => entries.find(e => 
    e.entryName.toLowerCase() === name.toLowerCase() || 
    e.entryName.toLowerCase().endsWith("/" + name.toLowerCase())
  );

  // 1. Extraer candidatos de Forge/NeoForge
  const forgeEntries = entries.filter(e => 
    e.entryName.toLowerCase().endsWith("mods.toml") || 
    e.entryName.toLowerCase().includes("neoforge.mods.toml")
  );

  for (const entry of forgeEntries) {
    try {
      const parsed = parseForgeToml(entry.getData().toString("utf8"));
      const loader = entry.entryName.includes("neoforge") ? "neoforge" : "forge";
      candidates.push({ 
        ...DEFAULT_META, ...parsed, loader, projectType: "mod", sha1, 
        source: entry.entryName 
      } as ScanCandidate);
    } catch {}
  }

  // 2. Extraer candidatos de Fabric/Quilt
  const fabricEntry = findEntry("fabric.mod.json");
  const quiltEntry = findEntry("quilt.mod.json");
  const fabricEntries = [fabricEntry, quiltEntry].filter(Boolean);

  for (const entry of fabricEntries) {
    try {
      const data = JSON.parse(entry!.getData().toString("utf8"));
      const isQuilt = entry!.entryName.includes("quilt");
      const ql = isQuilt ? (data.quilt_loader || {}) : data;
      candidates.push({
        ...DEFAULT_META,
        loader: isQuilt ? "quilt" : "fabric",
        projectType: "mod",
        modId: ql.id || data.id || UNKNOWN,
        modName: (ql.metadata?.name || data.name) || UNKNOWN,
        modVersion: normalizeModVersion(ql.version || data.version || UNKNOWN),
        isCompatibleWithConnector: !isQuilt,
        sha1,
        source: entry!.entryName
      } as ScanCandidate);
    } catch {}
  }

  // 3. Candidato de Respaldo (Filename)
  const filenameVersion = gameVersionFromFilename(filePath);
  candidates.push({
    ...DEFAULT_META,
    gameVersion: filenameVersion || UNKNOWN,
    loader: UNKNOWN,
    source: "filename"
  } as ScanCandidate);

  // 4. Evaluar Candidatos con el Motor de Scoring
  const { bestMatch, confidence, warnings } = evaluateCandidates(candidates, filePath);

  // 5. Extracción de Icono
  let iconBase64: string | undefined = undefined;
  try {
    const iconPath = (bestMatch as any)._logoFile || "icon.png";
    const iconEntry = findEntry(iconPath) || findEntry("icon.png") || findEntry("logo.png");
    if (iconEntry) {
      const buf = iconEntry.getData();
      if (buf && buf.length > 0) {
        iconBase64 = `data:image/png;base64,${buf.toString("base64")}`;
      }
    }
  } catch (e) {
    console.warn("[Scanner] Error extrayendo icono:", e);
  }

  // 6. Post-procesamiento de ProjectType (Strict JAR vs ZIP)
  const isJar = filePath.toLowerCase().endsWith(".jar");
  const isShader = entries.some(e => e.entryName.startsWith("shaders/"));
  const isPack = findEntry("pack.mcmeta");
  
  let projectType = "mod";
  if (isJar) {
    projectType = "mod";
  } else if (bestMatch.loader === "unknown") {
    if (isShader) projectType = "shader";
    else if (isPack) projectType = "resourcepack";
  }

  return { 
    ...bestMatch, 
    projectType,
    confidence, 
    warnings,
    iconBase64,
    sha1 
  };
}