/**
 * IndexedDB Storage System for MIM
 * 
 * Compatible migration from existing JSON-based storage:
 * - .mim-index/mod-descriptions.json → descriptions store
 * - .mim-index/remote-cache.json → cache store
 * - Future: mods, projects, configs, worlds, crash-reports
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Types for our data structures
interface ModDescription {
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

interface CacheEntry {
  key: string;
  data: any;
  expires: number;
  type: "modrinth" | "curseforge" | "description" | "metadata";
}

interface ProjectData {
  id: string;
  name: string;
  version: string;
  loader: string;
  mods: string[]; // Array of mod paths
  config: any;
  lastModified: number;
}

interface WorldData {
  id: string;
  name: string;
  projectId: string;
  path: string;
  size: number;
  lastModified: number;
}

interface CrashReport {
  id: string;
  projectId: string;
  timestamp: number;
  message: string;
  stack: string;
  mods: string[]; // Mod list at time of crash
}

// Database schema
interface MIMDatabase extends DBSchema {
  descriptions: {
    key: string;
    value: ModDescription;
    indexes: {
      'by-modName': string;
      'by-lastUpdated': number;
    };
  };
  cache: {
    key: string;
    value: CacheEntry;
    indexes: {
      'by-expires': number;
      'by-type': string;
    };
  };
  projects: {
    key: string;
    value: ProjectData;
    indexes: {
      'by-name': string;
      'by-lastModified': number;
    };
  };
  worlds: {
    key: string;
    value: WorldData;
    indexes: {
      'by-project': string;
      'by-lastModified': number;
    };
  };
  crashReports: {
    key: string;
    value: CrashReport;
    indexes: {
      'by-project': string;
      'by-timestamp': number;
    };
  };
}

class MIMIndexedDB {
  private db: IDBPDatabase<MIMDatabase> | null = null;
  private readonly DB_NAME = 'MIMStorage';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MIMDatabase>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        // Create descriptions store
        if (!db.objectStoreNames.contains('descriptions')) {
          const descStore = db.createObjectStore('descriptions', { keyPath: 'fileName' });
          descStore.createIndex('by-modName', 'modName');
          descStore.createIndex('by-lastUpdated', 'lastUpdated');
        }

        // Create cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('by-expires', 'expires');
          cacheStore.createIndex('by-type', 'type');
        }

        // Create projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('by-name', 'name');
          projStore.createIndex('by-lastModified', 'lastModified');
        }

        // Create worlds store
        if (!db.objectStoreNames.contains('worlds')) {
          const worldStore = db.createObjectStore('worlds', { keyPath: 'id' });
          worldStore.createIndex('by-project', 'projectId');
          worldStore.createIndex('by-lastModified', 'lastModified');
        }

        // Create crash reports store
        if (!db.objectStoreNames.contains('crashReports')) {
          const crashStore = db.createObjectStore('crashReports', { keyPath: 'id' });
          crashStore.createIndex('by-project', 'projectId');
          crashStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });

    console.log('[MIMIndexedDB] Database initialized successfully');
  }

  getDB(): IDBPDatabase<MIMDatabase> {
    if (!this.db) {
      throw new Error('[MIMIndexedDB] Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // === Descriptions Store ===
  
  async getDescription(fileName: string): Promise<ModDescription | undefined> {
    await this.init();
    return this.db!.get('descriptions', fileName);
  }

  async setDescription(description: ModDescription): Promise<void> {
    await this.init();
    const updated = { ...description, lastUpdated: Date.now() };
    await this.db!.put('descriptions', updated);
  }

  async getAllDescriptions(): Promise<ModDescription[]> {
    await this.init();
    return this.db!.getAll('descriptions');
  }

  async searchDescriptions(query: string): Promise<ModDescription[]> {
    await this.init();
    return this.db!.getAllFromIndex('descriptions', 'by-modName', IDBKeyRange.bound(query, query + '\uffff'));
  }

  async deleteDescription(fileName: string): Promise<void> {
    await this.init();
    await this.db!.delete('descriptions', fileName);
  }

  // === Cache Store ===
  
  async getCache(key: string): Promise<CacheEntry | undefined> {
    await this.init();
    const entry = await this.db!.get('cache', key);
    
    // Check if expired
    if (entry && entry.expires < Date.now()) {
      await this.db!.delete('cache', key);
      return undefined;
    }
    
    return entry;
  }

  async setCache(key: string, data: any, ttl: number = 12 * 60 * 60 * 1000, type: CacheEntry['type'] = 'metadata'): Promise<void> {
    await this.init();
    const entry: CacheEntry = {
      key,
      data,
      expires: Date.now() + ttl,
      type
    };
    await this.db!.put('cache', entry);
  }

  async clearExpiredCache(): Promise<number> {
    await this.init();
    const tx = this.db!.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('by-expires');
    
    const expiredKeys = await index.getAllKeys(IDBKeyRange.upperBound(Date.now()));
    let deleted = 0;
    
    for (const key of expiredKeys) {
      await store.delete(key);
      deleted++;
    }
    
    await tx.done;
    return deleted;
  }

  async clearCacheByType(type: CacheEntry['type']): Promise<void> {
    await this.init();
    const tx = this.db!.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('by-type');
    
    const keys = await index.getAllKeys(type);
    for (const key of keys) {
      await store.delete(key);
    }
    
    await tx.done;
  }

  // === Projects Store ===
  
  async getProject(id: string): Promise<ProjectData | undefined> {
    await this.init();
    return this.db!.get('projects', id);
  }

  async setProject(project: ProjectData): Promise<void> {
    await this.init();
    const updated = { ...project, lastModified: Date.now() };
    await this.db!.put('projects', updated);
  }

  async getAllProjects(): Promise<ProjectData[]> {
    await this.init();
    return this.db!.getAll('projects');
  }

  async deleteProject(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('projects', id);
  }

  // === Worlds Store ===
  
  async getWorld(id: string): Promise<WorldData | undefined> {
    await this.init();
    return this.db!.get('worlds', id);
  }

  async setWorld(world: WorldData): Promise<void> {
    await this.init();
    const updated = { ...world, lastModified: Date.now() };
    await this.db!.put('worlds', updated);
  }

  async getWorldsByProject(projectId: string): Promise<WorldData[]> {
    await this.init();
    return this.db!.getAllFromIndex('worlds', 'by-project', projectId);
  }

  async deleteWorld(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('worlds', id);
  }

  // === Crash Reports Store ===
  
  async addCrashReport(report: Omit<CrashReport, 'id'>): Promise<string> {
    await this.init();
    const id = `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullReport: CrashReport = { ...report, id };
    await this.db!.add('crashReports', fullReport);
    return id;
  }

  async getCrashReportsByProject(projectId: string, limit: number = 50): Promise<CrashReport[]> {
    await this.init();
    return this.db!.getAllFromIndex('crashReports', 'by-project', projectId, limit);
  }

  async deleteCrashReport(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('crashReports', id);
  }

  // === Migration Utilities ===
  
  async migrateFromJSON(): Promise<void> {
    await this.init();
    
    // Migration will be handled by the API endpoints
    // This is a placeholder for future direct client-side migration
    console.log('[MIMIndexedDB] Migration from JSON will be handled by API endpoints');
  }

  // === Storage Management ===
  
  async getStorageStats(): Promise<{
    descriptions: number;
    cache: number;
    projects: number;
    worlds: number;
    crashReports: number;
    total: number;
  }> {
    await this.init();
    
    const [descriptions, cache, projects, worlds, crashReports] = await Promise.all([
      this.db!.count('descriptions'),
      this.db!.count('cache'),
      this.db!.count('projects'),
      this.db!.count('worlds'),
      this.db!.count('crashReports')
    ]);

    return {
      descriptions,
      cache,
      projects,
      worlds,
      crashReports,
      total: descriptions + cache + projects + worlds + crashReports
    };
  }

  async clearAll(): Promise<void> {
    await this.init();
    
    const tx = this.db!.transaction(['descriptions', 'cache', 'projects', 'worlds', 'crashReports'], 'readwrite');
    
    await Promise.all([
      tx.objectStore('descriptions').clear(),
      tx.objectStore('cache').clear(),
      tx.objectStore('projects').clear(),
      tx.objectStore('worlds').clear(),
      tx.objectStore('crashReports').clear()
    ]);
    
    await tx.done;
  }
}

// Singleton instance
export const mimDB = new MIMIndexedDB();

// Export types for use in other files
export type { 
  ModDescription, 
  CacheEntry, 
  ProjectData, 
  WorldData, 
  CrashReport 
};
