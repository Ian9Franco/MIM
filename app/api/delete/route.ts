import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
      return NextResponse.json({ success: true, message: "File deleted successfully" });
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
