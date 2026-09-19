import assert from "node:assert/strict";
import type { ReadOnlyFileTransport, RemoteFileEntry } from "@mim/contracts-core/server";
import { probeServerProcess } from "@mim/server-engine/processProbe";

function memoryTransport(files: Record<string, Uint8Array>, dirs: Record<string, RemoteFileEntry[]>): ReadOnlyFileTransport {
  return {
    async list(remotePath) {
      const entries = dirs[remotePath.replace(/\\/g, "/")];
      if (!entries) throw new Error("missing dir");
      return entries;
    },
    async read(remotePath) {
      const bytes = files[remotePath.replace(/\\/g, "/")];
      if (!bytes) throw new Error("missing file");
      return bytes;
    },
  };
}

async function run() {
  const online = await probeServerProcess(
    memoryTransport(
      { "world/session.lock": new Uint8Array([1, 2, 3]) },
      {}
    )
  );
  assert.equal(online.status, "online");
  assert.equal(online.controllable, false);
  assert.equal(online.lockPath, "world/session.lock");

  const offline = await probeServerProcess(
    memoryTransport(
      {},
      { world: [{ path: "world/level.dat", name: "level.dat", kind: "file", size: 12 }] }
    )
  );
  assert.equal(offline.status, "offline");

  const unknown = await probeServerProcess(memoryTransport({}, {}));
  assert.equal(unknown.status, "unknown");
  console.log("✓ process probe infers online/offline/unknown from session.lock");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
