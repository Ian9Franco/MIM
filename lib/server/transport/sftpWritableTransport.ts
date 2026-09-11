import path from "node:path";
import type { RemoteFileEntry, WritableFileTransport } from "@mim/contracts-core/server";
import type { SftpConnectionConfig } from "@mim/contracts-core/server";
import {
  SftpAuditError,
  SFTP_MAX_FILE_BYTES,
  SFTP_MAX_TOTAL_BYTES,
  openSftpSession,
  type OpenSftpSession,
} from "./sftpSession";

function basename(remotePath: string): string {
  const parts = remotePath.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || remotePath;
}

async function listEntries(session: OpenSftpSession, remotePath: string): Promise<RemoteFileEntry[]> {
  const resolved = await session.resolve(remotePath);
  const entries = await session.call<import("ssh2").FileEntryWithStats[]>((done) => session.channel.readdir(resolved, done));
  if (entries.length > 2000) throw new SftpAuditError("LIMIT", "La carpeta supera el límite de 2000 entradas.");
  return entries.filter((entry) => entry.filename !== "." && entry.filename !== "..").map((entry): RemoteFileEntry => ({
    name: entry.filename, path: path.posix.join(remotePath, entry.filename),
    kind: entry.attrs.isDirectory() ? "directory" : "file", size: entry.attrs.size,
  }));
}

/** Request-scoped writable SFTP. Same host verification and root containment as the read adapter. */
export async function openSftpWritableTransport(config: SftpConnectionConfig, signal: AbortSignal): Promise<{
  transport: WritableFileTransport; close: () => void;
}> {
  const session = await openSftpSession(config, signal, "deploy");
  let bytesRead = 0;
  let bytesWritten = 0;

  async function readFile(remotePath: string): Promise<Uint8Array> {
    const resolved = await session.resolve(remotePath);
    const stats = await session.call<import("ssh2").Stats>((done) => session.channel.stat(resolved, done));
    if (!stats.isFile() || stats.size > SFTP_MAX_FILE_BYTES) {
      throw new SftpAuditError("LIMIT", "Un archivo no es regular o supera los 64 MiB.");
    }
    return session.call<Uint8Array>((done) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const stream = session.channel.createReadStream(resolved, { flags: "r" });
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length; bytesRead += chunk.length;
        if (size > SFTP_MAX_FILE_BYTES || bytesRead > SFTP_MAX_TOTAL_BYTES) {
          stream.destroy(new SftpAuditError("LIMIT", "La transferencia supera el límite de lectura."));
        } else chunks.push(chunk);
      });
      stream.on("error", (error: Error) => done(error, new Uint8Array()));
      stream.once("end", () => done(undefined, Buffer.concat(chunks)));
    });
  }

  async function mkdirRecursive(remotePath: string): Promise<void> {
    const relative = remotePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = relative.split("/").filter(Boolean);
    let cursor = "";
    for (const part of parts) {
      cursor = cursor ? `${cursor}/${part}` : part;
      const candidate = path.posix.resolve(session.root, cursor);
      if (candidate !== session.root && !candidate.startsWith(session.root === "/" ? "/" : `${session.root}/`)) {
        throw new SftpAuditError("PATH_OUTSIDE_ROOT", "La ruta excede la carpeta del servidor.");
      }
      try {
        const canonical = await session.call<string>((done) => session.channel.realpath(candidate, done));
        if (canonical !== session.root && !canonical.startsWith(session.root === "/" ? "/" : `${session.root}/`)) {
          throw new SftpAuditError("PATH_OUTSIDE_ROOT", "Un enlace apunta fuera de la carpeta del servidor.");
        }
        const stats = await session.call<import("ssh2").Stats>((done) => session.channel.stat(canonical, done));
        if (!stats.isDirectory()) throw new SftpAuditError("NOT_A_DIRECTORY", "Hay un archivo donde se esperaba una carpeta.");
      } catch (error: unknown) {
        if (!(error instanceof SftpAuditError) || error.code !== "ENOENT") throw error;
        await session.call<void>((done) => session.channel.mkdir(candidate, done));
      }
    }
  }

  async function removePath(remotePath: string): Promise<void> {
    const resolved = await session.resolve(remotePath);
    const stats = await session.call<import("ssh2").Stats>((done) => session.channel.stat(resolved, done));
    if (stats.isDirectory()) {
      const entries = await listEntries(session, remotePath);
      for (const entry of entries) await removePath(entry.path);
      await session.call<void>((done) => session.channel.rmdir(resolved, done));
      return;
    }
    await session.call<void>((done) => session.channel.unlink(resolved, done));
  }

  const transport: WritableFileTransport = {
    list: (remotePath) => listEntries(session, remotePath),
    read: readFile,
    async stat(remotePath) {
      try {
        const resolved = await session.resolve(remotePath);
        const stats = await session.call<import("ssh2").Stats>((done) => session.channel.stat(resolved, done));
        return {
          path: remotePath,
          name: basename(remotePath),
          kind: stats.isDirectory() ? "directory" : "file",
          size: stats.size,
        };
      } catch (error: unknown) {
        if (error instanceof SftpAuditError && error.code === "ENOENT") return null;
        throw error;
      }
    },
    async write(remotePath, content) {
      if (content.byteLength > SFTP_MAX_FILE_BYTES) {
        throw new SftpAuditError("LIMIT", "Un archivo no es regular o supera los 64 MiB.");
      }
      if (bytesWritten + content.byteLength > SFTP_MAX_TOTAL_BYTES) {
        throw new SftpAuditError("LIMIT", "La transferencia supera el límite de escritura.");
      }
      const resolved = await session.resolveForWrite(remotePath);
      await session.call<void>((done) => {
        const stream = session.channel.createWriteStream(resolved, { flags: "w" });
        stream.on("error", (error: Error) => done(error, undefined));
        stream.once("close", () => done(undefined, undefined));
        stream.end(Buffer.from(content));
      });
      bytesWritten += content.byteLength;
    },
    async remove(remotePath) {
      await removePath(remotePath);
    },
    async move(from, to) {
      const source = await session.resolve(from);
      const destination = await session.resolveForWrite(to);
      try {
        await session.call<void>((done) => session.channel.unlink(destination, done));
      } catch (error: unknown) {
        if (!(error instanceof SftpAuditError) || error.code !== "ENOENT") throw error;
      }
      await session.call<void>((done) => session.channel.rename(source, destination, done));
    },
    mkdir: mkdirRecursive,
  };
  return { transport, close: session.close };
}
