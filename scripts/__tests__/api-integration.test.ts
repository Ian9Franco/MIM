/**
 * SAGE Rescue API Integration Tests
 * 
 * Tests the actual HTTP endpoints:
 * - GET /api/sage/player-rescue/parse
 * - POST /api/sage/player-rescue/save
 * - DELETE /api/sage/player-rescue/purge-backups
 * 
 * This script requires the server to be running (npm run dev)
 */

import * as fs from "fs";
import * as path from "path";
import { readNBT, writeNBT, NBTTag, TagType } from "../../lib/modding/nbt";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(msg: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function createMockPlayerFile(): NBTTag {
  return {
    type: TagType.Compound,
    name: "",
    value: {
      Pos: {
        type: TagType.List,
        name: "Pos",
        value: { itemType: TagType.Double, list: [100.5, 64.0, 200.75] },
      },
      Dimension: {
        type: TagType.String,
        name: "Dimension",
        value: "minecraft:overworld",
      },
      SpawnX: { type: TagType.Int, name: "SpawnX", value: 100 },
      SpawnY: { type: TagType.Int, name: "SpawnY", value: 64 },
      SpawnZ: { type: TagType.Int, name: "SpawnZ", value: 200 },
      Health: { type: TagType.Float, name: "Health", value: 20.0 },
      Inventory: {
        type: TagType.List,
        name: "Inventory",
        value: {
          itemType: TagType.Compound,
          list: [
            {
              id: { type: TagType.String, name: "id", value: "minecraft:diamond_sword" },
              Count: { type: TagType.Byte, name: "Count", value: 1 },
              Slot: { type: TagType.Byte, name: "Slot", value: 0 },
            },
            {
              id: { type: TagType.String, name: "id", value: "minecraft:dirt" },
              Count: { type: TagType.Byte, name: "Count", value: 64 },
              Slot: { type: TagType.Byte, name: "Slot", value: 1 },
            },
          ],
        },
      },
    },
  };
}

async function createTestFile(testDir: string, filename: string): Promise<string> {
  const nbt = createMockPlayerFile();
  const buffer = await writeNBT(nbt, true); // Gzipped
  const filePath = path.join(testDir, filename);

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true });
    log(`✓ ${name}`, "green");
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    log(`✗ ${name}`, "red");
    log(`  Error: ${error.message}`, "red");
  }
}

async function testParseEndpoint(testDir: string) {
  await runTest("API: GET /api/sage/player-rescue/parse", async () => {
    const testFile = await createTestFile(testDir, "test-player.dat");

    const response = await fetch(
      `http://localhost:3000/api/sage/player-rescue/parse?filePath=${encodeURIComponent(testFile)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    if (!data.nbt) {
      throw new Error("NBT data not returned");
    }

    if (!data.playerData) {
      throw new Error("Player data not returned");
    }

    // Verify player data extraction
    const playerData = data.playerData;
    if (!Array.isArray(playerData.position) || playerData.position.length !== 3) {
      throw new Error("Player position not correctly extracted");
    }

    if (playerData.position[0] !== 100.5 || playerData.position[1] !== 64) {
      throw new Error("Coordinates not correctly parsed");
    }

    if (playerData.dimension !== "minecraft:overworld") {
      throw new Error("Dimension not correctly parsed");
    }

    if (playerData.inventorySize !== 2) {
      throw new Error("Inventory size not correctly parsed");
    }

    // Clean up
    fs.unlinkSync(testFile);
  });
}

async function testSaveEndpoint(testDir: string) {
  await runTest("API: POST /api/sage/player-rescue/save", async () => {
    const testFile = await createTestFile(testDir, "test-save.dat");

    // Read the file first
    const buf = fs.readFileSync(testFile);
    const nbt = await readNBT(buf);

    // Modify coordinates
    const rootValue = nbt.value as Record<string, NBTTag>;
    const posValue = rootValue["Pos"].value as { itemType: TagType; list: any[] };
    posValue.list[0] = 500.25;
    posValue.list[1] = 120.0;
    posValue.list[2] = 300.75;

    // Call save endpoint
    const response = await fetch(
      "http://localhost:3000/api/sage/player-rescue/save",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: testFile,
          nbtData: nbt,
          createBackup: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    // Verify backup was created
    const backupPath = `${testFile}.mim_bak`;
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not created");
    }

    // Verify file was modified
    const newBuf = fs.readFileSync(testFile);
    const newNBT = await readNBT(newBuf);
    const newRootValue = newNBT.value as Record<string, NBTTag>;
    const newPosValue = newRootValue["Pos"].value as { itemType: TagType; list: any[] };

    if (newPosValue.list[0] !== 500.25 || newPosValue.list[1] !== 120.0) {
      throw new Error("File not updated correctly");
    }

    // Clean up
    fs.unlinkSync(testFile);
    fs.unlinkSync(backupPath);
  });
}

async function testPurgeBackupsEndpoint(testDir: string) {
  await runTest("API: DELETE /api/sage/player-rescue/purge-backups", async () => {
    const testFile = await createTestFile(testDir, "test-purge.dat");

    // Create some backup files
    const uuid = path.basename(testFile).replace(".dat", "");
    const backupFiles = [
      `${testFile.replace(".dat", "")}-1234567890.dat`,
      `${testFile.replace(".dat", "")}-9876543210.dat`,
      `${testFile}.dat_old`,
    ];

    for (const bf of backupFiles) {
      fs.writeFileSync(bf, Buffer.from("fake backup data"));
    }

    // Call purge endpoint
    const response = await fetch(
      `http://localhost:3000/api/sage/player-rescue/purge-backups?filePath=${encodeURIComponent(testFile)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    if (data.count !== 3) {
      throw new Error(`Expected to delete 3 files, deleted ${data.count}`);
    }

    // Verify backups are deleted
    for (const bf of backupFiles) {
      if (fs.existsSync(bf)) {
        throw new Error(`Backup file not deleted: ${bf}`);
      }
    }

    // Clean up
    fs.unlinkSync(testFile);
  });
}

