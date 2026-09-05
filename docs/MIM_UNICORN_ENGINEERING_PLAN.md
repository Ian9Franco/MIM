# MIM — Unicorn Engineering Plan

> Documento de trabajo para **MIM PR Cycle**.  
> Objetivo: elevar las disciplinas técnicas de MIM que todavía están por debajo de ~8.5/10 de profundidad, sin agregar complejidad vacía ni features artificiales.

---

## Filosofía

La meta no es "meter tecnología porque sí".

La meta es que MIM sea **internamente absurdamente preparado**, pero que para el usuario se sienta simple, estable y obvio.

Principio:

> **Más complejidad interna sólo está justificada si reduce fricción, errores, decisiones o riesgo para el usuario.**

No perseguir complejidad visible.  
No agregar microservicios, Kubernetes, colas o capas sólo para sumar buzzwords.

La ingeniería extra debe resolver problemas reales de MIM.

### Estrategia: Demostración de Criterio vs. Infraestructura Vacía

> *"Esto nunca va a tener ese caudal de usuarios, pero quiero jugar a que sí."*

Un revisor técnico senior o recruiter no busca 9 subsistemas a medio terminar ni arquitecturas distribuidas innecesarias. Busca **2 o 3 piezas construidas de forma impecable**, respaldadas por una base de código limpia y documentadas con criterio de trade-offs.

La senioridad no se demuestra inventando complejidad, sino **demostrando por qué se elige o se descarta cada tecnología**.

### Decisiones conscientes de diseño (Qué NO construir y por qué)

1. **Sync Distribuido multi-master / CRDT:**  
   *Decisión:* **Descartado / Pospuesto.**  
   *Fundamento:* Un algoritmo CRDT resuelve conflictos concurrentes entre miles de usuarios simultáneos. MIM sincroniza el perfil de una sola persona entre dos dispositivos propios (Desktop y Laptop). Implementar Last-Write-Wins (LWW) con timestamps y revision hashes resuelve el 99% de los escenarios reales con una fracción ínfima de código y complejidad.
2. **Chaos Lab como producto / UI interactiva:**  
   *Decisión:* **Descartado de la UI.**  
   *Fundamento:* Una UI de "caos" es código descartable de mantenimiento visual. El valor técnico reside en una **suite de Fault Injection automatizada en CI/tests** (`scripts/__tests__`) que simule fallos de proveedores (429, timeouts, disco lleno) de forma determinista y reproducible.
3. **Circuit Breaker complejo con sondas Half-Open distribuidas:**  
   *Decisión:* **Simplificado.**  
   *Fundamento:* Un cliente HTTP unificado con timeouts estrictos, retry con exponential backoff + full jitter, y caché en memoria/disco entrega el 95% de la resiliencia operativa necesaria para Modrinth, CurseForge y Gemini sin añadir máquinas de estado asíncronas frágiles.

---

# Campos a reforzar

Áreas que hoy tienen margen claro para crecer:

| Campo | Nivel aproximado actual | Objetivo |
|---|---:|---:|
| Backend / APIs | 8.0 | 8.5+ |
| Data / Storage | 8.0 | 8.5+ |
| DevOps / Testing | 8.0 | 8.5+ |
| Arquitectura de software | 8.0 | 8.5+ |
| Seguridad | 7.5 | 8.5+ |
| IA aplicada | 7.0 | 8.5+ |
| Redes / Application Networking | 5.0 | 8.5 |

Las áreas ya fuertes —Desktop, Producto y UX/UI— no son el foco principal de este documento. Cloud y sistemas distribuidos avanzados dejan de ser objetivos activos: sólo deben reaparecer si un problema real del producto justifica reconsiderarlos.

---

# 1. IA aplicada — 7 → 8.5

MIM ya integra IA, pero el salto siguiente es pasar de "usar un modelo" a tener una **capa de AI Engineering real**.

## Propuestas

### 1.1 Tool calling real para MimBot

MimBot no debería limitarse a responder texto.

Debería poder consultar herramientas controladas del sistema, por ejemplo:

- estado del perfil;
- dependencias;
- SAGE;
- versiones;
- seguridad;
- logs;
- metadata del proyecto;
- resultados de Modrinth/CurseForge.

La IA decide qué herramienta consultar, pero las acciones críticas deben seguir bajo control explícito.

### 1.2 RAG local sobre el contexto real de MIM

Construir recuperación contextual sobre:

- documentación de MIM;
- metadata del pack;
- crash logs;
- resultados de SAGE;
- configs;
- manifests;
- historial relevante;
- datos estructurados del proyecto.

Objetivo:

> que MimBot responda usando evidencia del sistema actual, no sólo conocimiento general.

### 1.3 Evaluación automática de MimBot

Crear un dataset fijo de casos y preguntas.

Ejemplos:

