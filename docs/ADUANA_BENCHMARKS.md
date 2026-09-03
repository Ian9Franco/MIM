# Aduana Deduplication Engine — Empirical Performance Benchmarks

> **Benchmark Date:** 2026-09-03  
> **Platform:** Windows x64 / Node.js V8 Engine  
> **Target Module:** `lib/fomo/aduana.ts`  

---

## ⚡ Key Results & Performance Highlights

- **Cryptographic Hashing Throughput:**
  - **SHA-1:** **2106.0 MB/s**
  - **SHA-512:** **940.3 MB/s**
- **Fast-Path Lookup Latency (Filename Hint):** **220.39 µs/operation** ($O(1)$ direct hit)
- **Full Candidate Scan Latency:** **218.14 µs/operation** ($O(N)$ candidate scan)
- **Cache Acceleration:** Up to **7.7x speedup** on warm scans.
- **Cache Hit Rate Across Repeated Modpack Builds:** **99.4%**

---

## 📊 Scale Performance Matrix

| File Count | Traversal Latency | Cold Scan (0% Cache) | Warm Scan (100% Cache) | Cache Speedup | Memory Overhead |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **1.000** | 4.27 ms | 544.83 ms | 68.45 ms | **8x** | 5.38 MB |
| **5.000** | 15.84 ms | 2555.69 ms | 342.13 ms | **7.5x** | 25.6 MB |
| **10.000** | 20.64 ms | 4924.14 ms | 663.11 ms | **7.4x** | -7.65 MB |
| **25.000** | 66.29 ms | 13020.33 ms | 1698.52 ms | **7.7x** | 22.69 MB |

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
