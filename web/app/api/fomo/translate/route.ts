import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rateLimiter";
import { mimMsg } from "@/lib/voice";


/**
 * Strict schema validation for incoming translation requests.
 * Caps length at 3000 characters to prevent buffer overflow or proxy abuse.
 */
const requestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text payload cannot be empty")
    .max(3000, "Text exceeds maximum allowed length of 3000 characters"),
});

/**
 * Translates a single text block using the endpoint with strict timeout.
 */
async function translateBlock(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(text)}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Google Translate upstream returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data[0])) return text;

    return data[0]
      .map((item: any) => (Array.isArray(item) && typeof item[0] === "string" ? item[0] : ""))
      .join("");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Splits lines and groups them into moderate batches (up to 1000 characters)
 * to prevent hammering the upstream endpoint with 50+ concurrent requests.
 */
async function translateBatchedLines(source: string): Promise<string> {
  const lines = source.split("\n");
  const translatedLines: string[] = [];

  // Group lines into chunks under 1000 characters
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    if (!line.trim()) {
      // Flush current chunk if empty line encountered
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join("\n");
        const translatedChunk = await translateBlock(chunkText);
        translatedLines.push(translatedChunk);
        currentChunk = [];
        currentLength = 0;
      }
      translatedLines.push("");
      continue;
    }

    if (currentLength + line.length > 1000 && currentChunk.length > 0) {
      const chunkText = currentChunk.join("\n");
      const translatedChunk = await translateBlock(chunkText);
      translatedLines.push(translatedChunk);
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(line);
    currentLength += line.length + 1;
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join("\n");
    const translatedChunk = await translateBlock(chunkText);
    translatedLines.push(translatedChunk);
  }

  return translatedLines.join("\n");
}

export async function POST(request: Request) {
  // 1. Enforce strict rate limiting per IP (20 requests per minute)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, { windowMs: 60 * 1000, maxRequests: 20 });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: mimMsg.translateRateLimited(),
        retryAfterSeconds: rateLimit.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetInSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 2. Schema and payload validation with Zod
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body payload." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Validation failed";
    return NextResponse.json(
      { error: issue, details: parsed.error.format() },
      { status: 400 }
    );
  }

  const cleanText = parsed.data.text.replace(/\r\n/g, "\n");

  // 3. Batched execution with graceful degradation
  try {
    const translatedText = await translateBatchedLines(cleanText);
    return NextResponse.json(
      { translatedText, degraded: false },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (error: any) {
    console.warn(`[/api/fomo/translate] Upstream translation degraded for IP ${clientIp}:`, error?.message || error);
    // Graceful fallback: return original text rather than a fatal 500 error that crashes the UI
    return NextResponse.json(
      {
        translatedText: cleanText,
        degraded: true,
        reason: mimMsg.translateDegraded(),
      },
      { status: 200 }
    );
  }
}
