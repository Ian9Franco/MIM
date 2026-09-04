import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  ids: z.string().trim().min(1, "Missing or empty ids parameter"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ ids: searchParams.get("ids") });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid ids parameter" },
        { status: 400 }
      );
    }
    const idsParam = parsed.data.ids;

    const headers: Record<string, string> = {
      "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
      "Content-Type": "application/json"
    };
    if (process.env.MODRINTH_API_KEY) {
      headers.Authorization = process.env.MODRINTH_API_KEY;
    }

    const res = await fetch(`https://api.modrinth.com/v2/projects?ids=${encodeURIComponent(idsParam)}`, {
      headers,
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Modrinth error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
