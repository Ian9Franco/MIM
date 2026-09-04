import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";

const requestSchema = z.object({
  paths: z.array(z.string()).min(1, "Paths must contain at least one path"),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body payload" }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { paths } = parsed.data;
    const results: Record<string, boolean> = {};

    for (const p of paths) {
      if (!p.trim()) {
        results[p] = false;
        continue;
      }
      try {
        results[p] = fs.existsSync(p);
      } catch {
        results[p] = false;
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
