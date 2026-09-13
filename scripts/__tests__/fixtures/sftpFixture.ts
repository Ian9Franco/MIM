import { Server, utils, type Connection, type SFTPWrapper } from "ssh2";
import { generateKeyPairSync, createHash } from "node:crypto";
import AdmZip from "adm-zip";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";

export function fixtureJar(id: string, version: string): Buffer {
  const zip = new AdmZip();
  zip.addFile("fabric.mod.json", Buffer.from(JSON.stringify({ schemaVersion: 1, id, name: id, version, environment: "*", depends: { minecraft: "1.20.1", fabricloader: ">=0.15.0" } })));
  return zip.toBuffer();
}

export const FIXTURE_LATEST_LOG = `[01:15:30] [Server thread/INFO] [minecraft/MinecraftServer]: Starting minecraft server version 1.20.1
[01:15:31] [Server thread/ERROR] [FabricLoader/]: Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Some mods require 'missing' which is missing!
\tat net.fabricmc.loader.impl.FabricLoaderImpl.load(FabricLoaderImpl.java:234)
`;

export const FIXTURE_CRASH_REPORT = `---- Minecraft Crash Report ----
Time: 2026-09-12 21:00:00
Description: Exception in server tick loop

net.fabricmc.loader.impl.FormattedException: Some mods require 'missing' which is missing!
`;

export const FIXTURE_SERVER_PROPERTIES = `# Minecraft server properties
motd=MIM Fixture SMP
max-players=8
difficulty=normal
gamemode=survival
online-mode=true
pvp=true
white-list=false
view-distance=10
simulation-distance=8
server-port=25565
spawn-protection=16
enable-rcon=false
rcon.port=25575
level-name=world
`;

export function fixtureBackupZip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("world/level.dat", Buffer.from("fixture-world"));
  return zip.toBuffer();
}

