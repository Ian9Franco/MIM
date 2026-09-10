# NBT Rescue Engine — Binary Data Recovery Specification

> **Module:** `lib/modding/nbt.ts` & `app/api/sage/player-rescue/`  
> **Classification:** Systems Engineering / Binary File Recovery & Serialization  
> **Domain:** Minecraft Named Binary Tag (NBT) Protocol (NBT v19133 Specification)

---

## 🔬 The Data Corruption Problem

Minecraft saves player state (coordinates, dimension, inventory items, UUID) inside compressed binary NBT `.dat` files (`playerdata/<uuid>.dat` or `level.dat`).

When an invalid mod, sudden power failure, or out-of-bounds coordinates ($Y > 10^7$ or invalid dimension strings) crash the game during world loading, the vanilla Minecraft engine crashes on startup with:
```
Encountered an unexpected exception com.mojang.datafixers
java.lang.NullPointerException / IndexOutOfBoundsException
```
Most users discard their worlds or player progress. The **SAGE NBT Rescue Engine** provides surgical binary recovery without losing player inventory.

---

## 🛡️ The Zero-Data-Loss Invariant

The fundamental architectural invariant of the NBT Rescue Engine is:

$$\text{INVARIANT}: \quad \text{Source binary state is NEVER overwritten without a cryptographically flushed backup.}$$

```
                Corrupted player.dat
                         │
                         ▼
        [Stage 1: Binary Decompression]
        • Detect Gzip magic bytes (0x1f 0x8b)
        • Decompress stream into raw NBT payload
                         │
                         ▼
          [Stage 2: Tag Parser & AST]
          • Validate Compound Tag tree
          • Ensure strict Minecraft types:
            - Pos: List<Double> (64-bit IEEE float)
            - Rotation: List<Float> (32-bit float)
            - SpawnX/Y/Z: Int (32-bit signed int)
            - Dimension: String
                         │
                         ▼
          [Stage 3: Diagnosis & Repair]
          • Detect out-of-bounds coordinates (NaN, Infinity, Y < -2000)
          • Validate dimension registry (overworld, the_nether, the_end)
          • Purge corrupted/unregistered item IDs
                         │
                         ▼
         [Stage 4: Mandatory Snapshot Backup]
         • Flush exact source copy to <filename>.YYYYMMDD-HHMMSS.mim_bak
         • Verify backup size and byte integrity on disk
                         │
                         ▼
           [Stage 5: Atomic Flush & Swap]
           • Encode repaired NBT tree with Gzip compression
           • Write to temporary staging file (.tmp)
           • Verify magic bytes and checksum of staging file
           • Perform atomic rename over target .dat
                         │
                         ▼
              Safe Recovered player.dat
```

---

## 🧪 Specification Validation Matrix

Compliance with the official Minecraft NBT protocol is enforced via automated integration tests (`scripts/__tests__/nbt-integration.test.ts`):

| Check | Specification Rule | Engine Guarantee | Test Verification |
|:---|:---|:---|:---:|
| **Compression** | Gzip format with RFC 1952 header | Automatic detection via `0x1f 0x8b` header | ✅ Passed |
| **Coordinates** | Player `Pos` MUST be `List<Double>` | Rejects `Float` serialization to prevent Mojang crash | ✅ Passed |
| **Rotation** | Player `Rotation` MUST be `List<Float>` | Strictly serialized as 4-byte IEEE 754 floats | ✅ Passed |
| **Spawn Anchor** | `SpawnX`, `SpawnY`, `SpawnZ` MUST be `Int` | 4-byte signed integers (TagType.Int = 3) | ✅ Passed |
| **Dimension** | `Dimension` MUST be namespaced `String` | Normalizes to `minecraft:overworld`, `the_nether`, `the_end` | ✅ Passed |
| **Inventory** | `Inventory` MUST be `List<Compound>` | Preserves nested item NBT tags (Enchantments, CustomModelData) | ✅ Passed |
| **Atomic Swap** | Zero corruption on power interrupt | Writes `.tmp` first, then atomic rename | ✅ Passed |

---

## 🚀 Running Verification Tests

Run the complete 12-case NBT test suite:

\`\`\`bash
npm run test:nbt
\`\`\`
