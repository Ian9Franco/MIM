import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a temp directory for sage uploads if it doesn't exist
    const tempDir = path.join(os.tmpdir(), "sage-uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Keep the original filename but append a random string to prevent collisions
    const ext = path.extname(file.name) || ".dat";
    const baseName = path.basename(file.name, ext);
    const randomStr = crypto.randomBytes(4).toString("hex");
    const tempFileName = `${baseName}-${randomStr}${ext}`;
    const filePath = path.join(tempDir, tempFileName);

    // Write file to temp location
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      filePath,
      fileName: file.name
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error.message}` },
      { status: 500 }
    );
  }
}
