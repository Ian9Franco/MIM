import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import AdmZip from "adm-zip";
import { startSftpFixture, fixtureJar } from "./fixtures/sftpFixture";
import { applyClientSyncFromRemote } from "@/lib/server/applyClientSync";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";

function validInput(connection: InspectServerRequest["connection"]): InspectServerRequest {
  return {
    project: { name: "Fixture", version: "1.20.1", loader: "fabric" },
    runtime: { minecraftVersion: "1.20.1", loader: "fabric" },
    connection,
  };
}

async function writeAllUserZip(base: string, exampleVersion: string, includeMissing: boolean): Promise<void> {
  const zip = new AdmZip();
  zip.addFile("mods/example.jar", fixtureJar("example", exampleVersion));
  if (includeMissing) zip.addFile("mods/missing.jar", fixtureJar("missing", "1.0.0"));
  await fsp.writeFile(path.join(base, "Fixture_alluser.zip"), zip.toBuffer());
}

async function prepareSource(sourceBase: string): Promise<void> {
  const modsRoot = path.join(sourceBase, "_projects", "Fixture", "mods", ".essential", "librerias");
  await fsp.mkdir(modsRoot, { recursive: true });
  await fsp.writeFile(path.join(modsRoot, "example.jar"), fixtureJar("example", "1.0.0"));
}

async function run() {
  const fixture = await startSftpFixture();
  const buildsBase = await fsp.mkdtemp(path.join(os.tmpdir(), "mim-sync-apply-builds-"));
  const sourceBase = await fsp.mkdtemp(path.join(os.tmpdir(), "mim-sync-apply-source-"));
  const signal = () => AbortSignal.timeout(60000);
  const input = validInput(fixture.connection);

  try {
    await prepareSource(sourceBase);
    await writeAllUserZip(buildsBase, "9.9.9", false);

    const applied = await applyClientSyncFromRemote(input, buildsBase, signal(), sourceBase);
    assert.equal(applied.syncBefore.diff.status, "mismatched");
    assert.ok(applied.results.every((item) => item.success));
    assert.equal(applied.diffAfter?.status, "ready");
    assert.ok(fs.existsSync(path.join(sourceBase, "_projects", "Fixture", "mods", ".essential", "librerias", "example.jar")));
    assert.ok(fs.existsSync(path.join(buildsBase, "Fixture_alluser.zip")));
    console.log("✓ applyClientSyncFromRemote installs server mods and rebuilds alluser");
  } finally {
    await fixture.close();
    await fsp.rm(buildsBase, { recursive: true, force: true });
    await fsp.rm(sourceBase, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
