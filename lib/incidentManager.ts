/**
 * ALRT Central Intelligence Layer — Incident Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Núcleo de inteligencia operacional de MIM. Escucha el Event Bus,
 * correlaciona eventos, genera incidentes y gestiona la persistencia.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { eventBus } from "./eventBus";
import { MimEventMap } from "./eventContract";
import { incidentStorage } from "./incidentStorage";

export interface Incident {
  id: string;
  title: string;
  detail: string;
  severity: "danger" | "warning" | "info";
  timestamp: string;
  module: "SAGE" | "FOMO" | "TWEAK" | "CONFIG" | "SYSTEM";
  status: "active" | "resolved";
  seen: boolean;
  meta?: any;
}

class IncidentManager {
  private incidents: Incident[] = [];
  private initialized = false;
  private cacheExpiry = 0;
  private readonly CACHE_DURATION = 30000; // 30 segundos de cache
  private notifyTimer: ReturnType<typeof setTimeout> | null = null; // debounce notify

  constructor() {
    if (typeof window !== "undefined") {
      this.setupSubscriptions();
      this.initialized = true;
    }
  }

  private setupSubscriptions() {
    // 1. Escuchar crashes de SAGE
    eventBus.subscribe("sage:crash-detected", (data) => {
      this.createIncident({
        id: "sage-active-crash",
        title: `Caída de juego detectada (${data.crashType})`,
        detail: `Se detectaron reportes críticos de la sesión actual (${data.sessionId}). Revisa SAGE para el diagnóstico. Archivo log: ${data.logFile}`,
        severity: data.severity === "critical" ? "danger" : "warning",
        module: "SAGE",
        meta: data
      });
    });

    // 2. Escuchar riesgos de seguridad
    eventBus.subscribe("sage:security-risk", (data) => {
      if (data.severity === "critical" || data.severity === "suspicious") {
        this.createIncident({
          id: `sage-security-${data.fileName}-${data.riskType}`,
          title: `Riesgo de seguridad: ${data.severity.toUpperCase()}`,
          detail: `Se ha detectado una amenaza tipo ${data.riskType} en el archivo ${data.fileName} con una puntuación de riesgo de ${data.riskScore}/100.`,
          severity: data.severity === "critical" ? "danger" : "warning",
          module: "SAGE",
          meta: data
        });
      }
    });

    // 3. Escuchar errores de sistema
    eventBus.subscribe("system:error", (data) => {
      this.createIncident({
        id: `sys-error-${Date.now()}`,
        title: data.source,
        detail: data.message,
        severity: (data.severity === "critical" || !data.recoverable) ? "danger" : "warning",
        module: "SYSTEM",
        meta: data
      });
    });

    // 4. Escuchar validaciones de GATE
    eventBus.subscribe("builder:validation-completed", (data) => {
      if (!data.passed || data.warnings.length > 0) {
        this.createIncident({
          id: `gate-validation-${data.buildId}`,
          title: data.passed ? "GATE: Advertencias en el pack" : "GATE: Fallo de validación",
          detail: `Se detectaron ${data.issues.length} errores y ${data.warnings.length} advertencias en la validación del pack.`,
          severity: data.passed ? "warning" : "danger",
          module: "SYSTEM",
          meta: data
        });
      }
    });

    // 5. Correlación: Si se descarga un mod y SAGE detecta algo inmediatamente
    // Esto se expandirá con el Reactive Rule System
  }

  public async createIncident(data: Partial<Incident> & { id: string; title: string; detail: string; severity: Incident["severity"]; module: Incident["module"] }) {
    // Evitar duplicados exactos si el ID es el mismo y está activo
    const existing = this.incidents.find(i => i.id === data.id && i.status === "active");
    
    const incident: Incident = {
      status: "active",
      seen: false,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (existing) {
      existing.detail = data.detail;
      existing.timestamp = incident.timestamp;
      existing.meta = { ...existing.meta, ...data.meta };
    } else {
      this.incidents.unshift(incident);
    }

    // Guardar en IndexedDB
    await incidentStorage.saveIncident(existing || incident);
    
    // Invalidar cache
    this.cacheExpiry = 0;
    
    this.notify();
  }

  public async resolveIncident(id: string) {
    const incident = this.incidents.find(i => i.id === id);
    if (incident) {
      incident.status = "resolved";
      await incidentStorage.resolveIncident(id);
      this.cacheExpiry = 0;
      this.notify();
      eventBus.emit("alrt:incident-updated", { 
        incidentId: id, 
        changes: { status: "resolved" },
        updatedBy: "ALRT"
      });
    } else {
      await incidentStorage.resolveIncident(id);
      this.cacheExpiry = 0;
      // Reload active incidents to ensure memory synchronization
      this.incidents = await this.getIncidents("all", { limit: 100 });
      this.notify();
    }
  }

  public async markAsSeen(id?: string) {
    if (id) {
      const incident = this.incidents.find(i => i.id === id);
      if (incident) incident.seen = true;
    } else {
      this.incidents.forEach(i => i.seen = true);
    }
    
    await incidentStorage.markAsSeen(id ? [id] : undefined);
    this.cacheExpiry = 0;
    this.notify();
  }

  public async getIncidents(status: "active" | "resolved" | "all" = "active", options: {
    module?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Incident[]> {
    const now = Date.now();
    
    // Usar cache si está válido
    if (this.cacheExpiry > now && this.incidents.length > 0) {
      let filtered = this.incidents;
      
      if (status !== "all") {
        filtered = filtered.filter(i => i.status === status);
      }
      if (options.module) {
        filtered = filtered.filter(i => i.module === options.module);
      }
      if (options.severity) {
        filtered = filtered.filter(i => i.severity === options.severity);
      }
      
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      return filtered.slice(offset, offset + limit);
    }
    
    // Cargar desde IndexedDB
    const incidents = await incidentStorage.getIncidents({
      status,
      module: options.module,
      severity: options.severity,
      limit: options.limit || 100,
      offset: options.offset || 0,
      orderBy: "timestamp",
      orderDirection: "desc"
    });
    
    // Actualizar cache
    this.incidents = incidents;
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return incidents;
  }

  /**
   * Obtener estadísticas de incidentes
   */
  public async getStats() {
    return incidentStorage.getStats();
  }

  /**
   * Limpiar incidentes antiguos
   */
  public async cleanup(keepLast: number = 1000) {
    await incidentStorage.cleanup(keepLast);
    this.cacheExpiry = 0;
    this.incidents = await this.getIncidents("all", { limit: 100 });
  }

  // Métodos de compatibilidad (deprecados pero funcionales)
  private async saveToStorage() {
    // Método obsoleto - ahora usa IndexedDB automáticamente
    console.warn("[ALRT] saveToStorage is deprecated, using IndexedDB instead");
  }

  private async loadFromStorage() {
    // Método obsoleto - ahora carga bajo demanda
    console.warn("[ALRT] loadFromStorage is deprecated, loading on-demand from IndexedDB");
  }

  private notify() {
    if (typeof window === "undefined") return;
    // Debounce: coalesce rapid consecutive incidents into a single dispatch
    if (this.notifyTimer) clearTimeout(this.notifyTimer);
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = null;
      window.dispatchEvent(new CustomEvent("mim:incidents-updated", { detail: this.incidents }));
    }, 100);
  }

  public subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => {};
    const handler = () => callback();
    window.addEventListener("mim:incidents-updated", handler);
    return () => window.removeEventListener("mim:incidents-updated", handler);
  }
}

// Singleton
export const incidentManager = new IncidentManager();
