/**
 * Cross-Module Incident Correlation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor reactivo que escucha el Event Bus y detecta patrones entre módulos.
 * Transforma eventos aislados en Incidentes Contextuales complejos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { eventBus } from "./eventBus";
import { MimEventMap } from "./eventContract";
import { incidentManager } from "./incidentManager";

interface CorrelationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: (events: Array<{ name: string; payload: any; timestamp: number }>) => { title: string; detail: string; severity: "danger" | "warning" | "info" } | null;
}

interface RuleResult {
  ruleId: string;
  result: ReturnType<CorrelationRule["condition"]>;
  timestamp: number;
  eventFingerprint: string;
}

class CorrelationEngine {
  private eventHistory: Array<{ name: string; payload: any; timestamp: number }> = [];
  private readonly WINDOW_MS = 30000; // Ventana de 30 segundos para correlación
  
  // Memoización y cache
  private ruleCache = new Map<string, RuleResult>();
  private readonly CACHE_TTL = 5000; // 5 segundos de cache
  
  // Sistema de reglas dinámico
  private rules: CorrelationRule[] = [
    {
      id: "inconsistent-environment",
      name: "Entorno Inconsistente",
      enabled: true,
      priority: 1,
      condition: (events) => {
        const hasDownload = events.some(e => e.name === "fomo:download-completed");
        const hasCrash = events.some(e => e.name === "sage:crash-detected");
        
        if (hasDownload && hasCrash) {
          return {
            title: "Entorno Inconsistente Detectado",
            detail: "Se descargó un mod recientemente y se detectó un crash. Es muy probable que el nuevo mod sea incompatible o falte una dependencia.",
            severity: "danger"
          };
        }
        return null;
      }
    },
    {
      id: "security-alert-chain",
      name: "Cadena de Riesgo de Seguridad",
      enabled: true,
      priority: 2,
      condition: (events) => {
        const securityEvents = events.filter(e => e.name === "sage:security-risk");
        if (securityEvents.length >= 2) {
          return {
            title: "Múltiples Riesgos de Seguridad",
            detail: `Se han detectado ${securityEvents.length} riesgos de seguridad en una ventana corta. Tu instalación de mods podría estar comprometida.`,
            severity: "danger"
          };
        }
        return null;
      }
    },
    {
      id: "config-instability",
      name: "Inestabilidad por Configuración",
      enabled: true,
      priority: 3,
      condition: (events) => {
        const hasConfigChange = events.some(e => e.name === "tweak:config-updated");
        const hasCrash = events.some(e => e.name === "sage:crash-detected");

        if (hasConfigChange && hasCrash) {
          return {
            title: "Inestabilidad tras Cambio de Configuración",
            detail: "Se modificó la configuración y el juego falló. Revisa los últimos cambios en los archivos de configuración.",
            severity: "warning"
          };
        }
        return null;
      }
    }
  ];

  constructor() {
    if (typeof window !== "undefined") {
      this.setupListeners();
    }
  }
  private setupListeners() {
    // Escuchar TODOS los eventos del bus para el historial
    const allEvents: Array<keyof MimEventMap> = [
      "fomo:download-completed", 
      "sage:crash-detected", 
      "sage:security-risk", 
      "tweak:config-updated"
    ];

    allEvents.forEach(eventName => {
      eventBus.subscribe(eventName as any, (payload: any) => {
        this.addEvent(String(eventName), payload);
      });
    });
  }
  private addEvent(name: string, payload: any) {
    const now = Date.now();
    this.eventHistory.push({ name, payload, timestamp: now });

    // Limpiar eventos antiguos fuera de la ventana
    this.eventHistory = this.eventHistory.filter(e => now - e.timestamp < this.WINDOW_MS);

    this.checkRules();
  }

  /**
   * Generar fingerprint único para el estado actual de eventos
   */
  private getEventFingerprint(): string {
    const sortedEvents = this.eventHistory
      .map(e => `${e.name}:${Math.floor(e.timestamp / 1000)}`) // Agrupar por segundo
      .sort()
      .join('|');
    return sortedEvents;
  }

  /**
   * Limpiar cache expirado
   */
  private cleanCache() {
    const now = Date.now();
    for (const [key, result] of this.ruleCache.entries()) {
      if (now - result.timestamp > this.CACHE_TTL) {
        this.ruleCache.delete(key);
      }
    }
  }

  /**
   * Verificar reglas con memoización
   */
  private checkRules() {
    const fingerprint = this.getEventFingerprint();
    const now = Date.now();
    
    // Limpiar cache expirado
    this.cleanCache();
    
    // Ordenar reglas por prioridad
    const sortedRules = this.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);
    
    for (const rule of sortedRules) {
      const cacheKey = `${rule.id}:${fingerprint}`;
      
      // Verificar cache
      const cached = this.ruleCache.get(cacheKey);
      if (cached && (now - cached.timestamp < this.CACHE_TTL)) {
        // Usar resultado cacheado
        if (cached.result) {
          this.createIncidentFromRule(rule, cached.result);
        }
        continue;
      }
      
      // Evaluar regla
      const result = rule.condition(this.eventHistory);
      
      // Guardar en cache
      this.ruleCache.set(cacheKey, {
        ruleId: rule.id,
        result,
        timestamp: now,
        eventFingerprint: fingerprint
      });
      
      // Crear incidente si hay resultado
      if (result) {
        this.createIncidentFromRule(rule, result);
      }
    }
  }

  /**
   * Crear incidente a partir de resultado de regla
   */
  private createIncidentFromRule(rule: CorrelationRule, result: NonNullable<ReturnType<CorrelationRule["condition"]>>) {
    incidentManager.createIncident({
      id: `corr-${rule.id}-${new Date().toISOString().split('T')[0]}`,
      title: result.title,
      detail: result.detail,
      severity: result.severity,
      module: "SYSTEM",
      meta: { rule: rule.id, events: this.eventHistory.map(e => e.name) }
    });
  }

  /**
   * Agregar nueva regla dinámicamente
   */
  public addRule(rule: CorrelationRule) {
    this.rules.push(rule);
    // Limpiar cache para forzar re-evaluación
    this.ruleCache.clear();
  }

  /**
   * Eliminar regla por ID
   */
  public removeRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.ruleCache.clear();
  }

  /**
   * Habilitar/deshabilitar regla
   */
  public enableRule(ruleId: string, enabled: boolean) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.ruleCache.clear();
    }
  }

  /**
   * Obtener todas las reglas
   */
  public getRules(): CorrelationRule[] {
    return [...this.rules];
  }

  /**
   * Obtener estadísticas del motor de correlación
   */
  public getStats() {
    return {
      eventHistorySize: this.eventHistory.length,
      cacheSize: this.ruleCache.size,
      enabledRules: this.rules.filter(r => r.enabled).length,
      totalRules: this.rules.length
    };
  }
}

// Singleton
export const correlationEngine = new CorrelationEngine();
