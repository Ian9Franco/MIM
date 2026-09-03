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
| **[ADR-001](./ADR-001-deterministic-diagnosis-vs-llm.md)** | Why deterministic diagnosis instead of LLM diagnosis | SAGE 2.0 / AI Engine | ✅ Accepted |
| **[ADR-002](./ADR-002-content-addressed-caching.md)** | Why content hashes are the source of truth for deduplication | Aduana Storage Engine | ✅ Accepted |
| **[ADR-003](./ADR-003-offline-first-synchronization.md)** | Offline-first synchronization and conflict resolution | FOMO Cloud / Distributed | ✅ Accepted |
| **[ADR-004](./ADR-004-atomic-writes-nbt-recovery.md)** | Atomic writes and snapshot backups for corrupted NBT recovery | NBT Rescue Engine | ✅ Accepted |
| **[ADR-005](./ADR-005-static-bytecode-inspection-vs-execution.md)** | Static bytecode inspection instead of executing unknown JARs | Security Engine | ✅ Accepted |
| **[ADR-006](./ADR-006-typed-event-bus.md)** | Reactive typed event bus for cross-engine fault isolation | Core Architecture | ✅ Accepted |
