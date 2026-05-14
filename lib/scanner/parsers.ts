import { extractMcVersionFromRange, normalizeModVersion } from "./utils";
import { ModMeta } from "../scanner";

/**
 * @fileoverview Parsers especializados de Metadatos.
 * ─────────────────────────────────────────────────────────────────────────────
 * Contiene la lógica para extraer información estructurada (ModId, Versión, etc.)
 * a partir de formatos de configuración específicos de cada Mod Loader.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Parsea el contenido de un archivo `mods.toml` (Forge / NeoForge).
 * Dado que el formato TOML puede ser complejo y tener múltiples bloques,
 * esta función utiliza expresiones regulares para extraer los datos críticos
 * sin necesidad de importar una librería TOML pesada.
 *
 * @param content - El contenido en texto plano del archivo .toml
 * @returns Un objeto parcial con los metadatos descubiertos.
 */
export function parseForgeToml(content: string): Partial<ModMeta> {
  const result: Partial<ModMeta> = {};
  
  // Divide el documento en las secciones [[mods]]. 
  // Ignoramos el bloque inicial de configuraciones globales.
  const modSections = content.split(/\[\[mods\]\]/i).slice(1);
  const mainModIds: string[] = [];

  for (const section of modSections) {
    // Ignoramos cualquier cosa después de la declaración del mod 
    // (ej. secciones [[dependencies]] anidadas erróneamente)
    const modContent = section.split("[[")[0];
    
    // Extracción del ModId Principal
    const idMatch = modContent.match(/modId\s*=\s*["']([^"']+)["']/);
    if (idMatch) mainModIds.push(idMatch[1]);
    
    // Extracción del Nombre Público
    const nameMatch = modContent.match(/displayName\s*=\s*"([^"]+)"/);
    if (nameMatch && !result.modName) result.modName = nameMatch[1];
    
    // Extracción de la Versión
    // El lookahead (?![^"]*\$\{) previene extraer variables puras como "${file.jarVersion}"
    const verMatch = modContent.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
    if (verMatch && !result.modVersion) result.modVersion = normalizeModVersion(verMatch[1]);
  }

  // Se asume que el primer bloque [[mods]] es el mod principal del archivo
  if (mainModIds.length > 0) {
    result.modId = mainModIds[0];
    // Se guardan los demás IDs como 'providedIds' (útil para detectar sub-módulos integrados)
    (result as any).providedIds = mainModIds;
  }

  // Búsqueda de la versión de Minecraft requerida en las dependencias
  const sections = content.split(/\[\[dependencies/i);
  for (const section of sections) {
    const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
    if (rangeMatch) {
      const gv = extractMcVersionFromRange(rangeMatch[1]);
      if (gv) { 
        result.gameVersion = gv; 
        break; // Detenemos la búsqueda al encontrar la primera versión válida
      }
    }
  }

  // Extracción del icono opcional
  const logoMatch = content.match(/logoFile\s*=\s*"([^"]+)"/);
  if (logoMatch) (result as any)._logoFile = logoMatch[1];

  return result;
}
