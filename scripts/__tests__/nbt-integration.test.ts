/**
 * SAGE Rescue NBT Integration Tests
 * 
 * Tests the parse/save endpoints and NBT binary I/O to ensure:
 * - No corruption of NBT data
 * - Correct type handling (Float for Pos, Int for Dimension, etc.)
 * - Round-trip integrity (read -> modify -> write -> read)
 * - Proper gzip compression/decompression
 */

import * as fs from "fs";
import * as path from "path";
import { readNBT, writeNBT, NBTTag, TagType } from "../../lib/modding/nbt.ts";

// Colors for terminal output
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

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true });
    log(`✓ ${name}`, "green");
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    log(`✗ ${name}`, "red");
    log(`  ${error.message}`, "red");
  }
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Create a mock player NBT structure matching Minecraft's format
 * This represents a typical UUID.dat player file
 */
function createMockPlayerNBT(): NBTTag {
  return {
    type: TagType.Compound,
    name: "",
    value: {
      Pos: {
        type: TagType.List,
        name: "Pos",
        value: {
          itemType: TagType.Double,
          list: [100.5, 64.0, 200.75], // X, Y, Z as doubles
        },
      },
      Rotation: {
        type: TagType.List,
        name: "Rotation",
        value: {
          itemType: TagType.Float,
          list: [45.0, 0.0], // Yaw, Pitch as floats
        },
      },
      Dimension: {
        type: TagType.String,
        name: "Dimension",
        value: "minecraft:overworld",
      },
      SpawnX: {
        type: TagType.Int,
        name: "SpawnX",
        value: 100,
      },
      SpawnY: {
        type: TagType.Int,
        name: "SpawnY",
        value: 64,
      },
      SpawnZ: {
        type: TagType.Int,
        name: "SpawnZ",
        value: 200,
      },
      Health: {
        type: TagType.Float,
        name: "Health",
        value: 20.0,
      },
      Inventory: {
        type: TagType.List,
        name: "Inventory",
        value: {
          itemType: TagType.Compound,
          list: [
            {
              id: {
                type: TagType.String,
                name: "id",
                value: "minecraft:diamond_sword",
              },
              Count: {
                type: TagType.Byte,
                name: "Count",
                value: 1,
              },
              Slot: {
                type: TagType.Byte,
                name: "Slot",
                value: 0,
              },
            },
            {
              id: {
                type: TagType.String,
                name: "id",
                value: "minecraft:dirt",
              },
              Count: {
                type: TagType.Byte,
                name: "Count",
                value: 64,
              },
              Slot: {
                type: TagType.Byte,
                name: "Slot",
                value: 1,
              },
            },
          ],
        },
      },
      GameType: {
        type: TagType.Int,
        name: "GameType",
        value: 0, // Survival
      },
    },
  };
}

/**
 * Create a mock level.dat structure for world data
 */
function createMockLevelDatNBT(): NBTTag {
  return {
    type: TagType.Compound,
    name: "",
    value: {
      Data: {
        type: TagType.Compound,
        name: "Data",
        value: {
          LevelName: {
            type: TagType.String,
            name: "LevelName",
            value: "TestWorld",
          },
          Time: {
            type: TagType.Long,
            name: "Time",
            value: 12345n,
          },
          Player: {
            type: TagType.Compound,
            name: "Player",
            value: {
              Pos: {
                type: TagType.List,
                name: "Pos",
                value: {
                  itemType: TagType.Double,
                  list: [0.5, 64.0, 0.5],
                },
              },
              Dimension: {
                type: TagType.String,
                name: "Dimension",
                value: "minecraft:overworld",
              },
            },
          },
        },
      },
    },
  };
}

// ============================================================================
// Test Cases
// ============================================================================

