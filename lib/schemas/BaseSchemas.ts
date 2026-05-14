import { EventSchema } from "./types";

export const BASE_SCHEMAS: Array<Omit<EventSchema, "createdAt">> = [
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
    }
  },
  {
    eventName: "sage:crash-detected",
    version: "1.0.0",
    payloadSchema: {
      type: "object",
      properties: {
        crashId: { type: "string", minLength: 1 },
        crashType: { type: "string", enum: ["jvm", "mod", "dependency", "shader", "memory"] },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        logFile: { type: "string", minLength: 1 },
        stackTrace: { type: "string", nullable: true },
        suspectedMods: { type: "array", items: { type: "string" }, nullable: true },
        sessionId: { type: "string", minLength: 1 }
      },
      required: ["crashId", "crashType", "severity", "logFile", "sessionId"]
    }
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
        severity: { type: "string", enum: ["info", "warning", "danger"] },
        status: { type: "string", enum: ["unseen", "unread", "acknowledged", "resolved"] },
        module: { type: "string", enum: ["FOMO", "SAGE", "TWEAK", "ALRT", "SECURITY", "WATCHER", "BUILDER", "SYSTEM"] },
        correlationId: { type: "string", nullable: true },
        recommendations: { type: "array", items: { type: "string" }, nullable: true }
      },
      required: ["incidentId", "title", "description", "severity", "status", "module"]
    }
  }
];
