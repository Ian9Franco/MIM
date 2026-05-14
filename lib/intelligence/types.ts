import { MimEventMap } from "../eventBus";

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
