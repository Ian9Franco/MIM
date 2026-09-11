import path from "node:path";
import type { ReadOnlyFileTransport, RemoteFileEntry } from "@mim/contracts-core/server";
import type { SftpConnectionConfig } from "@mim/contracts-core/server";
import {
  SftpAuditError,
  SFTP_MAX_FILE_BYTES,
  SFTP_MAX_TOTAL_BYTES,
  openSftpSession,
} from "./sftpSession";

export { SftpAuditError };

/** A request-scoped connection. No write, shell, exec or forwarding capability escapes. */
export async function openSftpReadTransport(config: SftpConnectionConfig, signal: AbortSignal): Promise<{
  transport: ReadOnlyFileTransport; close: () => void;
}> {
  const session = await openSftpSession(config, signal, "audit");
  let bytesRead = 0;
  const transport: ReadOnlyFileTransport = {
    async list(remotePath) {
      const resolved = await session.resolve(remotePath);
      const entries = await session.call<import("ssh2").FileEntryWithStats[]>((done) => session.channel.readdir(resolved, done));
      if (entries.length > 2000) throw new SftpAuditError("LIMIT", "La carpeta supera el límite de 2000 entradas.");
      return entries.filter((entry) => entry.filename !== "." && entry.filename !== "..").map((entry): RemoteFileEntry => ({
        name: entry.filename, path: path.posix.join(remotePath, entry.filename),
        kind: entry.attrs.isDirectory() ? "directory" : "file", size: entry.attrs.size,
      }));
    },
    async read(remotePath) {
      const resolved = await session.resolve(remotePath);
      const stats = await session.call<import("ssh2").Stats>((done) => session.channel.stat(resolved, done));
      if (!stats.isFile() || stats.size > SFTP_MAX_FILE_BYTES) throw new SftpAuditError("LIMIT", "Un archivo no es regular o supera los 64 MiB.");
      // Stream rather than readFile so growth after stat cannot bypass the cap.
      return session.call<Uint8Array>((done) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const stream = session.channel.createReadStream(resolved, { flags: "r" });
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length; bytesRead += chunk.length;
          if (size > SFTP_MAX_FILE_BYTES || bytesRead > SFTP_MAX_TOTAL_BYTES) {
            stream.destroy(new SftpAuditError("LIMIT", "La auditoría supera el límite de lectura."));
          } else chunks.push(chunk);
        });
        stream.on("error", (error: Error) => done(error, new Uint8Array()));
        stream.once("end", () => done(undefined, Buffer.concat(chunks)));
      });
    },
  };
  return { transport, close: session.close };
}
