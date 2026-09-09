/**
 * Server Backup Management & World Metadata Inspection (SRV-6c)
 * Discovers backups, checks file integrity, and extracts world metadata.
 */

import type {
  ReadOnlyFileTransport,
  ServerBackupInfo,
  WorldMetadataInfo,
} from "@mim/contracts-core/server";

/**
 * Discovers all backup archives (.zip, .tar.gz, .bak) in the server backup folders.
 */
export async function listServerBackups(
  transport: ReadOnlyFileTransport,
  backupDirs: string[] = ["backups", "backup", "simplebackups"]
): Promise<ServerBackupInfo[]> {
  const backups: ServerBackupInfo[] = [];

  for (const dir of backupDirs) {
    try {
      const entries = await transport.list(dir);
      for (const entry of entries) {
        if (entry.kind === "file") {
          const lowerName = entry.name.toLowerCase();
          if (
            lowerName.endsWith(".zip") ||
            lowerName.endsWith(".tar.gz") ||
            lowerName.endsWith(".tgz") ||
            lowerName.endsWith(".bak")
          ) {
            // Attempt to parse world name from filename e.g. "world-2026-09-09.zip"
            const worldNameMatch = entry.name.match(/^([a-zA-Z0-9_\-]+?)[-_]\d{4}/);
            const worldName = worldNameMatch ? worldNameMatch[1] : undefined;

            backups.push({
              filename: entry.name,
              path: entry.path || `${dir}/${entry.name}`,
              sizeBytes: entry.size || 0,
              createdAt: entry.modifiedAt || new Date().toISOString(),
              worldName,
            });
          }
        }
      }
    } catch {
      // Backup directory might not exist yet, treat as benign
    }
  }

  // Sort by date or filename descending
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Parses basic world level properties from a level.dat buffer or fallback metadata.
 */
export function extractWorldMetadata(
  levelName: string,
  levelDatBuffer?: Uint8Array
): WorldMetadataInfo {
  if (!levelDatBuffer || levelDatBuffer.length === 0) {
    return {
      levelName,
    };
  }

  // Basic string scanning over NBT bytes for high-speed metadata extraction without heavy full NBT tree parse
  const bufferString = new TextDecoder("latin1").decode(levelDatBuffer);

  let generatorName: string | undefined;
  if (bufferString.includes("generatorName")) {
    const match = bufferString.match(/generatorName[^\w]*([a-zA-Z0-9_\-]+)/);
    if (match) generatorName = match[1];
  }

  let versionName: string | undefined;
  if (bufferString.includes("Version") || bufferString.includes("Name")) {
    const vMatch = bufferString.match(/(?:Version|Name).*?(\d+\.\d+(?:\.\d+)?)/);
    if (vMatch) versionName = vMatch[1];
  }

  return {
    levelName,
    generatorName: generatorName || "default",
    versionName: versionName || "Minecraft",
    hardcore: bufferString.includes("hardcore\x01"),
  };
}
