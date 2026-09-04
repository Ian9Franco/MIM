import { NextRequest, NextResponse } from "next/server";
import { readNBT, TagType, NBTTag } from "@/lib/modding/nbt";
import { resolveUuidToUsername } from "@/lib/minecraft/usercache";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

/**
 * GET /api/sage/player-rescue/parse
 * 
 * Parses a player .dat file and returns:
 * - Full NBT tree
 * - World name (from level.dat if available)
 * - Backup files associated with this player
 * - Key player data (coords, dimension, spawn points)
 */

function getPlayerCompound(rootTag: NBTTag): { compound: Record<string, NBTTag> | null; isLevelDat: boolean } {
  const rootCompound = rootTag.value as Record<string, NBTTag>;
  if (!rootCompound) return { compound: null, isLevelDat: false };

  // level.dat structure: root -> Data (Compound) -> Player (Compound)
  if (rootCompound["Data"] && rootCompound["Data"].type === TagType.Compound) {
    const dataCompound = rootCompound["Data"].value as Record<string, NBTTag>;
    if (dataCompound["Player"] && dataCompound["Player"].type === TagType.Compound) {
      return {
        compound: dataCompound["Player"].value as Record<string, NBTTag>,
        isLevelDat: true
      };
    }
  }

  // UUID.dat structure: root is the Player compound itself
  return {
    compound: rootCompound,
    isLevelDat: false
  };
}

/**
 * Extract the world name from level.dat
 */
async function getWorldName(levelDatPath: string): Promise<string> {
  try {
    if (!fs.existsSync(levelDatPath)) {
      return "Unknown";
    }
    const buf = fs.readFileSync(levelDatPath);
    const root = await readNBT(buf);
    const rootCompound = root.value as Record<string, NBTTag>;
    
    if (rootCompound["Data"]) {
      const dataCompound = rootCompound["Data"].value as Record<string, NBTTag>;
      if (dataCompound["LevelName"] && dataCompound["LevelName"].type === TagType.String) {
        return String(dataCompound["LevelName"].value);
      }
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

function normalizeUuidString(value: string): string {
  return value.replace(/-/g, "").toLowerCase();
}

function isUuidString(value: string): boolean {
  const normalized = normalizeUuidString(value.replace(/\.dat(_old)?$/, ""));
  return /^[0-9a-f]{32}$/.test(normalized);
}

/**
 * Find all backup files (timestamped) for a given player UUID
 */
function findBackupFiles(playerDataDir: string, baseFilename: string): string[] {
  const uuid = baseFilename.replace(/\.dat(_old)?$/, "");
  const backups: string[] = [];

  try {
    const files = fs.readdirSync(playerDataDir);
    for (const file of files) {
      // Match UUID-<timestamp>.dat pattern
      if (file.startsWith(uuid) && /-\d{10,}\.dat$/.test(file)) {
        backups.push(file);
      }
      // Match UUID.dat_old
      if (file === `${uuid}.dat_old`) {
        backups.push(file);
      }
    }
  } catch {
    return [];
  }

  return backups;
}

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

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

    // Read the NBT file
    const buf = fs.readFileSync(filePath);
    const root = await readNBT(buf);
    const { compound: playerCompound, isLevelDat } = getPlayerCompound(root);

    if (!playerCompound) {
      return NextResponse.json(
        { error: "Could not parse player compound from NBT file" },
        { status: 400 }
      );
    }

    // Get world name
    const fileName = path.basename(filePath);
    const dir = path.dirname(filePath);
    const levelDatPath = path.join(dir, "level.dat");
    let worldName = "External File";

    // Try to find level.dat in the same directory
    if (fs.existsSync(levelDatPath)) {
      worldName = await getWorldName(levelDatPath);
    } else {
      // Try to find it in the parent saves folder
      const possibleLevelDat = path.join(dir, "..", "level.dat");
      if (fs.existsSync(possibleLevelDat)) {
        worldName = await getWorldName(possibleLevelDat);
      }
    }

    // Find backup files associated with this player
    const backupFiles = findBackupFiles(dir, fileName);

    let username: string | null = null;
    if (isUuidString(fileName)) {
      username = await resolveUuidToUsername(fileName.replace(/\.dat(_old)?$/, ""), dir);
    }

    // Default to the raw filename if username is unavailable
    const displayName = username ? `${username} (${fileName})` : fileName;

    // Extract key player data
    let pos = [0, 80, 0];
    if (playerCompound["Pos"] && playerCompound["Pos"].type === TagType.List) {
      const listData = playerCompound["Pos"].value as { itemType: TagType; list: unknown[] };
      pos = listData.list.map(v => Number(v));
    }

    let dimension = "minecraft:overworld";
    if (playerCompound["Dimension"] && playerCompound["Dimension"].type === TagType.String) {
      dimension = String(playerCompound["Dimension"].value);
    }

    let spawnX = 0, spawnY = 80, spawnZ = 0;
    if (playerCompound["SpawnX"] && playerCompound["SpawnX"].type === TagType.Int) {
      spawnX = Number(playerCompound["SpawnX"].value);
    }
    if (playerCompound["SpawnY"] && playerCompound["SpawnY"].type === TagType.Int) {
      spawnY = Number(playerCompound["SpawnY"].value);
    }
    if (playerCompound["SpawnZ"] && playerCompound["SpawnZ"].type === TagType.Int) {
      spawnZ = Number(playerCompound["SpawnZ"].value);
    }

    let inventory: unknown[] = [];
    if (playerCompound["Inventory"] && playerCompound["Inventory"].type === TagType.List) {
      const listData = playerCompound["Inventory"].value as { itemType: TagType; list: unknown[] };
      inventory = listData.list;
    }

    return NextResponse.json({
      success: true,
      filePath,
      fileName,
      displayName,
      username,
      worldName,
      isLevelDat,
      nbt: root,
      playerData: {
        position: pos,
        dimension,
        spawn: { x: spawnX, y: spawnY, z: spawnZ },
        inventorySize: inventory.length
      },
      backupFiles,
      warnings: backupFiles.length > 0 
        ? [`Found ${backupFiles.length} backup files. Consider purging before saving to prevent mod rollbacks.`]
        : []
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error parsing player rescue file:", errorMsg);
    return NextResponse.json(
      { error: `Failed to parse NBT file: ${errorMsg}` },
      { status: 500 }
    );
  }

  }
);
