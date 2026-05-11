/**
 * Event Schema Registry - Versioned Event Management
 * ─────────────────────────────────────────────────────────────────────────────
 * Registro centralizado de schemas de eventos con versionamiento y validación.
 * 
 * Proporciona:
 * - Versionamiento semántico de eventos
 * - Validación runtime de payloads
 * - Migración automática entre versiones
 * - Backward compatibility checking
 * - Schema evolution tracking
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EventName, EventPayload, EventMetadata, validateEventPayload } from "./eventContract";

export interface EventSchema {
  /** Nombre del evento */
  eventName: EventName;
  /** Versión del schema (semver) */
  version: string;
  /** Definición del payload */
  payloadSchema: SchemaDefinition;
  /** Metadata requerida */
  metadataSchema?: SchemaDefinition;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de deprecación (opcional) */
  deprecatedAt?: string;
  /** Versión mínima compatible */
  minCompatibleVersion?: string;
  /** Función de migración desde versiones anteriores */
  migration?: (oldPayload: any, fromVersion: string) => any;
  /** Reglas de validación custom */
  validation?: (payload: any) => ValidationResult;
}

export interface SchemaDefinition {
  type: "object" | "string" | "number" | "boolean" | "array";
  properties?: Record<string, SchemaDefinition>;
  required?: string[];
  items?: SchemaDefinition;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "email" | "uri" | "date-time";
  nullable?: boolean;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    value: any;
  }>;
  warnings?: Array<{
    path: string;
    message: string;
  }>;
}

export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  migrationFunction: (payload: any) => any;
  description: string;
  breaking: boolean;
}

class EventSchemaRegistry {
  private schemas = new Map<string, EventSchema>();
  private migrations = new Map<string, SchemaMigration[]>();
  private validationCache = new Map<string, ValidationResult>();

  constructor() {
    this.initializeSchemas();
    this.setupMigrations();
  }

  /**
   * Registrar un nuevo schema de evento
   */
  registerSchema(schema: EventSchema): void {
    const key = `${schema.eventName}@${schema.version}`;
    
    // Verificar si ya existe
    if (this.schemas.has(key)) {
      throw new Error(`Schema already registered: ${key}`);
    }

    // Validar el schema antes de registrar
    const validationResult = this.validateSchema(schema);
    if (!validationResult.valid) {
      throw new Error(`Invalid schema: ${validationResult.errors.map(e => e.message).join(", ")}`);
    }

    this.schemas.set(key, schema);
    console.log(`[Schema Registry] Registered: ${key}`);
  }

  /**
   * Obtener schema específico
   */
  getSchema(eventName: EventName, version: string = "latest"): EventSchema | undefined {
    if (version === "latest") {
      return this.getLatestSchema(eventName);
    }

    const key = `${eventName}@${version}`;
    return this.schemas.get(key);
  }

  /**
   * Obtener la versión más reciente de un schema
   */
  getLatestSchema(eventName: EventName): EventSchema | undefined {
    const versions = this.getSchemaVersions(eventName);
    if (versions.length === 0) return undefined;

    // Ordenar por semver y tomar la más reciente
    const sortedVersions = versions.sort((a, b) => this.compareVersions(b, a));
    return this.schemas.get(`${eventName}@${sortedVersions[0]}`);
  }

  /**
   * Obtener todas las versiones de un schema
   */
  getSchemaVersions(eventName: EventName): string[] {
    const versions: string[] = [];
    
    for (const [key, schema] of this.schemas.entries()) {
      if (schema.eventName === eventName) {
        versions.push(schema.version);
      }
    }

    return versions;
  }

