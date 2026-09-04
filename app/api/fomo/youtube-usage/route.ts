import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { withApiGuard } from "@/lib/apiGuard";
import { getPortableDir } from "@/lib/core/settings";

const DATA_DIR = path.join(getPortableDir(), "data");
const USAGE_FILE = path.join(DATA_DIR, "showcase_usage.json");

function getUsage(): Record<string, number> {
  if (fs.existsSync(USAGE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading usage file", e);
    }
  }
  return {};
}

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
  },
  async () => {
    return NextResponse.json({ usage: getUsage() });
  }
);

const postBodySchema = z.object({
  usage: z.record(z.string(), z.number()),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    bodySchema: postBodySchema,
  },
  async ({ body }) => {
    try {
      const { usage } = body;
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), "utf-8");
      return NextResponse.json({ success: true, usage });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
);
