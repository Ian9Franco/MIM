import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import AdmZip from "adm-zip";
import { startSftpFixture, fixtureJar } from "./fixtures/sftpFixture";
import { syncClientWithRemoteServer } from "@/lib/server/multiplayerServer";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";

function validInput(connection: InspectServerRequest["connection"]): InspectServerRequest {
  return {
    project: { name: "Fixture", version: "1.20.1", loader: "fabric" },
    runtime: { minecraftVersion: "1.20.1", loader: "fabric" },
    connection,
  };
}

async function writeAllUserZip(base: string): Promise<void> {
  const zip = new AdmZip();
  zip.addFile("mods/example.jar", fixtureJar("example", "2.0.0"));
  zip.addFile("mods/missing.jar", fixtureJar("missing", "1.0.0"));
  await fs.writeFile(path.join(base, "Fixture_alluser.zip"), zip.toBuffer());
}

async function run() {
  const { POST } = await import("@/app/api/server/sync/route");
  const runtimeBefore = process.env.MIM_DESKTOP_RUNTIME;
  process.env.MIM_DESKTOP_RUNTIME = "1";
  const sample = validInput({
    host: "127.0.0.1",
    port: 22,
    username: "fixture",
    rootPath: "/server",
    knownHostFingerprint: `SHA256:${"A".repeat(43)}`,
    auth: { type: "password", password: "x" },
  });
  const request = (origin: string) =>
    new Request("http://127.0.0.1:3101/api/server/sync", {
      method: "POST",
      headers: { host: "127.0.0.1:3101", origin, "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });
  try {
    assert.equal((await POST(request("https://untrusted.example"))).status, 403);
    assert.equal((await POST(request("http://127.0.0.1:3101"))).status, 422);
  } finally {
    if (runtimeBefore === undefined) delete process.env.MIM_DESKTOP_RUNTIME;
    else process.env.MIM_DESKTOP_RUNTIME = runtimeBefore;
  }
  console.log("✓ HTTP sync guard rejects cross-origin calls");

  const fixture = await startSftpFixture();
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "mim-server-sync-"));
  const signal = () => AbortSignal.timeout(30000);
  const input = validInput(fixture.connection);
  try {
    const mods = path.join(base, "Fixture_allhost", "mods");
    await fs.mkdir(mods, { recursive: true });
    await fs.writeFile(path.join(mods, "example.jar"), fixtureJar("example", "2.0.0"));
    await fs.writeFile(path.join(mods, "missing.jar"), fixtureJar("missing", "1.0.0"));
    await writeAllUserZip(base);

    const result = await syncClientWithRemoteServer(input, base, signal());
    assert.equal(result.diff.status, "mismatched");
    assert.equal(result.diff.versionMismatches.length, 1);
    assert.equal(result.diff.versionMismatches[0].required.identity, "example");
    assert.equal(result.distributable.requiredMods.some((mod) => mod.identity === "example"), true);
    assert(!JSON.stringify(result).includes("local-fixture-only"));
    console.log("✓ Multiplayer sync detects remote/client hash mismatch");
  } finally {
    await fixture.close();
    await fs.rm(base, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
