import { NextResponse } from "next/server";
import { writeNBT, type NBTTag } from "@/lib/modding/nbt";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";
import { savePlayerBodySchema } from "@/lib/api/contracts";

export const POST = withApiGuard(
  { bodySchema: savePlayerBodySchema },
  async ({ body }) => {
  try {
    const { filePath, nbtData, createBackup } = body;

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
      const buffer = await writeNBT(nbtData as NBTTag, true);
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