async function testParseExternalFile(testDir: string) {
  await runTest("API: Parse external .dat file (non-standard path)", async () => {
    const testFile = await createTestFile(testDir, "external-player.dat");

    const response = await fetch(
      `http://localhost:3000/api/sage/player-rescue/parse?filePath=${encodeURIComponent(testFile)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Parse failed: ${data.error}`);
    }

    // Should detect as "External File" world
    if (data.worldName !== "External File") {
      // Allow this to be either "External File" or "Unknown"
      if (data.worldName !== "Unknown") {
        throw new Error(`Unexpected world name: ${data.worldName}`);
      }
    }

    fs.unlinkSync(testFile);
  });
}

async function testProfileEndpoint(testDir: string) {
  await runTest("API: GET /api/sage/profile", async () => {
    const profileDir = path.join(testDir, "minecraft");
    const usercachePath = path.join(profileDir, "usercache.json");

    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      usercachePath,
      JSON.stringify([
        { name: "Ian", uuid: "a6a145e2-6b3f-46f6-9130-feda4cc535f0" },
      ], null, 2),
      "utf8"
    );

    const response = await fetch(
      `http://localhost:3000/api/sage/profile?minecraftDir=${encodeURIComponent(profileDir)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    if (data.profile?.username !== "Ian") {
      throw new Error(`Unexpected username: ${data.profile?.username}`);
    }

    if (!data.profile?.uuid?.startsWith("a6a145e2")) {
      throw new Error(`Unexpected UUID: ${data.profile?.uuid}`);
    }

    if (!data.profile?.avatarUrl?.includes("crafatar.com")) {
      throw new Error("Expected avatarUrl to use crafatar.com");
    }

    fs.unlinkSync(usercachePath);
    fs.rmdirSync(profileDir);
  });
}

async function testErrorHandling(testDir: string) {
  await runTest("API: Handle non-existent file gracefully", async () => {
    const response = await fetch(
      `http://localhost:3000/api/sage/player-rescue/parse?filePath=/nonexistent/file.dat`
    );

    if (response.ok) {
      throw new Error("Should return 404 for non-existent file");
    }

    const data = await response.json();
    if (!data.error) {
      throw new Error("Should return error message");
    }
  });
}

