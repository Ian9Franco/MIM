import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
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

export async function GET() {
  return NextResponse.json({ usage: getUsage() });
}

export async function POST(request: Request) {
  try {
    const { usage } = await request.json();
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), "utf-8");
    return NextResponse.json({ success: true, usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