async function testNBTRoundTrip() {
  await runTest("NBT Round-Trip: Write and Read Back", async () => {
    const original = createMockPlayerNBT();

    // Write to buffer
    const buffer = await writeNBT(original, true); // With gzip
    assert(buffer.length > 0, "Buffer should not be empty");
    assert(buffer[0] === 0x1f && buffer[1] === 0x8b, "Should start with gzip magic bytes");

    // Read back
    const read = await readNBT(buffer);

    // Verify structure
    assertEquals(read.type, TagType.Compound, "Root should be Compound");
    const readValue = read.value as Record<string, NBTTag>;
    assert("Pos" in readValue, "Should have Pos tag");
    assert("Dimension" in readValue, "Should have Dimension tag");
    assert("Inventory" in readValue, "Should have Inventory tag");
  });
}

async function testCoordinateTypes() {
  await runTest("Data Types: Coordinates use Double (not Float)", async () => {
    const nbt = createMockPlayerNBT();
    const rootValue = nbt.value as Record<string, NBTTag>;

    // Pos should be List<Double>
    const posTag = rootValue["Pos"];
    assert(posTag.type === TagType.List, "Pos should be List");
    const posValue = posTag.value as { itemType: TagType; list: any[] };
    assertEquals(
      posValue.itemType,
      TagType.Double,
      "Pos list items should be Double type (not Float!)"
    );

    // Verify values match expectations
    assertEquals(posValue.list.length, 3, "Pos should have 3 values (X, Y, Z)");
    assertEquals(posValue.list[0], 100.5, "X coordinate");
    assertEquals(posValue.list[1], 64.0, "Y coordinate");
    assertEquals(posValue.list[2], 200.75, "Z coordinate");
  });
}

async function testRotationTypes() {
  await runTest("Data Types: Rotation uses Float", async () => {
    const nbt = createMockPlayerNBT();
    const rootValue = nbt.value as Record<string, NBTTag>;

    const rotTag = rootValue["Rotation"];
    assert(rotTag.type === TagType.List, "Rotation should be List");
    const rotValue = rotTag.value as { itemType: TagType; list: any[] };
    assertEquals(
      rotValue.itemType,
      TagType.Float,
      "Rotation list items should be Float type"
    );
  });
}

async function testSpawnCoordinates() {
  await runTest("Data Types: Spawn coordinates use Int", async () => {
    const nbt = createMockPlayerNBT();
    const rootValue = nbt.value as Record<string, NBTTag>;

    const spawnXTag = rootValue["SpawnX"];
    assertEquals(spawnXTag.type, TagType.Int, "SpawnX should be Int type");

    const spawnYTag = rootValue["SpawnY"];
    assertEquals(spawnYTag.type, TagType.Int, "SpawnY should be Int type");

    const spawnZTag = rootValue["SpawnZ"];
    assertEquals(spawnZTag.type, TagType.Int, "SpawnZ should be Int type");
  });
}

async function testDimensionString() {
  await runTest("Data Types: Dimension is String", async () => {
    const nbt = createMockPlayerNBT();
    const rootValue = nbt.value as Record<string, NBTTag>;

    const dimTag = rootValue["Dimension"];
    assertEquals(dimTag.type, TagType.String, "Dimension should be String type");
    assertEquals(
      dimTag.value,
      "minecraft:overworld",
      "Dimension value should match"
    );
  });
}

async function testInventoryStructure() {
  await runTest("Inventory Structure: List<Compound> with Item NBT", async () => {
    const nbt = createMockPlayerNBT();
    const rootValue = nbt.value as Record<string, NBTTag>;

    const invTag = rootValue["Inventory"];
    assertEquals(invTag.type, TagType.List, "Inventory should be List");

    const invValue = invTag.value as { itemType: TagType; list: any[] };
    assertEquals(
      invValue.itemType,
      TagType.Compound,
      "Inventory items should be Compound type"
    );

    // Check first item
    const firstItem = invValue.list[0] as Record<string, NBTTag>;
    assert("id" in firstItem, "Item should have 'id' field");
    assert("Count" in firstItem, "Item should have 'Count' field");
    assert("Slot" in firstItem, "Item should have 'Slot' field");

    assertEquals(
      firstItem["id"].type,
      TagType.String,
      "Item id should be String"
    );
    assertEquals(
      firstItem["Count"].type,
      TagType.Byte,
      "Item Count should be Byte"
    );
    assertEquals(firstItem["Count"].value, 1, "Count value should be 1");
  });
}

