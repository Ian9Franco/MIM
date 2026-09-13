import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import type { ReadOnlyFileTransport } from "@mim/contracts-core/server";

function normalizeVirtualPath(input: string): string {
  return input.replace(/^[/\\]+/, "").replace(/\\/g, "/");
}

/** Reads the latest `[project]_alluser.zip` with the same virtual paths as SFTP/build transports. */
export async function openAllUserReadTransport(buildsBase: string, projectName: string): Promise<ReadOnlyFileTransport> {
  const base = await fs.realpath(buildsBase);
  const zipPath = path.join(base, `${projectName}_alluser.zip`);
  const zipBuffer = await fs.readFile(zipPath);
  if (zipBuffer.length > 256 * 1024 * 1024) throw new Error("AllUser build exceeds read limit");
  const zip = new AdmZip(zipBuffer);
  const files = new Map<string, Buffer>();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (entry.header.size > 64 * 1024 * 1024) throw new Error("AllUser entry exceeds read limit");
    files.set(normalizeVirtualPath(entry.entryName), entry.getData());
  }
  return {
    async list(input) {
      const dir = normalizeVirtualPath(input);
      const prefix = dir ? `${dir}/` : "";
      const children = new Map<string, "file" | "directory">();
      for (const filePath of files.keys()) {
        if (prefix && !filePath.startsWith(prefix)) continue;
        const rest = prefix ? filePath.slice(prefix.length) : filePath;
        if (!rest) continue;
        const slash = rest.indexOf("/");
        const name = slash === -1 ? rest : rest.slice(0, slash);
        if (!name || name === "." || name === "..") continue;
        children.set(name, slash === -1 ? "file" : "directory");
      }
      return [...children.entries()].map(([name, kind]) => ({
        name,
        path: path.posix.join(dir || ".", name),
        kind,
      }));
    },
    async read(input) {
      const key = normalizeVirtualPath(input);
      const data = files.get(key);
      if (!data) throw new Error("AllUser file not found");
      return data;
    },
  };
}
