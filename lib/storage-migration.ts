/**
 * Storage Migration System
 * 
 * Migrates from JSON-based storage to IndexedDB for better performance and scalability.
 * Handles:
 * - .mim-index/mod-descriptions.json → IndexedDB descriptions store
 * - .mim-index/remote-cache.json → IndexedDB cache store
 * - Future: projects, configs, worlds, crash-reports
 */

import { promises as fs } from 'fs';
import path from 'path';
import { SOURCE_BASE } from '@/lib/constants';
import { mimDB, type ModDescription, type CacheEntry } from './indexeddb';

interface LegacyDescriptionData {
  fileName: string;
  modName: string;
  projectId?: string;
  title?: string;
  description?: string;
  body?: string;
  url?: string;
  status: "success" | "unknown" | "error";
}

interface LegacyCacheData {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl?: number;
  };
}

export class StorageMigration {
  private readonly LEGACY_DESCRIPTIONS_PATH = path.join(SOURCE_BASE, '.mim-index', 'mod-descriptions.json');
  private readonly LEGACY_CACHE_PATH = path.join(SOURCE_BASE, '.mim-index', 'cache', 'remote-cache.json');
  private readonly MIGRATION_MARKER_PATH = path.join(SOURCE_BASE, '.mim-index', '.indexeddb-migration-complete');

  async needsMigration(): Promise<boolean> {
    try {
      await fs.access(this.MIGRATION_MARKER_PATH);
      return false; // Migration already completed
    } catch {
      // Check if legacy files exist
      const descriptionsExist = await this.fileExists(this.LEGACY_DESCRIPTIONS_PATH);
      const cacheExists = await this.fileExists(this.LEGACY_CACHE_PATH);
      return descriptionsExist || cacheExists;
    }
  }

  async migrateAll(): Promise<{
    descriptionsMigrated: number;
    cacheMigrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let descriptionsMigrated = 0;
    let cacheMigrated = 0;

    try {
      console.log('[StorageMigration] Starting migration from JSON to IndexedDB...');

      // Initialize IndexedDB
      await mimDB.init();

      // Migrate descriptions
      if (await this.fileExists(this.LEGACY_DESCRIPTIONS_PATH)) {
        const result = await this.migrateDescriptions();
        descriptionsMigrated = result.count;
        errors.push(...result.errors);
      }

      // Migrate cache
      if (await this.fileExists(this.LEGACY_CACHE_PATH)) {
        const result = await this.migrateCache();
        cacheMigrated = result.count;
        errors.push(...result.errors);
      }

      // Mark migration as complete
      await fs.writeFile(this.MIGRATION_MARKER_PATH, new Date().toISOString());

      console.log(`[StorageMigration] Migration completed: ${descriptionsMigrated} descriptions, ${cacheMigrated} cache entries`);

      return {
        descriptionsMigrated,
        cacheMigrated,
        errors
      };

    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[StorageMigration]', errorMsg);
      errors.push(errorMsg);
      return {
        descriptionsMigrated,
        cacheMigrated,
        errors
      };
    }
  }

  private async migrateDescriptions(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      console.log('[StorageMigration] Migrating descriptions...');
      
      const content = await fs.readFile(this.LEGACY_DESCRIPTIONS_PATH, 'utf8');
      const legacyData: LegacyDescriptionData[] = JSON.parse(content);

      const db = await mimDB.getDB();
      const tx = db.transaction('descriptions', 'readwrite');
      const store = tx.objectStore('descriptions');

      for (const item of legacyData) {
        try {
          const description: ModDescription = {
            ...item,
            lastUpdated: Date.now() // Add timestamp for IndexedDB
          };
          await store.put(description);
          count++;
        } catch (itemError) {
          errors.push(`Failed to migrate description ${item.fileName}: ${itemError}`);
        }
      }

      await tx.done;

      // Backup original file
      const backupPath = this.LEGACY_DESCRIPTIONS_PATH + '.backup';
      await fs.rename(this.LEGACY_DESCRIPTIONS_PATH, backupPath);
      console.log(`[StorageMigration] Backed up descriptions to ${backupPath}`);

    } catch (error) {
      errors.push(`Descriptions migration failed: ${error}`);
    }

