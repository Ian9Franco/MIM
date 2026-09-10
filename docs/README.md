# 🗂️ Catálogo & Mapa Maestro de Documentación Técnica / Technical Documentation Index

<div align="center">

**[Documentación en Español](#-mapa-maestro-en-español)** • **[English Documentation](#-master-map-in-english)**

</div>

> **Catálogo de Ingeniería MIM:** Índice estructurado de especificaciones, benchmarks, modelos de amenazas, planes y arquitectura (v11.4.5).  
> *(Para la presentación general del software a usuarios, consultar el [README.es.md](../README.es.md) en la raíz).*

> [!TIP]
> 📋 **¿Buscás qué falta hacer en el proyecto?** Consultá el resumen maestro consolidado en **[PENDING.md](./PENDING.md)**, con enlaces directos a cada especificación técnica.

---

## 🇪🇸 Mapa Maestro en Español

La documentación está organizada en **carpetas temáticas limpias** con sus propios índices (`README.md`):

```text
docs/
├── README.md                      # Catálogo maestro que estás leyendo
├── PENDING.md                     # 📋 Resumen punto por punto de todo lo que falta hacer
│
├── 📋 OBJETIVOS, TAREAS & PLANEACIÓN
│   ├── planning/                  # El cerebro táctico: roadmap, whosnext, unicorn, status
│   ├── proposals/                 # RFCs y propuestas técnicas de diseño futuro
│   └── releases/                  # Changelog maestro, unreleased queue y bitácora Hogwarts
│
└── 🧠 CONOCIMIENTO, ARQUITECTURA & ESPECIFICACIONES
    ├── architecture/              # Topología, límites de capas, catálogo API y servidores
    ├── engines/                   # Motores de dominio: SAGE, NBT Rescue, Aduana y FOMO
    ├── security/                  # Bytecode scanner, threat model, safeStorage y web
    ├── cloud/                     # Base de datos Supabase, políticas RLS y esquemas SQL
    ├── guides/                    # Onboarding, reproducibilidad, demo tour y recruiter review
    ├── adr/                       # Architecture Decision Records inmutables (ADR-001 a ADR-007)
    └── automatizaciones/          # Bitácoras de automatizaciones y scripts
```

---

### 1. 🎯 Objetivos, Tareas & Planeación ([`docs/planning/`](./planning/README.md))
| Documento | Metáfora / Propósito |
| :--- | :--- |
| **[unicorn.md](./planning/unicorn.md)** 🦄 | **El Unicornio:** Plan maestro de ingeniería. Visión de profundidad técnica y decisiones de diseño. |
| **[whosnext.md](./planning/whosnext.md)** 🟢 | **Who's Next:** Tablero táctico de tareas inmediatas con criterios de aceptación claros para el sprint. |
| **[ROADMAP.md](./planning/ROADMAP.md)** 📌 | **El Mapa de Ruta:** Evolución estratégica oficial por versiones (v11.4.5) y estado de hitos. |
| **[project-status.md](./planning/project-status.md)** ⚖️ | **La Foto Real:** Auditoría honesta de madurez; separa lo 100% sólido de la deuda técnica real. |
| **[sprint-action-plan.md](./planning/sprint-action-plan.md)** ⚡ | **Plan de Acción:** Guía de ejecución para Issues #57 (Red), #58 (Server Manager) y #60 (Monorepo). |
| **[refactoring-backlog.md](./planning/refactoring-backlog.md)** 🧹 | **Limpieza & Deuda:** Inventario de modularizaciones y simplificación de componentes monolíticos. |
| **[ux-feedback.md](./planning/ux-feedback.md)** 🎨 | **Feedback & Pulido UI:** Mejoras pendientes de experiencia de usuario en Mobile, Desktop y MimBot. |

---

### 2. 🏛️ Arquitectura & Límites del Sistema ([`docs/architecture/`](./architecture/README.md))
| Documento | Propósito |
| :--- | :--- |
| **[overview.md](./architecture/overview.md)** 🗺️ | **Topología y Motores:** Vista panorámica de los 7 dominios en `lib/` y el bus reactivo (`MimEventMap`). |
| **[mim-core.md](./architecture/mim-core.md)** 📘 | **Manual Maestro de MIM:** Especificación integral de ciclo de vida, carpetas, frontend, backend y standalone. |
| **[boundaries.md](./architecture/boundaries.md)** 🛡️ | **Fronteras de Código:** Reglas de importación unidireccional forzadas por CI (`lint:architecture`). |
| **[api-catalog.md](./architecture/api-catalog.md)** 🔌 | **Catálogo de Endpoints:** Referencia de rutas REST en `app/api/` con métodos, parámetros y respuestas. |
| **[distributed-sync.md](./architecture/distributed-sync.md)** 🔄 | **Sistemas Distribuidos:** Modelo Offline-First, sincronización Last-Write-Wins (LWW) y Supabase. |
| **[server-manager.md](./architecture/server-manager.md)** 🖥️ | **Server Manager Foundation:** Contratos SFTP, preflight, snapshots inmutables y reconciliación remota. |
| **[server-audit.md](./architecture/server-audit.md)** 🔍 | **Auditoría de Servidores:** Guía paso a paso del protocolo de escaneo SFTP de solo lectura. |
| **[systems-summary.md](./architecture/systems-summary.md)** 📊 | **Ficha Ejecutiva:** Latencias, consumo de memoria y métricas de rendimiento por subsistema. |
| **[monorepo-inventory.md](./architecture/monorepo-inventory.md)** 📦 | **Inventario del Monorepo:** Análisis de grafo de dependencias y desacoplamiento de packages. |

---

### 3. 🧠 Motores de Dominio & Benchmarks ([`docs/engines/`](./engines/README.md))
| Documento | Propósito |
| :--- | :--- |
| **[sage.md](./engines/sage.md)** 🩺 | **Motor SAGE:** Diagnóstico forense de crashes de Minecraft y correlación de dependencias. |
| **[sage-eval.md](./engines/sage-eval.md)** 📊 | **Evaluación SAGE:** Métricas cuantitativas (100% F1, 84% Top-1, 0.05ms latencia) sobre 125 crashes reales. |
| **[nbt-rescue.md](./engines/nbt-rescue.md)** 📦 | **Especificación NBT Recovery:** Protocolo binario v19133 gzip e invariante zero-data-loss (`.mim_bak`). |
| **[aduana.md](./engines/aduana.md)** 🛂 | **Almacenamiento CAS Aduana:** Content-Addressed Storage con deduplicación y hashing (>2.0 GB/s). |
| **[fomo.md](./engines/fomo.md)** 🌟 | **Motor FOMO & Media:** Catálogo comunitario, resolución de dependencias y pipeline de YouTube/yt-dlp. |

---

### 4. 🛡️ Seguridad, Threat Model & Nube ([`docs/security/`](./security/README.md) y [`docs/cloud/`](./cloud/README.md))
| Documento | Propósito |
| :--- | :--- |
| **[bytecode-scanner.md](./security/bytecode-scanner.md)** 🔍 | **Análisis Estático de Bytecode:** Inspección de firmas de malware en `.jar` sin ejecución. |
| **[threat-model.md](./security/threat-model.md)** 🎯 | **Modelo de Amenazas STRIDE:** Vectores mitigados e IOCs conocidos (Fracturiser/Necro). |
| **[secrets.md](./security/secrets.md)** 🔑 | **Gestión de Secretos:** Persistencia cifrada en Electron mediante `safeStorage` (Windows DPAPI). |
| **[web-hardening.md](./security/web-hardening.md)** 🌐 | **Perímetro de Seguridad Web:** Hardening, rate limiting y reglas de modularización en Supabase. |
| **[supabase.md](./cloud/supabase.md)** ☁️ | **Infraestructura Supabase:** Esquemas SQL, políticas RLS y autenticación. |

---

### 5. 📑 Architecture Decision Records ([`docs/adr/`](./adr/README.md))
Ubicadas en [docs/adr/](./adr/README.md):
- **[ADR-001](./adr/ADR-001-deterministic-diagnosis-vs-llm.md)**: Diagnóstico Determinista vs. LLM
- **[ADR-002](./adr/ADR-002-content-addressed-caching.md)**: Almacenamiento Direccionado por Contenido (CAS)
- **[ADR-003](./adr/ADR-003-offline-first-synchronization.md)**: Sincronización Offline-First y LWW
- **[ADR-004](./adr/ADR-004-atomic-writes-nbt-recovery.md)**: Escrituras Atómicas y Recuperación Segura NBT
- **[ADR-005](./adr/ADR-005-static-bytecode-inspection-vs-execution.md)**: Inspección Estática de Bytecode vs. Ejecución
- **[ADR-006](./adr/ADR-006-typed-event-bus.md)**: Bus Reactivo de Eventos Tipado
- **[ADR-007](./adr/ADR-007-mimbot-model-gateway.md)**: MIMbot Model Gateway agnóstico y GLM

---

### 6. 💡 Propuestas Técnicas & RFCs ([`docs/proposals/`](./proposals/README.md))
| Documento | Propósito |
| :--- | :--- |
| **[mimbot-sage-graph.md](./proposals/mimbot-sage-graph.md)** | Diseño conceptual para potenciar MimBot con grafos y cascada de modelos. |
| **[mod-explainer.md](./proposals/mod-explainer.md)** | Diseño de resúmenes de mods con IA multimodal y grounding. |
| **[vault-data-sovereignty.md](./proposals/vault-data-sovereignty.md)** | Propuesta de baúl criptográfico local para soberanía total de datos. |

---

### 7. 🚀 Guías de Operación & Onboarding ([`docs/guides/`](./guides/README.md))
| Documento | Propósito |
| :--- | :--- |
| **[onboarding.md](./guides/onboarding.md)** 🛠️ | Guía de configuración y arranque para desarrolladores. |
| **[reproducibility.md](./guides/reproducibility.md)** 🔁 | Instrucciones para reproducir builds, benchmarks y tests. |
| **[demo.md](./guides/demo.md)** 🎮 | Guía interactiva del tour de demostración (`npm run demo`). |
| **[recruiter-review.md](./guides/recruiter-review.md)** 👔 | Auditoría técnica externa y evaluación de portfolio. |

---

### 8. 📜 Releases & Auditoría Histórica ([`docs/releases/`](./releases/README.md))
| Documento | Propósito |
| :--- | :--- |
| **[CHANGELOG.md](./releases/CHANGELOG.md)** 📜 | Changelog maestro y registro cronológico de versiones. |
| **[UNRELEASED.md](./releases/UNRELEASED.md)** ⏳ | Cambios acumulados en curso para la próxima versión. |
| **[hogwarts.md](./releases/hogwarts.md)** 🏰 | Bitácora histórica de PRs automáticos ejecutados por agentes (Hermione, Harry, McGonagall). |
| **[release-audit.md](./releases/release-audit.md)** 🔍 | Verificación de veracidad documental entre código y notas. |
| **[roadmap-v10-historic.md](./releases/roadmap-v10-historic.md)** 🏛️ | Archivo histórico de hitos cerrados en versiones anteriores. |
| **[backlog-v10-historic.md](./releases/backlog-v10-historic.md)** 📦 | Archivo histórico del backlog de la serie v10. |

---

<br/>

## 🇬🇧 Master Map in English

Physical folder layout:

- `docs/planning/`: Master strategic roadmap, tactical backlog (`whosnext.md`), master engineering plan (`unicorn.md`), project status, action plans, and refactoring inventory.
- `docs/architecture/`: System topologies, master manual (`mim-core.md`), architecture boundaries, and HTTP API catalog.
- `docs/engines/`: Specialized domain engine specifications and quantitative benchmarks (SAGE, Aduana, NBT Rescue, FOMO).
- `docs/security/`: Static bytecode scanner specifications, STRIDE threat models, secrets (safeStorage), and web hardening.
- `docs/cloud/`: Supabase database schemas, RLS policies, and cloud integration.
- `docs/guides/`: Developer onboarding, reproducibility recipes, demo tour, and technical portfolio review.
- `docs/adr/`: Architecture Decision Records (ADR-001 to ADR-007).
- `docs/proposals/`: Architectural RFC proposals and future design documents.
- `docs/releases/`: Changelog, unreleased queue, release notes, and automated PR audit logs (`hogwarts.md`).
