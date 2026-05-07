/**
 * Enhanced Mod Scanner - Mejoras en extracción de metadata
 * 
 * Problemas resueltos:
 * 1. Mejor detección de versiones en diferentes formatos
 * 2. Extracción más robusta de metadata de JARs
 * 3. Detección de loaders alternativos y edge cases
 * 4. Mejor manejo de archivos corruptos o malformados
 */

import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { SOURCE_BASE } from "./constants";

// Interfaces mejoradas
export interface EnhancedModMeta {
  modId: string;
  modName: string;
  modVersion: string;
  gameVersion: string;
  loader: string;
  projectType: string;
  isCompatibleWithConnector: boolean;
  author?: string;
  iconBase64?: string;
  sha1?: string;
  // Nuevos campos
  description?: string;
  website?: string;
  issues?: string;
  sources?: string;
  license?: string;
  dependencies?: Array<{
    modId: string;
    version?: string;
    type: "required" | "optional" | "incompatible";
  }>;
  // Metadata de calidad
  extractionQuality: "high" | "medium" | "low";
  extractionWarnings: string[];
}

const UNKNOWN = "unknown";

/**
 * Scanner mejorado con múltiples estrategias de extracción
 */
export async function scanModEnhanced(filePath: string): Promise<EnhancedModMeta> {
  const warnings: string[] = [];
  let quality: "high" | "medium" | "low" = "high";
  
  try {
    // 1. Calcular SHA1 para cache
    const fileBuffer = fs.readFileSync(filePath);
    const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");
    
    // 2. Intentar extraer del cache primero
    const cached = await getFromCache(filePath, sha1);
    if (cached) {
      return { ...cached, sha1 };
    }

    // 3. Extraer metadata del JAR
    const zip = new AdmZip(filePath);
    const meta = await extractMetadataEnhanced(zip, filePath, warnings);
    
    // 4. Calidad de extracción
    quality = calculateExtractionQuality(meta, warnings);
    
    // 5. Guardar en cache
    const result = { ...meta, sha1, extractionQuality: quality, extractionWarnings: warnings };
    await saveToCache(filePath, sha1, result);
    
    return result;
  } catch (error) {
    warnings.push(`Error general: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createFallbackMeta(filePath, warnings);
  }
}

/**
 * Extracción mejorada de metadata con múltiples estrategias
 */
async function extractMetadataEnhanced(zip: AdmZip, filePath: string, warnings: string[]): Promise<EnhancedModMeta> {
  const result: Partial<EnhancedModMeta> = {
    modId: UNKNOWN,
    modName: UNKNOWN,
    modVersion: UNKNOWN,
    gameVersion: UNKNOWN,
    loader: UNKNOWN,
    projectType: "mod",
    isCompatibleWithConnector: false,
    extractionWarnings: warnings
  };

  // Estrategia 1: Buscar archivos de configuración en orden de prioridad
  const configFiles = [
    "fabric.mod.json",
    "quilt.mod.json", 
    "META-INF/neoforge.mods.toml",
    "META-INF/mods.toml",
    "mcmod.info",
    "plugins.yml",
    "bungee.yml",
    "velocity-plugin.json",
    "paper-plugin.yml"
  ];

  let foundConfig = false;
  
  for (const configFile of configFiles) {
    try {
      if (zip.getEntry(configFile)) {
        const content = zip.readAsText(configFile);
        const parsed = await parseConfigFile(configFile, content, warnings);
        
        // Merge con resultado existente (priorizar datos más específicos)
        Object.assign(result, parsed);
        foundConfig = true;
        
        // Determinar loader basado en el archivo encontrado
        result.loader = detectLoaderFromConfig(configFile);
        break;
      }
    } catch (error) {
      warnings.push(`Error leyendo ${configFile}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // Estrategia 2: Si no se encontró configuración, intentar heurísticas avanzadas
  if (!foundConfig) {
    warnings.push("No se encontró archivo de configuración, usando heurísticas");
    Object.assign(result, await extractUsingHeuristics(zip, filePath, warnings));
    result.extractionQuality = "low";
  }

  // Estrategia 3: Extraer icono con mejor manejo de errores
  try {
    result.iconBase64 = await extractIconEnhanced(zip);
  } catch (error) {
    warnings.push(`Error extrayendo icono: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Estrategia 4: Validar y mejorar versión detectada
  if (result.modVersion && result.modVersion !== UNKNOWN) {
    result.modVersion = normalizeVersionEnhanced(result.modVersion);
  }

  // Estrategia 5: Detectar compatibilidad con connector
  result.isCompatibleWithConnector = detectConnectorCompatibility(result);

  return result as EnhancedModMeta;
}

/**
 * Parseo mejorado de diferentes tipos de archivos de configuración
 */
async function parseConfigFile(filename: string, content: string, warnings: string[]): Promise<Partial<EnhancedModMeta>> {
  const result: Partial<EnhancedModMeta> = {};

  try {
    switch (filename) {
      case "fabric.mod.json":
      case "quilt.mod.json":
        return parseFabricModJson(content, filename === "quilt.mod.json" ? "quilt" : "fabric");
      
      case "META-INF/neoforge.mods.toml":
      case "META-INF/mods.toml":
        return parseForgeTomlEnhanced(content, filename.includes("neoforge"));
      
      case "mcmod.info":
        return parseMcModInfo(content);
      
      case "plugins.yml":
        return parsePluginsYml(content);
      
      default:
        warnings.push(`Tipo de configuración no soportado: ${filename}`);
        return result;
    }
  } catch (error) {
    warnings.push(`Error parseando ${filename}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return result;
  }
}

/**
 * Parseo mejorado de Fabric/Quilt mod.json
 */
function parseFabricModJson(content: string, loader: string): Partial<EnhancedModMeta> {
  try {
    const json = JSON.parse(content);
    
    return {
      modId: json.id || json.schema?.["mod-id"] || UNKNOWN,
      modName: json.name || UNKNOWN,
      modVersion: normalizeVersionEnhanced(json.version) || UNKNOWN,
      loader,
      projectType: json.custom?.["modmenu"] ? "mod" : "mod",
      author: json.authors?.[0]?.name || json.author || UNKNOWN,
      description: json.description,
      website: json.contact?.homepage,
      issues: json.contact?.issues,
      sources: json.contact?.sources,
      license: json.license,
      dependencies: json.depends ? Object.entries(json.depends).map(([modId, version]) => ({
        modId,
        version: typeof version === 'string' ? version : (version as any).version,
        type: "required" as const
      })) : undefined
    };
  } catch (error) {
    return {};
  }
}

/**
 * Parseo mejorado de Forge/NeoForge TOML
 */
function parseForgeTomlEnhanced(content: string, isNeoForge: boolean): Partial<EnhancedModMeta> {
  const result: Partial<EnhancedModMeta> = {
    loader: isNeoForge ? "neoforge" : "forge"
  };

  try {
    // Extraer modId
    const idMatch = content.match(/^modId\s*=\s*"([^"]+)"/m);
    if (idMatch) result.modId = idMatch[1];

    // Extraer displayName
    const nameMatch = content.match(/displayName\s*=\s*"([^"]+)"/);
    if (nameMatch) result.modName = nameMatch[1];

    // Extraer versión (mejor manejo de placeholders)
    const verMatch = content.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
    if (verMatch) {
      result.modVersion = normalizeVersionEnhanced(verMatch[1]);
    } else {
      // Intentar extraer de build.gradle properties
      const gradleMatch = content.match(/version\s*=\s*"\$\{file\.jarVersion\}"/);
      if (gradleMatch) {
        result.modVersion = extractVersionFromGradle(content);
      }
    }

    // Extraer autores
    const authorMatch = content.match(/authors?\s*=\s*"([^"]+)"/i);
    if (authorMatch) result.author = authorMatch[1];

    // Extraer descripción
    const descMatch = content.match(/description\s*=\s*"""([^"]+)"""/);
    if (descMatch) result.description = descMatch[1].trim();

    // Extraer URL
    const urlMatch = content.match(/displayURL\s*=\s*"([^"]+)"/);
    if (urlMatch) result.website = urlMatch[1];

    // Extraer game version mejorado
    result.gameVersion = extractGameVersionEnhanced(content);

    // Extraer dependencias
    result.dependencies = extractDependenciesEnhanced(content);

    return result;
  } catch (error) {
    return result;
  }
}