  /**
   * Validar payload contra schema
   */
  validatePayload<T extends EventName>(
    eventName: T,
    payload: any,
    version?: string
  ): ValidationResult {
    const schema = this.getSchema(eventName, version);
    if (!schema) {
      return {
        valid: false,
        errors: [{ path: "schema", message: `Schema not found for ${eventName}`, value: eventName }]
      };
    }

    // Usar cache si está disponible
    const cacheKey = `${eventName}@${schema.version}-${JSON.stringify(payload)}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result = this.validateAgainstSchema(payload, schema.payloadSchema);

    // Ejecutar validación custom si existe
    if (result.valid && schema.validation) {
      const customResult = schema.validation(payload);
      if (!customResult.valid) {
        result.valid = false;
        result.errors.push(...customResult.errors);
      }
      if (customResult.warnings) {
        result.warnings = [...(result.warnings || []), ...customResult.warnings];
      }
    }

    // Cache resultado
    this.validationCache.set(cacheKey, result);
    
    // Limitar tamaño del cache
    if (this.validationCache.size > 1000) {
      const firstKey = this.validationCache.keys().next().value;
      if (firstKey !== undefined) {
        this.validationCache.delete(firstKey);
      }
    }

    return result;
  }

  /**
   * Migrar payload a versión específica
   */
  migratePayload<T extends EventName>(
    eventName: T,
    payload: any,
    fromVersion: string,
    toVersion?: string
  ): { success: boolean; payload?: any; error?: string } {
    const targetVersion = toVersion || this.getLatestVersion(eventName);
    if (!targetVersion) {
      return { success: false, error: `No versions found for ${eventName}` };
    }

    if (fromVersion === targetVersion) {
      return { success: true, payload };
    }

    const migrationPath = this.findMigrationPath(eventName, fromVersion, targetVersion);
    if (!migrationPath) {
      return { success: false, error: `No migration path from ${fromVersion} to ${targetVersion}` };
    }

    let currentPayload = payload;
    
    for (const migration of migrationPath) {
      try {
        currentPayload = migration.migrationFunction(currentPayload);
      } catch (error) {
        return { 
          success: false, 
          error: `Migration failed: ${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }

    return { success: true, payload: currentPayload };
  }

  /**
   * Verificar compatibilidad entre versiones
   */
  isCompatible(eventName: EventName, version1: string, version2: string): boolean {
    const schema1 = this.getSchema(eventName, version1);
    const schema2 = this.getSchema(eventName, version2);
    
    if (!schema1 || !schema2) return false;

    // Si tienen la misma major version, son compatibles
    const major1 = this.getMajorVersion(version1);
    const major2 = this.getMajorVersion(version2);
    
    return major1 === major2;
  }

  /**
   * Obtener schemas deprecados
   */
  getDeprecatedSchemas(): EventSchema[] {
    return Array.from(this.schemas.values()).filter(schema => schema.deprecatedAt);
  }

  /**
   * Deprecar una versión de schema
   */
  deprecateSchema(eventName: EventName, version: string, reason?: string): void {
    const schema = this.getSchema(eventName, version);
    if (!schema) {
      throw new Error(`Schema not found: ${eventName}@${version}`);
    }

    schema.deprecatedAt = new Date().toISOString();
    console.log(`[Schema Registry] Deprecated: ${eventName}@${version}${reason ? ` - ${reason}` : ""}`);
  }

  /**
   * Generar reporte de estado del registry
   */
  generateReport(): {
    totalSchemas: number;
    schemasByEvent: Record<string, number>;
    deprecatedSchemas: number;
    latestVersions: Record<string, string>;
    migrationPaths: number;
  } {
    const schemasByEvent: Record<string, number> = {};
    const latestVersions: Record<string, string> = {};

    for (const schema of this.schemas.values()) {
      schemasByEvent[schema.eventName] = (schemasByEvent[schema.eventName] || 0) + 1;
      
      if (!latestVersions[schema.eventName] || 
          this.compareVersions(schema.version, latestVersions[schema.eventName]) > 0) {
        latestVersions[schema.eventName] = schema.version;
      }
    }

    return {
      totalSchemas: this.schemas.size,
      schemasByEvent,
      deprecatedSchemas: this.getDeprecatedSchemas().length,
      latestVersions,
      migrationPaths: this.migrations.size
    };
  }

