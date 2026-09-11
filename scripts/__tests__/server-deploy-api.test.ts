import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { startSftpFixture, fixtureJar } from "./fixtures/sftpFixture";
import { deployServerSchema } from "@/lib/server/deploySchema";
import { deployServer } from "@/lib/server/deployServer";
import { inspectServer } from "@/lib/server/inspectServer";
import { countsFromDiff, isCompleteDeployableAudit } from "@/lib/server/deployEligibility";
import { openSftpWritableTransport } from "@/lib/server/transport/sftpWritableTransport";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";

function validInput(connection: InspectServerRequest["connection"], projectName = "Fixture"): InspectServerRequest {
  return { project: { name: projectName, version: "1.20.1", loader: "fabric" }, runtime: { minecraftVersion: "1.20.1", loader: "fabric" }, connection };
}

async function run() {
  const sample = validInput({
    host: "127.0.0.1", port: 22, username: "fixture", rootPath: "/server",
    knownHostFingerprint: `SHA256:${"A".repeat(43)}`, auth: { type: "password", password: "x" },
  });
  assert(!deployServerSchema.safeParse({ ...sample, project: { ...sample.project, name: "../escape" } }).success);
  assert(!deployServerSchema.safeParse(sample).success, "Deploy requires explicit confirm");
  assert(deployServerSchema.safeParse({ ...sample, confirm: true }).success);
  console.log("✓ Deploy schema rejects traversal and requires confirm");

  const { POST } = await import("@/app/api/server/deploy/route");
  const runtimeBefore = process.env.MIM_DESKTOP_RUNTIME;
  process.env.MIM_DESKTOP_RUNTIME = "1";
  const request = (origin: string) => new Request("http://localhost:3101/api/server/deploy", {
    method: "POST", headers: { host: "127.0.0.1:3101", origin, "Content-Type": "application/json" },
    body: JSON.stringify({ ...sample, confirm: true, project: { ...sample.project, name: `missing-${Date.now()}` } }),
  });
  try {
    assert.equal((await POST(request("https://untrusted.example"))).status, 403);
    assert.equal((await POST(request("http://127.0.0.1:3101"))).status, 422);
  } finally {
    if (runtimeBefore === undefined) delete process.env.MIM_DESKTOP_RUNTIME;
    else process.env.MIM_DESKTOP_RUNTIME = runtimeBefore;
  }
  console.log("✓ HTTP deploy guard rejects cross-origin calls");

  const fixture = await startSftpFixture();
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "mim-sftp-deploy-"));
  const signal = () => AbortSignal.timeout(30000);
  const input = validInput(fixture.connection);
  try {
    const mods = path.join(base, "Fixture_allhost", "mods");
    await fs.mkdir(mods, { recursive: true });
    await fs.writeFile(path.join(mods, "example.jar"), fixtureJar("example", "2.0.0"));
    await fs.writeFile(path.join(mods, "missing.jar"), fixtureJar("missing", "1.0.0"));

    const audit = await inspectServer(input, base, signal());
    assert.equal(audit.isPartialAudit, false);
    assert.ok(audit.report);
    assert.equal(isCompleteDeployableAudit(audit), true);
    assert.deepEqual(countsFromDiff(audit.report.diff), { install: 1, replace: 1, remove: 0, config: 0, manualReview: 0 });
    assert(!fixture.operations.includes("MUTATION"));
    console.log("✓ Complete audit is deployable and still read-only");

    fixture.setReadFault("denied");
    const partial = await inspectServer(input, base, signal());
    assert.equal(isCompleteDeployableAudit(partial), false);
    await assert.rejects(deployServer({ ...input, confirm: true }, base, signal()), /inventario incompleto|auditoría/);
    fixture.setReadFault("none");
    console.log("✓ Partial audit cannot authorize deploy");

    const writable = await openSftpWritableTransport(input.connection, signal());
    try {
      await assert.rejects(writable.transport.write("../outside.jar", new Uint8Array([1])), /excede/);
    } finally { writable.close(); }

    const result = await deployServer({ ...input, confirm: true }, base, signal());
    assert.equal(result.deployment.status, "completed");
    assert.equal(result.plan.counts.install, 1);
    assert.equal(result.plan.counts.replace, 1);
    assert.ok(fixture.files.has("/server/mods/missing.jar"));
    assert(fixture.operations.includes("MUTATION"));
    assert(!JSON.stringify(result).includes("local-fixture-only"));
    const after = await inspectServer(input, base, signal());
    assert.equal(after.isPartialAudit, false);
    assert.equal(after.report?.summary.missingFromServer, 0);
    assert.equal(after.report?.summary.updatesRequired, 0);
    console.log("✓ Writable SFTP deploy installs and replaces JARs without leaking secrets");
  } finally { await fixture.close(); await fs.rm(base, { recursive: true, force: true }); }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
