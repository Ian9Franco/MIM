import { DBSchema } from 'idb';

/**
 * @fileoverview Esquema de la Base de Datos MIM.
 * Define las interfaces de cada entidad almacenada y la estructura del esquema idb.
 */

/**
 * ModDescription: Caché de información extendida de un mod.
 * Se utiliza para evitar peticiones repetitivas a APIs de descripción/body.
 */
export interface ModDescription {
  fileName: string;
  modName: string;
  projectId?: string;
  title?: string;
  description?: string;
  body?: string;
  url?: string;
  status: "success" | "unknown" | "error";
  lastUpdated?: number;
}

/**
 * CacheEntry: Almacén genérico de TTL (Time To Live).
 * Almacena respuestas de red para evitar rate-limits.
 */
export interface CacheEntry {
  key: string;
  data: any;
  expires: number;
  type: "modrinth" | "curseforge" | "description" | "metadata";
}

/**
 * ProjectData: Representa una instancia de juego (Carpeta .minecraft).
 */
export interface ProjectData {
  id: string;
  name: string;
  version: string;
  loader: string;
  mods: string[]; // Lista de hashes de los mods presentes
  config: any;
  lastModified: number;
}

/**
 * WorldData: Representa un mundo de Minecraft.
 */
export interface WorldData {
  id: string;
  name: string;
  projectId: string; // Relación con ProjectData
  path: string;
  size: number;
  lastModified: number;
}

/**
 * CrashReport: Información de un error de ejecución analizado por SAGE.
 */
export interface CrashReport {
  id: string;
  projectId: string;
  timestamp: number;
  message: string;
  stack: string;
  mods: string[];
}

/**
 * ModEntity: Metadatos técnicos extraídos directamente del archivo .jar.
 * Esta es la entidad principal para las comprobaciones de compatibilidad.
 */
export interface ModEntity {
  hash: string; // Clave primaria (SHA-1)
  modId: string;
  modName: string;
  version: string;
  loader: string; // forge, fabric, neoforge, quilt
  gameVersion: string;
  environment: "client" | "server" | "both" | "unknown";
  dependencies: string[];
  conflicts: string[];
  providedIds: string[]; // IDs secundarios (ej. 'fabric-api-base')
  categories: string[];
  mixinTargets?: string[];
  lastSeen: number;
  source: "local" | "modrinth" | "curseforge";
  overrides?: Partial<Omit<ModEntity, "hash" | "overrides">>; // Ajustes manuales del usuario
}

/**
 * MIMDatabase: Definición estructural completa para la librería 'idb'.
 */
export interface MIMDatabase extends DBSchema {
  descriptions: {
    key: string;
    value: ModDescription;
    indexes: { 'by-modName': string; 'by-lastUpdated': number };
  };
  cache: {
    key: string;
    value: CacheEntry;
    indexes: { 'by-expires': number; 'by-type': string };
  };
  projects: {
    key: string;
    value: ProjectData;
    indexes: { 'by-name': string; 'by-lastModified': number };
  };
  worlds: {
    key: string;
    value: WorldData;
    indexes: { 'by-project': string; 'by-lastModified': number };
  };
  crashReports: {
    key: string;
    value: CrashReport;
    indexes: { 'by-project': string; 'by-timestamp': number };
  };
  mods: {
    key: string;
    value: ModEntity;
    indexes: { 'by-modId': string; 'by-environment': string; 'by-lastSeen': number };
  };
}
