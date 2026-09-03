/**
 * MIM Core — Structured Logger & Observability Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Structured typed logging with Correlation IDs, Engine tagging,
 * and high-resolution ISO timestamps for distributed tracing across subsystems.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from "crypto";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogContext {
  traceId?: string;
  spanId?: string;
  engine?: string;
  modId?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  engine: string;
  message: string;
  traceId: string;
  spanId: string;
  context?: Record<string, any>;
}

export class Logger {
  private engine: string;
  private currentTraceId: string;

  constructor(engine: string = "CORE", traceId?: string) {
    this.engine = engine.toUpperCase();
    this.currentTraceId = traceId || crypto.randomUUID();
  }

  public child(subEngine: string, customTraceId?: string): Logger {
    return new Logger(`${this.engine}:${subEngine.toUpperCase()}`, customTraceId || this.currentTraceId);
  }

  public setTraceId(traceId: string): void {
    this.currentTraceId = traceId;
  }

  public getTraceId(): string {
    return this.currentTraceId;
  }

  private emit(level: LogLevel, message: string, context?: LogContext): void {
    const spanId = context?.spanId || crypto.randomUUID().slice(0, 8);
    const traceId = context?.traceId || this.currentTraceId;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      engine: context?.engine || this.engine,
      message,
      traceId,
      spanId,
      context
    };

    // In production, emit serialized JSON for log forwarders (Datadog, Loki, etc.)
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      const output = JSON.stringify(entry);
      if (level === "ERROR") console.error(output);
      else if (level === "WARN") console.warn(output);
      else console.log(output);
    } else {
      // In development / CLI, emit clean color-coded human readable format
      const levelColors: Record<LogLevel, string> = {
        DEBUG: "\x1b[90m", // Gray
        INFO: "\x1b[36m",  // Cyan
        WARN: "\x1b[33m",  // Yellow
        ERROR: "\x1b[31m"  // Red
      };
      const reset = "\x1b[0m";
      const color = levelColors[level] || reset;

      const prefix = `${color}[${entry.timestamp.slice(11, 23)}] [${entry.level}] [${entry.engine}] [trace:${traceId.slice(0, 8)}]${reset}`;
      const duration = context?.durationMs !== undefined ? ` (${context.durationMs}ms)` : "";

      if (level === "ERROR") {
        console.error(`${prefix} ${message}${duration}`, context ? JSON.stringify(context) : "");
      } else if (level === "WARN") {
        console.warn(`${prefix} ${message}${duration}`);
      } else {
        console.log(`${prefix} ${message}${duration}`);
      }
    }
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.DEBUG || process.env.NODE_ENV !== "production") {
      this.emit("DEBUG", message, context);
    }
  }

  public info(message: string, context?: LogContext): void {
    this.emit("INFO", message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.emit("WARN", message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.emit("ERROR", message, context);
  }
}

/**
 * Factory helper to instantiate structured loggers per domain engine.
 */
export function createLogger(engineName: string): Logger {
  return new Logger(engineName);
}

// Global Core Logger
export const coreLogger = createLogger("MIM");
