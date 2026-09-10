import { Client, type SFTPWrapper, type Stats } from "ssh2";
import { createHash } from "node:crypto";
import path from "node:path";
import type { ReadOnlyFileTransport, RemoteFileEntry, SftpConnectionConfig } from "@mim/contracts-core/server";

export class SftpAuditError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
function normalizeError(error: unknown): SftpAuditError {
  if (error instanceof SftpAuditError) return error;
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === 2 || code === "ENOENT") return new SftpAuditError("ENOENT", "No se encontró el archivo o directorio solicitado.");
  if (code === 3 || code === "EACCES") return new SftpAuditError("EACCES", "La cuenta SFTP no tiene permisos de lectura.");
  return new SftpAuditError("SFTP_CONNECTION", "No se pudo completar la conexión SFTP. Revisá dirección, puerto y credenciales.");
}
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;

/** A request-scoped connection. No write, shell, exec or forwarding capability escapes. */
export async function openSftpReadTransport(config: SftpConnectionConfig, signal: AbortSignal): Promise<{
  transport: ReadOnlyFileTransport; close: () => void;
}> {
  const client = new Client();
  let channel: SFTPWrapper;
  let root = "";
  let bytesRead = 0;
  let terminalError: SftpAuditError | undefined;
  const pending = new Set<(reason: SftpAuditError) => void>();
  const fail = (error: unknown) => {
    terminalError ??= normalizeError(error);
    for (const reject of pending) reject(terminalError);
    pending.clear();
  };
  const abort = () => {
    fail(new SftpAuditError("ABORTED", "La auditoría se canceló o superó el tiempo de espera."));
    client.destroy();
  };
  const close = () => {
    signal.removeEventListener("abort", abort);
    fail(new SftpAuditError("CLOSED", "La conexión SFTP se cerró."));
    client.destroy();
  };
  signal.addEventListener("abort", abort, { once: true });
  client.on("error", fail);
  client.on("close", () => fail(new SftpAuditError("CLOSED", "La conexión SFTP se interrumpió.")));

  function call<T>(operation: (done: (error: Error | undefined | null, value: T) => void) => void): Promise<T> {
    if (terminalError) return Promise.reject(terminalError);
    if (signal.aborted) { abort(); return Promise.reject(terminalError); }
    return new Promise<T>((resolve, reject) => {
      pending.add(reject);
      try {
        operation((error, value) => {
          pending.delete(reject);
          if (error) reject(normalizeError(error)); else resolve(value);
        });
      } catch (error) { pending.delete(reject); reject(normalizeError(error)); }
    });
  }

  try {
    if (!config.knownHostFingerprint) throw new SftpAuditError("HOST_KEY_REQUIRED", "Falta la huella del host SSH.");
    await call<void>((done) => {
      client.once("ready", () => done(undefined, undefined));
      client.connect({
        host: config.host, port: config.port ?? 22, username: config.username,
        ...(config.auth.type === "password" ? { password: config.auth.password } : { privateKey: config.auth.privateKey, passphrase: config.auth.passphrase }),
        readyTimeout: 15000,
        hostVerifier: (key: Buffer) => {
          const fingerprint = `SHA256:${createHash("sha256").update(key).digest("base64").replace(/=+$/, "")}`;
          const trusted = fingerprint === config.knownHostFingerprint?.replace(/=+$/, "");
          if (!trusted) fail(new SftpAuditError("HOST_KEY_MISMATCH", "La huella del servidor no coincide. Verificala con el administrador."));
          return trusted;
        },
      });
    });
    channel = await call<SFTPWrapper>((done) => client.sftp(done));
    channel.on("error", fail);
    root = path.posix.normalize(await call<string>((done) => channel.realpath(config.rootPath || "/", done)));

    async function resolve(relativePath: string): Promise<string> {
      // The domain sees a virtual root; canonicalization also catches symlinks
      // escaping the selected server directory. Never trust directory entry paths.
      const relative = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const candidate = path.posix.resolve(root, relative);
      const contained = (value: string) => value === root || value.startsWith(root === "/" ? "/" : `${root}/`);
      if (!contained(candidate)) throw new SftpAuditError("PATH_OUTSIDE_ROOT", "La ruta excede la carpeta del servidor.");
      const canonical = await call<string>((done) => channel.realpath(candidate, done));
      if (!contained(canonical)) throw new SftpAuditError("PATH_OUTSIDE_ROOT", "Un enlace apunta fuera de la carpeta del servidor.");
      return canonical;
    }
    const transport: ReadOnlyFileTransport = {
      async list(remotePath) {
        const resolved = await resolve(remotePath);
        const entries = await call<import("ssh2").FileEntryWithStats[]>((done) => channel.readdir(resolved, done));
        if (entries.length > 2000) throw new SftpAuditError("LIMIT", "La carpeta supera el límite de 2000 entradas.");
        return entries.filter((entry) => entry.filename !== "." && entry.filename !== "..").map((entry): RemoteFileEntry => ({
          name: entry.filename, path: path.posix.join(remotePath, entry.filename),
          kind: entry.attrs.isDirectory() ? "directory" : "file", size: entry.attrs.size,
        }));
      },
      async read(remotePath) {
        const resolved = await resolve(remotePath);
        const stats = await call<Stats>((done) => channel.stat(resolved, done));
        if (!stats.isFile() || stats.size > MAX_FILE_BYTES) throw new SftpAuditError("LIMIT", "Un archivo no es regular o supera los 64 MiB.");
        // Stream rather than readFile so growth after stat cannot bypass the cap.
        return call<Uint8Array>((done) => {
          const chunks: Buffer[] = [];
          let size = 0;
          const stream = channel.createReadStream(resolved, { flags: "r" });
          stream.on("data", (chunk: Buffer) => {
            size += chunk.length; bytesRead += chunk.length;
            if (size > MAX_FILE_BYTES || bytesRead > MAX_TOTAL_BYTES) {
              stream.destroy(new SftpAuditError("LIMIT", "La auditoría supera el límite de lectura."));
            } else chunks.push(chunk);
          });
          stream.on("error", (error: Error) => done(error, new Uint8Array()));
          stream.once("end", () => done(undefined, Buffer.concat(chunks)));
        });
      },
    };
    return { transport, close };
  } catch (error) { close(); throw normalizeError(error); }
}
