/**
 * MIM Event Bus - Event Utilities
 */

import { EventSource, EventMetadata } from "./metadata";
import { MimEventMap } from "./taxonomy";

export function validateEventPayload<T extends keyof MimEventMap>(
  eventType: T,
  payload: any
): payload is MimEventMap[T] {
  return payload !== null && typeof payload === "object";
}

export function createEventMetadata(
  source: EventSource,
  correlationId?: string,
  context?: Record<string, any>
): EventMetadata {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    source,
    correlationId,
    schemaVersion: "1.0.0",
    context
  };
}

export function createCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