  /**
   * Inicializar schemas base del sistema
   */
  private initializeSchemas() {
    // Schemas para eventos principales (versión 1.0.0)
    const baseSchemas: Partial<EventSchema>[] = [
      {
        eventName: "fomo:search-initiated",
        version: "1.0.0",
        payloadSchema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 1 },
            source: { type: "string", enum: ["modrinth", "curseforge", "local"] },
            filters: { type: "object", nullable: true }
          },
          required: ["query", "source"]
        },
        createdAt: new Date().toISOString()
      },
      {
        eventName: "sage:crash-detected",
        version: "1.0.0",
        payloadSchema: {
          type: "object",
          properties: {
            crashId: { type: "string", minLength: 1 },
            crashType: { 
              type: "string", 
              enum: ["jvm", "mod", "dependency", "shader", "memory"] 
            },
            severity: { 
              type: "string", 
              enum: ["low", "medium", "high", "critical"] 
            },
            logFile: { type: "string", minLength: 1 },
            stackTrace: { type: "string", nullable: true },
            suspectedMods: { 
              type: "array", 
              items: { type: "string" },
              nullable: true 
            },
            sessionId: { type: "string", minLength: 1 }
          },
          required: ["crashId", "crashType", "severity", "logFile", "sessionId"]
        },
        createdAt: new Date().toISOString()
      },
      {
        eventName: "alrt:incident-created",
        version: "1.0.0",
        payloadSchema: {
          type: "object",
          properties: {
            incidentId: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            severity: { 
              type: "string", 
              enum: ["info", "warning", "danger"] 
            },
            status: { 
              type: "string", 
              enum: ["unseen", "unread", "acknowledged", "resolved"] 
            },
            module: { 
              type: "string", 
              enum: ["FOMO", "SAGE", "TWEAK", "ALRT", "SECURITY", "WATCHER", "BUILDER", "SYSTEM"] 
            },
            correlationId: { type: "string", nullable: true },
            recommendations: { 
              type: "array", 
              items: { type: "string" },
              nullable: true 
            }
          },
          required: ["incidentId", "title", "description", "severity", "status", "module"]
        },
        createdAt: new Date().toISOString()
      },
      {
        eventName: "system:error",
        version: "1.0.0",
        payloadSchema: {
          type: "object",
          properties: {
            errorId: { type: "string", minLength: 1 },
            source: { 
              type: "string", 
              enum: ["FOMO", "SAGE", "TWEAK", "ALRT", "SECURITY", "WATCHER", "BUILDER", "SYSTEM"] 
            },
            errorType: { 
              type: "string", 
              enum: ["validation", "runtime", "network", "file-system", "dependency"] 
            },
            severity: { 
              type: "string", 
              enum: ["low", "medium", "high", "critical"] 
            },
            message: { type: "string", minLength: 1 },
            stackTrace: { type: "string", nullable: true },
            context: { type: "object", nullable: true },
            recoverable: { type: "boolean" }
          },
          required: ["errorId", "source", "errorType", "severity", "message", "recoverable"]
        },
        createdAt: new Date().toISOString()
      }
    ];

    baseSchemas.forEach(schema => {
      if (schema.eventName && schema.version) {
        this.registerSchema(schema as EventSchema);
      }
    });
  }

  /**
   * Configurar migraciones entre versiones
   */
  private setupMigrations() {
    // Ejemplo de migración: system:error 1.0.0 → 1.1.0
    this.addMigration("system:error", {
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrationFunction: (payload: any) => ({
        ...payload,
        // Agregar nuevo campo opcional
        category: payload.errorType === "validation" ? "user-error" : "system-error",
        // Mantener compatibilidad
        legacyErrorType: payload.errorType
      }),
      description: "Add category field and maintain backward compatibility",
      breaking: false
    });
  }

  /**
   * Agregar migración entre versiones
   */
  private addMigration(eventName: EventName, migration: SchemaMigration): void {
    const key = eventName;
    if (!this.migrations.has(key)) {
      this.migrations.set(key, []);
    }
    this.migrations.get(key)!.push(migration);
  }

  /**
   * Encontrar camino de migración entre versiones
   */
  private findMigrationPath(
    eventName: EventName, 
    fromVersion: string, 
    toVersion: string
  ): SchemaMigration[] | null {
    const migrations = this.migrations.get(eventName) || [];
    const path: SchemaMigration[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const nextMigration = migrations.find(m => 
        m.fromVersion === currentVersion && 
        this.isVersionUpgrade(m.toVersion, currentVersion) &&
        this.canReachVersion(m.toVersion, toVersion)
      );

      if (!nextMigration) {
        return null; // No hay camino de migración
      }

      path.push(nextMigration);
      currentVersion = nextMigration.toVersion;

      if (path.length > 10) {
        return null; // Prevenir loops infinitos
      }
    }

    return path;
  }

  /**
   * Validar schema contra su propia definición
   */
  private validateSchema(schema: EventSchema): ValidationResult {
    const errors: Array<{ path: string; message: string; value: any }> = [];

    // Validar que el payloadSchema sea válido
    const payloadValidation = this.validateSchemaDefinition(schema.payloadSchema);
    if (!payloadValidation.valid) {
      errors.push(...payloadValidation.errors.map(e => ({
        ...e,
        path: `payloadSchema.${e.path}`
      })));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validar definición de schema
   */
  private validateSchemaDefinition(def: SchemaDefinition): ValidationResult {
    const errors: Array<{ path: string; message: string; value: any }> = [];

    if (def.type === "object" && def.properties) {
      for (const [key, prop] of Object.entries(def.properties)) {
        const propValidation = this.validateSchemaDefinition(prop);
        if (!propValidation.valid) {
          errors.push(...propValidation.errors.map(e => ({
            ...e,
            path: `${key}.${e.path}`
          })));
        }
      }
    }

    if (def.type === "array" && def.items) {
      const itemsValidation = this.validateSchemaDefinition(def.items);
      if (!itemsValidation.valid) {
        errors.push(...itemsValidation.errors.map(e => ({
          ...e,
          path: `items.${e.path}`
        })));
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validar payload contra schema
   */
  private validateAgainstSchema(
    payload: any, 
    schema: SchemaDefinition, 
    path: string = ""
  ): ValidationResult {
    const errors: Array<{ path: string; message: string; value: any }> = [];

    // Validar tipo
    if (!this.validateType(payload, schema.type)) {
      errors.push({
        path: path || "root",
        message: `Expected type ${schema.type}, got ${typeof payload}`,
        value: payload
      });
      return { valid: false, errors };
    }

    // Validar objeto
    if (schema.type === "object" && typeof payload === "object" && payload !== null) {
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in payload)) {
            errors.push({
              path: path ? `${path}.${required}` : required,
              message: "Required property missing",
              value: undefined
            });
          }
        }
      }

      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in payload) {
            const result = this.validateAgainstSchema(
              payload[key], 
              propSchema, 
              path ? `${path}.${key}` : key
            );
            if (!result.valid) {
              errors.push(...result.errors);
            }
          }
        }
      }
    }

    // Validar array
    if (schema.type === "array" && Array.isArray(payload)) {
      if (schema.items) {
        payload.forEach((item, index) => {
          const result = this.validateAgainstSchema(
            item, 
            schema.items!, 
            path ? `${path}[${index}]` : `[${index}]`
          );
          if (!result.valid) {
            errors.push(...result.errors);
          }
        });
      }
    }

    // Validar enum
    if (schema.enum && !schema.enum.includes(payload)) {
      errors.push({
        path: path || "root",
        message: `Value must be one of: ${schema.enum.join(", ")}`,
        value: payload
      });
    }

    // Validar número
    if (schema.type === "number" && typeof payload === "number") {
      if (schema.minimum !== undefined && payload < schema.minimum) {
        errors.push({
          path: path || "root",
          message: `Value must be >= ${schema.minimum}`,
          value: payload
        });
      }
      if (schema.maximum !== undefined && payload > schema.maximum) {
        errors.push({
          path: path || "root",
          message: `Value must be <= ${schema.maximum}`,
          value: payload
        });
      }
    }

    // Validar string
    if (schema.type === "string" && typeof payload === "string") {
      if (schema.pattern && !new RegExp(schema.pattern).test(payload)) {
        errors.push({
          path: path || "root",
          message: `String does not match pattern: ${schema.pattern}`,
          value: payload
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validar tipo de valor
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case "string": return typeof value === "string";
      case "number": return typeof value === "number";
      case "boolean": return typeof value === "boolean";
      case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
      case "array": return Array.isArray(value);
      default: return false;
    }
  }

  /**
   * Comparar versiones semver
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * Obtener major version
   */
  private getMajorVersion(version: string): number {
    return parseInt(version.split(".")[0], 10);
  }

  /**
   * Verificar si una versión es upgrade de otra
   */
  private isVersionUpgrade(newVersion: string, oldVersion: string): boolean {
    return this.compareVersions(newVersion, oldVersion) > 0;
  }

  /**
   * Verificar si se puede alcanzar una versión destino
   */
  private canReachVersion(current: string, target: string): boolean {
    return this.compareVersions(current, target) <= 0 || 
           this.compareVersions(target, current) <= 0;
  }

  /**
   * Obtener versión más reciente de un evento
   */
  private getLatestVersion(eventName: EventName): string | undefined {
    const versions = this.getSchemaVersions(eventName);
    if (versions.length === 0) return undefined;
    
    return versions.sort((a, b) => this.compareVersions(b, a))[0];
  }
}

// Singleton export
export const eventSchemaRegistry = new EventSchemaRegistry();
