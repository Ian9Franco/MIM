import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPortableDir } from "@/lib/settings";

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

export async function GET() {
  return NextResponse.json({ channels: getChannels() });
}

export async function POST(request: Request) {
  try {
    const { channels } = await request.json();
    if (!Array.isArray(channels)) {
      return NextResponse.json({ error: "Invalid channels data" }, { status: 400 });
    }
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2), "utf-8");
    return NextResponse.json({ success: true, channels });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
