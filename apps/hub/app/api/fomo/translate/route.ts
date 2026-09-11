import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { mimMsg } from "@/lib/voice";
import { translateText } from "@/lib/translator";

/**
 * Strict schema validation for incoming translation requests.
 * Caps length at 3000 characters to prevent buffer overflow or proxy abuse.
 */
const bodySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text payload cannot be empty")
    .max(3000, "Text exceeds maximum allowed length of 3000 characters"),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 20 },
    bodySchema,
  },
  async ({ body: { text }, clientIp }) => {
    const cleanText = text.replace(/\r\n/g, "\n");

    try {
      const result = await translateText(cleanText, "es");

      return NextResponse.json({
        translatedText: result.translatedText,
        degraded: result.degraded,
        provider: result.provider,
        reason: result.reason,
      });
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
);
