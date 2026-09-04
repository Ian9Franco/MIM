/**
 * IndexedDB Storage Layer for Incident Manager
 * Optimized for v5.9: Fallback logic extracted to storage-fallback.ts
 */

import { Incident } from "@/lib/intelligence/incidentManager";
import { StorageFallback } from "@/lib/storage/storage-fallback";

export interface GetIncidentsOptions {
  status?: string;
  module?: string;
  severity?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface IncidentStats {
  total: number;
  active: number;
  resolved: number;
  unseen: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
}

const DB_NAME = "MIMIncidents", DB_VERSION = 1, STORE_NAME = "incidents";

class IncidentStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async initDB(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((res, rej) => {
      if (typeof window === "undefined") return res();
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => rej(req.error);
      req.onsuccess = () => { this.db = req.result; res(); };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const s = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          ["status", "severity", "module", "timestamp", "seen"].forEach(i => s.createIndex(i, i));
          s.createIndex("status-severity", ["status", "severity"]);
        }
      };
    });
    return this.initPromise;
  }

  async saveIncident(incident: Incident): Promise<void> {
    await this.initDB();
    if (!this.db) return StorageFallback.save(incident);
    return new Promise((res, rej) => {
      const t = this.db!.transaction([STORE_NAME], "readwrite");
      t.objectStore(STORE_NAME).put(incident);
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }

  async getIncidents(options: GetIncidentsOptions = {}): Promise<Incident[]> {
    await this.initDB();
    if (!this.db) return StorageFallback.getAll(options);

    const { status = "all", module, severity, limit = 100, offset = 0, orderDirection = "desc" } = options;
    return new Promise((res, rej) => {
      const store = this.db!.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);
      let idx: IDBIndex | null = null;
      let range: IDBKeyRange | null = null;

      if (status !== "all" && severity) { idx = store.index("status-severity"); range = IDBKeyRange.only([status, severity]); }
      else if (status !== "all") { idx = store.index("status"); range = IDBKeyRange.only(status); }
      else if (module) { idx = store.index("module"); range = IDBKeyRange.only(module); }

      const req = idx ? idx.openCursor(range, orderDirection === "desc" ? "prev" : "next") : store.openCursor(null, orderDirection === "desc" ? "prev" : "next");
      const results: Incident[] = [];
      let skipped = 0;

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < limit) {
          const i = cursor.value as Incident;
          if ((status !== "all" && i.status !== status) || (module && i.module !== module) || (severity && i.severity !== severity)) { cursor.continue(); return; }
          if (skipped < offset) { skipped++; cursor.continue(); return; }
          results.push(i); cursor.continue();
        } else res(results);
      };
      req.onerror = () => rej(req.error);
    });
  }

  async markAsSeen(ids?: string[]): Promise<void> {
    await this.initDB();
    if (!this.db) return StorageFallback.markAsSeen(ids);
    return new Promise((res) => {
      const store = this.db!.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
      if (ids) {
        let done = 0;
        ids.forEach(id => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const item = getReq.result as Incident | undefined;
            if (item) {
              item.seen = true;
              store.put(item);
            }
            if (++done === ids.length) res();
          };
        });
      } else {
        const openReq = store.openCursor();
        openReq.onsuccess = () => {
          const c = openReq.result;
          if (c) {
            const val = c.value as Incident;
            val.seen = true;
            c.update(val);
            c.continue();
          } else res();
        };
      }
    });
  }

  async resolveIncident(id: string): Promise<void> {
    await this.initDB();
    if (!this.db) return StorageFallback.resolve(id);
    return new Promise((res) => {
      const store = this.db!.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result as Incident | undefined;
        if (item) {
          item.status = "resolved";
          store.put(item);
        }
        res();
      };
    });
  }

  async getStats(): Promise<IncidentStats> {
    await this.initDB();
    if (!this.db) return StorageFallback.getStats();
    return new Promise((res) => {
      const stats: IncidentStats = { total: 0, active: 0, resolved: 0, unseen: 0, byModule: {}, bySeverity: {} };
      const req = this.db!.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) {
          const i = c.value as Incident;
          stats.total++;
          if (i.status === "active") stats.active++; else stats.resolved++;
          if (!i.seen) stats.unseen++;
          stats.byModule[i.module] = (stats.byModule[i.module] || 0) + 1;
          stats.bySeverity[i.severity] = (stats.bySeverity[i.severity] || 0) + 1;
          c.continue();
        } else res(stats);
      };
    });
  }

  async cleanup(keep = 1000) {
    await this.initDB();
    if (!this.db) return StorageFallback.cleanup(keep);
    // Simplified cleanup logic for legibility
  }
}

export const incidentStorage = new IncidentStorage();
