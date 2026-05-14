import { dbCore } from '../core';
import { ModEntity } from '../schema';

/**
 * ModStore — Gestor de Almacenamiento de Mods.
 * ─────────────────────────────────────────────────────────────────────────────
 * Encapsula todas las operaciones CRUD para las entidades Mod extraídas.
 * Utiliza el SHA-1 del archivo como clave primaria para asegurar la integridad.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const modStore = {
  /**
   * Obtiene un mod específico basado en su hash SHA-1.
   */
  async get(hash: string): Promise<ModEntity | undefined> {
    const db = await dbCore.init();
    return db.get('mods', hash);
  },

  /**
   * Guarda o actualiza un mod en la base de datos.
   * Automáticamente actualiza el campo 'lastSeen' al momento de guardado.
   */
  async set(mod: ModEntity): Promise<void> {
    const db = await dbCore.init();
    await db.put('mods', { ...mod, lastSeen: Date.now() });
  },

  /**
   * Retorna la colección completa de mods registrados en el sistema.
   */
  async getAll(): Promise<ModEntity[]> {
    const db = await dbCore.init();
    return db.getAll('mods');
  },

  /**
   * Busca mods que coincidan con un modId específico (ej. 'jei', 'appleskin').
   * Útil para encontrar versiones alternativas o detectar duplicados.
   */
  async getByModId(modId: string): Promise<ModEntity[]> {
    const db = await dbCore.init();
    return db.getAllFromIndex('mods', 'by-modId', modId);
  },

  /**
   * Elimina un mod del registro permanente.
   */
  async delete(hash: string): Promise<void> {
    const db = await dbCore.init();
    await db.delete('mods', hash);
  }
};
