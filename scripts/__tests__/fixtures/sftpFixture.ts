import { Server, utils, type Connection, type SFTPWrapper } from "ssh2";
import { generateKeyPairSync, createHash } from "node:crypto";
import AdmZip from "adm-zip";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";

export function fixtureJar(id: string, version: string): Buffer {
  const zip = new AdmZip();
  zip.addFile("fabric.mod.json", Buffer.from(JSON.stringify({ schemaVersion: 1, id, name: id, version, environment: "*", depends: { minecraft: "1.20.1", fabricloader: ">=0.15.0" } })));
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
  const files = new Map<string, Buffer>([["/server/mods/example.jar", fixtureJar("example", "1.0.0")]]);
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
    const handles = new Map<string, { path: string; listed: boolean }>();
    const directory = (p: string) => ["/", "/server", "/server/mods"].includes(p);
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
      const entries = [...files.keys()].filter((p) => p.startsWith(`${state.path}/`) && !p.slice(state.path.length + 1).includes("/"));
      if (!entries.length) { sftp.status(id, 1); return; }
      sftp.name(id, entries.map((p) => ({ filename: p.slice(state.path.length + 1), longname: p, attrs: attrs(p) })));
    });
    sftp.on("OPEN", (id: number, p: string, flags: number) => {
      operations.push(flags === 1 ? "OPEN_READ" : "MUTATION");
      if (flags !== 1) { sftp.status(id, 3); return; }
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
    sftp.on("CLOSE", (id: number, handle: Buffer) => { handles.delete(handle.toString()); sftp.status(id, 0); });
    for (const event of ["WRITE", "REMOVE", "RMDIR", "MKDIR", "RENAME", "SETSTAT", "FSETSTAT", "SYMLINK"]) {
      sftp.on(event, (id: number) => { operations.push("MUTATION"); sftp.status(id, 3); });
    }
  }
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (typeof address !== "object" || !address) throw new Error("No fixture address");
  const connection: InspectServerRequest["connection"] = { host: "127.0.0.1", port: address.port, username: "fixture", rootPath: "/server", knownHostFingerprint: fingerprint, auth: { type: "password", password: "local-fixture-only" } };
  return { connection, userKey, files, operations, setReadFault: (value: typeof readFault) => { readFault = value; },
    async close() { for (const client of clients) client.end(); await new Promise<void>((resolve) => server.close(() => resolve())); } };
}
