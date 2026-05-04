import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(req: Request) {
  const body = await req.json();
  const next = saveSettings(body);
  return NextResponse.json(next);
}
