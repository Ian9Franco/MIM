/**
 * IndexedDB Storage System for MIM (Aggregator)
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo actúa como el punto de entrada central para la persistencia
 * en el navegador. Delega el almacenamiento real a sub-módulos especializados.
 */

import { dbCore } from './db/core';
import { modStore } from './db/stores/ModStore';
import { ModDescription, CacheEntry, ProjectData, WorldData, CrashReport } from './db/schema';

class MIMIndexedDB {
  async init() { await dbCore.init(); }

  // === Descripciones (Delegado) ===
  async getDescription(f: string) { return (await dbCore.init()).get('descriptions', f); }
  async setDescription(d: ModDescription) { await (await dbCore.init()).put('descriptions', { ...d, lastUpdated: Date.now() }); }
  async getAllDescriptions() { return (await dbCore.init()).getAll('descriptions'); }

  // === Cache (Delegado) ===
  async getCache(key: string) {
    const db = await dbCore.init();
    const entry = await db.get('cache', key);
    if (entry && entry.expires < Date.now()) { await db.delete('cache', key); return undefined; }
    return entry;
  }
  async setCache(key: string, data: any, ttl: number = 43200000, type: CacheEntry['type'] = 'metadata') {
    await (await dbCore.init()).put('cache', { key, data, expires: Date.now() + ttl, type });
  }

  // === Proyectos (Delegado) ===
  async getProject(id: string) { return (await dbCore.init()).get('projects', id); }
  async setProject(p: ProjectData) { await (await dbCore.init()).put('projects', { ...p, lastModified: Date.now() }); }
  async getAllProjects() { return (await dbCore.init()).getAll('projects'); }

  // === Mods (Delegado al Store especializado) ===
  getMod(hash: string) { return modStore.get(hash); }
  setMod(mod: any) { return modStore.set(mod); }
  getAllMods() { return modStore.getAll(); }

  // === Storage Management ===
  async getStorageStats() {
    const db = await dbCore.init();
    const [descriptions, cache, projects, worlds, crashReports, mods] = await Promise.all([
      db.count('descriptions'), db.count('cache'), db.count('projects'),
      db.count('worlds'), db.count('crashReports'), db.count('mods')
    ]);
    return { descriptions, cache, projects, worlds, crashReports, mods, total: descriptions + cache + projects + worlds + crashReports + mods };
  }

  async clearAll() {
    const db = await dbCore.init();
    const tx = db.transaction(['descriptions', 'cache', 'projects', 'worlds', 'crashReports', 'mods'], 'readwrite');
    await Promise.all([
      tx.objectStore('descriptions').clear(), tx.objectStore('cache').clear(),
      tx.objectStore('projects').clear(), tx.objectStore('worlds').clear(),
      tx.objectStore('crashReports').clear(), tx.objectStore('mods').clear()
    ]);
    await tx.done;
  }
}

export const mimDB = new MIMIndexedDB();
export type { ModDescription, CacheEntry, ProjectData, WorldData, CrashReport };
