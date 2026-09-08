# MIM Server Manager — Foundation Architecture

Tracking Epic: #58

## Problem statement

MIM already knows how to classify client/server/shared mods, validate dependencies and conflicts, build an `allhost` distribution, diagnose crashes with SAGE and read/write NBT. Server Manager must not duplicate those engines.

The missing capability is to represent an observed remote Minecraft instance with the same domain model as a local MIM project, compare desired and actual state, and only then decide whether a remote mutation is safe.

The architectural transition is therefore:

```text
Before
Local filesystem -> Scanner -> Validator -> Builder

Foundation
Artifact source -> Scanner -> ModArtifact -> InstanceManifest
                                      |              |
                                      +-> Validator  +-> Diff
                                                       |
                                                ReconciliationPlan
                                                       |
                                      +----------------+----------------+
                                      |                                 |
                                Local build                       Remote server
```

## 1. Canonical artifact contract

`lib/instances/types.ts` introduces `ModArtifact` as the transport-agnostic identity of a mod.

It contains:

- filename and mod identity;
- mod/game versions and loader;
- SHA hashes;
- explicit client/server environment requirements;
- dependencies, conflicts and provided IDs;
- mixin targets;
- source metadata without assuming the source is readable through local `fs`.

The critical rule is that domain logic receives an artifact, not a filesystem path.

### Identity order

Manifest diffing uses the strongest stable identity available:

1. `modId` when known;
2. cryptographic hash when metadata cannot identify the mod;
3. filename only as a last-resort fallback.

Multiple artifacts resolving to the same canonical identity are treated as duplicates and are **never auto-resolved** by reconciliation.

## 2. Buffer-first scanner

`scanModBuffer(buffer, fileName)` is now the transport-independent scanner entrypoint.

Existing local callers keep `scanModEnhanced(filePath)`, which becomes an adapter:

```text
Local FS ----read----+
                     |
SFTP -------download-+--> Buffer --> scanModBuffer()
                     |
Provider API --------+
```

This is the key prerequisite for remote auditing. A future SFTP implementation only needs to supply bytes; it does not need a second scanner.

Fabric/Quilt metadata now also exposes environment semantics and richer dependency/conflict/provides information. Forge/NeoForge remain `unknown` for sidedness unless reliable metadata is available; the system must not guess.

## 3. Universal InstanceManifest

An `InstanceManifest` is a deterministic snapshot of either desired or observed state:

```ts
InstanceManifest {
  schemaVersion
  instanceId
  side              // client | server
  minecraftVersion
  loader
  mods[]
  configs[]
  generatedAt
}
```

The same structure is intended for:

- a MIM project;
- a generated `alluser` build;
- a generated `allhost` build;
- a local Minecraft installation;
- a remote server discovered over SFTP/provider API.

This is the common language required before client/server sync can be made reliable.

## 4. Existing PackValidator remains authoritative

`validateInstanceManifest()` adapts the universal manifest to the current deterministic `PackValidator` rather than reimplementing validation rules for remote servers.

Remote artifacts do not invent MIM source-tree categories. They are mapped to the runtime side (`.local` for client, `.server` for server), which preserves:

- missing dependency checks;
- declared conflicts;
- client/server environment mismatches;
- duplicate `modId` detection;
- loader mismatch;
- Minecraft version mismatch.

`buildAllUser()` and `buildAllHost()` remain distribution producers. The later Server Manager integration should make `allhost`/project state a producer of the desired manifest, not create a separate server-pack model.

## 5. Manifest diff

`diffInstanceManifests(desired, actual)` is pure and deterministic.

It reports:

- additions;
- removals;
- updates and the exact reasons (`version`, `content`, `filename`, `loader`);
- unchanged artifacts;
- duplicates on either side;
- artifacts unsupported on the target runtime side.

Duplicates and invalid desired environment state require manual review.

This deliberately separates **observation** from **mutation**.

## 6. ReconciliationPlan

`buildReconciliationPlan(diff)` turns a diff into explicit operations:

- `install`;
- `remove`;
- `replace`;
- `manual-review`.