- crash conocido;
- dependencia faltante;
- incompatibilidad;
- explicación de un mod;
- respuesta de cuota;
- caso ambiguo.

Cada cambio de modelo, prompt o pipeline debería poder compararse con una baseline.

Métricas posibles:

- exactitud;
- cobertura de causa raíz;
- alucinaciones;
- referencias correctas;
- costo;
- latencia.

### 1.4 Model routing

No todo debería ir al modelo más capaz.

Crear políticas del tipo:

```text
problema simple/determinista
→ no LLM

explicación breve
→ modelo barato/rápido

diagnóstico ambiguo
→ modelo más capaz
```

### 1.5 Multimodal Mod Explainer

Usar:

- descripción;
- metadata;
- tags;
- galería de imágenes;
- contexto de versiones;
- Search Grounding cuando corresponda.

Objetivo: poder explicar mods, shaders o packs aunque el autor haya dejado poca información textual.

### 1.6 Respuestas con evidencia

MimBot debería distinguir explícitamente:

- evidencia encontrada en crash/log;
- dato proveniente de Modrinth/CurseForge;
- información del sistema local;
- inferencia del modelo.

---

# 2. Seguridad — 7.5 → 8.5

## 2.1 Secret management real

Prioridad alta.

- Migrar claves sensibles a `safeStorage` en Electron.
- No persistir secretos en texto plano.
- Migrar automáticamente configuraciones antiguas.
- No volver a mostrar una key completa después de guardarla.
- Revisar si la Web realmente necesita persistencia de claves.

## 2.2 Modelo interno de capacidades

Clasificar operaciones internas:

```text
filesystem:read
filesystem:write
network
destructive
credential-access
```

No hace falta exponer esto al usuario como sistema de permisos.

Puede funcionar como contrato interno para evitar que cualquier módulo haga cualquier cosa.

## 2.3 Trusted supply-chain pipeline

Todo archivo externo debería atravesar un pipeline consistente:

```text
download
→ provenance
→ hash
→ integrity check
→ static security scan
→ license audit
→ content storage
→ atomic staging/install
```

## 2.4 Security regression suite

Crear fixtures sintéticos para casos hostiles:

- ZIP bomb;
- path traversal;
- malformed JAR;
- payload sospechoso;
- filename extremo;
- JSON/body enorme;
- rutas inválidas;
- contenido corrupto.

Objetivo: convertir incidentes de seguridad en regresiones permanentes.

---

# 3. Backend / APIs — 8 → 8.5+

No hace falta sumar endpoints por sumar.

Hay que profundizar comportamiento backend.

## 3.1 Idempotencia

Operaciones sensibles deberían tolerar retries sin duplicar efectos.

Ejemplo:

```text
POST install pack
→ timeout
→ retry
→ mismo operationId
→ MIM detecta operación previa
→ no reinstala todo
```

Aplicable a:

- installs;
- sync;
- publicación;
- builds;
- rescates;
- operaciones largas.

## 3.2 Jobs para operaciones largas

Un modelo común:

```text
queued
running
completed
failed
cancelled
```

Con progreso observable.

Candidatos:

- descarga de packs;
- security scan;
- SAGE;
- build;
- import;
- sincronización.

## 3.3 Contratos compartidos

Schemas Zod como fuente única de verdad para:

- requests;
- responses;
- frontend;
- tests.

Evitar interfaces duplicadas entre cliente y servidor.

## 3.4 Taxonomía de errores

Formalizar errores de dominio.

Ejemplos:

```text
MIM_FILE_LOCKED
MIM_DEPENDENCY_CONFLICT
MIM_PROVIDER_RATE_LIMIT
MIM_INVALID_MODPACK
MIM_STORAGE_FAILURE
MIM_NETWORK_OFFLINE
MIM_SECURITY_REJECTED
```

Cada error debería definir:

- código;
- mensaje;
- retryable / non-retryable;
- severidad;
- acción sugerida.

---

# 4. Data / Storage — 8 → 8.5

## 4.1 Content-addressed storage completo

Usar hash como identidad principal del contenido.

Modelo conceptual:

```text
SHA256
→ blob
→ metadata
→ references
→ profiles using it
```

Permite responder:

> "Este archivo está siendo usado por 7 perfiles."

## 4.2 Garbage collection seguro

Cuando un contenido llega a:

```text
reference count = 0
```

no eliminar inmediatamente.

Pasarlo a:

```text
unreferenced
→ quarantine
→ retention window
→ GC
```

## 4.3 Integrity scrub

Verificación periódica o manual:

- recalcular hashes;
- detectar corrupción;
- detectar metadata huérfana;
- detectar referencias rotas.

## 4.4 Versioned storage migrations

Formalizar:

```text
storage schema v7
→ migration
→ v8
```

Cada migración debería ser:

- idempotente;
- testeable;
- reproducible;
- reversible cuando sea razonable.

