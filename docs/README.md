# 🗂️ Catálogo & Mapa Maestro de Documentación Técnica / Technical Documentation Index

<div align="center">

**[Documentación en Español](#-mapa-maestro-en-español)** • **[English Documentation](#-master-map-in-english)**

</div>

> **Catálogo de Ingeniería MIM:** Índice estructurado de especificaciones, benchmarks, modelos de amenazas y arquitectura (v11.4.5).  
> *(Para la presentación general del software a usuarios, consultar el [README.es.md](../README.es.md) en la raíz).*

---

## 🇪🇸 Mapa Maestro en Español

La documentación está organizada físicamente en carpetas temáticas para que encuentres todo al instante:

```text
docs/
├── README.md                      # Este catálogo técnico
├── whosnext.md                    # 🟢 Tablero táctico del sprint activo (v11.4.5)
│
├── architecture/                  # Arquitectura del sistema y catálogo de APIs
├── security/                      # Seguridad, escáner de bytecode y threat models
├── engines/                       # Especificaciones profundas y benchmarks de motores
├── cloud/                         # Infraestructura de nube y base de datos Supabase
├── proposals/                     # RFCs y propuestas técnicas de diseño
├── planning/                      # Roadmap unificado y auditoría de madurez
├── guides/                        # Guías operativas, onboarding y reproducibilidad
├── releases/                      # Changelog, notas de versiones y archivos históricos
└── adr/                           # Architecture Decision Records (inmutables)
```

---

### 1. 🎯 Sprint Activo & Planificación
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[whosnext.md](./whosnext.md)** 🟢 | `docs/` | **Checklist táctico del sprint activo (v11.4.5).** Tareas inmediatas de MimBot, seguridad, optimizaciones de UI y deuda técnica urgente. |
| **[ROADMAP.md](./planning/ROADMAP.md)** 📌 | `docs/planning/` | **Roadmap Técnico Oficial (v11.4.5).** Visión estratégica y consolidación de metas en curso. *(Historial previo en [releases/ROADMAP_v10_HISTORIC.md](./releases/ROADMAP_v10_HISTORIC.md))*. |
| **[PROJECT_STATUS.md](./planning/PROJECT_STATUS.md)** ⚖️ | `docs/planning/` | **Auditoría de Madurez & Transparencia.** Evaluación honesta de qué motores son estables, cuáles están en beta y zonas de deuda asumida. |

---

### 2. 🏛️ Arquitectura & Sistema General
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[MIM.md](./architecture/MIM.md)** 📘 | `docs/architecture/` | **Manual Técnico Maestro.** La explicación más completa de MIM: flujos de datos, estructura de carpetas, frontend, backend y ciclo de vida. |
| **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** | `docs/architecture/` | **Topología y Motores.** Los 7 dominios de `lib/` desacoplados y el bus de eventos reactivo (`MimEventMap`). |
| **[DISTRIBUTED_ARCHITECTURE.md](./architecture/DISTRIBUTED_ARCHITECTURE.md)** | `docs/architecture/` | **Sistemas Distribuidos & Sincronización.** Modelo Offline-First, Last-Write-Wins (LWW) y sincronización con Supabase. |
| **[API.md](./architecture/API.md)** | `docs/architecture/` | **Catálogo de Endpoints HTTP.** Referencia de rutas REST en `app/api` con sus métodos, parámetros y respuestas. |
| **[SYSTEMS_SUMMARY.md](./architecture/SYSTEMS_SUMMARY.md)** | `docs/architecture/` | **Ficha Técnica Ejecutiva.** Métricas de rendimiento, latencias y consumo de recursos de los motores. |

---

### 3. 🛡️ Seguridad & Blindaje Perimetral
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[SECURITY_ENGINE.md](./security/SECURITY_ENGINE.md)** | `docs/security/` | **Análisis Estático de Bytecode.** Cómo inspecciona MIM los archivos `.jar` en busca de malware sin ejecutarlos. |
| **[THREAT_MODEL.md](./security/THREAT_MODEL.md)** | `docs/security/` | **Modelo de Amenazas STRIDE.** Análisis formal de seguridad, vectores de ataque mitigados y superficies expuestas. |
| **[WEB_HARDENING.md](./security/WEB_HARDENING.md)** | `docs/security/` | **Perímetro Edge de MIMweb.** Reglas de rate limiting, headers defensivos y blindaje de la versión web pública. |

---

### 4. 🧠 Motores de Dominio & Benchmarks
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[SAGE_RESCUE.md](./engines/SAGE_RESCUE.md)** 🩺 | `docs/engines/` | **Guía Maestra de SAGE.** Diagnóstico forense de crashes, árbol de eliminación y rescate de jugadores. |
| **[SAGE_EVALUATION.md](./engines/SAGE_EVALUATION.md)** | `docs/engines/` | **Benchmark Cuantitativo de SAGE.** Evaluación sobre dataset de 125 crashes reales (F1 100%, latencia 0.05ms). |
| **[NBT_RESCUE_SPEC.md](./engines/NBT_RESCUE_SPEC.md)** | `docs/engines/` | **Especificación Binaria NBT.** Protocolo v19133, compresión gzip y el Invariante de Cero Pérdida de Datos. |
| **[ADUANA_BENCHMARKS.md](./engines/ADUANA_BENCHMARKS.md)** | `docs/engines/` | **Benchmark de Almacenamiento Aduana.** Rendimiento de Content-Addressed Storage y deduplicación (>2.0 GB/s). |
| **[FOMO_CLOUD.md](./engines/FOMO_CLOUD.md)** | `docs/engines/` | **Módulo FOMO & Media.** Descargas vía yt-dlp, curación de modpacks comunitarios y showcase de YouTube. |

---

### 5. ☁️ Base de Datos & Backend Cloud
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[supabase_setup_and_api.md](./cloud/supabase_setup_and_api.md)** | `docs/cloud/` | **Guía de Supabase.** Esquema SQL, políticas RLS, autenticación y configuración de credenciales. |

---

### 6. 💡 Propuestas Técnicas & RFCs (Diseños de Futuro)
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[PROPOSAL_SAGE_MIMBOT_INTELLIGENCE.md](./proposals/PROPOSAL_SAGE_MIMBOT_INTELLIGENCE.md)** | `docs/proposals/` | Diseño conceptual para potenciar MimBot con grafos y cascada de modelos. |
| **[PROPOSAL_INTELLIGENT_MOD_EXPLAINER.md](./proposals/PROPOSAL_INTELLIGENT_MOD_EXPLAINER.md)** | `docs/proposals/` | Diseño para generar resúmenes con IA mediante Gemini Search Grounding. |
| **[PROPOSAL_DATA_SOVEREIGNTY_VAULT.md](./proposals/PROPOSAL_DATA_SOVEREIGNTY_VAULT.md)** | `docs/proposals/` | Propuesta de baúl criptográfico para soberanía total de datos locales. |

---

### 7. 🚀 Guías de Operación & Onboarding
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[ONBOARDING.md](./guides/ONBOARDING.md)** | `docs/guides/` | Guía de configuración inicial para desarrolladores y nuevos entornos. |
| **[REPRODUCIBILITY.md](./guides/REPRODUCIBILITY.md)** | `docs/guides/` | Instrucciones para reproducir builds, Docker y tests de forma determinista. |
| **[DEMO.md](./guides/DEMO.md)** | `docs/guides/` | Guía interactiva para correr el showcase por consola (`npm run demo`). |

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

### 9. 📜 Histórico de Lanzamientos
| Documento | Ubicación | Propósito |
| :--- | :--- | :--- |
| **[CHANGELOG.md](./releases/CHANGELOG.md)** | `docs/releases/` | Historial completo de versiones y cambios. |
| **[release-notes-v10.5.0.md](./releases/release-notes-v10.5.0.md)** | `docs/releases/` | Notas de la versión v10.5.0. |
| **[release-notes-v10.5.1.md](./releases/release-notes-v10.5.1.md)** | `docs/releases/` | Notas de la versión v10.5.1. |
| **[ROADMAP_v10_HISTORIC.md](./releases/ROADMAP_v10_HISTORIC.md)** | `docs/releases/` | Archivo histórico de hitos cerrados en versiones v9 y v10. |
| **[BACKLOG_v10_HISTORIC.md](./releases/BACKLOG_v10_HISTORIC.md)** | `docs/releases/` | Archivo del backlog MoSCoW original de v10 (completado). |

---

<br/>

## 🇬🇧 Master Map in English

Physical folder layout:

- `docs/architecture/`: System topologies, master reference (`MIM.md`), distributed patterns, and HTTP API catalog.
- `docs/security/`: Static bytecode scanner specifications, STRIDE threat models, and web edge hardening.
- `docs/engines/`: In-depth subsystem specifications and quantitative benchmarks (SAGE, Aduana, NBT Rescue, FOMO).
- `docs/cloud/`: Supabase database schemas, RLS policies, and cloud integration.
- `docs/proposals/`: Architectural RFC proposals and future design documents.
- `docs/planning/`: Project maturity status, long-term roadmap, and technical backlog.
- `docs/guides/`: Developer onboarding, reproducibility recipes, and demo tour.
- `docs/releases/`: Project changelog and release notes.
- `docs/adr/`: Architecture Decision Records (ADR-001 to ADR-006).
- `docs/whosnext.md`: Live active sprint checklist.
