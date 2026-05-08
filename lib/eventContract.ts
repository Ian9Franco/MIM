/**
 * MIM Event Bus - Formal Event Contract
 * ─────────────────────────────────────────────────────────────────────────────
 * Contrato oficial y taxonomía formal de eventos del ecosistema MIM.
 * 
 * Este contrato define la estructura semántica y tipada de todos los eventos
 * que circulan por el sistema, asegurando trazabilidad, correlación y 
 * consistencia en toda la arquitectura event-driven.
 * 
 * Principios de diseño:
 * - Un evento = una responsabilidad clara
 * - Nombres semánticos y no ambiguos
 * - Payloads tipados y validados
 * - Metadatos de correlación incluidos
 * - Versionamiento de schemas
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ============================================================================
// METADATA Y CORRELACIÓN
// ============================================================================

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

export type EventSource = 
  | "FOMO"      // Discovery y descarga de mods
  | "SAGE"      // Análisis de crashes y seguridad
  | "TWEAK"     // Configuración y optimización
  | "ALRT"      // Inteligencia operacional
  | "SECURITY"  // Threat detection
  | "WATCHER"   // File system monitoring
  | "BUILDER"   // Build y packaging
  | "SYSTEM";   // Core system events

// ============================================================================
// EVENT MAP OFICIAL - TAXONOMÍA FORMAL
// ============================================================================

export type MimEventMap = {
  // -------------------------------------------------------------------------
  // FOMO EVENTS - Discovery y Gestión de Contenido
  // -------------------------------------------------------------------------
  "fomo:search": {
    query: string;
    source: "modrinth" | "curseforge" | "local";
  };

  "fomo:search-initiated": {
    query: string;
    source: "modrinth" | "curseforge" | "local";
    filters?: Record<string, any>;
  };
  
  "fomo:search-completed": {
    query: string;
    resultCount: number;
    duration: number; // ms
    source: "modrinth" | "curseforge" | "local";
  };
  
  "fomo:mod-selected": {
    projectId: string;
    projectTitle: string;
    source: "modrinth" | "curseforge";
    metadata?: {
      downloads: number;
      categories: string[];
      loaders: string[];
    };
  };
  
  "fomo:version-selected": {
    projectId: string;
    versionId: string;
    versionNumber: string;
    minecraftVersion: string;
    loader: string;
  };
  
  "fomo:download-initiated": {
    projectId: string;
    versionId: string;
    fileName: string;
    fileSize: number;
    source: "modrinth" | "curseforge" | "local";
  };
  
  "fomo:download-progress": {
    projectId: string;
    versionId: string;
    downloaded: number;
    total: number;
    speed: number; // bytes/sec
  };
  
  "fomo:download-completed": {
    projectId: string;
    versionId: string;
    fileName: string;
    filePath: string;
    checksum: string;
    duration: number;
  };

  "fomo:mod-downloaded": {
    modId: string;
    fileName: string;
    source: "modrinth" | "curseforge";
  };
  
  "fomo:download-failed": {
    projectId: string;
    versionId: string;
    error: string;
    retryCount: number;
  };
  
  "fomo:mod-installed": {
    projectId: string;
    versionId: string;
    fileName: string;
    targetPath: string;
    dependencies?: string[];
  };
  
  "fomo:collection-synced": {
    collectionId: string;
    modsAdded: number;
    modsRemoved: number;
    syncDuration: number;
  };

  // -------------------------------------------------------------------------
  // SAGE EVENTS - Análisis y Recuperación
  // -------------------------------------------------------------------------
  "sage:analysis-initiated": {
    type: "crash" | "log" | "security" | "dependency";
    targetPath?: string;
    sessionId: string;
  };
  
  "sage:crash-detected": {
    crashId: string;
    crashType: "jvm" | "mod" | "dependency" | "shader" | "memory";
    severity: "low" | "medium" | "high" | "critical";
    logFile: string;
    stackTrace?: string;
    suspectedMods?: string[];
    sessionId: string;
  };
  
  "sage:dependency-missing": {
    dependencyId: string;
    dependencyName: string;
    requiredBy: string;
    version?: string;
    severity: "warning" | "error";
  };
  
  "sage:conflict-detected": {
    conflictId: string;
    conflictType: "mixin" | "access-transformer" | "loader" | "version";
    involvedMods: string[];
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  };
  
  "sage:security-risk": {
    riskId: string;
    riskType: "malware" | "network" | "file-system" | "obfuscation";
    severity: "clean" | "caution" | "suspicious" | "critical";
    fileName: string;
    riskScore: number; // 0-100
    findings: string[];
  };
  
  "sage:recovery-initiated": {
    sessionId: string;
    crashId: string;
    recoveryType: "dependency" | "disable-mod" | "config-repair" | "version-change";
  };
  
  "sage:recovery-action-suggested": {
    sessionId: string;
    actionId: string;
    actionType: "install-dependency" | "disable-mod" | "update-config";
    description: string;
    automated: boolean;
    riskLevel: "low" | "medium" | "high";
  };
  
  "sage:recovery-action-applied": {
    sessionId: string;
    actionId: string;
    success: boolean;
    result?: string;
    error?: string;
  };
  
  "sage:recovery-completed": {
    sessionId: string;
    success: boolean;
    actionsApplied: number;
    duration: number;
  };
  
  "sage:player-rescued": {
    playerId: string;
    playerName: string;
    rescueType: "position" | "inventory" | "dimension";
    success: boolean;
    backupCreated: boolean;
  };
  
  "sage:analysis-completed": {
    type: string;
    success: boolean;
    category: string;
  };

  // -------------------------------------------------------------------------
  // TWEAK EVENTS - Configuración y Optimización
  // -------------------------------------------------------------------------
  "tweak:config-loaded": {
    configType: "options" | "shader" | "mod-config";
    filePath: string;
    entriesCount: number;
  };
  
  "tweak:config-updated": {
    configType: "options" | "shader" | "mod-config";
    filePath: string;
    changes: Record<string, { old: any; new: any }>;
    applied: boolean;
  };
  
  "tweak:mod-toggled": {
    modId: string;
    modFileName: string;
    enabled: boolean;
    reason: "manual" | "conflict" | "recovery";
  };
  
  "tweak:keybind-updated": {
    keybind: string;
    action: string;
    oldKey?: string;
    newKey: string;
    modName: string;
  };
  
  "tweak:keybind-synced": {
    totalKeybinds: number;
    syncedKeybinds: number;
    conflicts: number;
  };
  
  "tweak:shader-changed": {
    shaderName: string;
    shaderType: "iris" | "sodium" | "optifine";
    oldShader?: string;
    applied: boolean;
    compatibility?: {
      status: "compatible" | "warning" | "incompatible";
      issues: string[];
    };
  };
  
  "tweak:optimization-applied": {
    optimizationType: "jvm-args" | "memory" | "render" | "performance";
    oldValue: any;
    newValue: any;
    source: "manual" | "automatic" | "suggested";
    effectiveness?: number; // 0-100
  };

  // -------------------------------------------------------------------------
  // ALRT EVENTS - Inteligencia Operacional
  // -------------------------------------------------------------------------
  "alrt:signal-received": {
    signalId: string;
    signalType: "operational" | "security" | "performance" | "error";
    source: EventSource;
    severity: "info" | "warning" | "error" | "critical";
    message: string;
    metadata?: Record<string, any>;
  };
  
  "alrt:pattern-detected": {
    patternId: string;
    patternName: string;
    confidence: number; // 0-100
    matchedEvents: string[];
    timeWindow: number; // ms
    severity: "info" | "warning" | "error" | "critical";
  };
  
  "alrt:correlation-created": {
    correlationId: string;
    incidentId: string;
    signalIds: string[];
    patternId: string;
    context: {
      summary: string;
      affectedModules: EventSource[];
      riskScore: number;
    };
  };
  
  "alrt:incident-created": {
    incidentId: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "danger";
    status: "unseen" | "unread" | "acknowledged" | "resolved";
    module: EventSource;
    correlationId?: string;
    recommendations?: string[];
  };
  
  "alrt:incident-updated": {
    incidentId: string;
    changes: Partial<{
      status: "unseen" | "unread" | "acknowledged" | "resolved";
      severity: "info" | "warning" | "danger";
      assignedTo: string;
      tags: string[];
    }>;
    updatedBy: EventSource;
  };
  
  "alrt:incident-escalated": {
    incidentId: string;
    escalationLevel: number;
    reason: string;
    escalatedTo: EventSource;
    autoEscalated: boolean;
  };
  
  "alrt:recommendation-generated": {
    recommendationId: string;
    incidentId: string;
    type: "action" | "configuration" | "dependency" | "security";
    priority: number;
    description: string;
    automated: boolean;
    confidence: number;
  };

  // -------------------------------------------------------------------------
  // SECURITY EVENTS - Threat Detection
  // -------------------------------------------------------------------------
  "security:scan-initiated": {
    scanType: "file" | "directory" | "mod";
    target: string;
    scanDepth: "quick" | "deep" | "full";
  };
  
  "security:threat-detected": {
    threatId: string;
    threatType: "malware" | "suspicious" | "network" | "file-system";
    severity: "low" | "medium" | "high" | "critical";
    fileName: string;
    filePath: string;
    riskScore: number;
    indicators: string[];
    virusTotal?: {
      positives: number;
      total: number;
      scanDate: string;
    };
  };
  
  "security:scan-completed": {
    scanId: string;
    filesScanned: number;
    threatsFound: number;
    duration: number;
    threats: string[];
  };
  
  "security:quarantine-applied": {
    threatId: string;
    fileName: string;
    quarantinePath: string;
    action: "move" | "delete" | "disable";
    timestamp: string;
  };

  // -------------------------------------------------------------------------
  // WATCHER EVENTS - File System Monitoring
  // -------------------------------------------------------------------------
  "watcher:file-changed": {
    filePath: string;
    changeType: "created" | "modified" | "deleted";
    fileSize: number;
    fileType: "mod" | "config" | "resourcepack" | "shader" | "unknown";
    timestamp: string;
  };
  
  "watcher:directory-changed": {
    directoryPath: string;
    changeType: "file-added" | "file-removed" | "directory-added" | "directory-removed";
    affectedFiles: string[];
    timestamp: string;
  };
  
  "watcher:sync-required": {
    reason: "external-changes" | "file-conflict" | "missing-files";
    affectedPaths: string[];
    urgency: "low" | "medium" | "high";
  };

  // -------------------------------------------------------------------------
  // BUILDER EVENTS - Build y Packaging
  // -------------------------------------------------------------------------
  "builder:build-initiated": {
    buildType: "modpack" | "server" | "client";
    buildConfig: Record<string, any>;
    outputPath: string;
  };
  
  "builder:dependency-resolved": {
    buildId: string;
    dependencies: Array<{
      modId: string;
      version: string;
      source: string;
      resolved: boolean;
    }>;
  };
  
  "builder:packaging-completed": {
    buildId: string;
    packageType: "zip" | "tar" | "custom";
    outputPath: string;
    fileSize: number;
    includedMods: number;
    checksum: string;
  };
  
  "builder:validation-completed": {
    buildId: string;
    validationType: "manifest" | "dependencies" | "compatibility";
    passed: boolean;
    issues: string[];
    warnings: string[];
  };

  // -------------------------------------------------------------------------
  // SYSTEM EVENTS - Core System
  // -------------------------------------------------------------------------
  "system:startup": {
    version: string;
    environment: "development" | "production" | "test";
    modules: EventSource[];
    startupTime: number;
  };
  
  "system:shutdown": {
    reason: "manual" | "error" | "update";
    duration: number;
    graceful: boolean;
  };
  
  "system:project-changed": {
    projectId: string;
    projectName: string;
    minecraftVersion: string;
    loader: string;
    previousProject?: string;
  };
  
  "system:settings-updated": {
    section: string;
    changes: Record<string, { old: any; new: any }>;
    requiresRestart: boolean;
  };
  
  "system:error": {
    errorId: string;
    source: EventSource;
    errorType: "validation" | "runtime" | "network" | "file-system" | "dependency";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    stackTrace?: string;
    context?: Record<string, any>;
    recoverable: boolean;
  };
  
  "system:warning": {
    warningId: string;
    source: EventSource;
    warningType: "performance" | "compatibility" | "configuration" | "resource";
    message: string;
    impact: "low" | "medium" | "high";
    suggestedAction?: string;
  };
  
  "system:refresh": {
    trigger: "manual" | "auto" | "external";
    scope: "full" | "project" | "module";
    timestamp: string;
  };
};

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export type EventName = keyof MimEventMap;
export type EventPayload<T extends EventName> = MimEventMap[T];
export type EventHandler<T extends EventName> = (payload: EventPayload<T> & { metadata: EventMetadata }) => void;

// ============================================================================
// INTERFACES DE CORRELACIÓN Y LIFECYCLE
// ============================================================================

export interface Signal {
  id: string;
  type: "operational" | "security" | "performance" | "error";
  source: EventSource;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
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

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  eventSequence: Array<{
    eventType: EventName;
    timeWindow: number;
    conditions?: Partial<EventPayload<EventName>>;
  }>;
  severity: "info" | "warning" | "error" | "critical";
  confidence: number;
  recommendation?: string;
  enabled: boolean;
  priority: number;
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN
// ============================================================================

export function validateEventPayload<T extends EventName>(
  eventType: T,
  payload: any
): payload is EventPayload<T> {
  // Implementación de validación runtime
  // Esto puede expandirse con validadores más sofisticados
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
