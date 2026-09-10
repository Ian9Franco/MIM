import fs from "node:fs/promises";
import path from "node:path";
import type { ReadOnlyFileTransport } from "@mim/contracts-core/server";

/** Local build reader with the same virtual paths as the SFTP adapter. */
export async function openBuildReadTransport(buildsBase: string, projectName: string): Promise<ReadOnlyFileTransport> {
  const base = await fs.realpath(buildsBase);
  const root = await fs.realpath(path.join(base, `${projectName}_allhost`));
  function assertWithin(basePath: string, target: string) {
    const relative = path.relative(basePath, target);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Build path escapes its root");
  }
  assertWithin(base, root);
  async function resolve(input: string) {
    const candidate = path.resolve(root, input.replace(/^[/\\]+/, ""));
    assertWithin(root, candidate);
    const canonical = await fs.realpath(candidate);
    assertWithin(root, canonical);
    return canonical;
  }
  return {
    async list(input) {
      const names = await fs.readdir(await resolve(input), { withFileTypes: true });
      return names.map((entry) => ({ name: entry.name, path: path.posix.join(input, entry.name), kind: entry.isDirectory() ? "directory" as const : "file" as const }));
    },
    async read(input) {
      const file = await fs.open(await resolve(input), "r");
      try {
        const stats = await file.stat();
        if (!stats.isFile() || stats.size > 64 * 1024 * 1024) throw new Error("Build file exceeds read limit");
        const buffer = Buffer.alloc(stats.size);
        let offset = 0;
        while (offset < buffer.length) {
          const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, offset);
          if (!bytesRead) throw new Error("Build changed during audit");
          offset += bytesRead;
        }
        if ((await file.stat()).mtimeMs !== stats.mtimeMs) throw new Error("Build changed during audit");
        return buffer;
      } finally { await file.close(); }
    },
  };
}
