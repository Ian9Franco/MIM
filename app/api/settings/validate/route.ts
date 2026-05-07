import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { paths } = await req.json();
    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json({ error: "Paths must be an array" }, { status: 400 });
    }

    const results: Record<string, boolean> = {};
    for (const p of paths) {
      if (!p) {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
