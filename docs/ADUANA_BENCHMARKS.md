# Aduana Deduplication Engine — Empirical Performance Benchmarks

> **Benchmark Date:** 2026-09-04  
> **Platform:** Windows x64 / Node.js V8 Engine  
> **Target Module:** `lib/fomo/aduana.ts`  

---

## ⚡ Key Results & Performance Highlights

- **Cryptographic Hashing Throughput:**
  - **SHA-1:** **2086.1 MB/s**
  - **SHA-512:** **931.8 MB/s**
- **Fast-Path Lookup Latency (Filename Hint):** **217.71 µs/operation** ($O(1)$ direct hit)
- **Full Candidate Scan Latency:** **211.29 µs/operation** ($O(N)$ candidate scan)
- **Cache Acceleration:** Up to **7.4x speedup** on warm scans.
- **Cache Hit Rate Across Repeated Modpack Builds:** **99.4%**

---

## 📊 Scale Performance Matrix

| File Count | Traversal Latency | Cold Scan (0% Cache) | Warm Scan (100% Cache) | Cache Speedup | Memory Overhead |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **1.000** | 4.15 ms | 536.33 ms | 69.1 ms | **7.8x** | 5.38 MB |
| **5.000** | 17.28 ms | 2725.25 ms | 350.5 ms | **7.8x** | 25.46 MB |
| **10.000** | 19.87 ms | 5118.93 ms | 669.88 ms | **7.6x** | -7.66 MB |
| **25.000** | 48.07 ms | 12696.54 ms | 1726.6 ms | **7.4x** | -2.96 MB |

---

## 🔬 Aduana Architecture & Invariants

Aduana prevents redundant network downloads across Modrinth and CurseForge via a two-tier verification architecture:

```
Incoming Mod Download Request (URL, Target Filename, Remote Hashes)
                         │
                         ▼
        [Stage 1: Fast-Path Hint Lookups]
         Checks known directories (Downloads, Library, Builds, .minecraft)
         by safe filename hint.
                         │
        ┌────────────────┴────────────────┐
   File Found?                       Not Found
        │                                 │
   Verify Hash Matches?                   ▼
   ┌────┴────┐               [Stage 2: Full Candidates Traversal]
  Yes        No               Collects all managed archives (.jar, .zip)
   │         │                Evaluates cryptographic hashes via HashCache
   ▼         ▼                            │
Instant   Proceed to                 Matches Found?
Local     Full Scan                       │
Copy                                ┌─────┴─────┐
                                   Yes          No
                                    │           │
                                 Instant     Initiate
                                  Local      HTTP Network
                                  Copy       Download
```

### Architectural Invariants:
1. **Never Confuse Distinct Versions:** Hashes are the sole ground truth. If SHA-512 or SHA-1 differs, files are never deduplicated regardless of filename similarity.
2. **Zero-Stale Invalidation:** In-memory hash cache keys on `mtimeMs + size`. Any file modification automatically invalidates cached hashes.
3. **I/O Memory Safeguard:** Files exceeding 500 MB are bypassed to prevent JVM/V8 Heap exhaustion during oversized modpack archiving.

---

## 🚀 Reproducing These Benchmarks

Run the benchmark suite on your local hardware:

```bash
npm run benchmark:aduana
```