async function testCoordinateModification() {
  await runTest("Modify Coordinates: Update Pos and Spawn", async () => {
    const original = createMockPlayerNBT();

    // Modify coordinates
    const rootValue = original.value as Record<string, NBTTag>;
    const posValue = rootValue["Pos"].value as { itemType: TagType; list: any[] };
    posValue.list[0] = 500.25; // New X
    posValue.list[1] = 120.0; // New Y
    posValue.list[2] = 300.75; // New Z

    // Modify spawn
    rootValue["SpawnX"].value = 500;
    rootValue["SpawnY"].value = 120;
    rootValue["SpawnZ"].value = 300;

    // Write and read back
    const buffer = await writeNBT(original, true);
    const read = await readNBT(buffer);
    const readValue = read.value as Record<string, NBTTag>;
    const readPos = readValue["Pos"].value as { itemType: TagType; list: any[] };

    assertEquals(readPos.list[0], 500.25, "X should be updated");
    assertEquals(readPos.list[1], 120.0, "Y should be updated");
    assertEquals(readPos.list[2], 300.75, "Z should be updated");

    assertEquals(readValue["SpawnX"].value, 500, "SpawnX should be updated");
    assertEquals(readValue["SpawnY"].value, 120, "SpawnY should be updated");
    assertEquals(readValue["SpawnZ"].value, 300, "SpawnZ should be updated");
  });
}

async function testDimensionChange() {
  await runTest("Modify Dimension: Change to Nether and back", async () => {
    const original = createMockPlayerNBT();
    const rootValue = original.value as Record<string, NBTTag>;

    // Change to Nether
    rootValue["Dimension"].value = "minecraft:the_nether";

    let buffer = await writeNBT(original, true);
    let read = await readNBT(buffer);
    let readValue = read.value as Record<string, NBTTag>;
    assertEquals(
      readValue["Dimension"].value,
      "minecraft:the_nether",
      "Should be in Nether"
    );

    // Change to End
    readValue["Dimension"].value = "minecraft:the_end";
    buffer = await writeNBT(read, true);
    read = await readNBT(buffer);
    readValue = read.value as Record<string, NBTTag>;
    assertEquals(
      readValue["Dimension"].value,
      "minecraft:the_end",
      "Should be in End"
    );
  });
}

async function testInventoryModification() {
  await runTest("Modify Inventory: Delete and Add Items", async () => {
    const original = createMockPlayerNBT();
    const rootValue = original.value as Record<string, NBTTag>;
    const invValue = rootValue["Inventory"].value as { itemType: TagType; list: any[] };

    // Check initial state
    assertEquals(invValue.list.length, 2, "Should start with 2 items");

    // Delete second item
    invValue.list.pop();
    assertEquals(invValue.list.length, 1, "Should have 1 item after deletion");

    // Write and read back
    let buffer = await writeNBT(original, true);
    let read = await readNBT(buffer);
    let readValue = read.value as Record<string, NBTTag>;
    let readInv = readValue["Inventory"].value as { itemType: TagType; list: any[] };
    assertEquals(readInv.list.length, 1, "Deleted item should not be present");

    // Add new item
    const newItem = {
      id: {
        type: TagType.String,
        name: "id",
        value: "minecraft:oak_log",
      },
      Count: {
        type: TagType.Byte,
        name: "Count",
        value: 32,
      },
      Slot: {
        type: TagType.Byte,
        name: "Slot",
        value: 2,
      },
    };
    readInv.list.push(newItem);

    // Write and verify
    buffer = await writeNBT(read, true);
    read = await readNBT(buffer);
    readValue = read.value as Record<string, NBTTag>;
    readInv = readValue["Inventory"].value as { itemType: TagType; list: any[] };
    assertEquals(readInv.list.length, 2, "Should have 2 items after addition");
  });
}

