import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";
import { probeGeminiApiKey, type GeminiKeyStatus } from "@/lib/intelligence/geminiKeyValidation";

const validateKeysSchema = z.object({
  curseforge: z.string().optional().nullable(),
  modrinth: z.string().optional().nullable(),
  virusTotal: z.string().optional().nullable(),
  gemini: z.string().optional().nullable(),
  useStoredGemini: z.boolean().optional(),
});

export const POST = withApiGuard(
  { bodySchema: validateKeysSchema },
  async ({ body }) => {
    try {
      const { curseforge, modrinth, virusTotal, gemini, useStoredGemini } = body;
      const results: Record<string, boolean | null> = {};
      let geminiStatus: GeminiKeyStatus | undefined;

      // 1. CurseForge Validation (Required)
      if (curseforge?.trim()) {
        try {
          const cfRes = await fetch("https://api.curseforge.com/v1/games/432", {
            headers: { "x-api-key": curseforge.trim() },
          });
          results.curseforge = cfRes.ok;
        } catch {
          results.curseforge = false;
        }
      } else {
        results.curseforge = false;
      }

      // 2. Modrinth Validation (Optional)
      if (modrinth?.trim()) {
        try {
          let token = modrinth.trim();
          if (!token.startsWith("mrp_") && !token.startsWith("Bearer ") && token.length < 100) {
            token = `mrp_${token}`;
          }

          const modRes = await fetch("https://api.modrinth.com/v2/user", {
            headers: {
              "User-Agent": "MIM-App/1.0 (contact@mim.local)",
              Authorization: token,
            },
          });
          results.modrinth = modRes.ok;
        } catch {
          results.modrinth = false;
        }
      } else {
        results.modrinth = null;
      }

      // 3. VirusTotal Validation (Optional)
      if (virusTotal?.trim()) {
        try {
          const vtRes = await fetch("https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8", {
            headers: { "x-apikey": virusTotal.trim() },
          });
          results.virusTotal = vtRes.ok;
        } catch {
          results.virusTotal = false;
        }
      } else {
        results.virusTotal = null;
      }

      // 4. Gemini Validation (Optional or stored server-side)
      const geminiCandidate = useStoredGemini
        ? getApiKey("gemini").trim()
        : gemini?.trim() || "";

      if (useStoredGemini || gemini?.trim()) {
        geminiStatus = await probeGeminiApiKey(geminiCandidate);
        results.gemini =
          geminiStatus === "valid"
            ? true
            : geminiStatus === "missing"
              ? null
              : false;
      } else {
        results.gemini = null;
      }

      return NextResponse.json({
        results,
        ...(geminiStatus ? { geminiStatus } : {}),
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  }
);