/**
 * Heurísticas mejoradas para cuando no hay configuración
 */
async function extractUsingHeuristics(zip: AdmZip, filePath: string, warnings: string[]): Promise<Partial<EnhancedModMeta>> {
  const result: Partial<EnhancedModMeta> = {};
  const fileName = path.basename(filePath, ".jar");

  // Heurística 1: Extraer del nombre del archivo
  const fileNameVersion = extractVersionFromFileName(fileName);
  if (fileNameVersion) {
    result.modVersion = fileNameVersion.version;
    result.modName = fileNameVersion.name;
  }

  // Heurística 2: Buscar en MANIFEST.MF
  try {
    const manifest = zip.getEntry("META-INF/MANIFEST.MF");
    if (manifest) {
      const manifestContent = zip.readAsText("META-INF/MANIFEST.MF");
      const manifestData = parseManifestEnhanced(manifestContent);
      Object.assign(result, manifestData);
    }
  } catch (error) {
    warnings.push("Error leyendo MANIFEST.MF");
  }

  // Heurística 3: Buscar archivos de texto con metadata
  const textFiles = zip.getEntries().filter(entry => 
    entry.entryName.endsWith(".txt") || 
    entry.entryName.endsWith(".md") ||
    entry.entryName.endsWith(".properties")
  );

  for (const textFile of textFiles.slice(0, 5)) { // Limitar a 5 archivos
    try {
      const content = zip.readAsText(textFile.entryName);
      const textData = extractFromTextFile(content, textFile.entryName);
      if (textData.modName && textData.modName !== UNKNOWN) {
        Object.assign(result, textData);
        break;
      }
    } catch (error) {
      // Ignorar errores en heurísticas
    }
  }

  // Heurística 4: Game version del path del archivo
  const pathVersion = extractGameVersionFromPath(filePath);
  if (pathVersion && (!result.gameVersion || result.gameVersion === UNKNOWN)) {
    result.gameVersion = pathVersion;
  }

  return result;
}

