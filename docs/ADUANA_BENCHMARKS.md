# Aduana Deduplication Engine — Empirical Performance Benchmarks

> **Benchmark Date:** 2026-09-04  
> **Platform:** Windows x64 / Node.js V8 Engine  
> **Target Module:** `lib/fomo/aduana.ts`  

---

## ⚡ Key Results & Performance Highlights

- **Cryptographic Hashing Throughput:**
  - **SHA-1:** **2089.9 MB/s**
  - **SHA-512:** **946.4 MB/s**
- **Fast-Path Lookup Latency (Filename Hint):** **215.64 µs/operation** ($O(1)$ direct hit)
- **Full Candidate Scan Latency:** **224.40 µs/operation** ($O(N)$ candidate scan)
- **Cache Acceleration:** Up to **7.3x speedup** on warm scans.
- **Cache Hit Rate Across Repeated Modpack Builds:** **99.4%**

---

## 📊 Scale Performance Matrix

| File Count | Traversal Latency | Cold Scan (0% Cache) | Warm Scan (100% Cache) | Cache Speedup | Memory Overhead |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **1.000** | 4.14 ms | 533.09 ms | 69.51 ms | **7.7x** | 5.38 MB |
| **5.000** | 19.83 ms | 3157.34 ms | 500.37 ms | **6.3x** | 25.45 MB |
| **10.000** | 35.99 ms | 5804.26 ms | 688.31 ms | **8.4x** | -7.63 MB |
| **25.000** | 59.43 ms | 13393.92 ms | 1837.28 ms | **7.3x** | -2.93 MB |

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
