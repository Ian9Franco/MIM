import { EventName, EventPayload, EventMetadata, Incident, Recommendation } from "@/lib/events/eventContract";

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
    changes: Record<string, unknown>;
  }>;
}

export interface TimelineOptions {
  eventTypes?: EventName[];
  sources?: string[];
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface TimelineItem {
  timestamp: string;
  type: "event" | "correlation" | "incident";
  data: DebugEvent | DebugCorrelation | DebugIncident;
  duration?: number;
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