    return { count, errors };
  }

  private async migrateCache(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      console.log('[StorageMigration] Migrating cache...');
      
      const content = await fs.readFile(this.LEGACY_CACHE_PATH, 'utf8');
      const legacyData: LegacyCacheData = JSON.parse(content);

      const db = await mimDB.getDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      const now = Date.now();

      for (const [key, entry] of Object.entries(legacyData)) {
        try {
          // Check if entry is still valid
          const expires = entry.ttl ? entry.timestamp + entry.ttl : entry.timestamp + (12 * 60 * 60 * 1000); // 12 hours default
          
          if (expires > now) {
            const cacheEntry: CacheEntry = {
              key,
              data: entry.data,
              expires,
              type: this.detectCacheType(key)
            };
            await store.put(cacheEntry);
            count++;
          }
        } catch (itemError) {
          errors.push(`Failed to migrate cache entry ${key}: ${itemError}`);
        }
      }

      await tx.done;

      // Backup original file
      const backupPath = this.LEGACY_CACHE_PATH + '.backup';
      await fs.rename(this.LEGACY_CACHE_PATH, backupPath);
      console.log(`[StorageMigration] Backed up cache to ${backupPath}`);

    } catch (error) {
      errors.push(`Cache migration failed: ${error}`);
    }

    return { count, errors };
  }

  private detectCacheType(key: string): CacheEntry['type'] {
    if (key.includes('modrinth')) return 'modrinth';
    if (key.includes('curseforge')) return 'curseforge';
    if (key.includes('description')) return 'description';
    return 'metadata';
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async rollbackMigration(): Promise<void> {
    console.log('[StorageMigration] Rolling back migration...');

    try {
      // Clear IndexedDB
      await mimDB.clearAll();

      // Restore from backups if they exist
      const descriptionsBackup = this.LEGACY_DESCRIPTIONS_PATH + '.backup';
      const cacheBackup = this.LEGACY_CACHE_PATH + '.backup';

      if (await this.fileExists(descriptionsBackup)) {
        await fs.rename(descriptionsBackup, this.LEGACY_DESCRIPTIONS_PATH);
        console.log('[StorageMigration] Restored descriptions backup');
      }

      if (await this.fileExists(cacheBackup)) {
        await fs.rename(cacheBackup, this.LEGACY_CACHE_PATH);
        console.log('[StorageMigration] Restored cache backup');
      }

      // Remove migration marker
      try {
        await fs.unlink(this.MIGRATION_MARKER_PATH);
      } catch {
        // Ignore if file doesn't exist
      }

      console.log('[StorageMigration] Rollback completed');

    } catch (error) {
      console.error('[StorageMigration] Rollback failed:', error);
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    needsMigration: boolean;
    legacyFilesExist: boolean;
    indexedDBStats: any;
    lastMigration?: string;
  }> {
    const needsMigration = await this.needsMigration();
    const legacyFilesExist = await this.fileExists(this.LEGACY_DESCRIPTIONS_PATH) || 
                             await this.fileExists(this.LEGACY_CACHE_PATH);

    let lastMigration: string | undefined;
    try {
      lastMigration = await fs.readFile(this.MIGRATION_MARKER_PATH, 'utf8');
    } catch {
      // No migration marker
    }

    let indexedDBStats = null;
    try {
      indexedDBStats = await mimDB.getStorageStats();
    } catch {
      // IndexedDB not initialized yet
    }

    return {
      needsMigration,
      legacyFilesExist,
      indexedDBStats,
      lastMigration
    };
  }
}

// Singleton instance
export const storageMigration = new StorageMigration();