/**
 * Normalización mejorada de versiones
 */
function normalizeVersionEnhanced(version: string): string {
  if (!version || version === "unknown") return version;

  // Limpiar caracteres problemáticos
  let clean = version.trim()
    .replace(/^v/i, "") // Quitar 'v' inicial
    .replace(/[-+]?(fabric|forge|neoforge|quilt|snapshot|alpha|beta|dev|local|all|release|final|pre)/gi, "") // Quitar sufijos de loader
    .replace(/[-+]?(mc)?1\.(1[6-9]|2\d)(\.\d+)?/gi, "") // Quitar versiones de Minecraft
    .replace(/[_-]/g, ".") // Estandarizar separadores
    .replace(/[^0-9.]/g, "") // Solo números y puntos
    .replace(/^\.+|\.+$/g, "") // Quitar puntos extremos
    .replace(/\.{2,}/g, "."); // Reducir puntos múltiples

  // Manejar casos especiales
  if (clean.includes("..")) {
    clean = clean.replace(/\.\./g, ".");
  }

  // Validar que la versión tenga sentido
  const parts = clean.split(".");
  if (parts.length > 4) {
    clean = parts.slice(0, 4).join(".");
  }

  return clean || version; // Return original si no se puede limpiar
}

/**
 * Extracción de versión mejorada desde Gradle
 */
function extractVersionFromGradle(content: string): string {
  // Buscar propiedades comunes de versión
  const patterns = [
    /mod_version\s*=\s*["']([^"']+)["']/,
    /version\s*=\s*["']([^"']+)["']/,
    /project\.version\s*=\s*["']([^"']+)["']/
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return normalizeVersionEnhanced(match[1]);
    }
  }

  return UNKNOWN;
}

/**
 * Extracción de game version mejorada
 */
