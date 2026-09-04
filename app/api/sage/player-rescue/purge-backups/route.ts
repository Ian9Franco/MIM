import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/**
 * DELETE /api/sage/player-rescue/purge-backups
 * 
 * Deletes all backup files associated with a specific player.
 * 
 * Query Parameters:
 * - filePath: Path to the primary .dat file
 * 
 * Response:
 * {
 *   success: boolean,
 *   deleted: string[],
 *   count: number,
 *   sizeSaved: number
 * }
 */

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath query parameter is required" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }

    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const uuid = fileName.replace(/\.dat(_old)?$/, "");

    const logs: string[] = [];
    let deletedCount = 0;
    let totalSizeSaved = 0;
    const deletedFiles: string[] = [];

    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        let shouldDelete = false;

        // Match UUID-<timestamp>.dat pattern (modpack backups)
        if (file.startsWith(uuid) && /-\d{10,}\.dat$/.test(file)) {
          shouldDelete = true;
        }

        // Match UUID.dat_old (vanilla backup)
        if (file === `${uuid}.dat_old`) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          const fullPath = path.join(dir, file);
          try {
            const stats = fs.statSync(fullPath);
            totalSizeSaved += stats.size;
            fs.unlinkSync(fullPath);
            deletedCount++;
            deletedFiles.push(file);
            logs.push(`✓ Deleted: ${file}`);
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logs.push(`✗ Failed to delete ${file}: ${errMsg}`);
          }
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Error scanning directory: ${errMsg}` },
        { status: 500 }
      );
    }

    const sizeMB = (totalSizeSaved / (1024 * 1024)).toFixed(3);
    logs.push(`---`);
    logs.push(`✓ Purge complete: ${deletedCount} files deleted`);
    logs.push(`✓ Space recovered: ${sizeMB} MB`);

    return NextResponse.json({
      success: true,
      deleted: deletedFiles,
      count: deletedCount,
      sizeSaved: totalSizeSaved,
      logs,
      message: deletedCount > 0 
        ? `Deleted ${deletedCount} backup files. Player will not rollback on next load.`
        : "No backup files found."
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error purging player backups:", errorMsg);
    return NextResponse.json(
      { error: `Failed to purge backups: ${errorMsg}` },
      { status: 500 }
    );
  }
}
