import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readNBT, writeNBT, type NBTTag } from "./nbt";

/** Replace only after serialization, disk verification and the requested backup succeed. */
export async function savePlayerNBT(filePath: string, data: NBTTag, createBackup: boolean): Promise<void> {
  const target = path.resolve(filePath);
  if (!fs.lstatSync(target).isFile()) throw new Error("Player data must be a regular file");
  const buffer = await writeNBT(data, true);
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
  let created = false;
  try {
    const fd = fs.openSync(temporary, "wx", fs.statSync(target).mode);
    created = true;
    try {
      fs.writeFileSync(fd, buffer);
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    const written = fs.readFileSync(temporary);
    if (!written.equals(buffer)) throw new Error("NBT disk verification failed");
    await readNBT(written);
    if (createBackup) {
      const backup = `${target}.mim_bak`;
      try {
        if (!fs.lstatSync(backup).isFile()) throw new Error("Backup must be a regular file");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      fs.copyFileSync(target, backup);
    }
    // Same-directory rename: no truncate/unlink fallback if replacement fails.
    fs.renameSync(temporary, target);
    created = false;
  } finally {
    if (created) fs.unlinkSync(temporary);
  }
}