function extractGameVersionEnhanced(content: string): string {
  // Buscar en dependencies blocks
  const sections = content.split(/\[\[dependencies/i);
  
  for (const section of sections) {
    const isMc = /modId\s*=\s*["']minecraft["']/i.test(section);
    if (isMc) {
      const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
      if (rangeMatch) {
        return extractMcVersionFromRange(rangeMatch[1]);
      }
    }
  }

  // Buscar patrones alternativos
  const patterns = [
    /minecraftVersion\s*=\s*["']([^"']+)["']/,
    /mcVersion\s*=\s*["']([^"']+)["']/
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }

  return UNKNOWN;
}

/**
 * Extracción de dependencias mejorada
 */
function extractDependenciesEnhanced(content: string): Array<{
  modId: string;
  version?: string;
  type: "required" | "optional" | "incompatible";
}> {
  const dependencies: Array<{
    modId: string;
    version?: string;
    type: "required" | "optional" | "incompatible";
  }> = [];

  const sections = content.split(/\[\[dependencies/i);
  
  for (const section of sections.slice(1)) { // Skip first empty section
    const modIdMatch = section.match(/modId\s*=\s*["']([^"']+)["']/);
    const versionMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
    const mandatoryMatch = section.match(/mandatory\s*=\s*(true|false)/);
    
    if (modIdMatch) {
      dependencies.push({
        modId: modIdMatch[1],
        version: versionMatch?.[1],
        type: mandatoryMatch?.[1] === "false" ? "optional" : "required"
      });
    }
  }

  return dependencies;
}

/**
 * Extracción de icono mejorada
 */
async function extractIconEnhanced(zip: AdmZip): Promise<string | undefined> {
  const iconPaths = [
    "icon.png",
    "assets/modid/icon.png", 
    "logo.png",
    "mod-icon.png",
    "icon.jpg",
    "icon.jpeg"
  ];

  for (const iconPath of iconPaths) {
    try {
      const entry = zip.getEntry(iconPath);
      if (entry) {
        const iconBuffer = zip.readFile(entry);
        if (iconBuffer && iconBuffer.length > 0) {
          // Validar que sea una imagen válida
          if (isValidImage(iconBuffer)) {
            return `data:image/png;base64,${iconBuffer.toString("base64")}`;
          }
        }
      }
    } catch (error) {
      // Continuar con siguiente路径
    }
  }

  return undefined;
}

/**
 * Validación de imagen
 */
function isValidImage(buffer: Buffer): boolean {
  // Validar headers de imágenes comunes
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF]);
  
  return (
    buffer.slice(0, 4).equals(pngHeader) ||
    buffer.slice(0, 3).equals(jpegHeader)
  );
}

/**
 * Calidad de extracción
 */
function calculateExtractionQuality(meta: Partial<EnhancedModMeta>, warnings: string[]): "high" | "medium" | "low" {
  let score = 0;
  
  // Puntos por metadata completa
  if (meta.modId && meta.modId !== UNKNOWN) score += 2;
  if (meta.modName && meta.modName !== UNKNOWN) score += 2;
  if (meta.modVersion && meta.modVersion !== UNKNOWN) score += 2;
  if (meta.gameVersion && meta.gameVersion !== UNKNOWN) score += 1;
  if (meta.loader && meta.loader !== UNKNOWN) score += 1;
  if (meta.author && meta.author !== UNKNOWN) score += 1;
  if (meta.description) score += 1;
  
  // Penalizaciones por warnings
  score -= Math.min(warnings.length, 3);
  
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/**
 * Crear metadata fallback
 */
function createFallbackMeta(filePath: string, warnings: string[]): EnhancedModMeta {
  const fileName = path.basename(filePath, ".jar");
  const fileNameData = extractVersionFromFileName(fileName);
  
  return {
    modId: UNKNOWN,
    modName: fileNameData.name || fileName,
    modVersion: fileNameData.version || UNKNOWN,
    gameVersion: extractGameVersionFromPath(filePath) || UNKNOWN,
    loader: UNKNOWN,
    projectType: "mod",
    isCompatibleWithConnector: false,
    extractionQuality: "low",
    extractionWarnings: [...warnings, "Usando metadata fallback"]
  };
}

// Funciones helper adicionales...
function extractVersionFromFileName(fileName: string): { name: string; version: string } {
  const patterns = [
    /^(.+?)[\-\_](\d+(?:\.\d+)*(?:[\-\_][a-zA-Z0-9]+)*)\.jar$/,
    /^(.+?)[\-\_]v?(\d+(?:\.\d+)*)\.jar$/,
    /^(.+?)[\-\_]([\d\.]+(?:[a-zA-Z0-9\-_]*)?)\.jar$/
  ];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      return {
        name: match[1].replace(/[\-_]/g, " "),
        version: normalizeVersionEnhanced(match[2])
      };
    }
  }

  return { name: fileName, version: UNKNOWN };
}

function extractMcVersionFromRange(range: string): string {
  // Extraer versión específica de rangos como "[1.20.1,1.20.4]"
  const match = range.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : UNKNOWN;
}

function extractGameVersionFromPath(filePath: string): string | null {
  const match = filePath.match(/[\\/](1\.(?:1[6-9]|2\d)(?:\.\d+)?)[\\/]/);
  return match ? match[1] : null;
}

function detectLoaderFromConfig(configFile: string): string {
  if (configFile.includes("fabric")) return "fabric";
  if (configFile.includes("quilt")) return "quilt";
  if (configFile.includes("neoforge")) return "neoforge";
  if (configFile.includes("mods.toml")) return "forge";
  return UNKNOWN;
}

function detectConnectorCompatibility(meta: Partial<EnhancedModMeta>): boolean {
  return meta.loader === "fabric" && meta.gameVersion !== UNKNOWN;
}

function parseManifestEnhanced(content: string): Partial<EnhancedModMeta> {
  const result: Partial<EnhancedModMeta> = {};
  
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      
      switch (key.toLowerCase()) {
        case 'implementation-title':
          result.modName = value;
          break;
        case 'implementation-version':
          result.modVersion = normalizeVersionEnhanced(value);
          break;
        case 'implementation-vendor':
          result.author = value;
          break;
      }
    }
  }
  
  return result;
}

