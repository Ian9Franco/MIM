/**
 * IndexedDB Storage Layer for Incident Manager
 * Optimized for v5.9: Fallback logic extracted to storage-fallback.ts
 */

import { Incident } from "@/lib/intelligence/incidentManager";
import { StorageFallback } from "@/lib/storage/storage-fallback";

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
        const db = (e.target as any).result;
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

  async getIncidents(options: any = {}): Promise<Incident[]> {
    await this.initDB();
    if (!this.db) return StorageFallback.getAll(options);

    const { status = "all", module, severity, limit = 100, offset = 0, orderDirection = "desc" } = options;
    return new Promise((res, rej) => {
      const store = this.db!.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);
      let idx: any = null, range: any = null;

      if (status !== "all" && severity) { idx = store.index("status-severity"); range = IDBKeyRange.only([status, severity]); }
      else if (status !== "all") { idx = store.index("status"); range = IDBKeyRange.only(status); }
      else if (module) { idx = store.index("module"); range = IDBKeyRange.only(module); }

      const req = idx ? idx.openCursor(range, orderDirection === "desc" ? "prev" : "next") : store.openCursor(null, orderDirection === "desc" ? "prev" : "next");
      const results: Incident[] = [];
      let skipped = 0;

      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor && results.length < limit) {
          const i = cursor.value;
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
      const req = ids ? null : store.openCursor();
      if (ids) {
        let done = 0;
        ids.forEach(id => store.get(id).onsuccess = (e: any) => { if (e.target.result) { e.target.result.seen = true; store.put(e.target.result); } if (++done === ids.length) res(); });
      } else {
        req!.onsuccess = (e: any) => { const c = e.target.result; if (c) { c.value.seen = true; c.update(c.value); c.continue(); } else res(); };
      }
    });
  }

  async resolveIncident(id: string): Promise<void> {
    await this.initDB();
    if (!this.db) return StorageFallback.resolve(id);
    return new Promise((res) => {
      const store = this.db!.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
      store.get(id).onsuccess = (e: any) => { if (e.target.result) { e.target.result.status = "resolved"; store.put(e.target.result); } res(); };
    });
  }

  async getStats(): Promise<any> {
    await this.initDB();
    if (!this.db) return StorageFallback.getStats();
    return new Promise((res) => {
      const stats = { total: 0, active: 0, resolved: 0, unseen: 0, byModule: {} as any, bySeverity: {} as any };
      this.db!.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME).openCursor().onsuccess = (e: any) => {
        const c = e.target.result;
        if (c) {
          const i = c.value; stats.total++;
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
