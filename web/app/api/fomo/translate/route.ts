import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rateLimiter";
import { mimMsg } from "@/lib/voice";
import { translateText } from "@/lib/translator";

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

  // 3. Execution via official translation service with graceful degradation
  try {
    const result = await translateText(cleanText, "es");

    return NextResponse.json(
      {
        translatedText: result.translatedText,
        degraded: result.degraded,
        provider: result.provider,
        reason: result.reason,
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[/api/fomo/translate] Official translation degraded for IP ${clientIp}:`, errorMsg);

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
