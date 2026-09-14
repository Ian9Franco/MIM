import { NextResponse } from "next/server";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";
import { validatePathsBodySchema } from "@/lib/api/contracts";

export const POST = withApiGuard(
  { bodySchema: validatePathsBodySchema },
  async ({ body }) => {
    try {
      const { paths } = body;
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
);
