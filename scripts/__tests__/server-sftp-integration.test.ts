import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { startSftpFixture, fixtureJar } from "./fixtures/sftpFixture";
import { openSftpReadTransport } from "@/lib/server/transport/sftpReadTransport";
import { inspectServer } from "@/lib/server/inspectServer";
import { inspectServerSchema, type InspectServerRequest } from "@/lib/server/inspectSchema";

async function run() {
  const fixture = await startSftpFixture();
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "mim-sftp-audit-"));
  const signal = () => AbortSignal.timeout(15000);
  const input: InspectServerRequest = { project: { name: "Fixture", version: "1.20.1", loader: "fabric" }, runtime: { minecraftVersion: "1.20.1", loader: "fabric" }, connection: fixture.connection };
  try {
    const mods = path.join(base, "Fixture_allhost", "mods");
    await fs.mkdir(mods, { recursive: true });
    await fs.writeFile(path.join(mods, "example.jar"), fixtureJar("example", "2.0.0"));
    await fs.writeFile(path.join(mods, "missing.jar"), fixtureJar("missing", "1.0.0"));
    const before = new Map(fixture.files);
    const report = await inspectServer(input, base, signal());
    assert.equal(report.isPartialAudit, false);
    assert.ok(report.report);
    assert.equal(report.report.summary.updatesRequired, 1);
    assert.equal(report.report.summary.missingFromServer, 1);
    assert.equal(report.report.summary.validationErrors, 0, "Platform dependencies are not missing JARs");
    assert.deepEqual(fixture.files, before);
    assert(!fixture.operations.includes("MUTATION"));
    assert(!JSON.stringify(report).includes("local-fixture-only"));
    console.log("✓ Real SFTP audit: version/missing differences, no writes or secrets");

    await assert.rejects(openSftpReadTransport({ ...input.connection, knownHostFingerprint: `SHA256:${"A".repeat(43)}` }, signal()), /huella/);
    await assert.rejects(openSftpReadTransport({ ...input.connection, auth: { type: "password", password: "wrong" } }, signal()), /conexión/);
    const keySession = await openSftpReadTransport({ ...input.connection, auth: { type: "privateKey", privateKey: fixture.userKey } }, signal());
    try { assert.equal((await keySession.transport.list("/mods")).length, 1); } finally { keySession.close(); }
    const session = await openSftpReadTransport(input.connection, signal());
    try {
      await assert.rejects(session.transport.read("../outside.jar"), /excede/);
      await assert.rejects(session.transport.read("/mods/escape.jar"), /enlace/);
      await assert.rejects(session.transport.read("/mods/absent.jar"), { code: "ENOENT" });
    } finally { session.close(); }
    console.log("✓ Host identity, credentials, path containment and absence errors");

    fixture.setReadFault("denied");
    const partial = await inspectServer(input, base, signal());
    assert.equal(partial.isPartialAudit, true);
    assert.equal(partial.report, null);
    assert(partial.warnings.length > 0);
    fixture.setReadFault("disconnect");
    const disconnected = await inspectServer(input, base, signal());
    assert.equal(disconnected.isPartialAudit, true);
    fixture.setReadFault("stall");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    try { await assert.rejects(inspectServer(input, base, controller.signal)); } finally { clearTimeout(timer); }
    console.log("✓ Permissions, disconnect and cancellation cannot certify a complete audit");
    assert(!inspectServerSchema.safeParse({ ...input, project: { ...input.project, name: "../escape" } }).success);
    console.log("✓ Request schema rejects project path traversal");
    const { POST } = await import("@/app/api/server/inspect/route");
    const runtimeBefore = process.env.MIM_DESKTOP_RUNTIME;
    process.env.MIM_DESKTOP_RUNTIME = "1";
    const request = (origin: string) => new Request("http://localhost:3101/api/server/inspect", {
      method: "POST", headers: { host: "127.0.0.1:3101", origin, "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, project: { ...input.project, name: `missing-${Date.now()}` } }),
    });
    try {
      assert.equal((await POST(request("https://untrusted.example"))).status, 403);
      assert.equal((await POST(request("http://127.0.0.1:3101"))).status, 422, "Host/origin agreement survives Next URL normalization");
    } finally {
      if (runtimeBefore === undefined) delete process.env.MIM_DESKTOP_RUNTIME;
      else process.env.MIM_DESKTOP_RUNTIME = runtimeBefore;
    }
    console.log("✓ HTTP guard rejects cross-origin calls and accepts normalized loopback origins");
  } finally { await fixture.close(); await fs.rm(base, { recursive: true, force: true }); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
