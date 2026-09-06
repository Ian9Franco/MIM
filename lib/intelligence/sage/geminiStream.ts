export class GeminiSseTextReader {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly decoder = new TextDecoder();
  private buffer = "";
  private upstreamDone = false;

  constructor(body: ReadableStream<Uint8Array>) {
    this.reader = body.getReader();
  }

  async readText(): Promise<{ done: boolean; text: string }> {
    while (true) {
      const event = this.takeEvent();
      if (event !== null) {
        const text = extractText(event);
        if (text) return { done: false, text };
        continue;
      }

      if (this.upstreamDone) return { done: true, text: "" };
      const chunk = await this.reader.read();
      this.buffer += this.decoder.decode(chunk.value, { stream: !chunk.done });
      this.buffer = this.buffer.replace(/\r\n/g, "\n");
      this.upstreamDone = chunk.done;
    }
  }

  async cancel(reason?: unknown): Promise<void> {
    await this.reader.cancel(reason);
  }

  private takeEvent(): string | null {
    const boundary = this.buffer.indexOf("\n\n");
    if (boundary < 0) {
      if (!this.upstreamDone || !this.buffer.trim()) return null;
      const finalEvent = this.buffer;
      this.buffer = "";
      return finalEvent;
    }

    const event = this.buffer.slice(0, boundary);
    this.buffer = this.buffer.slice(boundary + 2);
    return event;
  }
}

function extractText(event: string): string {
  const payload = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!payload || payload === "[DONE]") return "";

  const value: unknown = JSON.parse(payload);
  if (!isRecord(value) || !Array.isArray(value.candidates)) return "";
  return value.candidates.flatMap(candidateText).join("");
}

function candidateText(candidate: unknown): string[] {
  if (!isRecord(candidate) || !isRecord(candidate.content)) return [];
  const parts = candidate.content.parts;
  if (!Array.isArray(parts)) return [];
  return parts.map((part) => isRecord(part) && typeof part.text === "string" ? part.text : "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
