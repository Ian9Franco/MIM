import { NextRequest, NextResponse } from "next/server";
import { getPortableDir, getSettings } from "@/lib/core/settings";
import { readNBT, writeNBT, TagType, NBTTag } from "@/lib/modding/nbt";
import path from "path";
import fs from "fs";
import { loadUsercacheEntries } from "@/lib/minecraft/usercache";

// Extract player compound tag from NBT tag depending on whether it's level.dat or UUID.dat
function getPlayerCompound(rootTag: NBTTag): { compound: Record<string, NBTTag> | null, isLevelDat: boolean } {
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

// Regex to detect files with long numeric suffixes (backups)
const BACKUP_REGEX = /-[0-9]{10,}\.dat$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customFilePath = searchParams.get("filePath");
    const includeNbt = searchParams.get("includeNbt") === "true";
    const showBackups = searchParams.get("showBackups") === "true";

    if (customFilePath && fs.existsSync(customFilePath)) {
      try {
        const buf = fs.readFileSync(customFilePath);
        const root = await readNBT(buf);
        const { compound: playerCompound, isLevelDat } = getPlayerCompound(root);
        
        return NextResponse.json({
          players: [{
            fileName: path.basename(customFilePath),
            filePath: customFilePath,
            isHost: isLevelDat,
            worldName: "Archivo Externo",
            coordinates: [0,0,0], // Will be filled below if compound exists
            inventoryCount: 0,
            dimension: "Overworld",
            nbt: includeNbt ? root : undefined
          }]
        });
      } catch (err: any) {
        return NextResponse.json({ error: "No se pudo leer el archivo NBT: " + err.message }, { status: 400 });
      }
    }

    const portableDir = getPortableDir();
    const playerRescueDir = path.join(portableDir, "player-rescue");

    // Create the folder automatically if it doesn't exist
    if (!fs.existsSync(playerRescueDir)) {
      try {
        fs.mkdirSync(playerRescueDir, { recursive: true });
      } catch (err) {
        console.error("Could not create player-rescue directory", err);
      }
    }

    const playersList: any[] = [];
    const { minecraftPath } = getSettings();
 
    // 1. Scan portable player-rescue folder
    if (fs.existsSync(playerRescueDir)) {
      try {
        const files = fs.readdirSync(playerRescueDir);
        for (const file of files) {
          if (file.endsWith(".dat") && !file.toLowerCase().includes("level.dat")) {
            playersList.push({
              fileName: file,
              filePath: path.join(playerRescueDir, file),
              isHost: false,
              worldName: "Carpeta de Rescate"
            });
          }
        }
      } catch (_) {}
    }

    // 2. Scan global minecraftPath/saves folder
    if (fs.existsSync(path.join(minecraftPath, "saves"))) {
      try {
        const worlds = fs.readdirSync(path.join(minecraftPath, "saves"));
        for (const world of worlds) {
          const worldPath = path.join(minecraftPath, "saves", world);
          if (fs.statSync(worldPath).isDirectory()) {
            // We ONLY want primary player <UUID>.dat files, so we ignore level.dat completely
            
            // Check playerdata folder (UUIDs)
            const playerDataDir = path.join(worldPath, "playerdata");
            if (fs.existsSync(playerDataDir)) {
              const dataFiles = fs.readdirSync(playerDataDir);
              for (const df of dataFiles) {
                if (df.endsWith(".dat") || df.endsWith(".dat_old")) {
                  const isBackup = BACKUP_REGEX.test(df) || df.endsWith(".dat_old");
                  if (isBackup && !showBackups) continue;

                  playersList.push({
                    fileName: df,
                    filePath: path.join(playerDataDir, df),
                    isHost: false,
                    worldName: world,
                    isBackup
                  });
                }
              }
            }
          }
        }
      } catch (e) { console.error("Error scanning global saves:", e); }
    }

    // Process details for each player file
    let usercache: any[] = [];
    try {
      usercache = await loadUsercacheEntries(minecraftPath);
    } catch (_) {}

    const activePlayers = [];
    for (const p of playersList) {
      try {
        const buf = fs.readFileSync(p.filePath);
        const root = await readNBT(buf);
        const { compound: playerCompound } = getPlayerCompound(root);

        if (playerCompound) {
          // Get position [X, Y, Z]
          let coords = [0, 80, 0];
          if (playerCompound["Pos"] && playerCompound["Pos"].type === TagType.List) {
            const listData = playerCompound["Pos"].value as { itemType: TagType, list: any[] };
            if (listData.list.length === 3) {
              coords = [
                Number(listData.list[0]),
                Number(listData.list[1]),
                Number(listData.list[2])
              ];
            }
          }

          // Get inventory count
          let invCount = 0;
          if (playerCompound["Inventory"] && playerCompound["Inventory"].type === TagType.List) {
            const listData = playerCompound["Inventory"].value as { itemType: TagType, list: any[] };
            invCount = listData.list.length;
          }

          // Get dimension
          let dimension = "minecraft:overworld";
          if (playerCompound["Dimension"] && playerCompound["Dimension"].type === TagType.String) {
            dimension = String(playerCompound["Dimension"].value);
          } else if (playerCompound["Dimension"] && playerCompound["Dimension"].type === TagType.Int) {
            const dimId = Number(playerCompound["Dimension"].value);
            dimension = dimId === -1 ? "minecraft:the_nether" : dimId === 1 ? "minecraft:the_end" : "minecraft:overworld";
          }

          let displayName = p.fileName;
          if (!p.isHost && p.fileName.endsWith(".dat")) {
            const uuid = p.fileName.replace(".dat", "");
            const cached = usercache.find(c => c.uuid === uuid);
            if (cached) {
              displayName = cached.name;
            }
          }

          activePlayers.push({
            ...p,
            displayName,
            coordinates: coords,
            inventoryCount: invCount,
            dimension,
            nbt: includeNbt ? root : undefined
          });
        }
      } catch (err) {
        console.error(`Failed to parse player NBT file: ${p.filePath}`, err);
        activePlayers.push({
          ...p,
          coordinates: [0, 0, 0],
          inventoryCount: 0,
          dimension: "Desconocida (Error al leer)",
          error: "Error al analizar archivo NBT"
        });
      }
    }

    return NextResponse.json({ players: activePlayers });
  } catch (error: any) {
    console.error("Error listing player files:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { filePath, resetCoords, clearInventory, newCoords, changeDimension, newDimension } = await req.json();

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found or not selected" }, { status: 400 });
    }

    // Backup original file before editing
    const backupPath = filePath + ".mim_bak";
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    const buf = fs.readFileSync(filePath);
    const root = await readNBT(buf);
    
    // Find where the player compound resides
    const rootCompound = root.value as Record<string, NBTTag>;
    let playerCompound: Record<string, NBTTag> | null = null;
    let isLevelDat = false;

    if (rootCompound["Data"] && rootCompound["Data"].type === TagType.Compound) {
      const dataCompound = rootCompound["Data"].value as Record<string, NBTTag>;
      if (dataCompound["Player"] && dataCompound["Player"].type === TagType.Compound) {
        playerCompound = dataCompound["Player"].value as Record<string, NBTTag>;
        isLevelDat = true;
      }
    } else {
      playerCompound = rootCompound;
    }

    if (!playerCompound) {
      return NextResponse.json({ error: "Could not find player data compound" }, { status: 500 });
    }

    const logs: string[] = [];

    // 1. Coords Reset
    if (resetCoords) {
      const coordsToSet = newCoords || [0.0, 80.0, 0.0];
      if (playerCompound["Pos"] && playerCompound["Pos"].type === TagType.List) {
        playerCompound["Pos"].value = {
          itemType: TagType.Double,
          list: [
            Number(coordsToSet[0]),
            Number(coordsToSet[1]),
            Number(coordsToSet[2])
          ]
        };
        logs.push(`Coordenadas de jugador reubicadas a [${coordsToSet.join(", ")}]`);
      }
      
      // Clear motion
      if (playerCompound["Motion"] && playerCompound["Motion"].type === TagType.List) {
        playerCompound["Motion"].value = {
          itemType: TagType.Double,
          list: [0.0, 0.0, 0.0]
        };
      }
      
      // Reset fall distance
      if (playerCompound["FallDistance"]) {
        playerCompound["FallDistance"].value = 0.0;
      }
    }

    // 2. Clear Inventory
    if (clearInventory) {
      if (playerCompound["Inventory"] && playerCompound["Inventory"].type === TagType.List) {
        const countBefore = (playerCompound["Inventory"].value as any).list.length;
        playerCompound["Inventory"].value = {
          itemType: TagType.Compound,
          list: []
        };
        logs.push(`Inventario limpiado por completo (Se eliminaron ${countBefore} ítems)`);
      }
      if (playerCompound["EnderItems"] && playerCompound["EnderItems"].type === TagType.List) {
        playerCompound["EnderItems"].value = {
          itemType: TagType.Compound,
          list: []
        };
        logs.push(`Cofre de Ender limpiado por completo`);
      }
    }

    // 3. Dimension Change
    if (changeDimension) {
      const dimToSet = newDimension || "minecraft:overworld";
      if (playerCompound["Dimension"]) {
        if (playerCompound["Dimension"].type === TagType.String) {
          playerCompound["Dimension"].value = dimToSet;
        } else if (playerCompound["Dimension"].type === TagType.Int) {
          playerCompound["Dimension"].value = dimToSet.includes("the_nether") ? -1 : dimToSet.includes("the_end") ? 1 : 0;
        }
        logs.push(`Dimensión cambiada a "${dimToSet}"`);
      }
    }

    // Re-serialize and compress
    const outputBuffer = await writeNBT(root, true);
    fs.writeFileSync(filePath, outputBuffer);

    return NextResponse.json({
      success: true,
      message: "Jugador rescatado correctamente",
      backupCreated: !fs.existsSync(backupPath),
      logs
    });
  } catch (error: any) {
    console.error("Error modifying player NBT file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
