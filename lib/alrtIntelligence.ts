/**
 * ALRT Intelligence - Central Event Awareness Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Capa central de inteligencia operacional y awareness contextual encargada de 
 * escuchar, correlacionar, priorizar y transformar eventos aislados del ecosistema 
 * MIM en incidentes interpretables y accionables.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { eventBus, MimEventMap } from "./eventBus";
import { incidentManager } from "./incidentManager";

export interface EventPattern {
  id: string;
  name: string;
  description: string;
  eventSequence: Array<{
    eventType: keyof MimEventMap;
    timeWindow: number; // milisegundos
    conditions?: Record<string, any>;
  }>;
  severity: "info" | "warning" | "danger";
  confidence: number; // 0-100
  recommendation?: string;
}

export interface OperationalEvent {
  id: string;
  type: keyof MimEventMap;
  timestamp: number;
  payload: any;
  source: "FOMO" | "SAGE" | "TWEAK" | "CONFIG" | "SYSTEM";
  correlationId?: string;
}

export interface IncidentCorrelation {
  id: string;
  events: OperationalEvent[];
  pattern: EventPattern;
  severity: "info" | "warning" | "danger";
  confidence: number;
  context: {
    summary: string;
    affectedModules: string[];
    suggestedActions: string[];
    timeline: Array<{
      timestamp: number;
      event: string;
      description: string;
    }>;
  };
  createdAt: string;
}

export interface BehavioralPattern {
  id: string;
  description: string;
  frequency: number; // ocurrencias por hora
  riskLevel: "low" | "medium" | "high";
  lastSeen: number;
  context: Record<string, any>;
}

class AlrtIntelligence {
  private eventBuffer: OperationalEvent[] = [];
  private correlations = new Map<string, IncidentCorrelation>();
  private behavioralPatterns = new Map<string, BehavioralPattern>();
  private readonly BUFFER_SIZE = 1000;
  private readonly BUFFER_WINDOW = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.setupEventListeners();
    this.initializePatterns();
    this.startPeriodicAnalysis();
  }

  private setupEventListeners() {
    // Escuchar todos los eventos del ecosistema MIM
    const allEventTypes: Array<keyof MimEventMap> = [
      "fomo:search",
      "fomo:mod-downloaded",
      "fomo:version-selected",
      "sage:crash-detected",
      "sage:security-risk",
      "sage:analysis-completed",
      "sage:player-rescued",
      "tweak:mod-toggled",
      "tweak:config-updated",
      "tweak:keybind-synced",
      "alrt:incident-created",
      "alrt:incident-updated",
      "system:error",
      "system:refresh",
      "system:project-changed",
      "system:settings-updated"
    ];

    allEventTypes.forEach(eventType => {
      eventBus.subscribe(eventType, (payload) => {
        this.processEvent(eventType, payload);
      });
    });
  }

  private initializePatterns() {
    // Patrones de correlación predefinidos
    const patterns: EventPattern[] = [
      {
        id: "inconsistent-environment",
        name: "Entorno Inconsistente",
        description: "Descarga de mod seguida de crash",
        eventSequence: [
          { eventType: "fomo:mod-downloaded", timeWindow: 30000 },
          { eventType: "sage:crash-detected", timeWindow: 60000 }
        ],
        severity: "danger",
        confidence: 85,
        recommendation: "Revisar compatibilidad del mod descargado"
      },
      {
        id: "security-degradation",
        name: "Degradación de Seguridad",
        description: "Múltiples riesgos de seguridad detectados",
        eventSequence: [
          { eventType: "sage:security-risk", timeWindow: 120000 },
          { eventType: "sage:security-risk", timeWindow: 120000 }
        ],
        severity: "danger",
        confidence: 90,
        recommendation: "Ejecutar análisis de seguridad completo"
      },
      {
        id: "config-instability",
        name: "Inestabilidad por Configuración",
        description: "Cambio de configuración seguido de crash",
        eventSequence: [
          { eventType: "tweak:config-updated", timeWindow: 10000 },
          { eventType: "sage:crash-detected", timeWindow: 30000 }
        ],
        severity: "warning",
        confidence: 75,
        recommendation: "Revertir cambios de configuración"
      },
    ];

    // Almacenar patrones para análisis
    patterns.forEach(pattern => {
      this.behavioralPatterns.set(pattern.id, {
        id: pattern.id,
        description: pattern.description,
        frequency: 0,
        riskLevel: pattern.severity === "danger" ? "high" : pattern.severity === "warning" ? "medium" : "low",
        lastSeen: 0,
        context: pattern
      });
    });
  }

  private processEvent(eventType: keyof MimEventMap, payload: any) {
    const event: OperationalEvent = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: Date.now(),
      payload,
      source: this.determineEventSource(eventType)
    };

    // Agregar al buffer
    this.eventBuffer.push(event);
    this.cleanupBuffer();

    // Analizar patrones inmediatamente
    this.analyzePatterns(event);

    // Emitir evento de awareness (usando system:refresh como placeholder)
    eventBus.emit("system:refresh", {
      trigger: "auto",
      scope: "module",
      timestamp: new Date().toISOString()
    });
  }

  private determineEventSource(eventType: keyof MimEventMap): "FOMO" | "SAGE" | "TWEAK" | "CONFIG" | "SYSTEM" {
    if (eventType.startsWith("fomo:")) return "FOMO";
    if (eventType.startsWith("sage:")) return "SAGE";
    if (eventType.startsWith("tweak:")) return "TWEAK";
    if (eventType.startsWith("alert:")) return "SYSTEM";
    if (eventType.startsWith("system:")) return "SYSTEM";
    return "SYSTEM";
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupBuffer() {
    const now = Date.now();
    this.eventBuffer = this.eventBuffer.filter(event => 
      now - event.timestamp < this.BUFFER_WINDOW
    );

    if (this.eventBuffer.length > this.BUFFER_SIZE) {
      this.eventBuffer = this.eventBuffer.slice(-this.BUFFER_SIZE);
    }
  }

  private analyzePatterns(triggerEvent: OperationalEvent) {
    const patterns = Array.from(this.behavioralPatterns.values())
      .map(p => p.context as EventPattern)
      .filter(p => p !== undefined);

    for (const pattern of patterns) {
      this.checkPattern(pattern, triggerEvent);
    }
  }

  private checkPattern(pattern: EventPattern, triggerEvent: OperationalEvent) {
    const relevantEvents = this.eventBuffer.filter(event => 
      pattern.eventSequence.some(seq => seq.eventType === event.type)
    );

    if (relevantEvents.length < pattern.eventSequence.length) {
      return;
    }

    // Verificar secuencia temporal
    const sortedEvents = relevantEvents.sort((a, b) => a.timestamp - b.timestamp);
    let patternMatched = false;
    let matchedEvents: OperationalEvent[] = [];

    for (let i = 0; i <= sortedEvents.length - pattern.eventSequence.length; i++) {
      const window = sortedEvents.slice(i, i + pattern.eventSequence.length);
      
      if (this.matchesPattern(window, pattern)) {
        patternMatched = true;
        matchedEvents = window;
        break;
      }
    }

    if (patternMatched) {
      this.createCorrelation(pattern, matchedEvents);
      this.updateBehavioralPattern(pattern.id);
    }
  }

  private matchesPattern(events: OperationalEvent[], pattern: EventPattern): boolean {
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    
    // Verificar ventana de tiempo
    if (lastEvent.timestamp - firstEvent.timestamp > pattern.eventSequence[0].timeWindow) {
      return false;
    }

    // Verificar secuencia de eventos
    for (let i = 0; i < pattern.eventSequence.length; i++) {
      const expectedType = pattern.eventSequence[i].eventType;
      const actualEvent = events[i];
      
      if (actualEvent.type !== expectedType) {
        return false;
      }

      // Verificar condiciones adicionales si existen
      const conditions = pattern.eventSequence[i].conditions;
      if (conditions) {
        for (const [key, value] of Object.entries(conditions)) {
          if (actualEvent.payload[key] !== value) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private createCorrelation(pattern: EventPattern, events: OperationalEvent[]) {
    const correlationId = this.generateCorrelationId();
    
    // Asignar correlation ID a los eventos
    events.forEach(event => {
      event.correlationId = correlationId;
    });

    const correlation: IncidentCorrelation = {
      id: correlationId,
      events,
      pattern,
      severity: pattern.severity,
      confidence: pattern.confidence,
      context: this.buildContext(events, pattern),
      createdAt: new Date().toISOString()
    };

    this.correlations.set(correlationId, correlation);

    // Crear incidente en ALRT
    this.createIncidentFromCorrelation(correlation);

    // Emitir evento de correlación (usando alrt:incident-created)
    eventBus.emit("alrt:incident-created", {
      incidentId: `alrt-correlation-${correlationId}`,
      title: `Correlación: ${pattern.name}`,
      description: pattern.description,
      severity: pattern.severity === "danger" ? "danger" : pattern.severity === "warning" ? "warning" : "info",
      status: "unseen",
      module: "SYSTEM",
      correlationId
    });
  }

  private buildContext(events: OperationalEvent[], pattern: EventPattern) {
    const affectedModules = [...new Set(events.map(e => e.source))];
    const timeline = events.map(event => ({
      timestamp: event.timestamp,
      event: event.type,
      description: this.generateEventDescription(event)
    }));

    return {
      summary: pattern.description,
      affectedModules,
      suggestedActions: pattern.recommendation ? [pattern.recommendation] : [],
      timeline
    };
  }

  private generateEventDescription(event: OperationalEvent): string {
    const descriptions: Record<string, string> = {
      "fomo:mod-downloaded": "Mod descargado",
      "sage:crash-detected": "Crash detectado",
      "sage:dependency-missing": "Dependencia faltante",
      "sage:security-risk": "Riesgo de seguridad",
      "tweak:config-updated": "Configuración actualizada",
      "tweak:shader-changed": "Shader cambiado"
    };

    return descriptions[event.type] || `Evento: ${event.type}`;
  }

  private createIncidentFromCorrelation(correlation: IncidentCorrelation) {
    incidentManager.createIncident({
      id: `alrt-correlation-${correlation.id}`,
      title: `Correlación Detectada: ${correlation.pattern.name}`,
      detail: `${correlation.context.summary}. Módulos afectados: ${correlation.context.affectedModules.join(", ")}.`,
      severity: correlation.severity,
      module: "SYSTEM",
      meta: {
        correlationId: correlation.id,
        pattern: correlation.pattern.id,
        confidence: correlation.confidence,
        events: correlation.events.map(e => e.id),
        suggestedActions: correlation.context.suggestedActions
      }
    });
  }

  private updateBehavioralPattern(patternId: string) {
    const pattern = this.behavioralPatterns.get(patternId);
    if (pattern) {
      pattern.frequency++;
      pattern.lastSeen = Date.now();
    }
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicAnalysis() {
    setInterval(() => {
      this.performBehavioralAnalysis();
      this.cleanupOldCorrelations();
    }, 60000); // Cada minuto
  }

  private performBehavioralAnalysis() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Analizar patrones de comportamiento
    this.behavioralPatterns.forEach(pattern => {
      if (pattern.frequency > 0) {
        const hourlyFrequency = pattern.frequency / (now / oneHour);
        
        // Detectar patrones anómalos
        if (hourlyFrequency > 5 && pattern.riskLevel !== "high") {
          this.createBehavioralIncident(pattern, "high-frequency");
        }
      }
    });

    // Resetear contadores de frecuencia
    this.behavioralPatterns.forEach(pattern => {
      pattern.frequency = 0;
    });
  }

  private createBehavioralIncident(pattern: BehavioralPattern, reason: string) {
    incidentManager.createIncident({
      id: `alrt-behavior-${pattern.id}-${Date.now()}`,
      title: `Patrón Anómalo Detectado: ${pattern.description}`,
      detail: `Se detectó un patrón de comportamiento anómalo: ${reason}. Frecuencia: ${pattern.frequency} ocurrencias.`,
      severity: pattern.riskLevel === "high" ? "danger" : "warning",
      module: "SYSTEM",
      meta: {
        patternId: pattern.id,
        reason,
        frequency: pattern.frequency,
        riskLevel: pattern.riskLevel
      }
    });
  }

  private cleanupOldCorrelations() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [id, correlation] of this.correlations.entries()) {
      const correlationTime = new Date(correlation.createdAt).getTime();
      if (now - correlationTime > maxAge) {
        this.correlations.delete(id);
      }
    }
  }

  /**
   * Obtener correlaciones activas
   */
  getActiveCorrelations(): IncidentCorrelation[] {
    return Array.from(this.correlations.values());
  }

  /**
   * Obtener patrones de comportamiento
   */
  getBehavioralPatterns(): BehavioralPattern[] {
    return Array.from(this.behavioralPatterns.values());
  }

  /**
   * Obtener timeline operacional unificado
   */
  getOperationalTimeline(limit: number = 100): OperationalEvent[] {
    return this.eventBuffer
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obtener estadísticas de awareness
   */
  getAwarenessStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const recentEvents = this.eventBuffer.filter(e => now - e.timestamp < oneHour);
    const recentCorrelations = Array.from(this.correlations.values())
      .filter(c => now - new Date(c.createdAt).getTime() < oneHour);

    return {
      eventsInLastHour: recentEvents.length,
      correlationsInLastHour: recentCorrelations.length,
      activePatterns: this.behavioralPatterns.size,
      highRiskPatterns: Array.from(this.behavioralPatterns.values())
        .filter(p => p.riskLevel === "high").length,
      topEventSources: this.getTopEventSources(recentEvents)
    };
  }

  private getTopEventSources(events: OperationalEvent[]): Array<{ source: string; count: number }> {
    const sourceCounts = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Generar recomendaciones contextuales
   */
  generateRecommendations(): Array<{
    type: "install_dependency" | "disable_mod" | "update_config" | "check_security";
    description: string;
    priority: number;
    context: any;
  }> {
    const recommendations: any[] = [];
    const recentCorrelations = this.getActiveCorrelations()
      .filter(c => Date.now() - new Date(c.createdAt).getTime() < 30 * 60 * 1000); // Últimos 30 min

    recentCorrelations.forEach(correlation => {
      if (correlation.pattern.recommendation) {
        recommendations.push({
          type: "update_config",
          description: correlation.pattern.recommendation,
          priority: correlation.severity === "danger" ? 1 : 2,
          context: {
            correlationId: correlation.id,
            pattern: correlation.pattern.id,
            affectedModules: correlation.context.affectedModules
          }
        });
      }
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }
}

// Singleton
export const alrtIntelligence = new AlrtIntelligence();