---

# 5. DevOps / Testing — 8 → 8.5+

## 5.1 Cada bug importante debe convertirse en fixture

Regla:

> Un bug crítico sólo debería ocurrir una vez.

Después de arreglarlo, dejar un test/fixture que impida su regreso.

## 5.2 Matrix testing

Evaluar tests en más de una combinación relevante.

Especialmente importante por Desktop:

- Windows;
- versiones de Node compatibles;
- configuraciones clave;
- modos Desktop/Web cuando aplique.

## 5.3 Golden fixtures

Crear inputs fijos y outputs esperados para:

- NBT;
- crash logs;
- manifests;
- dependency graphs;
- security scans;
- API transformations.

## 5.4 Mutation testing

Introducir mutation testing en módulos críticos.

Ejemplo:

```ts
if (safe)
```

se muta a:

```ts
if (!safe)
```

Si los tests siguen verdes, la cobertura funcional era insuficiente.

Candidatos:

- `withApiGuard`;
- parsers;
- SAGE;
- security;
- storage;
- dependency resolution.

## 5.5 Fault injection

Crear pruebas que provoquen fallos deliberados:

- API 429;
- timeout;
- conexión caída;
- respuesta inválida;
- disco lleno;
- permiso denegado;
- archivo bloqueado;
- metadata corrupta;
- operación interrumpida.

---

# 6. Arquitectura — 8 → 8.5

No sumar capas por dogma.

Hacer más claros los contratos de las capas existentes.

## 6.1 Application use cases

Extraer operaciones complejas como unidades explícitas:

```text
InstallMod
RepairProfile
PublishModpack
AnalyzeCrash
SynchronizeClub
BuildModpack
```

Objetivo:

- que la UI no coordine 10 servicios;
- concentrar reglas de dominio;
- facilitar tests;
- desacoplar frontend de infraestructura.

## 6.2 Architecture tests

Agregar reglas automáticas de dependencias.

Ejemplos:

```text
lib/modding/
NO puede importar
components/
```

```text
core engines
NO dependen de UI
```

```text
web/
NO importa módulos Desktop-only
```

CI debería romper si se violan fronteras arquitectónicas.

## 6.3 Contratos explícitos entre dominios

Definir interfaces estables entre:

- modding;
- storage;
- intelligence;
- security;
- cloud;
- events.

Evitar dependencias accidentales entre implementaciones concretas.

---

# Proyectos transversales recomendados

En lugar de implementar 30 features inconexas, priorizar proyectos que eleven varias disciplinas simultáneamente.

---

## A. MIM Intelligence Runtime

### Objetivo

Convertir MimBot en una capa real de AI Engineering.

### Incluir

- tool calling;
- RAG local;
- model routing;
- evaluations;
- evidence-aware responses;
- multimodal explainer.

### Campos que eleva

- IA
- Backend
- Arquitectura
- Testing

---

## B. MIM Trusted Pipeline

### Objetivo

Formalizar todo ingreso de archivos externos.

```text
download
→ provenance
→ hash
→ integrity
→ security
→ license
→ content storage
→ atomic staging
```

### Campos que eleva

- Seguridad
- Storage
- Backend
- Arquitectura
- Testing

---

## C. MIM Reliability Lab

### Objetivo

Probar deliberadamente que MIM sabe fallar bien mediante tests automatizados, sin convertirlo en una feature de producto ni en una UI separada.

### Fallos simulables

- Modrinth offline;
- CurseForge 429;
- Gemini quota exhausted;
- Supabase lento;
- Supabase offline;
- filesystem read-only;
- archivo bloqueado;
- disco lleno;
- metadata corrupta;
- JSON inválido;
- descarga interrumpida;
- proceso abortado a mitad.

### Campos que eleva

- Testing
- DevOps
- Backend
- Seguridad
- Networking

---

# Orden sugerido de implementación

No es una orden rígida. PR Cycle debe validar siempre contra el código actual.

## Fase 0 — Foundational Rigor & Type Hygiene (Prioridad Cero)

Antes de construir abstracciones avanzadas, la base de código debe reflejar solidez profesional:
1. Saneamiento de `any` en módulos core (`lib/apiGuard.ts`, `lib/intelligence`, `lib/security`).
2. Reducción y saneamiento de warnings de linter (abandonar gradualmente `--max-warnings=9999`).
3. Ampliación de tests unitarios en la lógica dura (`lib/intelligence/sage`, sanitización y seguridad).
4. Tipado estricto con schemas Zod como single source of truth.

## Fase 1 — Network Resilience & Error Taxonomy (Alta Señal)

