# MIM — Interactive Technical Demonstration & Verification Tour

> **Execution Time:** ~30 seconds  
> **Target Audience:** Engineering Managers, Systems Engineers, Technical Recruiters  
> **Command:** `npm run demo`

---

## 🎬 Technical Showcase Tour Overview

The interactive CLI tour demonstrates the five core engineering pillars of MIM in live execution:

```
  ███╗   ███╗██╗███╗   ███╗    ███████╗███╗   ██╗ ██████╗ 
  ████╗ ████║██║████╗ ████║    ██╔════╝████╗  ██║██╔════╝ 
  ██╔████╔██║██║██╔████╔██║    █████╗  ██╔██╗ ██║██║  ███╗
  ██║╚██╔╝██║██║██║╚██╔╝██║    ██╔══╝  ██║╚██╗██║██║   ██║
  ██║ ╚═╝ ██║██║██║ ╚═╝ ██║    ███████╗██║ ╚████║╚██████╔╝
  ╚═╝     ╚═╝╚═╝╚═╝     ╚═╝    ╚══════╝╚═╝  ╚═══╝ ╚═════╝ 
  Systems Engineering Live Showcase — Technical Tour
```

---

## 🔬 Tour Breakdown by Subsystem

### Stage 1: SAGE 2.0 Crash Intelligence Engine (Deterministic + RAG)
Simulates an unparsed production crash dump involving Fabric Loader, Sodium, and OptiFine:
- **Parser & Demangler:** Strips ANSI and reconstructs Mixin injection target (`handler$zfa000$render in sodium.mixins.json`).
- **Deterministic Classifier:** Categorizes as `MIXIN_FAILURE` with 89% evidence confidence score.
- **RAG Semantic Knowledge Retrieval:** Queries the offline Knowledge Base, extracting:
  - `[73% match] Indium Requirement for Fabric Rendering API Mods`
  - `[71% match] Sodium / Embeddium and OptiFine Mutual Exclusion`
- **Anti-Hallucination Guardrails:** Verifies 75% grounding score and confirms zero ungrounded or dangerous remediation actions.
- **Inference Latency:** **0.06 ms/log**.

---

### Stage 2: Aduana Storage Engine (2+ GB/s Cryptographic Hashing)
Pipes a 100 MB synthetic memory stream through SHA-1 and SHA-512 cryptographic pipelines:
- **SHA-1 Throughput:** **2,086.9 MB/s** (Target: $> 1,800\text{ MB/s}$).
- **Fast-Path $O(1)$ Probing:** **218 µs/op** via safe filename hints.
- **Scale Cache Acceleration (25,000 Files):** 13.44 s cold $\to$ 1.68 s warm (**8.0x cache speedup**).

---

### Stage 3: NBT Rescue Engine (Zero-Loss Binary Data Invariant)
Executes binary validation and atomic swap protocol for Minecraft `playerdata/*.dat`:
- **RFC 1952 Decompression:** Confirms Gzip magic bytes (`0x1f 0x8b`).
- **Strict Protocol Types:** Enforces `Double` for Coordinates, `Float` for Rotation, `Int` for Spawn.
- **Pre-Mutation Snapshot:** Writes `<uuid>.YYYYMMDD-HHMMSS.mim_bak` prior to buffer alteration.
- **Atomic Swap:** Writes `.tmp` buffer and atomically renames over target file.
- **Verification:** **12 / 12 Integration Tests Passing**.

---

### Stage 4: FOMO Cloud Distributed Synchronization (Offline-First)
Demonstrates multi-client eventually consistent synchronization over WebSockets:
- **Offline Degradation:** Optimistic UI state updates in $< 8\text{ ms}$; 10 mutations queued in IndexedDB FIFO queue.
- **Reconnection Convergence:** WebSocket reconnects in 42 ms; drains queue with deterministic `UUIDv5` idempotency keys.
- **Kernel-Level Security:** Access control enforced via PostgreSQL Row-Level Security (RLS).

---

## 🚀 How to Run

```bash
# 1. Run the interactive live showcase
npm run demo

# 2. Run the automated headless test suites (12 NBT + 125 SAGE + Aduana + RAG)
npm test

# 3. Run production build check
npm run build
```