/** Real SSH/SFTP protocol fixture; no filesystem writes or shell execution exposed. */
export async function startSftpFixture() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const parsed = utils.parseKey(privateKey);
  if (parsed instanceof Error || Array.isArray(parsed)) throw new Error("Invalid fixture key");
  const fingerprint = `SHA256:${createHash("sha256").update(parsed.getPublicSSH()).digest("base64").replace(/=+$/, "")}`;
  const userKey = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } }).privateKey;
  const parsedUserKey = utils.parseKey(userKey);
  if (parsedUserKey instanceof Error || Array.isArray(parsedUserKey)) throw new Error("Invalid fixture user key");
  const files = new Map<string, Buffer>([
    ["/server/mods/example.jar", fixtureJar("example", "1.0.0")],
    ["/server/server.properties", Buffer.from(FIXTURE_SERVER_PROPERTIES)],
    ["/server/logs/latest.log", Buffer.from(FIXTURE_LATEST_LOG)],
    ["/server/crash-reports/crash-2026-09-12_fixture.txt", Buffer.from(FIXTURE_CRASH_REPORT)],
    ["/server/backups/world-2026-09-12.zip", fixtureBackupZip()],
  ]);
  const clients = new Set<Connection>();
  const operations: string[] = [];
  let readFault: "none" | "denied" | "disconnect" | "stall" = "none";
  let handleSequence = 0;
  const server = new Server({ hostKeys: [privateKey] }, (client) => {
    clients.add(client);
    client.on("error", () => {});
    client.on("close", () => clients.delete(client));
    client.on("authentication", (ctx) => {
      if (ctx.method === "password" && ctx.username === "fixture" && ctx.password === "local-fixture-only") ctx.accept();
      else if (ctx.method === "publickey" && ctx.username === "fixture" && ctx.key.data.equals(parsedUserKey.getPublicSSH()) &&
        (!ctx.signature || parsedUserKey.verify(ctx.blob!, ctx.signature, ctx.hashAlgo) === true)) ctx.accept();
      else ctx.reject();
    });
    client.on("ready", () => client.on("session", (accept) => {
      const session = accept();
      session.on("sftp", (acceptSftp) => setup(acceptSftp(), client));
    }));
  });
  function setup(sftp: SFTPWrapper, client: Connection) {
    sftp.on("error", () => {});
    const handles = new Map<string, { path: string; listed: boolean; writable?: boolean }>();
    const dirs = new Set(["/", "/server", "/server/mods", "/server/logs", "/server/crash-reports", "/server/backups"]);
    const parentOf = (p: string) => { const i = p.lastIndexOf("/"); return i <= 0 ? "/" : p.slice(0, i); };
    const directory = (p: string) => dirs.has(p);
    const exists = (p: string) => directory(p) || files.has(p);
    const attrs = (p: string) => ({ mode: directory(p) ? 0o40755 : 0o100644, size: files.get(p)?.length || 0, uid: 0, gid: 0, atime: 0, mtime: 0 });
    sftp.on("REALPATH", (id: number, p: string) => {
      operations.push("REALPATH");
      const canonical = p === "/server/mods/escape.jar" ? "/outside/secret.jar" : p;
      if (!exists(p) && p !== "/server/mods/escape.jar") { sftp.status(id, 2); return; }
      sftp.name(id, [{ filename: canonical, longname: canonical, attrs: attrs(p) }]);
    });
    for (const event of ["STAT", "LSTAT"]) sftp.on(event, (id: number, p: string) => {
      operations.push(event); if (exists(p)) sftp.attrs(id, attrs(p)); else sftp.status(id, 2);
    });
    sftp.on("OPENDIR", (id: number, p: string) => {
      operations.push("OPENDIR");
      if (!directory(p)) { sftp.status(id, 2); return; }
      const handle = Buffer.from(String(++handleSequence)); handles.set(handle.toString(), { path: p, listed: false }); sftp.handle(id, handle);
    });
    sftp.on("READDIR", (id: number, handle: Buffer) => {
      operations.push("READDIR"); const state = handles.get(handle.toString());
      if (!state || state.listed) { sftp.status(id, 1); return; }
      state.listed = true;
      const prefix = `${state.path === "/" ? "" : state.path}/`;
      const childFiles = [...files.keys()].filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
      const childDirs = [...dirs].filter((p) => p !== state.path && p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
      const entries = [...childDirs, ...childFiles];
      if (!entries.length) { sftp.status(id, 1); return; }
      sftp.name(id, entries.map((p) => ({ filename: p.slice(prefix.length), longname: p, attrs: attrs(p) })));
    });
    sftp.on("OPEN", (id: number, p: string, flags: number) => {
      const writable = (flags & 2) !== 0;
      operations.push(writable ? "MUTATION" : "OPEN_READ");
      if (writable) {
        if (!directory(parentOf(p))) { sftp.status(id, 2); return; }
        if ((flags & 16) !== 0 || !files.has(p)) files.set(p, Buffer.alloc(0));
        const handle = Buffer.from(String(++handleSequence)); handles.set(handle.toString(), { path: p, listed: false, writable: true }); sftp.handle(id, handle);
        return;
      }
      if (!files.has(p)) { sftp.status(id, 2); return; }
      const handle = Buffer.from(String(++handleSequence)); handles.set(handle.toString(), { path: p, listed: false }); sftp.handle(id, handle);
    });
    sftp.on("FSTAT", (id: number, handle: Buffer) => {
      const state = handles.get(handle.toString()); if (state) sftp.attrs(id, attrs(state.path)); else sftp.status(id, 4);
    });
    sftp.on("READ", (id: number, handle: Buffer, offset: number, length: number) => {
      operations.push("READ");
      if (readFault === "stall") return;
      if (readFault === "disconnect") { client.end(); return; }
      if (readFault === "denied") { sftp.status(id, 3); return; }
      const state = handles.get(handle.toString()); const bytes = state && files.get(state.path);
      if (!bytes || offset >= bytes.length) sftp.status(id, 1); else sftp.data(id, bytes.subarray(offset, offset + length));
    });
    sftp.on("WRITE", (id: number, handle: Buffer, offset: number, data: Buffer) => {
      operations.push("MUTATION");
      const state = handles.get(handle.toString());
      if (!state?.writable) { sftp.status(id, 4); return; }
      const current = files.get(state.path) || Buffer.alloc(0);
      const end = offset + data.length;
      const next = Buffer.alloc(Math.max(current.length, end));
      current.copy(next);
      data.copy(next, offset);
      files.set(state.path, next);
      sftp.status(id, 0);
    });
    sftp.on("MKDIR", (id: number, p: string) => {
      operations.push("MUTATION");
      if (exists(p)) { sftp.status(id, 4); return; }
      if (!directory(parentOf(p))) { sftp.status(id, 2); return; }
      dirs.add(p);
      sftp.status(id, 0);
    });
    sftp.on("REMOVE", (id: number, p: string) => {
      operations.push("MUTATION");
      if (!files.has(p)) { sftp.status(id, 2); return; }
      files.delete(p);
      sftp.status(id, 0);
    });
    sftp.on("RMDIR", (id: number, p: string) => {
      operations.push("MUTATION");
      if (!directory(p) || p === "/" || p === "/server") { sftp.status(id, 4); return; }
      const prefix = `${p}/`;
      if ([...files.keys()].some((file) => file.startsWith(prefix)) || [...dirs].some((dir) => dir !== p && dir.startsWith(prefix))) {
        sftp.status(id, 4); return;
      }
      dirs.delete(p);
      sftp.status(id, 0);
    });
    sftp.on("RENAME", (id: number, from: string, to: string) => {
      operations.push("MUTATION");
      if (!files.has(from) || !directory(parentOf(to))) { sftp.status(id, 2); return; }
      files.set(to, files.get(from)!);
      files.delete(from);
      sftp.status(id, 0);
    });
    sftp.on("CLOSE", (id: number, handle: Buffer) => { handles.delete(handle.toString()); sftp.status(id, 0); });
    for (const event of ["SETSTAT", "FSETSTAT"]) sftp.on(event, (id: number) => { sftp.status(id, 0); });
    sftp.on("SYMLINK", (id: number) => { operations.push("MUTATION"); sftp.status(id, 3); });
  }
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (typeof address !== "object" || !address) throw new Error("No fixture address");
  const connection: InspectServerRequest["connection"] = { host: "127.0.0.1", port: address.port, username: "fixture", rootPath: "/server", knownHostFingerprint: fingerprint, auth: { type: "password", password: "local-fixture-only" } };
  return { connection, userKey, files, operations, setReadFault: (value: typeof readFault) => { readFault = value; },
    async close() { for (const client of clients) client.end(); await new Promise<void>((resolve) => server.close(() => resolve())); } };
}
