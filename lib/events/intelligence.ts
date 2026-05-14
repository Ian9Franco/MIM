/**
 * MIM Event Bus - Operational Intelligence Types
 */

import { EventSource } from "./metadata";
import type { MimEventMap } from "./taxonomy";

export type EventName = keyof MimEventMap;

export interface Signal {
  id: string;
  type: "operational" | "security" | "performance" | "error";
  source: EventSource;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Recommendation {
  id: string;
  incidentId: string;
  type: "action" | "configuration" | "dependency" | "security";
  priority: number;
  description: string;
  automated: boolean;
  confidence: number;
  applied: boolean;
  result?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "danger";
  status: "unseen" | "unread" | "acknowledged" | "resolved";
  module: EventSource;
  correlationId?: string;
  signals: string[];
  recommendations?: Recommendation[];
  timeline: Array<{
    timestamp: string;
    event: string;
    description: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  eventSequence: Array<{
    eventType: EventName;
    timeWindow: number;
    conditions?: Partial<MimEventMap[EventName]>;
  }>;
  severity: "info" | "warning" | "error" | "critical";
  confidence: number;
  recommendation?: string;
  enabled: boolean;
  priority: number;
}
