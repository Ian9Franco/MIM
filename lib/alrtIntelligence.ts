/**
 * ALRT Intelligence - Central Event Awareness Layer
 */

import { eventBus, MimEventMap } from "./eventBus";
import { incidentManager } from "./incidentManager";
import { 
  EventPattern, OperationalEvent, IncidentCorrelation, BehavioralPattern 
} from "./intelligence/types";
import { DEFAULT_PATTERNS } from "./intelligence/CorrelationRules";

class AlrtIntelligence {
  private eventBuffer: OperationalEvent[] = [];
  private correlations = new Map<string, IncidentCorrelation>();
  private behavioralPatterns = new Map<string, BehavioralPattern>();
  private readonly BUFFER_SIZE = 1000;
  private readonly BUFFER_WINDOW = 300000; // 5 min

  constructor() {
    this.setupEventListeners();
    this.initializePatterns();
    this.startPeriodicAnalysis();
  }

  private setupEventListeners() {
    const allEvents: Array<keyof MimEventMap> = [
      "fomo:search", "fomo:mod-downloaded", "fomo:version-selected",
      "sage:crash-detected", "sage:security-risk", "sage:analysis-completed", "sage:player-rescued",
      "tweak:mod-toggled", "tweak:config-updated", "tweak:keybind-synced",
      "alrt:incident-created", "alrt:incident-updated",
      "system:error", "system:refresh", "system:project-changed", "system:settings-updated"
    ];
    allEvents.forEach(type => eventBus.subscribe(type, (payload) => this.processEvent(type, payload)));
  }

  private initializePatterns() {
    DEFAULT_PATTERNS.forEach(p => {
      this.behavioralPatterns.set(p.id, {
        id: p.id, description: p.description, frequency: 0,
        riskLevel: p.severity === "danger" ? "high" : p.severity === "warning" ? "medium" : "low",
        lastSeen: 0, context: p
      });
    });
  }

  private processEvent(type: keyof MimEventMap, payload: any) {
    const event: OperationalEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type, timestamp: Date.now(), payload, source: this.determineSource(type)
    };
    this.eventBuffer.push(event);
    this.cleanupBuffer();
    this.analyzePatterns(event);
    eventBus.emit("system:refresh", { trigger: "auto", scope: "module", timestamp: new Date().toISOString() });
  }

  private determineSource(type: string): any {
    if (type.startsWith("fomo:")) return "FOMO";
    if (type.startsWith("sage:")) return "SAGE";
    if (type.startsWith("tweak:")) return "TWEAK";
    return "SYSTEM";
  }

  private cleanupBuffer() {
    const now = Date.now();
    this.eventBuffer = this.eventBuffer.filter(e => now - e.timestamp < this.BUFFER_WINDOW);
    if (this.eventBuffer.length > this.BUFFER_SIZE) this.eventBuffer = this.eventBuffer.slice(-this.BUFFER_SIZE);
  }

  private analyzePatterns(triggerEvent: OperationalEvent) {
    this.behavioralPatterns.forEach(p => this.checkPattern(p.context as EventPattern));
  }

  private checkPattern(pattern: EventPattern) {
    const relevant = this.eventBuffer.filter(e => pattern.eventSequence.some(s => s.eventType === e.type));
    if (relevant.length < pattern.eventSequence.length) return;

    const sorted = relevant.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i <= sorted.length - pattern.eventSequence.length; i++) {
      const window = sorted.slice(i, i + pattern.eventSequence.length);
      if (this.matchesPattern(window, pattern)) {
        this.createCorrelation(pattern, window);
        this.updateBehavioralPattern(pattern.id);
        break;
      }
    }
  }

  private matchesPattern(events: OperationalEvent[], pattern: EventPattern): boolean {
    if (events[events.length - 1].timestamp - events[0].timestamp > pattern.eventSequence[0].timeWindow) return false;
    return pattern.eventSequence.every((seq, i) => {
      const e = events[i];
      if (e.type !== seq.eventType) return false;
      if (seq.conditions) {
        return Object.entries(seq.conditions).every(([k, v]) => e.payload[k] === v);
      }
      return true;
    });
  }

  private createCorrelation(pattern: EventPattern, events: OperationalEvent[]) {
    const id = `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    events.forEach(e => e.correlationId = id);
    const correlation: IncidentCorrelation = {
      id, events, pattern, severity: pattern.severity, confidence: pattern.confidence,
      context: { 
        summary: pattern.description, affectedModules: [...new Set(events.map(e => e.source as string))],
        suggestedActions: pattern.recommendation ? [pattern.recommendation] : [],
        timeline: events.map(e => ({ timestamp: e.timestamp, event: e.type, description: `${e.type}` }))
      },
      createdAt: new Date().toISOString()
    };
    this.correlations.set(id, correlation);
    this.createIncidentFromCorrelation(correlation);
    eventBus.emit("alrt:incident-created", {
      incidentId: `alrt-correlation-${id}`, title: `Correlación: ${pattern.name}`,
      description: pattern.description, severity: pattern.severity as any,
      status: "unseen", module: "SYSTEM", correlationId: id
    });
  }

  private createIncidentFromCorrelation(c: IncidentCorrelation) {
    incidentManager.createIncident({
      id: `alrt-correlation-${c.id}`, title: `Correlación Detectada: ${c.pattern.name}`,
      detail: `${c.context.summary}. Módulos afectados: ${c.context.affectedModules.join(", ")}.`,
      severity: c.severity, module: "SYSTEM",
      meta: { correlationId: c.id, pattern: c.pattern.id, confidence: c.confidence, suggestedActions: c.context.suggestedActions }
    });
  }

  private updateBehavioralPattern(id: string) {
    const p = this.behavioralPatterns.get(id);
    if (p) { p.frequency++; p.lastSeen = Date.now(); }
  }

  private startPeriodicAnalysis() {
    setInterval(() => {
      const now = Date.now();
      this.behavioralPatterns.forEach(p => {
        if (p.frequency > 5) this.createBehavioralIncident(p, "high-frequency");
        p.frequency = 0;
      });
      this.correlations.forEach((c, id) => {
        if (now - new Date(c.createdAt).getTime() > 86400000) this.correlations.delete(id);
      });
    }, 60000);
  }

  private createBehavioralIncident(p: BehavioralPattern, reason: string) {
    incidentManager.createIncident({
      id: `alrt-behavior-${p.id}-${Date.now()}`, title: `Patrón Anómalo: ${p.description}`,
      detail: `Frecuencia inusual: ${reason}.`, severity: p.riskLevel === "high" ? "danger" : "warning", module: "SYSTEM"
    });
  }

  getActiveCorrelations() { return Array.from(this.correlations.values()); }
  getBehavioralPatterns() { return Array.from(this.behavioralPatterns.values()); }
  getOperationalTimeline(limit: number = 100) { return this.eventBuffer.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit); }
  getAwarenessStats() {
    const now = Date.now();
    const recent = this.eventBuffer.filter(e => now - e.timestamp < 3600000);
    return { eventsInLastHour: recent.length, correlationsInLastHour: this.getActiveCorrelations().filter(c => now - new Date(c.createdAt).getTime() < 3600000).length, activePatterns: this.behavioralPatterns.size };
  }
}

export const alrtIntelligence = new AlrtIntelligence();
export * from "./intelligence/types";
