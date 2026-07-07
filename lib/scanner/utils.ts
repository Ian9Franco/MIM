import path from "path";

/**
 * @fileoverview Utilidades de Normalización y Deducción para el Mod Scanner.
 * ─────────────────────────────────────────────────────────────────────────────
 * Colección de funciones puras diseñadas para extraer y limpiar cadenas de texto
 * complejas, como rangos de versiones de Minecraft (SemVer) y versiones de mods
 * contaminadas con etiquetas de loaders.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Deduce la versión de Minecraft a partir de una cadena de rango (versionRange).
 * 
 * Muchas dependencias de Forge declaran rangos como "[1.20.1,1.21)". Esta función
 * extrae las versiones semánticas válidas (1.16 en adelante) y las formatea
 * para la visualización del usuario (ej. "1.20.1+" o "1.20.1 - 1.20.4").
 *
 * @param range - Cadena de texto con el rango de versiones de dependencias.
 * @returns La versión simplificada o null si no se detecta un patrón válido.
 */
export function extractMcVersionFromRange(range: string): string | null {
  // Captura todas las instancias de versiones de Minecraft modernas (>= 1.16)
  const matches = [...range.matchAll(/1\.(1[6-9]|2\d)(?:\.\d+)?/g)].map(m => m[0]);
  
  if (matches.length === 0) return null;
  
  if (matches.length === 1) {
    // Si hay una sola versión pero el string indica rango abierto (,) o mayor (>), se añade '+'
    return (range.includes(",") || range.includes(">")) ? `${matches[0]}+` : matches[0];
  }
  
  // Si coinciden inicio y fin, se devuelve simple, de lo contrario el rango completo
  return matches[0] === matches[1] ? matches[0] : `${matches[0]} - ${matches[1]}`;
}

/**
 * Heurística de Respaldo: Extrae la versión de Minecraft desde el nombre del archivo.
 * 
 * Se utiliza cuando un archivo (como un ResourcePack o un .jar mal formado)
 * no contiene metadatos internos explícitos pero sigue el estándar de nombres
 * comunitario (ej. "Soartex_Fanver_MC1.20.zip").
 *
 * @param filePath - Ruta absoluta o relativa del archivo.
 * @returns La versión de Minecraft deducida o null.
 */
export function gameVersionFromFilename(filePath: string): string | null {
  const base = path.basename(filePath, ".jar");
  const pattern = /(?:mc)?(1\.(1[6-9]|2\d)(?:\.\d+)?)/g;
  const matches = [...base.matchAll(pattern)];
  // Retorna la última coincidencia, ya que muchos mods ponen su versión primero y la de MC al final
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

/**
 * Limpia y normaliza la versión interna de un mod.
 * 
 * Elimina prefijos 'v', sufijos de loaders ("-fabric", "+forge") y estandariza
 * separadores para asegurar que las comparaciones de versiones (ej. al buscar
 * actualizaciones en Modrinth) sean precisas.
 *
 * @param version - Versión en crudo extraída del mod.
 * @returns Versión limpia (ej. "1.0.0-fabric" -> "1.0.0").
 */
export function normalizeModVersion(version: string): string {
  if (!version || version === "unknown") return version;
  
  const clean = version
    .trim()
    .replace(/^v/i, "") // Elimina 'v' inicial (v1.0 -> 1.0)
    .replace(/[-+]?(fabric|forge|snapshot|beta)/gi, "") // Elimina tags de entorno
    .replace(/[_-]/g, "."); // Reemplaza guiones por puntos
    
  return clean || version;
}
