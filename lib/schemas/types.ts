import { EventName } from "../eventContract";

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
  errors: Array<{ path: string; message: string; value: any; }>;
  warnings?: Array<{ path: string; message: string; }>;
}

export interface EventSchema {
  eventName: EventName;
  version: string;
  payloadSchema: SchemaDefinition;
  metadataSchema?: SchemaDefinition;
  createdAt: string;
  deprecatedAt?: string;
  minCompatibleVersion?: string;
  migration?: (oldPayload: any, fromVersion: string) => any;
  validation?: (payload: any) => ValidationResult;
}

export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  migrationFunction: (payload: any) => any;
  description: string;
  breaking: boolean;
}
