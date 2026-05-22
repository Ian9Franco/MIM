import { EventFlowTrace, DebugEvent } from "./types";
import { EventSource } from "@/lib/events/eventContract";

export function analyzeFlow(trace: EventFlowTrace) {
  const summary = {
    totalEvents: trace.events.length,
    totalCorrelations: trace.correlations.length,
    totalIncidents: trace.incidents.length,
    averageProcessingTime: trace.events.reduce((sum, e) => sum + e.processingTime, 0) / trace.events.length || 0,
    eventTypes: {} as Record<string, number>,
    sources: {} as Record<EventSource, number>
  };

  trace.events.forEach(event => {
    summary.eventTypes[event.type] = (summary.eventTypes[event.type] || 0) + 1;
    summary.sources[event.metadata.source] = (summary.sources[event.metadata.source] || 0) + 1;
  });

  const bottlenecks = [];
  const slowEvents = trace.events.filter(e => e.processingTime > 100);
  if (slowEvents.length > 0) {
    bottlenecks.push({
      type: "slow-event" as const,
      description: `${slowEvents.length} eventos con procesamiento >100ms`,
      impact: slowEvents.reduce((sum, e) => sum + e.processingTime, 0)
    });
  }

  const lowConfidenceCorrelations = trace.correlations.filter(c => c.confidence < 50);
  if (lowConfidenceCorrelations.length > 0) {
    bottlenecks.push({
      type: "failed-correlation" as const,
      description: `${lowConfidenceCorrelations.length} correlaciones con baja confianza (<50%)`,
      impact: lowConfidenceCorrelations.length
    });
  }

  const recommendations = [];
  if (summary.averageProcessingTime > 50) recommendations.push("Optimizar procesamiento de eventos - tiempo promedio elevado");
  if (summary.totalIncidents > summary.totalCorrelations) recommendations.push("Revisar reglas de correlación - muchos incidentes sin correlacionar");

  return { summary, bottlenecks, recommendations };
}
