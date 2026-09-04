# 🗺️ MIM Documentation & Master Map / Mapa Maestro de Documentación

<div align="center">

**[Documentación en Español](#-mapa-maestro-en-español)** • **[English Documentation](#-master-map-in-english)**

</div>

> **Estado del Proyecto:** MIM es un sistema de ingeniería modular para Minecraft en **desarrollo activo y beta avanzada** (v11.3.0).  
> Ver [PROJECT_STATUS.md](./PROJECT_STATUS.md) para el informe de madurez técnica real y zonas de deuda asumida.

---

## 🇪🇸 Mapa Maestro en Español

Para no perderte entre los documentos, esta guía clasifica cada archivo por su **función exacta y cuándo debés abrirlo**:

### 1. 🎯 Planificación & Día a Día (¿Qué hacer ahora?)
| Documento | Propósito | ¿Cuándo leerlo? |
| :--- | :--- | :--- |
| **[whosnext.md](./whosnext.md)** 🟢 | **Checklist táctico del sprint activo (v11.3.0).** Tareas inmediatas de MimBot, seguridad, optimizaciones de UI y deuda técnica urgente. | **Siempre.** Es el archivo vivo de trabajo diario. |
| **[ROADMAP.md](./ROADMAP.md)** | **Hitos y evolución estratégica.** Registro de versiones completadas (v9, v10, v11) y visión de largo plazo. | Para entender de dónde viene el proyecto y hacia dónde va. |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | **Auditoría de madurez honesta.** Qué funciona al 100%, qué es experimental y contexto de desarrollo solo-dev. | Antes de tomar decisiones de arquitectura pesadas. |
| **[BACKLOG.md](./BACKLOG.md)** | **Banco de ideas y mejoras diferidas.** Tareas no urgentes anotadas para el futuro. | Al planificar nuevas iteraciones. |

---

### 2. 🏛️ Arquitectura & Sistema General (¿Cómo funciona MIM?)
| Documento | Propósito | ¿Cuándo leerlo? |
| :--- | :--- | :--- |
| **[MIM.md](./MIM.md)** 📘 | **Manual Técnico Maestro.** La explicación más completa de MIM: flujos de datos, estructura de carpetas, frontend, backend y ciclo de vida. | Para entender el sistema completo de punta a punta. |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | **Topología y Motores.** Los 7 dominios de `lib/` desacoplados y el bus de eventos reactivo (`MimEventMap`). | Al crear nuevos módulos o modificar la comunicación interna. |
| **[DISTRIBUTED_ARCHITECTURE.md](./DISTRIBUTED_ARCHITECTURE.md)** | **Sistemas Distribuidos & Sincronización.** Modelo Offline-First, Last-Write-Wins (LWW) y sincronización con Supabase. | Al tocar lógica de sincronización entre Desktop y Web. |
| **[API.md](./API.md)** | **Catálogo de Endpoints HTTP.** Referencia de rutas REST en `app/api` con sus métodos, parámetros y respuestas. | Al conectar pantallas o servicios con el backend de Next.js. |
| **[SYSTEMS_SUMMARY.md](./SYSTEMS_SUMMARY.md)** | **Ficha Técnica Ejecutiva.** Métricas de rendimiento, latencias y consumo de recursos de los motores. | Para consultas rápidas de specs y límites. |

---

### 3. 🛡️ Seguridad & Blindaje Perimetral
| Documento | Propósito | ¿Cuándo leerlo? |
| :--- | :--- | :--- |
| **[SECURITY_ENGINE.md](./SECURITY_ENGINE.md)** | **Análisis Estático de Bytecode.** Cómo inspecciona MIM los archivos `.jar` en busca de malware sin ejecutarlos. | Al modificar el escáner de mods o reglas de detección. |
| **[THREAT_MODEL.md](./THREAT_MODEL.md)** | **Modelo de Amenazas STRIDE.** Análisis formal de seguridad, vectores de ataque mitigados y superficies expuestas. | En auditorías de seguridad y revisiones de infraestructura. |
| **[WEB_HARDENING.md](./WEB_HARDENING.md)** | **Perímetro Edge de MIMweb.** Reglas de rate limiting, headers defensivos y blindaje de la versión web pública. | Al desplegar o tocar rutas públicas en Vercel/Edge. |

---

### 4. 🧠 Motores de Dominio & Benchmarks
| Documento | Propósito | ¿Cuándo leerlo? |
| :--- | :--- | :--- |
| **[SAGE_RESCUE.md](./SAGE_RESCUE.md)** 🩺 | **Guía Maestra de SAGE.** Diagnóstico forense de crashes, árbol de eliminación y rescate de jugadores. | Al trabajar en la inteligencia de diagnóstico o MimBot. |
| **[SAGE_EVALUATION.md](./SAGE_EVALUATION.md)** | **Benchmark Cuantitativo de SAGE.** Evaluación sobre dataset de 125 crashes reales (F1 100%, latencia 0.05ms). | Para verificar que los cambios en SAGE no degraden la precisión. |
| **[NBT_RESCUE_SPEC.md](./NBT_RESCUE_SPEC.md)** | **Especificación Binaria NBT.** Protocolo v19133, compresión gzip y el Invariante de Cero Pérdida de Datos. | Al tocar código de lectura/escritura de archivos `.dat`. |
| **[ADUANA_BENCHMARKS.md](./ADUANA_BENCHMARKS.md)** | **Benchmark de Almacenamiento Aduana.** Rendimiento de Content-Addressed Storage y deduplicación (>2.0 GB/s). | Para optimizaciones de I/O y caché en disco. |
| **[FOMO_CLOUD.md](./FOMO_CLOUD.md)** | **Módulo FOMO & Media.** Descargas vía yt-dlp, curación de modpacks comunitarios y showcase de YouTube. | Al trabajar en componentes o servicios de la pestaña FOMO. |

---

### 5. ☁️ Base de Datos & Backend Cloud
| Documento | Propósito | ¿Cuándo leerlo? |
| :--- | :--- | :--- |
| **[supabase_setup_and_api.md](./supabase_setup_and_api.md)** | **Guía de Supabase.** Esquema SQL, políticas RLS, autenticación y configuración de credenciales. | Al crear tablas, migraciones o tocar queries remotas. |

---

### 6. 💡 Propuestas Técnicas & RFCs (Diseños de Futuro)
| Documento | Propósito |
| :--- | :--- |
| **[PROPOSAL_SAGE_MIMBOT_INTELLIGENCE.md](./PROPOSAL_SAGE_MIMBOT_INTELLIGENCE.md)** | Diseño conceptual para potenciar MimBot con grafos y cascada de modelos. |
| **[PROPOSAL_INTELLIGENT_MOD_EXPLAINER.md](./PROPOSAL_INTELLIGENT_MOD_EXPLAINER.md)** | Diseño para generar resúmenes con IA mediante Gemini Search Grounding. |
| **[PROPOSAL_DATA_SOVEREIGNTY_VAULT.md](./PROPOSAL_DATA_SOVEREIGNTY_VAULT.md)** | Propuesta de baúl criptográfico para soberanía total de datos locales. |

---

### 7. 🚀 Guías de Operación & Herramientas
| Documento | Propósito |
| :--- | :--- |
| **[ONBOARDING.md](./ONBOARDING.md)** | Guía de configuración inicial para desarrolladores y nuevos entornos. |
| **[REPRODUCIBILITY.md](./REPRODUCIBILITY.md)** | Instrucciones para reproducir builds, Docker y tests de forma determinista. |
| **[DEMO.md](./DEMO.md)** | Guía interactiva para correr el showcase por consola (`npm run demo`). |

---

### 8. 📑 Decisiones de Arquitectura Inmutables (ADRs)
Ubicadas en [docs/adr/](./adr/README.md):
- **[ADR-001](./adr/ADR-001-deterministic-diagnosis-vs-llm.md)**: Diagnóstico Determinista vs. LLM
- **[ADR-002](./adr/ADR-002-content-addressed-caching.md)**: Almacenamiento Direccionado por Contenido (CAS)
- **[ADR-003](./adr/ADR-003-offline-first-synchronization.md)**: Sincronización Offline-First y LWW
- **[ADR-004](./adr/ADR-004-atomic-writes-nbt-recovery.md)**: Escrituras Atómicas y Recuperación Segura NBT
- **[ADR-005](./adr/ADR-005-static-bytecode-inspection-vs-execution.md)**: Inspección Estática de Bytecode vs. Ejecución
- **[ADR-006](./adr/ADR-006-typed-event-bus.md)**: Bus Reactivo de Eventos Tipado

---

### 9. 📜 Histórico
- **[CHANGELOG.md](./CHANGELOG.md)**: Historial completo de versiones y cambios.
- **[release-notes-v10.5.0.md](./release-notes-v10.5.0.md)** / **[release-notes-v10.5.1.md](./release-notes-v10.5.1.md)**: Notas de versiones anteriores.

---

<br/>

## 🇬🇧 Master Map in English

A comprehensive index mapping every engineering specification, benchmark, and architectural document in MIM:

### 📋 Project Status & Daily Workflow
- **[whosnext.md](./whosnext.md)**: Active tactical sprint checklist (v11.3.0). Current engineering priorities.
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**: Honest engineering state, known technical debt, and solo-dev context.
- **[ROADMAP.md](./ROADMAP.md)**: Multi-version strategic roadmap and milestones (v9 to v11).
- **[BACKLOG.md](./BACKLOG.md)**: Long-term technical backlog and deferred items.

### 🏛️ Core Architecture & Distributed Systems
- **[MIM.md](./MIM.md)**: Master technical document covering end-to-end data flows, lifecycle, and component structure.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Decoupled 7-engine domain topology and typed reactive event bus (`MimEventMap`).
- **[DISTRIBUTED_ARCHITECTURE.md](./DISTRIBUTED_ARCHITECTURE.md)**: Offline-first synchronization, Last-Write-Wins (LWW) conflict resolution, and PostgreSQL RLS.
- **[API.md](./API.md)**: HTTP REST endpoint specification and request/response contracts.
- **[SYSTEMS_SUMMARY.md](./SYSTEMS_SUMMARY.md)**: Executive hardware profile, memory footprints, and engine latency summary.

### 🛡️ AppSec & Perimeter Defense
- **[SECURITY_ENGINE.md](./SECURITY_ENGINE.md)**: Static bytecode scanner for untrusted Java `.jar` archives without execution.
- **[THREAT_MODEL.md](./THREAT_MODEL.md)**: Formal STRIDE threat modeling and mitigation matrix.
- **[WEB_HARDENING.md](./WEB_HARDENING.md)**: Edge defense rules, IP rate limiting, and defensive response headers for MIMweb.

### 🔬 Empirical Benchmarks & Subsystem Specs
- **[SAGE_RESCUE.md](./SAGE_RESCUE.md)**: SAGE crash intelligence forensics and player recovery engine.
- **[SAGE_EVALUATION.md](./SAGE_EVALUATION.md)**: 125-case empirical evaluation report (100% Macro F1, 0.05ms latency).
- **[NBT_RESCUE_SPEC.md](./NBT_RESCUE_SPEC.md)**: NBT binary safe recovery protocol (v19133) and Zero-Data-Loss Invariant.
- **[ADUANA_BENCHMARKS.md](./ADUANA_BENCHMARKS.md)**: Content-addressed caching throughput benchmarks (>2.0 GB/s).
- **[FOMO_CLOUD.md](./FOMO_CLOUD.md)**: Community pool, yt-dlp media engine, and showcase sync.

### 📑 Architecture Decision Records (ADRs)
Located under [docs/adr/](./adr/README.md):
- [ADR-001: Deterministic Diagnosis vs. LLM](./adr/ADR-001-deterministic-diagnosis-vs-llm.md)
- [ADR-002: Content-Addressed Caching](./adr/ADR-002-content-addressed-caching.md)
- [ADR-003: Offline-First Synchronization & LWW](./adr/ADR-003-offline-first-synchronization.md)
- [ADR-004: Atomic Writes & Zero-Loss NBT Recovery](./adr/ADR-004-atomic-writes-nbt-recovery.md)
- [ADR-005: Static Bytecode Inspection vs. Execution](./adr/ADR-005-static-bytecode-inspection-vs-execution.md)
- [ADR-006: Reactive Typed Event Bus](./adr/ADR-006-typed-event-bus.md)
