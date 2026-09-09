import assert from "node:assert/strict";
import AdmZip from "adm-zip";
import {
  discoverRemoteServerState,
  isWritableTransport,
  parseServerProperties,
  safeResolveRemotePath,
  sanitizeSftpConfig,
  type ReadOnlyFileTransport,
  type RemoteFileEntry,
  type SftpConnectionConfig,
} from "@/lib/server";

function createMockModJarBuffer(modId: string, modName: string, version: string): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    "fabric.mod.json",
    Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        id: modId,
        version,
        name: modName,
        environment: "server",
        depends: { fabricloader: ">=0.15.0" },
      })
    )
  );
  return zip.toBuffer();
}

class MockSftpReadTransport implements ReadOnlyFileTransport {
  private files = new Map<string, Buffer>();
  public readCount = 0;
  public listCount = 0;

  constructor() {
    // Populate fixture server filesystem
    this.files.set(
      "/server/mods/fabric-api-0.92.0.jar",
      createMockModJarBuffer("fabric-api", "Fabric API", "0.92.0")
    );
    this.files.set(
      "/server/mods/sodium-0.5.8.jar",
      createMockModJarBuffer("sodium", "Sodium", "0.5.8")
    );
    this.files.set(
      "/server/server.properties",
      Buffer.from(
        [
          "# Minecraft server properties",
          "motd=Production Fabric Server",
          "server-port=25565",
          "online-mode=true",
          "max-players=20",
        ].join("\n")
      )
    );
    this.files.set("/server/logs/latest.log", Buffer.from("[00:00:00] [Server thread/INFO]: Starting Minecraft server\n"));
  }

  async list(remotePath: string): Promise<RemoteFileEntry[]> {
    this.listCount++;
    const normalized = remotePath.replace(/\\/g, "/").replace(/\/$/, "");
    const results: RemoteFileEntry[] = [];

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalized + "/")) {
        const relative = filePath.slice(normalized.length + 1);
        if (!relative.includes("/")) {
          results.push({
            name: relative,
            path: filePath,
            kind: "file",
            size: this.files.get(filePath)?.length,
          });
        }
      }
    }
    return results;
  }

  async read(remotePath: string): Promise<Uint8Array> {
    this.readCount++;
    const normalized = remotePath.replace(/\\/g, "/");
    const content = this.files.get(normalized);
    if (!content) {
      throw new Error(`[MockSFTP] Remote file not found: ${remotePath}`);
    }
    return content;
  }
}

async function testRemoteDiscovery(): Promise<void> {
  const transport = new MockSftpReadTransport();

  assert.equal(isWritableTransport(transport), false, "Transport must be recognized as read-only");

  const result = await discoverRemoteServerState(transport, {
    rootPath: "/server",
    modsDir: "mods",
    scanServerProperties: true,
  });

  assert.equal(result.totalJarFiles, 2);
  assert.equal(result.manifest.side, "server");
  assert.equal(result.manifest.metadata?.displayName, "Production Fabric Server");
  assert.equal(result.manifest.mods.length, 2);
  assert.ok(result.manifest.mods.some((m) => m.modId === "fabric-api"));
  assert.ok(result.manifest.mods.some((m) => m.modId === "sodium"));
  assert.equal(result.serverProperties?.["server-port"], "25565");
  assert.equal(result.serverProperties?.["online-mode"], "true");
  assert.ok(result.durationMs >= 0);

  console.log("✔ Remote server state discovery passed");
}

async function testSecurityPathTraversal(): Promise<void> {
  // 1. Safe paths
  assert.equal(safeResolveRemotePath("/server", "mods"), "/server/mods");
  assert.equal(safeResolveRemotePath("/server/mods", "fabric.jar"), "/server/mods/fabric.jar");

  // 2. Traversal attacks must be rejected
  assert.throws(
    () => safeResolveRemotePath("/server", "../etc/passwd"),
    /Path traversal attempt detected/
  );
  assert.throws(
    () => safeResolveRemotePath("/server/mods", "../../config/secret.json"),
    /Path traversal attempt detected/
  );

  console.log("✔ Path traversal security checks passed");
}

async function testPropertiesParsing(): Promise<void> {
  const rawProps = `
# Comment line
! Another comment
server-port = 25565
motd=My Cool Server = Best
white-list=false
`;
  const parsed = parseServerProperties(rawProps);
  assert.equal(parsed.properties["server-port"], "25565");
  assert.equal(parsed.properties["motd"], "My Cool Server = Best");
  assert.equal(parsed.properties["white-list"], "false");
  assert.equal(parsed.properties["# Comment line"], undefined);

  console.log("✔ Server properties parser passed");
}

async function testConfigSanitization(): Promise<void> {
  const config: SftpConnectionConfig = {
    host: "sftp.example.com",
    port: 2022,
    username: "mcadmin",
    auth: {
      type: "password",
      password: "super_secret_ssh_password",
    },
    knownHostFingerprint: "SHA256:abc123xyz",
  };

  const sanitized = sanitizeSftpConfig(config);
  assert.equal(sanitized.host, "sftp.example.com");
  assert.equal(sanitized.username, "mcadmin");
  assert.equal(sanitized.authType, "password");
  assert.equal("password" in sanitized, false, "Password must not be in sanitized config");

  console.log("✔ SFTP config sanitization passed");
}

async function testAbortSignalCancellation(): Promise<void> {
  const transport = new MockSftpReadTransport();
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await discoverRemoteServerState(transport, {
        rootPath: "/server",
        signal: controller.signal,
      });
    },
    (err: unknown) => {
      return (err as Error).name === "AbortError";
    }
  );

  console.log("✔ AbortSignal cancellation passed");
}

async function run(): Promise<void> {
  console.log("Starting SFTP read transport and server discovery test suite...");
  await testRemoteDiscovery();
  await testSecurityPathTraversal();
  await testPropertiesParsing();
  await testConfigSanitization();
  await testAbortSignalCancellation();
  console.log("\nAll SFTP read transport tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