async function testBackupWarning(testDir: string) {
  await runTest("API: Warn when backup files are detected", async () => {
    const testFile = await createTestFile(testDir, "test-warning.dat");

    // Create a backup file
    const backupFile = `${testFile.replace(".dat", "")}-1234567890.dat`;
    fs.writeFileSync(backupFile, Buffer.from("fake backup"));

    const response = await fetch(
      `http://localhost:3000/api/sage/player-rescue/parse?filePath=${encodeURIComponent(testFile)}`
    );

    const data = await response.json();

    if (data.backupFiles.length !== 1) {
      throw new Error(`Expected 1 backup file, found ${data.backupFiles.length}`);
    }

    if (!data.warnings || data.warnings.length === 0) {
      throw new Error("Should include warning about backups");
    }

    // Clean up
    fs.unlinkSync(testFile);
    fs.unlinkSync(backupFile);
  });
}

async function testUuidUsernameResolution(testDir: string) {
  await runTest("API: Resolve UUID to username from local usercache.json", async () => {
    const uuidFilename = "a6a145e2-6b3f-46f6-9130-feda4cc535f0.dat";
    const testFile = await createTestFile(testDir, uuidFilename);

    const usercachePath = path.join(testDir, "usercache.json");
    const cacheEntries = [
      { name: "Ian", uuid: "a6a145e2-6b3f-46f6-9130-feda4cc535f0" },
    ];
    fs.writeFileSync(usercachePath, JSON.stringify(cacheEntries, null, 2), "utf8");

    const response = await fetch(
      `http://localhost:3000/api/sage/player-rescue/parse?filePath=${encodeURIComponent(testFile)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    if (data.username !== "Ian") {
      throw new Error(`Expected username Ian, got ${data.username}`);
    }

    if (data.displayName !== "Ian (a6a145e2-6b3f-46f6-9130-feda4cc535f0.dat)") {
      throw new Error(`Unexpected displayName: ${data.displayName}`);
    }

    fs.unlinkSync(testFile);
    fs.unlinkSync(usercachePath);
  });
}

async function runAllAPITests() {
  console.clear();
  log("╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  SAGE Rescue - API Integration Test Suite                      ║", "cyan");
  log("╚════════════════════════════════════════════════════════════════╝", "cyan");
  log("");

  // Check if server is running
  log("Checking if server is running (localhost:3000)...", "blue");
  try {
    const response = await fetch("http://localhost:3000/api/sage/player-rescue/parse?filePath=/test");
    // We expect an error, just checking if server responds
  } catch {
    log("");
    log("⚠️  Server is not running!", "red");
    log("Please start the dev server with: npm run dev", "yellow");
    log("");
    process.exit(1);
  }

  log("✓ Server is running", "green");
  log("");

  // Create temporary test directory
  const testDir = path.join(__dirname, "..", "tmp-test-nbt");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  try {
    log("Running API tests...", "blue");
    log("");

    await testParseEndpoint(testDir);
    await testSaveEndpoint(testDir);
    await testPurgeBackupsEndpoint(testDir);
    await testParseExternalFile(testDir);
    await testProfileEndpoint(testDir);
    await testUuidUsernameResolution(testDir);
    await testErrorHandling(testDir);
    await testBackupWarning(testDir);

    // Print summary
    log("");
    log("╔════════════════════════════════════════════════════════════════╗", "cyan");
    log("║  Test Results                                                  ║", "cyan");
    log("╚════════════════════════════════════════════════════════════════╝", "cyan");
    log("");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    for (const result of results) {
      const icon = result.passed ? "✓" : "✗";
      const color = result.passed ? "green" : "red";
      log(`${icon} ${result.name}`, color);
      if (result.error) {
        log(`  ${result.error}`, "yellow");
      }
    }

    log("");
    log(
      `Total: ${total} | Passed: ${passed} | Failed: ${failed}`,
      failed === 0 ? "green" : "red"
    );

    if (failed === 0) {
      log("");
      log("🎉 All API tests passed!", "green");
      log("✓ Parse endpoint works correctly", "green");
      log("✓ Save endpoint works correctly", "green");
      log("✓ Purge backups endpoint works correctly", "green");
      log("✓ Backup detection works correctly", "green");
      log("✓ Error handling works correctly", "green");
    } else {
      log("");
      log("⚠️  Some tests failed. Review errors above.", "red");
    }
  } finally {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testDir, file));
      }
      fs.rmdirSync(testDir);
    }
  }
}

// Run tests
runAllAPITests().catch((err) => {
  log(`Fatal error: ${err.message}`, "red");
  process.exit(1);
});
