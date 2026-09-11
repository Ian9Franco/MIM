import { Client, type SFTPWrapper } from "ssh2";
import { createHash } from "node:crypto";
import path from "node:path";
import type { SftpConnectionConfig } from "@mim/contracts-core/server";

export class SftpAuditError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export const SFTP_MAX_FILE_BYTES = 64 * 1024 * 1024;
export const SFTP_MAX_TOTAL_BYTES = 512 * 1024 * 1024;

export type SftpSessionPurpose = "audit" | "deploy";

export function normalizeSftpError(error: unknown, purpose: SftpSessionPurpose = "audit"): SftpAuditError {
  if (error instanceof SftpAuditError) return error;
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === 2 || code === "ENOENT") return new SftpAuditError("ENOENT", "No se encontró el archivo o directorio solicitado.");
  if (code === 3 || code === "EACCES") {
    return new SftpAuditError(
      "EACCES",
      purpose === "deploy"
        ? "La cuenta SFTP no tiene permisos para leer o escribir en esta carpeta."
        : "La cuenta SFTP no tiene permisos de lectura."
    );
  }
  return new SftpAuditError("SFTP_CONNECTION", "No se pudo completar la conexión SFTP. Revisá dirección, puerto y credenciales.");
}

export function isContainedInRoot(root: string, value: string): boolean {
  return value === root || value.startsWith(root === "/" ? "/" : `${root}/`);
}

export interface OpenSftpSession {
  channel: SFTPWrapper;
  root: string;
  purpose: SftpSessionPurpose;
  call: <T>(operation: (done: (error: Error | undefined | null, value: T) => void) => void) => Promise<T>;
  resolve: (relativePath: string) => Promise<string>;
  resolveForWrite: (relativePath: string) => Promise<string>;
  close: () => void;
}

/** Shared SSH/SFTP session with host verification and path containment. */
export async function openSftpSession(
  config: SftpConnectionConfig,
  signal: AbortSignal,
  purpose: SftpSessionPurpose = "audit"
): Promise<OpenSftpSession> {
  const client = new Client();
  let channel: SFTPWrapper;
  let root = "";
  let terminalError: SftpAuditError | undefined;
  const pending = new Set<(reason: SftpAuditError) => void>();
  const abortMessage = purpose === "deploy"
    ? "El despliegue se canceló o superó el tiempo de espera."
    : "La auditoría se canceló o superó el tiempo de espera.";
  const fail = (error: unknown) => {
    terminalError ??= normalizeSftpError(error, purpose);
    for (const reject of pending) reject(terminalError);
    pending.clear();
  };
  const abort = () => {
    fail(new SftpAuditError("ABORTED", abortMessage));
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
          if (error) reject(normalizeSftpError(error, purpose)); else resolve(value);
        });
      } catch (error) { pending.delete(reject); reject(normalizeSftpError(error, purpose)); }
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

    function virtualToCandidate(relativePath: string): string {
      const relative = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const candidate = path.posix.resolve(root, relative);
      if (!isContainedInRoot(root, candidate)) throw new SftpAuditError("PATH_OUTSIDE_ROOT", "La ruta excede la carpeta del servidor.");
      return candidate;
    }

    async function resolve(relativePath: string): Promise<string> {
      // The domain sees a virtual root; canonicalization also catches symlinks
      // escaping the selected server directory. Never trust directory entry paths.
      const candidate = virtualToCandidate(relativePath);
      const canonical = await call<string>((done) => channel.realpath(candidate, done));
      if (!isContainedInRoot(root, canonical)) throw new SftpAuditError("PATH_OUTSIDE_ROOT", "Un enlace apunta fuera de la carpeta del servidor.");
      return canonical;
    }

    async function resolveForWrite(relativePath: string): Promise<string> {
      const candidate = virtualToCandidate(relativePath);
      const parent = path.posix.dirname(candidate);
      const canonicalParent = await call<string>((done) => channel.realpath(parent, done));
      if (!isContainedInRoot(root, canonicalParent)) {
        throw new SftpAuditError("PATH_OUTSIDE_ROOT", "Un enlace apunta fuera de la carpeta del servidor.");
      }
      return path.posix.join(canonicalParent, path.posix.basename(candidate));
    }

    return { channel, root, purpose, call, resolve, resolveForWrite, close };
  } catch (error) {
    close();
    throw normalizeSftpError(error, purpose);
  }
}
