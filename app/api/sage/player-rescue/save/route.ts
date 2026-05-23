import { NextRequest, NextResponse } from "next/server";
import { readNBT, writeNBT, TagType, NBTTag } from "@/lib/modding/nbt";
import path from "path";
import fs from "fs";

/**
 * POST /api/sage/player-rescue/save
 * 
 * Saves modified NBT data back to the .dat file.
 * 
 * Body:
 * {
 *   filePath: string,
 *   nbtData: NBTTag,
 *   createBackup?: boolean (default: true)
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filePath, nbtData, createBackup = true } = body;

    if (!filePath || !nbtData) {
      return NextResponse.json(
        { error: "filePath and nbtData are required" },
        { status: 400 }
      );
    }

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
      } catch (err: any) {
        logs.push(`⚠ Warning: Could not create backup: ${err.message}`);
      }
    }

    // Write the NBT data (will be auto-gzipped)
    try {
      const buffer = await writeNBT(nbtData, true);
      fs.writeFileSync(filePath, buffer);
      logs.push(`✓ File saved successfully: ${path.basename(filePath)}`);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to write NBT data: ${err.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filePath,
      logs,
      message: "Player data saved. Ensure the Minecraft server/client is closed before the next world load."
    });
  } catch (error: any) {
    console.error("Error saving player rescue file:", error);
    return NextResponse.json(
      { error: `Failed to save file: ${error.message}` },
      { status: 500 }
    );
  }
}
