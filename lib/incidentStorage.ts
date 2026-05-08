/**
 * IndexedDB Storage Layer for Incident Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Almacenamiento escalable para 10,000+ incidentes con índices optimizados
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Incident } from "./incidentManager";

const DB_NAME = "MIMIncidents";
const DB_VERSION = 1;
const STORE_NAME = "incidents";

interface IncidentRecord extends Incident {
  id: string; // Primary key
}

class IncidentStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Inicializar la base de datos IndexedDB
   */
  private async initDB(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        resolve(); // SSR fallback
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[IncidentStorage] Error opening IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Crear store con índices optimizados
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          
          // Índices para consultas rápidas
          store.createIndex("status", "status", { unique: false });
          store.createIndex("severity", "severity", { unique: false });
          store.createIndex("module", "module", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("seen", "seen", { unique: false });
          store.createIndex("status-severity", ["status", "severity"], { unique: false });
          store.createIndex("module-timestamp", ["module", "timestamp"], { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Guardar incidente
   */
  async saveIncident(incident: Incident): Promise<void> {
    await this.initDB();
    
    if (!this.db) {
      console.warn("[IncidentStorage] IndexedDB no disponible, usando localStorage fallback");
      this.saveToLocalStorage(incident);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(incident as IncidentRecord);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtener incidentes con filtros
   */
  async getIncidents(options: {
    status?: "active" | "resolved" | "all";
    module?: string;
    severity?: string;
    limit?: number;
    offset?: number;
    orderBy?: "timestamp" | "severity";
    orderDirection?: "asc" | "desc";
  } = {}): Promise<Incident[]> {
    await this.initDB();
    
    if (!this.db) {
      console.warn("[IncidentStorage] IndexedDB no disponible, usando localStorage fallback");
      return this.getFromLocalStorage(options);
    }

    const {
      status = "all",
      module,
      severity,
      limit = 100,
      offset = 0,
      orderBy = "timestamp",
      orderDirection = "desc"
    } = options;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      
      let index: IDBIndex | null = null;
      let range: IDBKeyRange | null = null;

      // Seleccionar índice óptimo según filtros
      if (status !== "all" && severity) {
        index = store.index("status-severity");
        range = IDBKeyRange.bound([status, severity], [status, severity]);
      } else if (status !== "all") {
        index = store.index("status");
        range = IDBKeyRange.only(status);
      } else if (module) {
        index = store.index("module");
        range = IDBKeyRange.only(module);
      } else if (severity) {
        index = store.index("severity");
        range = IDBKeyRange.only(severity);
      }

      const request = index ? index.openCursor(range, orderDirection === "desc" ? "prev" : "next") 
                         : store.openCursor(null, orderDirection === "desc" ? "prev" : "next");

      const results: Incident[] = [];
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && results.length < limit) {
          const incident = cursor.value as Incident;
          
          // Aplicar filtros adicionales si no se usó índice compuesto
          if (status !== "all" && incident.status !== status) {
            cursor.continue();
            return;
          }
          if (module && incident.module !== module) {
            cursor.continue();
            return;
          }
          if (severity && incident.severity !== severity) {
            cursor.continue();
            return;
          }

          // Aplicar offset
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          results.push(incident);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Marcar incidentes como vistos
   */
  async markAsSeen(ids?: string[]): Promise<void> {
    await this.initDB();
    
    if (!this.db) {
      this.markAsSeenLocalStorage(ids);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      if (ids) {
        // Marcar incidentes específicos
        let completed = 0;
        const total = ids.length;

        ids.forEach(id => {
          const request = store.get(id);
          request.onsuccess = () => {
            const incident = request.result;
            if (incident) {
              incident.seen = true;
              const updateRequest = store.put(incident);
              updateRequest.onsuccess = () => {
                completed++;
                if (completed === total) resolve();
              };
              updateRequest.onerror = () => reject(updateRequest.error);
            } else {
              completed++;
              if (completed === total) resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      } else {
        // Marcar todos como vistos
        const request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const incident = cursor.value;
            incident.seen = true;
            cursor.update(incident);
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  /**
   * Resolver incidente
   */
  async resolveIncident(id: string): Promise<void> {
    await this.initDB();
    
    if (!this.db) {
      this.resolveIncidentLocalStorage(id);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const incident = getRequest.result;
        if (incident) {
          incident.status = "resolved";
          const updateRequest = store.put(incident);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(); // Incidente no encontrado
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Obtener estadísticas del almacenamiento
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    resolved: number;
    unseen: number;
    byModule: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    await this.initDB();
    
    if (!this.db) {
      return this.getStatsFromLocalStorage();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      const stats = {
        total: 0,
        active: 0,
        resolved: 0,
        unseen: 0,
        byModule: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const incident = cursor.value as Incident;
          stats.total++;
          
          if (incident.status === "active") stats.active++;
          if (incident.status === "resolved") stats.resolved++;
          if (!incident.seen) stats.unseen++;
          
          stats.byModule[incident.module] = (stats.byModule[incident.module] || 0) + 1;
          stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;
          
          cursor.continue();
        } else {
          resolve(stats);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpiar incidentes antiguos (mantener últimos N)
   */
  async cleanup(keepLast: number = 1000): Promise<void> {
    await this.initDB();
    
    if (!this.db) {
      this.cleanupLocalStorage(keepLast);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      
      // Obtener todos ordenados por timestamp (más viejos primero)
      const request = index.openCursor(null, "next");
      const toDelete: string[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          count++;
          if (count > keepLast) {
            toDelete.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          // Eliminar los excedentes
          if (toDelete.length === 0) {
            resolve();
            return;
          }

          let deleted = 0;
          toDelete.forEach(id => {
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => {
              deleted++;
              if (deleted === toDelete.length) resolve();
            };
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Fallback methods para localStorage
  private saveToLocalStorage(incident: Incident) {
    const incidents = this.getFromLocalStorage();
    const index = incidents.findIndex(i => i.id === incident.id);
    if (index >= 0) {
      incidents[index] = incident;
    } else {
      incidents.unshift(incident);
    }
    localStorage.setItem("mim_incidents", JSON.stringify(incidents.slice(0, 50)));
  }

  private getFromLocalStorage(options: any = {}): Incident[] {
    try {
      const saved = localStorage.getItem("mim_incidents");
      if (!saved) return [];
      
      let incidents = JSON.parse(saved) as Incident[];
      
      // Aplicar filtros básicos
      if (options.status !== "all") {
        incidents = incidents.filter(i => i.status === options.status);
      }
      if (options.module) {
        incidents = incidents.filter(i => i.module === options.module);
      }
      if (options.severity) {
        incidents = incidents.filter(i => i.severity === options.severity);
      }
      
      // Ordenar
      incidents.sort((a, b) => {
        const comparison = a.timestamp.localeCompare(b.timestamp);
        return options.orderDirection === "desc" ? -comparison : comparison;
      });
      
      // Aplicar paginación
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      return incidents.slice(offset, offset + limit);
    } catch (e) {
      console.error("[IncidentStorage] Error reading from localStorage:", e);
      return [];
    }
  }

  private markAsSeenLocalStorage(ids?: string[]) {
    try {
      const saved = localStorage.getItem("mim_incidents");
      if (!saved) return;
      
      const incidents = JSON.parse(saved) as Incident[];
      incidents.forEach(incident => {
        if (!ids || ids.includes(incident.id)) {
          incident.seen = true;
        }
      });
      
      localStorage.setItem("mim_incidents", JSON.stringify(incidents));
    } catch (e) {
      console.error("[IncidentStorage] Error marking as seen in localStorage:", e);
    }
  }

  private resolveIncidentLocalStorage(id: string) {
    try {
      const saved = localStorage.getItem("mim_incidents");
      if (!saved) return;
      
      const incidents = JSON.parse(saved) as Incident[];
      const incident = incidents.find(i => i.id === id);
      if (incident) {
        incident.status = "resolved";
        localStorage.setItem("mim_incidents", JSON.stringify(incidents));
      }
    } catch (e) {
      console.error("[IncidentStorage] Error resolving incident in localStorage:", e);
    }
  }

  private getStatsFromLocalStorage() {
    try {
      const saved = localStorage.getItem("mim_incidents");
      if (!saved) return {
        total: 0, active: 0, resolved: 0, unseen: 0,
        byModule: {}, bySeverity: {}
      };
      
      const incidents = JSON.parse(saved) as Incident[];
      const stats = {
        total: incidents.length,
        active: incidents.filter(i => i.status === "active").length,
        resolved: incidents.filter(i => i.status === "resolved").length,
        unseen: incidents.filter(i => !i.seen).length,
        byModule: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>
      };
      
      incidents.forEach(incident => {
        stats.byModule[incident.module] = (stats.byModule[incident.module] || 0) + 1;
        stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;
      });
      
      return stats;
    } catch (e) {
      console.error("[IncidentStorage] Error getting stats from localStorage:", e);
      return {
        total: 0, active: 0, resolved: 0, unseen: 0,
        byModule: {}, bySeverity: {}
      };
    }
  }

  private cleanupLocalStorage(keepLast: number) {
    try {
      const saved = localStorage.getItem("mim_incidents");
      if (!saved) return;
      
      const incidents = JSON.parse(saved) as Incident[];
      incidents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const trimmed = incidents.slice(0, keepLast);
      localStorage.setItem("mim_incidents", JSON.stringify(trimmed));
    } catch (e) {
      console.error("[IncidentStorage] Error cleaning up localStorage:", e);
    }
  }
}

// Singleton
export const incidentStorage = new IncidentStorage();
