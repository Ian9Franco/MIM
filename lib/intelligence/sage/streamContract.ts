import type { SageErrorPayload } from "./errorContract";

export type SageStreamEvent =
  | { type: "start"; model: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; error: SageErrorPayload };

const encoder = new TextEncoder();

export function encodeSageStreamEvent(event: SageStreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export function parseSageStreamEvent(line: string): SageStreamEvent {
  const value: unknown = JSON.parse(line);
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("Invalid SAGE stream event");
  }

  if (value.type === "start" && typeof value.model === "string") {
    return { type: "start", model: value.model };
  }
  if (value.type === "delta" && typeof value.text === "string") {
    return { type: "delta", text: value.text };
  }
  if (value.type === "done") return { type: "done" };
  if (value.type === "error" && isSageErrorPayload(value.error)) {
    return { type: "error", error: value.error };
  }

  throw new Error(`Unsupported SAGE stream event: ${value.type}`);
}

export async function consumeSageStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SageStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  try {
    while (!completed) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      const parsed = drainLines(buffer);
      buffer = parsed.remainder;

      for (const line of parsed.lines) {
        const event = parseSageStreamEvent(line);
        onEvent(event);
        if (event.type === "done") completed = true;
        if (event.type === "error") throw new SageStreamFailure(event.error);
      }

      if (chunk.done) break;
    }
  } finally {
    reader.releaseLock();
  }

  if (!completed) throw new Error("SAGE stream ended before the done event");
}

export class SageStreamFailure extends Error {
  constructor(readonly payload: SageErrorPayload) {
    super(payload.message);
    this.name = "SageStreamFailure";
  }
}

function drainLines(value: string): { lines: string[]; remainder: string } {
  const lines = value.split("\n");
  const remainder = lines.pop() ?? "";
  return { lines: lines.map((line) => line.trim()).filter(Boolean), remainder };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSageErrorPayload(value: unknown): value is SageErrorPayload {
  if (!isRecord(value)) return false;
  return (
    (value.error === "NO_API_KEY" ||
      value.error === "RATE_LIMITED" ||
      value.error === "GENERATION_FAILED") &&
    (value.code === "MIM_CREDENTIAL_MISSING" ||
      value.code === "MIM_CREDENTIAL_INVALID" ||
      value.code === "MIM_PROVIDER_RATE_LIMIT" ||
      value.code === "MIM_AI_GENERATION_FAILED") &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean" &&
    (value.severity === "warning" || value.severity === "error") &&
    typeof value.action === "string" &&
    (value.details === undefined || typeof value.details === "string")
  );
}
