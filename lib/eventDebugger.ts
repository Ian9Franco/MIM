/**
 * ALRT Event Debugger - Development Timeline Tools
 * ─────────────────────────────────────────────────────────────────────────────
 * Herramientas de debugging para el sistema event-driven de MIM.
 * 
 * Proporciona visibilidad completa del flujo de eventos, correlaciones,
 * y transformaciones de señales a incidentes. Esencial para mantener
 * la trazabilidad y diagnosticar problemas en el ecosistema operacional.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { eventBus } from "./eventBus";
import { alrtIntelligence } from "./alrtIntelligence";
import { sageRecoveryEngine } from "./sageRecoveryEngine";
import { incidentManager } from "./incidentManager";
import {
  EventName,
  EventPayload,
  EventMetadata,
  EventSource,
  Signal,
  Incident,
  Recommendation,
  CorrelationRule
} from "./eventContract";

export interface DebugEvent {
  id: string;
  type: EventName;
  payload: EventPayload<EventName>;
  metadata: EventMetadata;
  processed: boolean;
  processingTime: number;
  handlers: string[];
  errors?: string[];
}

export interface DebugCorrelation {
  id: string;
  patternId: string;
  patternName: string;
  confidence: number;
  inputEvents: string[];
  outputIncident?: string;
  processingTime: number;
  timestamp: string;
}

export interface DebugIncident {
  incident: Incident;
  sourceSignals: string[];
  correlationChain: string[];
  recommendations: Recommendation[];
  lifecycle: Array<{
    status: string;
    timestamp: string;
    changedBy: string;
    changes: Record<string, any>;
  }>;
}

export interface EventFlowTrace {
  id: string;
  correlationId: string;
  events: DebugEvent[];
  correlations: DebugCorrelation[];
  incidents: DebugIncident[];
  startTime: string;
  endTime?: string;
  totalDuration?: number;
}

class EventDebugger {
  private eventHistory = new Map<string, DebugEvent>();
  private correlationHistory = new Map<string, DebugCorrelation>();
  private incidentHistory = new Map<string, DebugIncident>();
  private flowTraces = new Map<string, EventFlowTrace>();
  private activeTrace?: string;
  private maxHistorySize = 10000;
  private debugMode = false;

  constructor() {
    this.setupEventInterception();
    this.startPeriodicCleanup();
  }

  /**
   * Activar modo debugging para capturar todos los eventos
   */
  enableDebugMode() {
    this.debugMode = true;
    console.log("[ALRT Debugger] Debug mode enabled - capturing all events");
    
    // Emitir evento de debugging activado
    eventBus.emit("system:refresh", {
      trigger: "manual",
      scope: "full",
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Desactivar modo debugging
   */
  disableDebugMode() {
    this.debugMode = false;
    console.log("[ALRT Debugger] Debug mode disabled");
  }

  /**
   * Iniciar un nuevo trace de flujo de eventos
   */
  startTrace(correlationId?: string): string {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trace: EventFlowTrace = {
      id: traceId,
      correlationId: correlationId || createCorrelationId(),
      events: [],
      correlations: [],
      incidents: [],
      startTime: new Date().toISOString()
    };

    this.flowTraces.set(traceId, trace);
    this.activeTrace = traceId;

    console.log(`[ALRT Debugger] Started trace: ${traceId}`);
    return traceId;
  }

  /**
   * Finalizar trace activo
   */
  endTrace(traceId?: string): EventFlowTrace | null {
    const id = traceId || this.activeTrace;
    if (!id) return null;

    const trace = this.flowTraces.get(id);
    if (!trace) return null;

    trace.endTime = new Date().toISOString();
    trace.totalDuration = new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime();

    if (id === this.activeTrace) {
      this.activeTrace = undefined;
    }

    console.log(`[ALRT Debugger] Ended trace: ${id} (${trace.totalDuration}ms)`);
    return trace;
  }

  /**
   * Configurar interceptación de eventos para debugging
   */
  private setupEventInterception() {
    // Interceptar todos los eventos del bus
    const originalEmit = eventBus.emit.bind(eventBus);
    
    eventBus.emit = <T extends EventName>(event: T, payload: EventPayload<T>) => {
      const startTime = performance.now();
      
      // Capturar evento si estamos en debug mode
      if (this.debugMode) {
        this.captureEvent(event, payload, startTime);
      }

      // Ejecutar emit original
      const result = originalEmit(event, payload);

      // Registrar tiempo de procesamiento
      const processingTime = performance.now() - startTime;
      
      if (this.debugMode) {
        this.updateEventProcessingTime(event, processingTime);
      }

      return result;
    };
  }

  /**
   * Capturar evento para debugging
   */
  private captureEvent<T extends EventName>(
    eventType: T,
    payload: EventPayload<T>,
    startTime: number
  ) {
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const debugEvent: DebugEvent = {
      id: eventId,
      type: eventType,
      payload,
      metadata: {
        eventId,
        timestamp: new Date().toISOString(),
        source: this.determineEventSource(eventType),
        schemaVersion: "1.0.0"
      },
      processed: false,
      processingTime: 0,
      handlers: []
    };

    this.eventHistory.set(eventId, debugEvent);

    // Agregar al trace activo si existe
    if (this.activeTrace) {
      const trace = this.flowTraces.get(this.activeTrace);
      if (trace) {
        trace.events.push(debugEvent);
      }
    }

    // Limitar tamaño del historial
    if (this.eventHistory.size > this.maxHistorySize) {
      const oldestKey = this.eventHistory.keys().next().value;
      if (oldestKey !== undefined) {
        this.eventHistory.delete(oldestKey);
      }
    }
  }

  /**
   * Actualizar tiempo de procesamiento de evento
   */
  private updateEventProcessingTime(eventType: EventName, processingTime: number) {
    // Encontrar el evento más reciente de este tipo
    const recentEvent = Array.from(this.eventHistory.values())
      .reverse()
      .find(e => e.type === eventType && !e.processed);

    if (recentEvent) {
      recentEvent.processingTime = processingTime;
      recentEvent.processed = true;
    }
  }

  /**
   * Determinar source de evento basado en su tipo
   */
  private determineEventSource(eventType: EventName): EventSource {
    if (eventType.startsWith("fomo:")) return "FOMO";
    if (eventType.startsWith("sage:")) return "SAGE";
    if (eventType.startsWith("tweak:")) return "TWEAK";
    if (eventType.startsWith("alrt:")) return "ALRT";
    if (eventType.startsWith("security:")) return "SECURITY";
    if (eventType.startsWith("watcher:")) return "WATCHER";
    if (eventType.startsWith("builder:")) return "BUILDER";
    if (eventType.startsWith("system:")) return "SYSTEM";
    return "SYSTEM";
  }

  /**
   * Registrar correlación detectada por ALRT
   */
  registerCorrelation(correlation: DebugCorrelation) {
    this.correlationHistory.set(correlation.id, correlation);

    // Agregar al trace activo si existe
    if (this.activeTrace) {
      const trace = this.flowTraces.get(this.activeTrace);
      if (trace) {
        trace.correlations.push(correlation);
      }
    }

    console.log(`[ALRT Debugger] Correlation: ${correlation.patternName} (${correlation.confidence}% confidence)`);
  }

  /**
   * Registrar incidente creado
   */
  registerIncident(incident: Incident, sourceSignals: string[] = []) {
    const debugIncident: DebugIncident = {
      incident,
      sourceSignals,
      correlationChain: [],
      recommendations: [],
      lifecycle: [{
        status: incident.status,
        timestamp: incident.createdAt,
        changedBy: incident.module,
        changes: { created: true }
      }]
    };

    this.incidentHistory.set(incident.id, debugIncident);

    // Agregar al trace activo si existe
    if (this.activeTrace) {
      const trace = this.flowTraces.get(this.activeTrace);
      if (trace) {
        trace.incidents.push(debugIncident);
      }
    }

    console.log(`[ALRT Debugger] Incident: ${incident.title} (${incident.severity})`);
  }

  /**
   * Generar timeline de debugging
   */
  generateTimeline(options: {
    startTime?: string;
    endTime?: string;
    eventTypes?: EventName[];
    sources?: EventSource[];
    correlationId?: string;
    limit?: number;
  } = {}): Array<{
    timestamp: string;
    type: "event" | "correlation" | "incident";
    data: DebugEvent | DebugCorrelation | DebugIncident;
    duration?: number;
  }> {
    const timeline: Array<{
      timestamp: string;
      type: "event" | "correlation" | "incident";
      data: DebugEvent | DebugCorrelation | DebugIncident;
      duration?: number;
    }> = [];

    // Agregar eventos
    for (const event of this.eventHistory.values()) {
      if (this.matchesFilters(event, options)) {
        timeline.push({
          timestamp: event.metadata.timestamp,
          type: "event",
          data: event,
          duration: event.processingTime
        });
      }
    }

    // Agregar correlaciones
    for (const correlation of this.correlationHistory.values()) {
      if (this.matchesCorrelationFilters(correlation, options)) {
        timeline.push({
          timestamp: correlation.timestamp,
          type: "correlation",
          data: correlation,
          duration: correlation.processingTime
        });
      }
    }

    // Agregar incidentes
    for (const incident of this.incidentHistory.values()) {
      if (this.matchesIncidentFilters(incident, options)) {
        timeline.push({
          timestamp: incident.incident.createdAt,
          type: "incident",
          data: incident
        });
      }
    }

    // Ordenar por timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Aplicar límite
    if (options.limit) {
      return timeline.slice(0, options.limit);
    }

    return timeline;
  }

  /**
   * Verificar si evento coincide con filtros
   */
  private matchesFilters(event: DebugEvent, options: any): boolean {
    if (options.eventTypes && !options.eventTypes.includes(event.type)) {
      return false;
    }

    if (options.sources && !options.sources.includes(event.metadata.source)) {
      return false;
    }

    if (options.correlationId && event.metadata.correlationId !== options.correlationId) {
      return false;
    }

    if (options.startTime && new Date(event.metadata.timestamp) < new Date(options.startTime)) {
      return false;
    }

    if (options.endTime && new Date(event.metadata.timestamp) > new Date(options.endTime)) {
      return false;
    }

    return true;
  }

  /**
   * Verificar si correlación coincide con filtros
   */
  private matchesCorrelationFilters(correlation: DebugCorrelation, options: any): boolean {
    if (options.startTime && new Date(correlation.timestamp) < new Date(options.startTime)) {
      return false;
    }

    if (options.endTime && new Date(correlation.timestamp) > new Date(options.endTime)) {
      return false;
    }

    return true;
  }

  /**
   * Verificar si incidente coincide con filtros
   */
  private matchesIncidentFilters(incident: DebugIncident, options: any): boolean {
    if (options.startTime && new Date(incident.incident.createdAt) < new Date(options.startTime)) {
      return false;
    }

    if (options.endTime && new Date(incident.incident.createdAt) > new Date(options.endTime)) {
      return false;
    }

    return true;
  }

  /**
   * Generar reporte de análisis de flujo
   */
  generateFlowAnalysis(traceId?: string): {
    summary: {
      totalEvents: number;
      totalCorrelations: number;
      totalIncidents: number;
      averageProcessingTime: number;
      eventTypes: Record<string, number>;
      sources: Record<EventSource, number>;
    };
    bottlenecks: Array<{
      type: "slow-event" | "failed-correlation" | "incident-backlog";
      description: string;
      impact: number;
    }>;
    recommendations: string[];
  } {
    const trace = traceId ? this.flowTraces.get(traceId) : this.getActiveTraceData();
    
    if (!trace) {
      throw new Error("Trace not found");
    }

    const summary = {
      totalEvents: trace.events.length,
      totalCorrelations: trace.correlations.length,
      totalIncidents: trace.incidents.length,
      averageProcessingTime: trace.events.reduce((sum, e) => sum + e.processingTime, 0) / trace.events.length || 0,
      eventTypes: {} as Record<string, number>,
      sources: {} as Record<EventSource, number>
    };

    // Analizar distribución de eventos
    trace.events.forEach(event => {
      summary.eventTypes[event.type] = (summary.eventTypes[event.type] || 0) + 1;
      summary.sources[event.metadata.source] = (summary.sources[event.metadata.source] || 0) + 1;
    });

    // Detectar cuellos de botella
    const bottlenecks = [];

    // Eventos lentos
    const slowEvents = trace.events.filter(e => e.processingTime > 100);
    if (slowEvents.length > 0) {
      bottlenecks.push({
        type: "slow-event" as const,
        description: `${slowEvents.length} eventos con procesamiento >100ms`,
        impact: slowEvents.reduce((sum, e) => sum + e.processingTime, 0)
      });
    }

    // Correlaciones con baja confianza
    const lowConfidenceCorrelations = trace.correlations.filter(c => c.confidence < 50);
    if (lowConfidenceCorrelations.length > 0) {
      bottlenecks.push({
        type: "failed-correlation" as const,
        description: `${lowConfidenceCorrelations.length} correlaciones con baja confianza (<50%)`,
        impact: lowConfidenceCorrelations.length
      });
    }

    // Incidentes sin resolver
    const unresolvedIncidents = trace.incidents.filter(i => i.incident.status !== "resolved");
    if (unresolvedIncidents.length > 0) {
      bottlenecks.push({
        type: "incident-backlog" as const,
        description: `${unresolvedIncidents.length} incidentes sin resolver`,
        impact: unresolvedIncidents.length
      });
    }

    // Generar recomendaciones
    const recommendations = [];

    if (summary.averageProcessingTime > 50) {
      recommendations.push("Optimizar procesamiento de eventos - tiempo promedio elevado");
    }

    if (summary.totalIncidents > summary.totalCorrelations) {
      recommendations.push("Revisar reglas de correlación - muchos incidentes sin correlacionar");
    }

    if (Object.keys(summary.eventTypes).length > 20) {
      recommendations.push("Considerar consolidar tipos de eventos similares");
    }

    return {
      summary,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Obtener datos del trace activo o consolidar todos
   */
  private getActiveTraceData(): EventFlowTrace {
    if (this.activeTrace) {
      const trace = this.flowTraces.get(this.activeTrace);
      if (trace) return trace;
    }

    // Consolidar todos los datos si no hay trace activo
    return {
      id: "consolidated",
      correlationId: "global",
      events: Array.from(this.eventHistory.values()),
      correlations: Array.from(this.correlationHistory.values()),
      incidents: Array.from(this.incidentHistory.values()),
      startTime: new Date(Date.now() - 3600000).toISOString(), // Última hora
      endTime: new Date().toISOString(),
      totalDuration: 3600000
    };
  }

  /**
   * Exportar datos de debugging
   */
  exportData(): {
    events: DebugEvent[];
    correlations: DebugCorrelation[];
    incidents: DebugIncident[];
    traces: EventFlowTrace[];
    exportTime: string;
  } {
    return {
      events: Array.from(this.eventHistory.values()),
      correlations: Array.from(this.correlationHistory.values()),
      incidents: Array.from(this.incidentHistory.values()),
      traces: Array.from(this.flowTraces.values()),
      exportTime: new Date().toISOString()
    };
  }

  /**
   * Limpiar datos antiguos
   */
  private startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      // Limpiar eventos antiguos
      for (const [id, event] of this.eventHistory.entries()) {
        if (now - new Date(event.metadata.timestamp).getTime() > maxAge) {
          this.eventHistory.delete(id);
        }
      }

      // Limpiar traces antiguos
      for (const [id, trace] of this.flowTraces.entries()) {
        if (trace.endTime && now - new Date(trace.endTime).getTime() > maxAge) {
          this.flowTraces.delete(id);
        }
      }

      console.log(`[ALRT Debugger] Cleanup completed. Events: ${this.eventHistory.size}, Traces: ${this.flowTraces.size}`);
    }, 60 * 60 * 1000); // Cada hora
  }

  /**
   * Obtener estadísticas del debugger
   */
  getStats() {
    return {
      debugMode: this.debugMode,
      activeTrace: this.activeTrace,
      eventsCaptured: this.eventHistory.size,
      correlationsDetected: this.correlationHistory.size,
      incidentsCreated: this.incidentHistory.size,
      activeTraces: this.flowTraces.size,
      memoryUsage: {
        events: this.eventHistory.size * 1024, // Estimación
        correlations: this.correlationHistory.size * 512,
        incidents: this.incidentHistory.size * 2048
      }
    };
  }
}

// Helper function
function createCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Singleton export
export const eventDebugger = new EventDebugger();
