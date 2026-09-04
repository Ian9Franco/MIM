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
| Cloud / BaaS | 6.5 | 8.5 |
| Sistemas distribuidos | 5.5 | 8.5 |
| Redes / Application Networking | 5.0 | 8.5 |

Las áreas ya fuertes —Desktop, Producto y UX/UI— no son el foco principal de este documento.

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

# 7. Cloud — 6.5 → 8.5

No meter infraestructura pesada sólo para subir la nota.

Profundizar la relación real:

```text
Desktop ↔ Supabase ↔ Web
```

## 7.1 Sync engine real

En vez de sincronizar snapshots completos sin contexto:

```text
local state
→ change log
→ sync
→ remote state
```

Agregar:

- revision IDs;
- timestamps;
- retry;
- conflict detection;
- offline queue.

## 7.2 Device awareness

Identificar origen de cambios:

```text
deviceId
clientType
lastSeen
revision
```

Ejemplo:

> cambio realizado desde Desktop principal vs Notebook.

## 7.3 Incremental sync

Sincronizar sólo cambios reales.

Evitar re-subir estructuras completas innecesariamente.

## 7.4 Cloud audit trail

Registrar eventos relevantes:

- entidad;
- dispositivo;
- operación;
- revisión;
- timestamp.

No necesariamente visible por defecto al usuario.

## 7.5 Realtime

Usar realtime donde aporte valor real:

- comunidad;
- drafts;
- favoritos;
- publicaciones;
- estados compartidos.

Sin convertir todo el producto en realtime por moda.

---

# 8. Sistemas distribuidos — 5.5 → 8.5

El problema real a resolver:

> ¿Qué pasa cuando Desktop y Web modifican estado mientras uno de los dos está offline?

## 8.1 Revisions

Cada entidad sincronizable debería poder llevar:

```text
revision
updatedAt
deviceId
```

Una escritura contra una revisión vieja debería poder detectarse.

## 8.2 Conflict resolution por tipo de dato

No usar una sola estrategia para todo.

Ejemplos:

### Favoritos

```text
set union / tombstones
```

### Followed mods

```text
set merge
```

### Perfil

```text
field-level merge
```

### Drafts complejos

```text
conflict explícito
```

### Campos simples

```text
LWW cuando sea aceptable
```

## 8.3 Offline operation log

Registrar operaciones locales:

```text
ADD_FAVORITE A
REMOVE_FAVORITE B
UPDATE_PROFILE X
```

Al recuperar conexión:

```text
replay
→ conflict check
→ remote commit
```

## 8.4 Retry-safe distributed operations

Toda operación sincronizada debería tolerar:

- duplicate delivery;
- reorder;
- retry;
- network interruption.

---

# 9. Redes / Application Networking — 5 → 8.5

No implementar TCP por diversión.

Profundizar la resiliencia HTTP real de MIM.

## 9.1 MIM Network Core

Crear un cliente común para:

- Modrinth;
- CurseForge;
- Gemini;
- YouTube;
- traducción;
- Supabase cuando corresponda.

Con:

- timeout;
- cancellation;
- retry;
- exponential backoff;
- jitter;
- concurrency limit;
- rate-limit awareness;
- cache;
- telemetry;
- circuit breaker.

## 9.2 Circuit breaker

Ejemplo:

```text
5 fallos consecutivos de CurseForge
→ circuit OPEN
→ no enviar tráfico durante 30 s
→ cache/fallback
→ HALF-OPEN probe
→ CLOSED si recupera
```

La UI no necesita conocer la implementación.

## 9.3 Network quality awareness

Estados generales:

```text
offline
degraded
normal
```

El sistema puede adaptar:

- retries;
- concurrencia;
- imágenes;
- sync;
- llamadas de IA;
- descargas.

## 9.4 Resumable downloads

Para descargas grandes:

- HTTP Range;
- partial files;
- resume;
- integrity check al finalizar.

Evitar reiniciar una descarga grande desde cero por una caída de conexión.

---

# Proyectos transversales recomendados

En lugar de implementar 30 features inconexas, priorizar proyectos que eleven varias disciplinas simultáneamente.

---

## A. MIM Network Core

### Objetivo

Capa unificada de networking resiliente.

### Incluir

- timeout;
- retry;
- exponential backoff;
- jitter;
- circuit breaker;
- cancellation;
- concurrency;
- rate-limit awareness;
- cache;
- telemetry.

### Campos que eleva

- Redes
- Backend
- Arquitectura
- Resiliencia
- Testing

---

## B. MIM Sync Engine

### Objetivo

Sincronización offline-first consistente entre Desktop, Web y Supabase.

### Incluir

- operation log;
- revisions;
- device IDs;
- incremental sync;
- conflict detection;
- retry seguro;
- merge strategies.

### Campos que eleva

- Cloud
- Sistemas distribuidos
- Data
- Backend
- Arquitectura

---

## C. MIM Intelligence Runtime

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

## D. MIM Trusted Pipeline

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

## E. MIM Reliability Lab / Chaos Lab

### Objetivo

Probar deliberadamente que MIM sabe fallar bien.

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
- Distributed Systems

---

# Idea: MIM Chaos Lab

Modo exclusivo para desarrollo/testing.

No debe ser parte visible de la experiencia normal del usuario.

Ejemplo conceptual:

```text
MIM CHAOS LAB

[ ] Modrinth offline
[ ] CurseForge 429
[ ] Gemini 429
[ ] Supabase +2000ms
[ ] Drop network after 40%
[ ] Filesystem readonly
[ ] Disk full
[ ] Corrupt cache metadata
[ ] Lock target file
```

Objetivo:

> demostrar que MIM no sólo funciona cuando todo está bien, sino que degrada de forma controlada cuando el entorno falla.

Esto representa muy bien la filosofía "overengineered por dentro, correcto por fuera".

---

# Orden sugerido de implementación

No es una orden rígida. PR Cycle debe validar siempre contra el código actual.

## Fase 1 — Reliability Foundation

1. Secret management (`safeStorage`)
2. Error taxonomy
3. Shared network client básico
4. timeout + retry + cancellation
5. fault fixtures iniciales
6. architecture dependency checks

## Fase 2 — Network & Backend Maturity

1. Circuit breaker
2. rate-limit awareness
3. idempotency
4. jobs/progress abstraction
5. resumable downloads
6. golden fixtures

## Fase 3 — Storage & Trusted Pipeline

1. provenance
2. hash identity
3. content references
4. integrity scrub
5. safe GC
6. versioned migrations
7. supply-chain pipeline

## Fase 4 — Cloud / Distributed

1. operation log
2. revisions
3. device awareness
4. incremental sync
5. conflict policies
6. offline replay
7. audit trail

## Fase 5 — AI Engineering

1. MimBot tool interface
2. local/context RAG
3. evidence tagging
4. evaluation dataset
5. model routing
6. multimodal explainer

## Fase 6 — Reliability Lab

1. network failure injection
2. provider 429 injection
3. filesystem failures
4. corrupted state fixtures
5. interrupted operation tests
6. mutation testing

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
Network Core
Sync Engine
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
