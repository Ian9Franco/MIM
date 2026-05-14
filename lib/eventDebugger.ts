/**
 * ALRT Event Debugger - Development Timeline Tools
 */

import { eventBus } from "./eventBus";
import { 
  EventName, EventPayload, EventMetadata, EventSource, Incident, Recommendation, createCorrelationId 
} from "./eventContract";
import { DebugEvent, DebugCorrelation, DebugIncident, EventFlowTrace } from "./debugger/types";
import { analyzeFlow } from "./debugger/AnalysisEngine";

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

  enableDebugMode() {
    this.debugMode = true;
    eventBus.emit("system:refresh", { trigger: "manual", scope: "full", timestamp: new Date().toISOString() });
  }

  disableDebugMode() { this.debugMode = false; }

  startTrace(correlationId?: string): string {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trace: EventFlowTrace = {
      id: traceId,
      correlationId: correlationId || createCorrelationId(),
      events: [], correlations: [], incidents: [],
      startTime: new Date().toISOString()
    };
    this.flowTraces.set(traceId, trace);
    this.activeTrace = traceId;
    return traceId;
  }

  endTrace(traceId?: string): EventFlowTrace | null {
    const id = traceId || this.activeTrace;
    if (!id) return null;
    const trace = this.flowTraces.get(id);
    if (!trace) return null;
    trace.endTime = new Date().toISOString();
    trace.totalDuration = new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime();
    if (id === this.activeTrace) this.activeTrace = undefined;
    return trace;
  }

  private setupEventInterception() {
    const originalEmit = eventBus.emit.bind(eventBus);
    eventBus.emit = <T extends EventName>(event: T, payload: EventPayload<T>) => {
      const startTime = performance.now();
      if (this.debugMode) this.captureEvent(event, payload);
      const result = originalEmit(event, payload);
      if (this.debugMode) this.updateEventProcessingTime(event, performance.now() - startTime);
      return result;
    };
  }

  private captureEvent<T extends EventName>(eventType: T, payload: EventPayload<T>) {
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const debugEvent: DebugEvent = {
      id: eventId, type: eventType, payload,
      metadata: { eventId, timestamp: new Date().toISOString(), source: this.determineSource(eventType), schemaVersion: "1.0.0" },
      processed: false, processingTime: 0, handlers: []
    };
    this.eventHistory.set(eventId, debugEvent);
    if (this.activeTrace) this.flowTraces.get(this.activeTrace)?.events.push(debugEvent);
    if (this.eventHistory.size > this.maxHistorySize) this.eventHistory.delete(this.eventHistory.keys().next().value!);
  }

  private updateEventProcessingTime(eventType: EventName, processingTime: number) {
    const recent = Array.from(this.eventHistory.values()).reverse().find(e => e.type === eventType && !e.processed);
    if (recent) { recent.processingTime = processingTime; recent.processed = true; }
  }

  private determineSource(eventType: string): EventSource {
    const map: Record<string, EventSource> = { fomo: "FOMO", sage: "SAGE", tweak: "TWEAK", alrt: "ALRT", security: "SECURITY", watcher: "WATCHER", builder: "BUILDER", system: "SYSTEM" };
    return map[eventType.split(":")[0]] || "SYSTEM";
  }

  registerCorrelation(correlation: DebugCorrelation) {
    this.correlationHistory.set(correlation.id, correlation);
    if (this.activeTrace) this.flowTraces.get(this.activeTrace)?.correlations.push(correlation);
  }

  registerIncident(incident: Incident, sourceSignals: string[] = []) {
    const debugIncident: DebugIncident = { incident, sourceSignals, correlationChain: [], recommendations: [], lifecycle: [{ status: incident.status, timestamp: incident.createdAt, changedBy: incident.module, changes: { created: true } }] };
    this.incidentHistory.set(incident.id, debugIncident);
    if (this.activeTrace) this.flowTraces.get(this.activeTrace)?.incidents.push(debugIncident);
  }

  generateTimeline(options: any = {}) {
    const timeline: any[] = [];
    this.eventHistory.forEach(e => { if (this.matches(e, options)) timeline.push({ timestamp: e.metadata.timestamp, type: "event", data: e, duration: e.processingTime }); });
    this.correlationHistory.forEach(c => { if (this.matchesCorr(c, options)) timeline.push({ timestamp: c.timestamp, type: "correlation", data: c, duration: c.processingTime }); });
    this.incidentHistory.forEach(i => { if (this.matchesInc(i, options)) timeline.push({ timestamp: i.incident.createdAt, type: "incident", data: i }); });
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return options.limit ? timeline.slice(0, options.limit) : timeline;
  }

  private matches(e: DebugEvent, o: any) { 
    return (!o.eventTypes || o.eventTypes.includes(e.type)) && (!o.sources || o.sources.includes(e.metadata.source)) && (!o.startTime || new Date(e.metadata.timestamp) >= new Date(o.startTime)) && (!o.endTime || new Date(e.metadata.timestamp) <= new Date(o.endTime)); 
  }
  private matchesCorr(c: DebugCorrelation, o: any) { return (!o.startTime || new Date(c.timestamp) >= new Date(o.startTime)) && (!o.endTime || new Date(c.timestamp) <= new Date(o.endTime)); }
  private matchesInc(i: DebugIncident, o: any) { return (!o.startTime || new Date(i.incident.createdAt) >= new Date(o.startTime)) && (!o.endTime || new Date(i.incident.createdAt) <= new Date(o.endTime)); }

  generateFlowAnalysis(traceId?: string) {
    const trace = traceId ? this.flowTraces.get(traceId) : this.getConsolidatedData();
    if (!trace) throw new Error("Trace not found");
    return analyzeFlow(trace);
  }

  private getConsolidatedData(): EventFlowTrace {
    return { id: "consolidated", correlationId: "global", events: Array.from(this.eventHistory.values()), correlations: Array.from(this.correlationHistory.values()), incidents: Array.from(this.incidentHistory.values()), startTime: new Date(Date.now() - 3600000).toISOString() };
  }

  exportData() {
    return { events: Array.from(this.eventHistory.values()), correlations: Array.from(this.correlationHistory.values()), incidents: Array.from(this.incidentHistory.values()), traces: Array.from(this.flowTraces.values()), exportTime: new Date().toISOString() };
  }

  private startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;
      this.eventHistory.forEach((e, id) => { if (now - new Date(e.metadata.timestamp).getTime() > maxAge) this.eventHistory.delete(id); });
      this.flowTraces.forEach((t, id) => { if (t.endTime && now - new Date(t.endTime).getTime() > maxAge) this.flowTraces.delete(id); });
    }, 3600000);
  }

  getStats() {
    return { debugMode: this.debugMode, activeTrace: this.activeTrace, eventsCaptured: this.eventHistory.size, correlationsDetected: this.correlationHistory.size, incidentsCreated: this.incidentHistory.size, activeTraces: this.flowTraces.size, memoryUsage: { events: this.eventHistory.size * 1024, correlations: this.correlationHistory.size * 512, incidents: this.incidentHistory.size * 2048 } };
  }
}

export const eventDebugger = new EventDebugger();
export * from "./debugger/types";
