/**
 * IndexedDB Storage System for MIM (Aggregator)
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo actúa como el punto de entrada central para la persistencia
 * en el navegador. Delega el almacenamiento real a sub-módulos especializados.
 */

import { dbCore } from './db/core';
import { modStore } from './db/stores/ModStore';
import { ModDescription, CacheEntry, ProjectData, WorldData, CrashReport, ModEntity, FollowedAuthor, FollowedMod } from './db/schema';

class MIMIndexedDB {
  async init() { await dbCore.init(); }
  async getDB() { return dbCore.init(); }

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
  async clearExpiredCache() {
    const db = await dbCore.init();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    let cursor = await store.openCursor();
    let count = 0;
    const now = Date.now();
    while (cursor) {
      if (cursor.value.expires < now) {
        await cursor.delete();
        count++;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
    return count;
  }

  // === Proyectos (Delegado) ===
  async getProject(id: string) { return (await dbCore.init()).get('projects', id); }
  async setProject(p: ProjectData) { await (await dbCore.init()).put('projects', { ...p, lastModified: Date.now() }); }
  async getAllProjects() { return (await dbCore.init()).getAll('projects'); }

  // === Mods (Delegado al Store especializado) ===
  getMod(hash: string) { return modStore.get(hash); }
  setMod(mod: any) { return modStore.set(mod); }
  getAllMods() { return modStore.getAll(); }

  // === Autores Seguidos ===
  async getFollowedAuthor(name: string) { return (await dbCore.init()).get('followedAuthors', name); }
  async setFollowedAuthor(a: FollowedAuthor) { await (await dbCore.init()).put('followedAuthors', a); }
  async getAllFollowedAuthors() { return (await dbCore.init()).getAll('followedAuthors'); }
  async deleteFollowedAuthor(name: string) { await (await dbCore.init()).delete('followedAuthors', name); }

  // === Mods Seguidos ===
  async getFollowedMod(projectId: string) { return (await dbCore.init()).get('followedMods', projectId); }
  async setFollowedMod(m: FollowedMod) { await (await dbCore.init()).put('followedMods', m); }
  async getAllFollowedMods() { return (await dbCore.init()).getAll('followedMods'); }
  async deleteFollowedMod(projectId: string) { await (await dbCore.init()).delete('followedMods', projectId); }

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
export type { ModDescription, CacheEntry, ProjectData, WorldData, CrashReport, ModEntity };
