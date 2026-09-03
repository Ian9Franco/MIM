# Aduana Deduplication Engine — Empirical Performance Benchmarks

> **Benchmark Date:** 2026-09-03  
> **Platform:** Windows x64 / Node.js V8 Engine  
> **Target Module:** `lib/fomo/aduana.ts`  

---

## ⚡ Key Results & Performance Highlights

- **Cryptographic Hashing Throughput:**
  - **SHA-1:** **2095.3 MB/s**
  - **SHA-512:** **914.3 MB/s**
- **Fast-Path Lookup Latency (Filename Hint):** **242.24 µs/operation** ($O(1)$ direct hit)
- **Full Candidate Scan Latency:** **238.42 µs/operation** ($O(N)$ candidate scan)
- **Cache Acceleration:** Up to **6.9x speedup** on warm scans.
- **Cache Hit Rate Across Repeated Modpack Builds:** **99.4%**

---

## 📊 Scale Performance Matrix

| File Count | Traversal Latency | Cold Scan (0% Cache) | Warm Scan (100% Cache) | Cache Speedup | Memory Overhead |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **1.000** | 6.33 ms | 609.82 ms | 95.59 ms | **6.4x** | 5.38 MB |
| **5.000** | 23.94 ms | 3089.9 ms | 455.17 ms | **6.8x** | 25.47 MB |
| **10.000** | 33.67 ms | 6060.68 ms | 881.14 ms | **6.9x** | -7.62 MB |
| **25.000** | 77.26 ms | 15362.51 ms | 2238.1 ms | **6.9x** | -3.06 MB |

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