1. Cliente HTTP compartido sólo donde existan consumidores repetidos, con timeout, retry, exponential backoff, full jitter y cache; **sin circuit breaker distribuido/half-open como objetivo activo**.
2. Rate-limit awareness para APIs externas (Modrinth, CurseForge, Gemini).
3. Taxonomía de errores formal (`MIM_PROVIDER_RATE_LIMIT`, `MIM_FILE_LOCKED`, etc.) con códigos y flags `retryable`.
4. Idempotencia básica en operaciones de descarga e instalación.

## Fase 2 — Security Baseline

1. Secret management en Electron: migración de API keys y tokens a `safeStorage`.
2. Prohibición de persistencia de secretos en texto plano.
3. Provenance y verificación SHA256 estricta en descargas de artefactos externos.
4. Security regression fixtures (ZIP bomb, path traversal, malformed JARs).

## Fase 3 — AI Engineering Evals

1. Dataset fijo de evaluación para MimBot (15 a 20 casos de prueba con crash logs reales y ground truth).
2. Benchmark automatizado midiendo exactitud diagnóstica, alucinación y latencia/costo.
3. Tool calling controlado para consulta de dependencias y estado del sistema.
4. Distinción explícita de respuestas con evidencia vs. inferencia.

## Fase 4 — Fault Injection Suite (Testing Realista)

1. Tests automatizados de fallos provocados en `scripts/__tests__`:
   - Modrinth caído / offline.
   - Proveedores con HTTP 429 (Rate Limit).
   - Gemini cuota agotada.
   - Disco lleno / filesystem read-only.
   - Archivo JAR bloqueado por otro proceso.
2. Golden fixtures para logs de crash y árboles de dependencias.

## Fase 5 — Storage Integrity & Pipelines Avanzados

1. Hash identity y content references para modpacks y mods compartidos.
2. Garbage collection seguro con período de cuarentena / ventana de retención.
3. Integrity scrub programable para detectar corrupción o metadata huérfana.
4. Versioned storage migrations idempotentes y reproducibles.

## Fase 6 — Evaluado y Pospuesto (Considered & Deferred)

Arquitecturas documentadas para justificar decisiones de diseño, pero congeladas por relación señal/costo:
- **Sync distribuido multi-master / CRDT y Sync Engine offline-first complejo**: reemplazados por Last-Write-Wins con timestamps/revision hashes para el escenario real de una persona en sus propios dispositivos.
- **Cloud avanzado con operation logs, device-awareness, conflict policies e incremental sync como subsistema propio**: fuera del roadmap activo hasta que exista un problema real de producto que lo justifique.
- **Circuit breaker completo con estados OPEN/HALF-OPEN/CLOSED y sondas distribuidas**: reemplazado por timeouts, retry con exponential backoff + full jitter y cache/fallback donde corresponda.
- **Chaos Lab interactivo con UI**: reemplazado por la suite de tests de Fault Injection en CI.
- **RAG vectorial local masivo**: pospuesto en favor de evaluación sistemática sobre prompts estructurados y datos contextuales directos.

---

# Reglas para PR Cycle

Este documento NO debe convertirse en una lista ciega de features.

Antes de cada PR:

1. Revisar `main` actual.
2. Leer commits recientes.
3. Revisar PRs abiertos.
4. Confirmar que el problema sigue existiendo.
5. Evitar zonas activas del usuario.
6. Elegir un solo cambio pequeño.
7. No introducir infraestructura mayor si el problema puede resolverse de forma más simple.
8. No agregar dependencias sin una razón clara.
9. No debilitar tests, seguridad, tipos o CI.
10. Priorizar cambios que eleven más de un campo técnico a la vez.

---

# Criterio de "overengineering correcto"

Una propuesta es válida si cumple al menos una de estas condiciones:

- reduce errores futuros;
- automatiza una regla que hoy depende de memoria humana;
- hace una operación retry-safe;
- mejora recuperación ante fallos;
- elimina estados imposibles;
- mejora observabilidad;
- mejora consistencia;
- protege datos o secretos;
- convierte un bug en una regresión testeada;
- simplifica la experiencia del usuario;
- hace más explícito un contrato arquitectónico.

Una propuesta es sospechosa si existe principalmente para:

- sumar una tecnología;
- hacer el diagrama más impresionante;
- imitar arquitectura de Big Tech sin necesidad;
- crear abstracciones sin más de un consumidor real;
- mover complejidad sin eliminar riesgo;
- agregar infraestructura que el producto todavía no necesita.

---

# Resultado buscado

MIM debería avanzar hacia esto:

```text
                 COMPLEJIDAD INTERNA

AI Runtime
Network Resilience
Trusted Pipeline
Storage Integrity
Security
Architecture Contracts
Fault Injection
CI / Regression Safety

                        ↓

                       MIM

                        ↓

                EXPERIENCIA EXTERNA

                    "Funciona."
```

El objetivo del unicornio no es que el usuario vea la sofisticación.

El objetivo es que **la sofisticación sea la razón por la cual el usuario no necesita verla**.