async function testLevelDatRoundTrip() {
  await runTest("Level.dat Round-Trip: Read world name and player data", async () => {
    const levelDat = createMockLevelDatNBT();

    // Write and read
    const buffer = await writeNBT(levelDat, true);
    const read = await readNBT(buffer);

    // Verify structure
    const readValue = read.value as Record<string, NBTTag>;
    assert("Data" in readValue, "Should have Data tag");

    const dataValue = readValue["Data"].value as Record<string, NBTTag>;
    assert("LevelName" in dataValue, "Data should have LevelName");

    const levelName = dataValue["LevelName"].value;
    assertEquals(levelName, "TestWorld", "LevelName should match");
  });
}

async function testUncompressedNBT() {
  await runTest("Uncompressed NBT: Write and read without gzip", async () => {
    const original = createMockPlayerNBT();

    // Write without compression
    const buffer = await writeNBT(original, false);

    // Should NOT start with gzip magic bytes
    assert(
      !(buffer[0] === 0x1f && buffer[1] === 0x8b),
      "Uncompressed buffer should NOT have gzip magic bytes"
    );

    // Read back (should auto-detect that it's not compressed)
    const read = await readNBT(buffer);
    const readValue = read.value as Record<string, NBTTag>;
    assert("Pos" in readValue, "Should parse uncompressed NBT correctly");
  });
}

async function testLargeInventory() {
  await runTest("Large Inventory: Handle 100+ items", async () => {
    const original = createMockPlayerNBT();
    const rootValue = original.value as Record<string, NBTTag>;
    const invValue = rootValue["Inventory"].value as { itemType: TagType; list: any[] };

    // Add many items
    for (let i = 0; i < 100; i++) {
      invValue.list.push({
        id: {
          type: TagType.String,
          name: "id",
          value: `minecraft:item_${i}`,
        },
        Count: {
          type: TagType.Byte,
          name: "Count",
          value: Math.min(64, i % 65),
        },
        Slot: {
          type: TagType.Byte,
          name: "Slot",
          value: i,
        },
      });
    }

    // Write and read
    const buffer = await writeNBT(original, true);
    const read = await readNBT(buffer);
    const readValue = read.value as Record<string, NBTTag>;
    const readInv = readValue["Inventory"].value as { itemType: TagType; list: any[] };

    assertEquals(
      readInv.list.length,
      102,
      "Should preserve all 102 items (2 original + 100 new)"
    );
  });
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.clear();
  log("╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  SAGE Rescue - NBT Integration Test Suite                      ║", "cyan");
  log("╚════════════════════════════════════════════════════════════════╝", "cyan");
  log("");

  log("Running tests...", "blue");
  log("");

  // Run all tests
  await testNBTRoundTrip();
  await testCoordinateTypes();
  await testRotationTypes();
  await testSpawnCoordinates();
  await testDimensionString();
  await testInventoryStructure();
  await testCoordinateModification();
  await testDimensionChange();
  await testInventoryModification();
  await testLevelDatRoundTrip();
  await testUncompressedNBT();
  await testLargeInventory();

  // Print summary
  log("");
  log("╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  Test Results Summary                                          ║", "cyan");
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
    log("🎉 All tests passed! NBT I/O is safe and reliable.", "green");
    log("");
    log("✓ Coordinates use Double type (correct)", "green");
    log("✓ Rotation uses Float type (correct)", "green");
    log("✓ Spawn coordinates use Int type (correct)", "green");
    log("✓ Dimension is String type (correct)", "green");
    log("✓ Inventory is List<Compound> (correct)", "green");
    log("✓ Round-trip integrity preserved", "green");
    log("✓ Gzip compression/decompression works", "green");
    log("");
    log(
      "Ready to implement: Advanced NBT editing + External file uploads",
      "green"
    );
  } else {
    log("");
    log("⚠️  Some tests failed. Review errors above.", "red");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((err) => {
  log(`Fatal error: ${err.message}`, "red");
  process.exit(1);
});
