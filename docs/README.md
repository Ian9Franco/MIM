# MIM Documentation & Engineering Specifications / Documentación Técnica

<div align="center">

**[English Documentation](#english)** • **[Documentación en Español](#español)**

</div>

---

## English

Welcome to the technical documentation of **MIM (Minecraft Intelligent Manager)**. Below is the organized directory of systems engineering specifications, benchmarks, threat models, and architectural decisions.

### 🏛️ Core Architecture & Distributed Systems
- **[System Architecture (7 Domain Engines)](./ARCHITECTURE.md)**: Full topology, decoupled engines, and typed event bus (`MimEventMap`).
- **[Distributed Systems Architecture (FOMO Cloud)](./DISTRIBUTED_ARCHITECTURE.md)**: Offline-first state sync, Last-Write-Wins (LWW) conflict resolution, optimistic UI rollback, and PostgreSQL Row-Level Security (RLS).
- **[Live Demo Tour Specification](./DEMO.md)**: Step-by-step walkthrough of the interactive headless CLI showcase (`npm run demo`).
- **[Reproducibility Guide](./REPRODUCIBILITY.md)**: Local, Docker, and CI reproducible environments.

### 🔬 Subsystem Specifications & Empirical Benchmarks
- **[SAGE 2.0 Crash Intelligence Evaluation](./SAGE_EVALUATION.md)**: 125-case quantitative evaluation report (100% Macro F1, 84% Top-1, 100% Top-3, 0.06 ms latency, RAG, and guardrails).
- **[Aduana Storage Engine Benchmarks](./ADUANA_BENCHMARKS.md)**: Content-addressed storage, SHA-1/SHA-512 throughput (> 2.0 GB/s), and empirical scaling from 1K to 25K files (8× speedup).
- **[Static Java Bytecode Threat Analysis](./SECURITY_ENGINE.md)**: AST inspection rules (process execution, shell droppers, native JNI, reflection evasion), bounded worker pools, and threat scoring.
- **[STRIDE Threat Model & Attack Trees](./THREAT_MODEL.md)**: Formal AppSec analysis across Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.
- **[NBT Binary Safe Recovery Specification](./NBT_RESCUE_SPEC.md)**: Named Binary Tag protocol (NBT v19133), RFC 1952 Gzip decompression, mandatory `.mim_bak` snapshot, and the Zero-Data-Loss Invariant.
- **[MIM Sovereign Vault Architecture Proposal](./PROPOSAL_DATA_SOVEREIGNTY_VAULT.md)**: Data sovereignty specification, SHA-256 integrity, idempotent account re-seeding, and cloud dormancy mitigation.
- **[MIM Intelligent Mod Explainer Proposal](./PROPOSAL_INTELLIGENT_MOD_EXPLAINER.md)**: On-demand AI synthesis, public Gemini Search Grounding for sparse/empty metadata, and zero-server architecture.

### 📑 Architecture Decision Records (ADRs)
- **[ADR Index](./adr/README.md)**: Overview of foundational design decisions.
  - [ADR-001: Deterministic Diagnosis vs. LLM](./adr/ADR-001-deterministic-diagnosis-vs-llm.md)
  - [ADR-002: Content-Addressed Caching](./adr/ADR-002-content-addressed-caching.md)
  - [ADR-003: Offline-First Synchronization & LWW](./adr/ADR-003-offline-first-synchronization.md)
  - [ADR-004: Atomic Writes & Zero-Loss NBT Recovery](./adr/ADR-004-atomic-writes-nbt-recovery.md)
  - [ADR-005: Static Bytecode Inspection vs. Execution](./adr/ADR-005-static-bytecode-inspection-vs-execution.md)
  - [ADR-006: Reactive Typed Event Bus](./adr/ADR-006-typed-event-bus.md)

---

## Español

Bienvenido a la documentación técnica de **MIM (Minecraft Intelligent Manager)**. A continuación se detalla el índice de especificaciones de ingeniería, benchmarks, modelos de amenazas y decisiones arquitectónicas.

### 🏛️ Arquitectura Central y Sistemas Distribuidos
- **[Arquitectura del Sistema (7 Motores de Dominio)](./ARCHITECTURE.md)**: Topología completa, motores desacoplados y bus de eventos tipado (`MimEventMap`).
- **[Arquitectura de Sistemas Distribuidos (FOMO Cloud)](./DISTRIBUTED_ARCHITECTURE.md)**: Sincronización offline-first, resolución de conflictos Last-Write-Wins (LWW), rollback optimista y Row-Level Security (RLS) en PostgreSQL.
- **[Documentación Técnica Maestra (MIM.md)](./MIM.md)**: Documento integral en español sobre flujos de datos, componentes y funcionamiento de la aplicación.
- **[Guía de Reproducibilidad](./REPRODUCIBILITY.md)**: Entornos reproducibles en local, Docker y CI.
- **[Demostración de Sistemas en Vivo](./DEMO.md)**: Guía paso a paso del showcase interactivo por consola (`npm run demo`).

### 🔬 Especificaciones de Subsistemas y Benchmarks
- **[Evaluación de Inteligencia de Crashes SAGE 2.0](./SAGE_EVALUATION.md)**: Reporte cuantitativo sobre 125 casos canónicos (100% Macro F1, 84% Top-1, 100% Top-3, latencia de 0.06 ms, RAG y guardrails).
- **[Benchmarks del Motor de Almacenamiento Aduana](./ADUANA_BENCHMARKS.md)**: Almacenamiento direccionado por contenido, hashing a > 2.0 GB/s y aceleración de 8× de 1K a 25K archivos.
- **[Análisis Estático de Amenazas en Bytecode Java](./SECURITY_ENGINE.md)**: Reglas de inspección AST (procesos externos, droppers, JNI, evasión por reflexión) y puntuación de riesgo.
- **[Modelo de Amenazas STRIDE y Árboles de Ataque](./THREAT_MODEL.md)**: Análisis formal de seguridad de aplicaciones.
- **[Especificación de Recuperación Binaria NBT](./NBT_RESCUE_SPEC.md)**: Protocolo NBT v19133 de Mojang, descompresión RFC 1952, snapshot `.mim_bak` e invariante de cero pérdida de datos.
- **[Propuesta Arquitectónica: MIM Sovereign Vault](./PROPOSAL_DATA_SOVEREIGNTY_VAULT.md)**: Soberanía de datos, verificación de integridad SHA-256, migración de cuentas y mitigación de pausas en la nube.
- **[Propuesta: Explicador Inteligente de Mods](./PROPOSAL_INTELLIGENT_MOD_EXPLAINER.md)**: Síntesis de proyectos on-demand con Gemini Search Grounding para metadatos vacíos sin requerir servidor backend.

### 📑 Registro de Decisiones de Arquitectura (ADRs)
- **[Índice de ADRs](./adr/README.md)**: Decisiones fundacionales de diseño.
  - [ADR-001: Diagnóstico Determinista vs. LLM](./adr/ADR-001-deterministic-diagnosis-vs-llm.md)
  - [ADR-002: Almacenamiento Direccionado por Contenido](./adr/ADR-002-content-addressed-caching.md)
  - [ADR-003: Sincronización Offline-First y LWW](./adr/ADR-003-offline-first-synchronization.md)
  - [ADR-004: Escrituras Atómicas y Recuperación NBT](./adr/ADR-004-atomic-writes-nbt-recovery.md)
  - [ADR-005: Inspección Estática de Bytecode vs. Ejecución](./adr/ADR-005-static-bytecode-inspection-vs-execution.md)
  - [ADR-006: Bus Reactivo de Eventos Tipado](./adr/ADR-006-typed-event-bus.md)
