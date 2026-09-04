import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readNBT, writeNBT, TagType, NBTTag } from "@/lib/modding/nbt";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

const savePlayerSchema = z.object({
  filePath: z.string().min(1, "filePath is required"),
  nbtData: z.custom<NBTTag>((val) => typeof val === "object" && val !== null, "Invalid NBT data structure"),
  createBackup: z.boolean().optional().default(true),
});

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body payload" }, { status: 400 });
    }

    const parsed = savePlayerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { filePath, nbtData, createBackup } = parsed.data;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }

    const logs: string[] = [];

    // Create backup before writing
    if (createBackup) {
      try {
        const backupPath = `${filePath}.mim_bak`;
        fs.copyFileSync(filePath, backupPath);
        logs.push(`✓ Backup created: ${path.basename(backupPath)}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logs.push(`⚠ Warning: Could not create backup: ${errMsg}`);
      }
    }

    // Write the NBT data (will be auto-gzipped)
    try {
      const buffer = await writeNBT(nbtData, true);
      fs.writeFileSync(filePath, buffer);
      logs.push(`✓ File saved successfully: ${path.basename(filePath)}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Failed to write NBT data: ${errMsg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filePath,
      logs,
      message: "Player data saved. Ensure the Minecraft server/client is closed before the next world load."
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error saving player rescue file:", errorMsg);
    return NextResponse.json(
      { error: `Failed to save file: ${errorMsg}` },
      { status: 500 }
    );
  }

  }
);
