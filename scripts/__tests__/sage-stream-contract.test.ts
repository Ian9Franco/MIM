import assert from "node:assert/strict";
import { GeminiSseTextReader } from "../../lib/intelligence/sage/geminiStream";
import {
  consumeSageStream,
  encodeSageStreamEvent,
  SageStreamFailure,
} from "../../lib/intelligence/sage/streamContract";
import { sageErrorPayload } from "../../lib/intelligence/sage/errorContract";

const encoder = new TextEncoder();

function chunkedStream(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function testGeminiFragmentation(): Promise<void> {
  const first = JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hola " }] } }] });
  const second = JSON.stringify({ candidates: [{ content: { parts: [{ text: "mundo" }] } }] });
  const reader = new GeminiSseTextReader(chunkedStream([
    `data: ${first.slice(0, 19)}`,
    `${first.slice(19)}\r\n\r\ndata: ${second}\n`,
    "\n",
  ]));

  assert.deepEqual(await reader.readText(), { done: false, text: "Hola " });
  assert.deepEqual(await reader.readText(), { done: false, text: "mundo" });
  assert.deepEqual(await reader.readText(), { done: true, text: "" });
}

async function testSageFragmentation(): Promise<void> {
  const encoded = [
    encodeSageStreamEvent({ type: "start", model: "gemini-test" }),
    encodeSageStreamEvent({ type: "delta", text: "uno" }),
    encodeSageStreamEvent({ type: "delta", text: " dos" }),
    encodeSageStreamEvent({ type: "done" }),
  ];
  const payload = Buffer.concat(encoded.map((value) => Buffer.from(value))).toString("utf8");
  const seen: string[] = [];

  await consumeSageStream(chunkedStream([
    payload.slice(0, 7),
    payload.slice(7, 41),
    payload.slice(41),
  ]), (event) => {
    if (event.type === "delta") seen.push(event.text);
  });

  assert.deepEqual(seen, ["uno", " dos"]);
}

async function testStructuredStreamFailure(): Promise<void> {
  const failure = sageErrorPayload("MIM_AI_GENERATION_FAILED");
  const body = chunkedStream([
    new TextDecoder().decode(encodeSageStreamEvent({ type: "error", error: failure })),
  ]);

  await assert.rejects(
    consumeSageStream(body, () => undefined),
    (error: unknown) =>
      error instanceof SageStreamFailure &&
      error.payload.code === "MIM_AI_GENERATION_FAILED" &&
      error.payload.retryable,
  );
}

async function testTruncatedStreamFailsClosed(): Promise<void> {
  const body = chunkedStream([
    new TextDecoder().decode(encodeSageStreamEvent({ type: "delta", text: "incompleto" })),
  ]);
  await assert.rejects(
    consumeSageStream(body, () => undefined),
    /ended before the done event/,
  );
}

async function run(): Promise<void> {
  await testGeminiFragmentation();
  await testSageFragmentation();
  await testStructuredStreamFailure();
  await testTruncatedStreamFailsClosed();
  console.log("✓ SAGE streaming contract suite passed");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
