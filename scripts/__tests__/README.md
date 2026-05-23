# SAGE Rescue Feature Tests

This directory contains comprehensive test suites for the SAGE Rescue enhancement feature, covering:

- **NBT Binary I/O**: Parse/write gzipped NBT structures
- **Data Type Validation**: Ensure Minecraft's strict type requirements
- **API Endpoint Integration**: Test the three new rescue endpoints
- **Round-trip Integrity**: Read → Modify → Write → Read cycle

## Files

### `nbt-integration.test.ts`
Tests the NBT parser and writer directly:
- ✅ Gzip compression/decompression
- ✅ Coordinate types (Double)
- ✅ Spawn coordinates (Int)
- ✅ Dimension (String)
- ✅ Inventory structure (List<Compound>)
- ✅ Large inventory handling (100+ items)

### `api-integration.test.ts`
Tests the actual HTTP endpoints (requires dev server running):
- ✅ `GET /api/sage/player-rescue/parse` - Parse .dat files
- ✅ `POST /api/sage/player-rescue/save` - Save modified NBT
- ✅ `DELETE /api/sage/player-rescue/purge-backups` - Remove backups
- ✅ External file handling
- ✅ Error handling

## Running Tests

### Prerequisites

```bash
npm install
```

### Test 1: NBT Binary I/O (No Server Needed)

```bash
npx ts-node __tests__/nbt-integration.test.ts
```

**What it tests:**
- Gzip magic byte detection (0x1f 0x8b)
- NBT data structure preservation
- Type correctness (Float vs Double vs Int)
- Large data handling

**Expected output:**
```
✓ NBT Round-Trip: Write and Read Back
✓ Data Types: Coordinates use Double (not Float)
✓ Data Types: Rotation uses Float
✓ Data Types: Spawn coordinates use Int
✓ Data Types: Dimension is String
✓ Inventory Structure: List<Compound> with Item NBT
✓ Modify Coordinates: Update Pos and Spawn
✓ Modify Dimension: Change to Nether and back
✓ Modify Inventory: Delete and Add Items
✓ Level.dat Round-Trip: Read world name and player data
✓ Uncompressed NBT: Write and read without gzip
✓ Large Inventory: Handle 100+ items

🎉 All tests passed! NBT I/O is safe and reliable.
```

### Test 2: API Endpoint Integration (Server Required)

First, start the dev server in another terminal:

```bash
npm run dev
```

Then in another terminal, run:

```bash
npx ts-node __tests__/api-integration.test.ts
```

**What it tests:**
- Parse endpoint correctly extracts NBT data
- Save endpoint creates backups and updates files
- Purge endpoint removes mod backups
- Coordinate modifications are preserved
- Error handling for missing files
- Backup warnings are displayed

**Expected output:**
```
✓ API: GET /api/sage/player-rescue/parse
✓ API: POST /api/sage/player-rescue/save
✓ API: DELETE /api/sage/player-rescue/purge-backups
✓ API: Parse external .dat file (non-standard path)
✓ API: Handle non-existent file gracefully
✓ API: Warn when backup files are detected

🎉 All API tests passed!
```

## Manual Testing Against Real Player Files

To test against actual Minecraft player files:

### Step 1: Identify a test world

```bash
# On Windows
cd %APPDATA%\.minecraft\saves\YourWorldName\playerdata\
# On macOS
cd ~/Library/Application\ Support/minecraft/saves/YourWorldName/playerdata/
```

### Step 2: Make a backup

```bash
# Copy a player file for testing
copy <UUID>.dat <UUID>.dat.test
# or on Unix:
cp <UUID>.dat <UUID>.dat.test
```

### Step 3: Test the parse endpoint

Using curl or Postman:

```bash
curl "http://localhost:3000/api/sage/player-rescue/parse?filePath=$(pwd)/<UUID>.dat.test"
```

Expected response:
```json
{
  "success": true,
  "filePath": "/path/to/playerdata/<UUID>.dat.test",
  "fileName": "<UUID>.dat.test",
  "worldName": "YourWorldName",
  "playerData": {
    "position": [100.5, 64.0, 200.75],
    "dimension": "minecraft:overworld",
    "spawn": { "x": 100, "y": 64, "z": 200 },
    "inventorySize": 36
  },
  "backupFiles": [],
  "nbt": { /* full NBT tree */ }
}
```

### Step 4: Test the save endpoint

Modify coordinates and save back:

```bash
curl -X POST "http://localhost:3000/api/sage/player-rescue/save" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/playerdata/<UUID>.dat.test",
    "nbtData": { /* modified NBT */ },
    "createBackup": true
  }'
```

Expected response:
```json
{
  "success": true,
  "filePath": "/path/to/playerdata/<UUID>.dat.test",
  "logs": [
    "✓ Backup created: <UUID>.dat.test.mim_bak",
    "✓ File saved successfully: <UUID>.dat.test"
  ],
  "message": "Player data saved..."
}
```

### Step 5: Verify integrity

Read the file back to ensure it's valid:

```bash
curl "http://localhost:3000/api/sage/player-rescue/parse?filePath=$(pwd)/<UUID>.dat.test"
```

The coordinates should reflect your changes.

## Type Reference (Minecraft NBT)

| Field | Type | Range | Example |
|-------|------|-------|---------|
| `Pos` | List<Double> | ±30M | [100.5, 64.0, 200.75] |
| `Rotation` | List<Float> | 0-360 | [45.0, 0.0] |
| `Dimension` | String | N/A | "minecraft:overworld" |
| `SpawnX/Y/Z` | Int | ±30M | 100 |
| `Health` | Float | 0-20 | 20.0 |
| `Inventory` | List<Compound> | N/A | [{id: ..., Count: ...}] |

## Troubleshooting

### "Server is not running"
Start the dev server first:
```bash
npm run dev
```

### "Cannot find module 'lib/modding/nbt'"
Ensure TypeScript paths are configured correctly in `tsconfig.json` and ts-node can resolve them:
```bash
npx ts-node --require tsconfig-paths/register __tests__/nbt-integration.test.ts
```

### "ENOENT: no such file or directory"
Check that the test is using correct absolute paths for file operations.

### "Invalid NBT data"
Ensure the .dat file is properly gzipped. Minecraft always gzips player files.

## Safety Notes

✅ All tests use:
- Temporary files (cleaned up after tests)
- Automatic backup creation (.mim_bak)
- Non-destructive modifications
- Mock data for API tests

⚠️ When testing with real player files:
- **Always backup the world first**
- Close Minecraft before modifying files
- Test with a throw-away world first
- Verify changes with `parse` endpoint before applying to production

## Next Steps

Once tests pass:

1. ✅ Binary I/O is validated
2. ✅ API endpoints are working
3. → Proceed to Part 3: Advanced NBT editing UI
4. → Implement external file upload streaming