function extractFromTextFile(content: string, fileName: string): Partial<EnhancedModMeta> {
  const result: Partial<EnhancedModMeta> = {};
  
  // Buscar patrones comunes en archivos de texto
  const patterns = [
    /name[:\s=]+(.+?)(?:\n|$)/i,
    /version[:\s=]+(.+?)(?:\n|$)/i,
    /author[:\s=]+(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const key = pattern.source.toLowerCase();
      if (key.includes('name')) result.modName = match[1].trim();
      else if (key.includes('version')) result.modVersion = normalizeVersionEnhanced(match[1].trim());
      else if (key.includes('author')) result.author = match[1].trim();
    }
  }
  
  return result;
}

function parseMcModInfo(content: string): Partial<EnhancedModMeta> {
  try {
    const json = JSON.parse(content);
    return {
      modId: json.modid || UNKNOWN,
      modName: json.name || UNKNOWN,
      modVersion: normalizeVersionEnhanced(json.version) || UNKNOWN,
      description: json.description,
      author: json.authorList?.[0] || json.author,
      website: json.url,
      loader: "forge" // mcmod.info es típicamente Forge
    };
  } catch (error) {
    return {};
  }
}

function parsePluginsYml(content: string): Partial<EnhancedModMeta> {
  try {
    // YAML parsing simple para plugins.yml
    const lines = content.split('\n');
    const result: Partial<EnhancedModMeta> = { loader: "bungee" };
    
    for (const line of lines) {
      if (line.includes('name:')) {
        result.modName = line.split(':')[1]?.trim();
      } else if (line.includes('version:')) {
        result.modVersion = normalizeVersionEnhanced(line.split(':')[1]?.trim());
      } else if (line.includes('author:')) {
        result.author = line.split(':')[1]?.trim();
      }
    }
    
    return result;
  } catch (error) {
    return {};
  }
}

// Cache functions (similar al original pero mejorado)
async function getFromCache(filePath: string, sha1: string): Promise<EnhancedModMeta | null> {
  // Implementación similar a la original pero con enhanced metadata
  return null; // Placeholder
}

async function saveToCache(filePath: string, sha1: string, meta: EnhancedModMeta): Promise<void> {
  // Implementación similar a la original pero con enhanced metadata
}

export { scanModEnhanced as scanMod };
