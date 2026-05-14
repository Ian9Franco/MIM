/**
 * MIM Event Bus - Metadata and Sources
 */

export type EventSource = 
  | "FOMO"      // Discovery y descarga de mods
  | "SAGE"      // Análisis de crashes y seguridad
  | "TWEAK"     // Configuración y optimización
  | "ALRT"      // Inteligencia operacional
  | "SECURITY"  // Threat detection
  | "WATCHER"   // File system monitoring
  | "BUILDER"   // Build y packaging
  | "SYSTEM";   // Core system events

export interface EventMetadata {
  /** ID único del evento */
  eventId: string;
  /** Timestamp de generación (ISO 8601) */
  timestamp: string;
  /** Source del evento (módulo generador) */
  source: EventSource;
  /** ID de correlación para agrupar eventos relacionados */
  correlationId?: string;
  /** ID de sesión para tracking de usuario */
  sessionId?: string;
  /** Versión del schema del evento */
  schemaVersion: string;
  /** Contexto adicional del evento */
  context?: Record<string, any>;
}
