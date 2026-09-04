import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { withApiGuard } from "@/lib/apiGuard";
import { getPortableDir } from "@/lib/core/settings";

const DATA_DIR = path.join(getPortableDir(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "showcase_channels.json");

function getChannels(): string[] {
  if (fs.existsSync(CHANNELS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHANNELS_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading channels file", e);
    }
  }
  // Default channel
  return ["https://www.youtube.com/@EnderVerseMC"];
}

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
  },
  async () => {
    return NextResponse.json({ channels: getChannels() });
  }
);

const postBodySchema = z.object({
  channels: z.array(z.string()),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    bodySchema: postBodySchema,
  },
  async ({ body }) => {
    try {
      const { channels } = body;
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2), "utf-8");
      return NextResponse.json({ success: true, channels });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
);
