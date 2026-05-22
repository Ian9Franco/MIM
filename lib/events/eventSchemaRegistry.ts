/**
 * Event Schema Registry - Versioned Event Management
 */

import { EventName } from "@/lib/events/eventContract";
import { EventSchema, SchemaMigration, ValidationResult } from "@/lib/schemas/types";
import { validateAgainstSchema } from "@/lib/schemas/Validator";
import { BASE_SCHEMAS } from "@/lib/schemas/BaseSchemas";

class EventSchemaRegistry {
  private schemas = new Map<string, EventSchema>();
  private migrations = new Map<string, SchemaMigration[]>();
  private validationCache = new Map<string, ValidationResult>();

  constructor() {
    this.initializeSchemas();
  }

  registerSchema(schema: EventSchema): void {
    const key = `${String(schema.eventName)}@${schema.version}`;
    if (this.schemas.has(key)) throw new Error(`Schema already registered: ${key}`);
    this.schemas.set(key, schema);
  }

  getSchema(eventName: EventName, version: string = "latest"): EventSchema | undefined {
    if (version === "latest") {
      const versions = this.getSchemaVersions(eventName);
      if (versions.length === 0) return undefined;
      const latest = versions.sort((a, b) => this.compareVersions(b, a))[0];
      return this.schemas.get(`${String(eventName)}@${latest}`);
    }
    return this.schemas.get(`${String(eventName)}@${version}`);
  }

  getSchemaVersions(eventName: EventName): string[] {
    return Array.from(this.schemas.values()).filter(s => s.eventName === eventName).map(s => s.version);
  }

  validatePayload<T extends EventName>(eventName: T, payload: any, version?: string): ValidationResult {
    const schema = this.getSchema(eventName, version);
    if (!schema) return { valid: false, errors: [{ path: "schema", message: `Schema not found for ${String(eventName)}`, value: String(eventName) }] };
    
    const cacheKey = `${String(eventName)}@${schema.version}-${JSON.stringify(payload)}`;
    if (this.validationCache.has(cacheKey)) return this.validationCache.get(cacheKey)!;

    const result = validateAgainstSchema(payload, schema.payloadSchema);
    if (result.valid && schema.validation) {
      const custom = schema.validation(payload);
      if (!custom.valid) { result.valid = false; result.errors.push(...custom.errors); }
    }

    if (this.validationCache.size < 1000) this.validationCache.set(cacheKey, result);
    return result;
  }

  migratePayload<T extends EventName>(eventName: T, payload: any, fromVersion: string, toVersion?: string) {
    const target = toVersion || this.getLatestVersion(eventName);
    if (!target || fromVersion === target) return { success: true, payload };
    return { success: false, error: "Migration not implemented in modular version yet" };
  }

  private initializeSchemas() {
    BASE_SCHEMAS.forEach((s: any) => this.registerSchema({ ...s, createdAt: new Date().toISOString() } as EventSchema));
  }

  private compareVersions(v1: string, v2: string): number {
    const p1 = v1.split(".").map(Number);
    const p2 = v2.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((p1[i] || 0) > (p2[i] || 0)) return 1;
      if ((p1[i] || 0) < (p2[i] || 0)) return -1;
    }
    return 0;
  }

  private getLatestVersion(eventName: EventName) {
    const versions = this.getSchemaVersions(eventName);
    return versions.length ? versions.sort((a, b) => this.compareVersions(b, a))[0] : undefined;
  }
}

export const eventSchemaRegistry = new EventSchemaRegistry();
export * from "@/lib/schemas/types";
