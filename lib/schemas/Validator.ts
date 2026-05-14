import { SchemaDefinition, ValidationResult } from "./types";

export function validateAgainstSchema(payload: any, schema: SchemaDefinition, path: string = ""): ValidationResult {
  const errors: any[] = [];

  if (!validateType(payload, schema.type)) {
    errors.push({ path: path || "root", message: `Expected type ${schema.type}, got ${typeof payload}`, value: payload });
    return { valid: false, errors };
  }

  if (schema.type === "object" && typeof payload === "object" && payload !== null) {
    if (schema.required) {
      for (const req of schema.required) {
        if (!(req in payload)) errors.push({ path: path ? `${path}.${req}` : req, message: "Required property missing", value: undefined });
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in payload) {
          const res = validateAgainstSchema(payload[key], propSchema, path ? `${path}.${key}` : key);
          if (!res.valid) errors.push(...res.errors);
        }
      }
    }
  }

  if (schema.type === "array" && Array.isArray(payload) && schema.items) {
    payload.forEach((item, i) => {
      const res = validateAgainstSchema(item, schema.items!, path ? `${path}[${i}]` : `[${i}]`);
      if (!res.valid) errors.push(...res.errors);
    });
  }

  if (schema.enum && !schema.enum.includes(payload)) {
    errors.push({ path: path || "root", message: `Value must be one of: ${schema.enum.join(", ")}`, value: payload });
  }

  return { valid: errors.length === 0, errors };
}

function validateType(value: any, type: string): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number";
    case "boolean": return typeof value === "boolean";
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    default: return false;
  }
}