The plan performs no I/O. It also records whether destructive actions require a snapshot and whether safety findings block execution.

A later executor must enforce:

```text
plan
  -> preflight
  -> snapshot
  -> apply
  -> verify hashes + regenerate actual manifest
  -> commit history
  -> rollback on partial failure
```

No remote write path should bypass that sequence.

## 7. Capability-based remote connections

A host is not a capability.

`lib/server/capabilities.ts` models four independent interfaces:

### FileTransport

List/read/write/remove/move remote files. SFTP should be the first implementation.

### ProcessControl

Start/stop/restart/status when a provider API exposes lifecycle control.

### CommandChannel

Console/RCON command execution.

### TelemetrySource

Optional TPS/MSPT/player/heap snapshots.

This avoids a monolithic `ServerConnector` where most methods are optional and provider-specific.

Examples:

```text
Generic SFTP host
files       yes
process     no
commands    no
telemetry   no

Pterodactyl + RCON
files       yes
process     yes
commands    yes
telemetry   maybe
```

The UI must expose only capabilities actually present on the target.

## 8. Event Bus integration

Server Manager extends the typed event contract through a composable `MimEventMap` rather than adding a second bus.

Foundation events cover:

- connect/disconnect;
- manifest scanned/changed;
- reconciliation planned;
- sync started/completed/failed;
- crash detected;
- health degradation.

SAGE, ALRT, history and UI can subscribe independently.

## 9. SAGE integration boundary

Do not create a second `SageServerEngine`.

The intended pipeline is:

```text
FileTransport/provider
   -> latest.log / crash-reports
   -> SAGE existing deterministic engine
   + InstanceManifest
   + reconciliation history
   -> enriched evidence
```

Future work may extend SAGE context from `rawLog` to a structured diagnostic input, but culprit attribution must remain evidence-driven. LLM layers explain verified evidence; they do not manufacture it.

A high-value future correlation is:

> first crash after `mod X` changed from version A to B during reconciliation Y.

That requires trustworthy change history, not a new crash classifier.

## 10. NBT integration boundary

The existing NBT reader/writer remains authoritative.

Remote NBT editing must use:

```text
remote file
 -> download
 -> snapshot
 -> readNBT
 -> controlled mutation
 -> writeNBT
 -> validate
 -> atomic upload
```

Sensitive world files must not be written while the server is running unless a future operation explicitly proves the write is safe.

## 11. Delivery phases

### Phase 0 — Foundation (this PR)

- canonical `ModArtifact`;
- universal `InstanceManifest`;
- buffer-first scanner;
- environment/dependency metadata alignment;
- reuse of `PackValidator`;
- deterministic manifest diff;
- side-effect-free reconciliation planning;
- remote capability contracts;
- typed server events;
- contract tests.

### Phase 1 — Read-only remote audit

Implement SFTP `FileTransport`, inspect `/mods`, build a remote manifest and present:

```text
MIM SERVER AUDIT
118 correct
2 outdated
1 duplicate
2 missing dependencies
1 client-only artifact on server
```

No remote writes.

### Phase 2 — Transactional deploy

Snapshot, execute plan, verify regenerated manifest and rollback on failure.

### Phase 3 — SAGE remote

Feed remote logs + manifest + recent changes into the existing diagnostic pipeline.

### Phase 4 — Administration

`server.properties`, config editing, backups, NBT, lifecycle and console capabilities.

### Phase 5 — Multiplayer ecosystem

Distribute the required server manifest to clients, preflight before connection and preserve client-only optimization/visual profiles without contaminating server state.

## 12. Non-goals

The foundation intentionally does **not**:

- implement a hosting-provider-specific integration;
- add SFTP/RCON/Pterodactyl dependencies yet;
- write/delete remote files;
- auto-delete duplicate mods;
- guess Forge sidedness when metadata is ambiguous;
- introduce a resident MIM Server Agent;
- make telemetry a requirement for core synchronization;
- replace SAGE, NBT, PackValidator, Aduana or the existing builder.

These constraints keep Server Manager an extension of MIM's existing engines instead of a second product hidden inside the repository.
