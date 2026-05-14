import { openDB, IDBPDatabase } from 'idb';
import { MIMDatabase } from './schema';

/**
 * MIMStorage — Base de Datos IndexedDB.
 * Se utiliza para persistir metadatos de mods, caché de APIs externas,
 * configuraciones de proyectos y reportes de errores.
 */
const DB_NAME = 'MIMStorage';
const DB_VERSION = 1;

/**
 * MIMDatabaseCore (Singleton)
 * ─────────────────────────────────────────────────────────────────────────────
 * Clase orquestadora para la conexión con IndexedDB. Implementa un patrón
 * Singleton para asegurar que solo exista una instancia activa de la DB
 * y evitar fugas de memoria o bloqueos de transacciones.
 * ─────────────────────────────────────────────────────────────────────────────
 */
class MIMDatabaseCore {
  private db: IDBPDatabase<MIMDatabase> | null = null;

  /**
   * Inicializa la conexión con la base de datos.
   * Si la base de datos no existe o la versión ha cambiado, ejecuta el callback 'upgrade'.
   */
  async init(): Promise<IDBPDatabase<MIMDatabase>> {
    if (this.db) return this.db;

    this.db = await openDB<MIMDatabase>(DB_NAME, DB_VERSION, {
      /**
       * Callback de Actualización: Define la estructura de los Object Stores.
       * IMPORTANTE: Si añades un nuevo store, incrementa DB_VERSION arriba.
       */
      upgrade(db) {
        // 1. Descripciones de mods (Cache de metadatos profundos)
        if (!db.objectStoreNames.contains('descriptions')) {
          const s = db.createObjectStore('descriptions', { keyPath: 'fileName' });
          s.createIndex('by-modName', 'modName');
          s.createIndex('by-lastUpdated', 'lastUpdated');
        }
        
        // 2. Caché Genérico (Respuestas de APIs de Modrinth/CurseForge)
        if (!db.objectStoreNames.contains('cache')) {
          const s = db.createObjectStore('cache', { keyPath: 'key' });
          s.createIndex('by-expires', 'expires');
          s.createIndex('by-type', 'type');
        }

        // 3. Proyectos (Instancias de Minecraft gestionadas)
        if (!db.objectStoreNames.contains('projects')) {
          const s = db.createObjectStore('projects', { keyPath: 'id' });
          s.createIndex('by-name', 'name');
          s.createIndex('by-lastModified', 'lastModified');
        }

        // 4. Mundos (Relacionados con proyectos)
        if (!db.objectStoreNames.contains('worlds')) {
          const s = db.createObjectStore('worlds', { keyPath: 'id' });
          s.createIndex('by-project', 'projectId');
          s.createIndex('by-lastModified', 'lastModified');
        }

        // 5. Crash Reports (Historial de diagnósticos SAGE)
        if (!db.objectStoreNames.contains('crashReports')) {
          const s = db.createObjectStore('crashReports', { keyPath: 'id' });
          s.createIndex('by-project', 'projectId');
          s.createIndex('by-timestamp', 'timestamp');
        }

        // 6. Entidades Mod (Información extraída de los .jar)
        if (!db.objectStoreNames.contains('mods')) {
          const s = db.createObjectStore('mods', { keyPath: 'hash' });
          s.createIndex('by-modId', 'modId');
          s.createIndex('by-environment', 'environment');
          s.createIndex('by-lastSeen', 'lastSeen');
        }
      },
    });

    return this.db;
  }

  /**
   * Retorna la instancia activa. Lanza un error si se intenta acceder
   * antes de que se haya completado el proceso de inicialización (init).
   */
  get instance() {
    if (!this.db) {
      console.warn('[MIMDB] Acceso prematuro a la DB. Asegúrate de llamar a init() al arrancar.');
      throw new Error('[MIMDB] Database not initialized');
    }
    return this.db;
  }
}

// Exportamos una instancia única para todo el proyecto.
export const dbCore = new MIMDatabaseCore();
