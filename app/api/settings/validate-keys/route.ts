import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { curseforge, modrinth, virusTotal } = await req.json();
    const results: Record<string, boolean> = {};

    // 1. CurseForge Validation (Required)
    if (curseforge) {
      try {
        const cfRes = await fetch("https://api.curseforge.com/v1/games/432", {
          headers: { "x-api-key": curseforge }
        });
        results.curseforge = cfRes.ok;
      } catch {
        results.curseforge = false;
      }
    } else {
      results.curseforge = false; // Required, so empty is invalid/not-ready
    }

    // 2. Modrinth Validation (Optional)
    if (modrinth) {
      try {
        const modRes = await fetch("https://api.modrinth.com/v2/user", {
          headers: { "Authorization": modrinth }
        });
        results.modrinth = modRes.ok;
      } catch {
        results.modrinth = false;
      }
    } else {
      results.modrinth = null; // Not configured
    }

    // 3. VirusTotal Validation (Optional)
    if (virusTotal) {
      try {
        const vtRes = await fetch("https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8", {
          headers: { "x-apikey": virusTotal }
        });
        results.virusTotal = vtRes.ok;
      } catch {
        results.virusTotal = false;
      }
    } else {
      results.virusTotal = null; // Not configured
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
