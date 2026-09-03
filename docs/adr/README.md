# MIM — Architecture Decision Records (ADRs)

This directory documents the foundational architectural and design decisions made throughout the engineering lifecycle of **MIM (Minecraft Intelligent Manager)**.

Each record follows the standard Michael Nygard format:
- **Title:** Numbered decision identifier
- **Status:** Proposed / Accepted / Superseded
- **Context:** The technical constraints, forces, and problem statement
- **Decision:** The chosen architectural pattern and implementation
- **Consequences:** Positive results, trade-offs, and operational boundaries

---

## 📑 Index of Records

| Identifier | Title | Domain / Engine | Status |
|:---|:---|:---:|:---:|
| **[ADR-001](./ADR-001-typed-event-bus.md)** | Reactive Typed Event Bus for Cross-Engine Communication and Fault Isolation | Core / Architecture | ✅ Accepted |
| **[ADR-002](./ADR-002-content-addressed-caching.md)** | Content-Addressed Cryptographic Hashing and Two-Tier Cache for Mod Deduplication | Aduana Storage Engine | ✅ Accepted |
| **[ADR-003](./ADR-003-deterministic-diagnostic-ai-boundary.md)** | Strict Architectural Boundary Between Deterministic Diagnostic Engine and AI Explanation Layer | SAGE 2.0 / AI Engine | ✅ Accepted |
| **[ADR-004](./ADR-004-offline-first-lww-synchronization.md)** | Offline-First Synchronization with Last-Write-Wins and Client-Side Idempotency Queues | FOMO Cloud / Distributed | ✅ Accepted |
