import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import type { ReadOnlyFileTransport } from "@mim/contracts-core/server";

function normalizeVirtualPath(input: string): string {
  return input.replace(/^[/\\]+/, "").replace(/\\/g, "/");
}

function childNameUnderPrefix(filePath: string, prefix: string): { name: string; kind: "file" | "directory" } | null {
  if (prefix && !filePath.startsWith(prefix)) return null;
  const rest = prefix ? filePath.slice(prefix.length) : filePath;
  if (!rest) return null;
  const slash = rest.indexOf("/");
  const name = slash === -1 ? rest : rest.slice(0, slash);
  if (!name || name === "." || name === "..") return null;
  return { name, kind: slash === -1 ? "file" : "directory" };
}

function listZipChildren(files: Map<string, Buffer>, input: string) {
  const dir = normalizeVirtualPath(input);
  const prefix = dir ? `${dir}/` : "";
  const children = new Map<string, "file" | "directory">();
  for (const filePath of files.keys()) {
    const child = childNameUnderPrefix(filePath, prefix);
    if (child) children.set(child.name, child.kind);
  }
  return [...children.entries()].map(([name, kind]) => ({
    name,
    path: path.posix.join(dir || ".", name),
    kind,
  }));
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
      return listZipChildren(files, input);
    },
    async read(input) {
      const key = normalizeVirtualPath(input);
      const data = files.get(key);
      if (!data) throw new Error("AllUser file not found");
      return data;
    },
  };
}
