/** Local-only, disposable SFTP + Next fixture. No real server or credentials required. */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import AdmZip from "adm-zip";
import { startSftpFixture, fixtureJar } from "../__tests__/fixtures/sftpFixture";

function fixtureClientOnlyJar(id: string, version: string): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    "fabric.mod.json",
    Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        id,
        name: id,
        version,
        environment: "client",
        depends: { minecraft: "1.20.1", fabricloader: ">=0.15.0" },
      })
    )
  );
  return zip.toBuffer();
}

async function writeAllUserZip(base: string, projectName: string): Promise<void> {
  const zip = new AdmZip();
  zip.addFile("mods/example.jar", fixtureJar("example", "2.0.0"));
  zip.addFile("mods/missing.jar", fixtureJar("missing", "1.0.0"));
  zip.addFile("mods/sodium.jar", fixtureClientOnlyJar("sodium", "0.5.8"));
  await fs.writeFile(path.join(base, `${projectName}_alluser.zip`), zip.toBuffer());
}

async function main() {
  const fixture = await startSftpFixture();
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "mim-server-ui-"));
  const mods = path.join(base, "Fixture_allhost", "mods");
  await fs.mkdir(mods, { recursive: true });
  await fs.writeFile(path.join(mods, "example.jar"), fixtureJar("example", "2.0.0"));
  await fs.writeFile(path.join(mods, "missing.jar"), fixtureJar("missing", "1.0.0"));
  await writeAllUserZip(base, "Fixture");
  const configPath = path.resolve(".server-fixture.json");
  await fs.writeFile(configPath, JSON.stringify({ connection: fixture.connection, project: { id: "fixture", name: "Fixture", version: "1.20.1", loader: "fabric" } }, null, 2));
  console.log(`Local fixture connection: ${configPath}`);
  console.log("Open http://127.0.0.1:3101/servers. Create project Fixture / 1.20.1 / fabric. AllHost + AllUser builds are prepared in a temp dir.");
  console.log("Commands: denied, disconnect, stall, none, quit");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3101"], {
    env: { ...process.env, MIM_BUILDS_BASE: base }, stdio: ["ignore", "inherit", "inherit"],
  });
  let closing = false;
  const cli = createInterface({ input: process.stdin });
  async function close() {
    if (closing) return;
    closing = true; cli.close(); child.kill();
    await fixture.close(); await fs.rm(base, { recursive: true, force: true });
    await fs.rm(configPath, { force: true });
  }
  cli.on("line", (line) => {
    if (line === "quit") void close();
    else if (line === "none" || line === "denied" || line === "disconnect" || line === "stall") {
      fixture.setReadFault(line); console.log(`SFTP read mode: ${line}`);
    }
  });
  child.on("exit", () => { void close(); });
  process.once("SIGINT", () => { void close(); });
  process.once("SIGTERM", () => { void close(); });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
