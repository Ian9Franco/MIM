import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

const validateKeysSchema = z.object({
  curseforge: z.string().optional().nullable(),
  modrinth: z.string().optional().nullable(),
  virusTotal: z.string().optional().nullable(),
});

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body payload" }, { status: 400 });
    }

    const parsed = validateKeysSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { curseforge, modrinth, virusTotal } = parsed.data;
    const results: Record<string, boolean | null> = {};

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
      results.curseforge = false; // Required, so empty is invalid/not-ready
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
            "Authorization": token,
          },
        });
        results.modrinth = modRes.ok;
      } catch {
        results.modrinth = false;
      }
    } else {
      results.modrinth = null; // Not configured
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
      results.virusTotal = null; // Not configured
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  }
);
