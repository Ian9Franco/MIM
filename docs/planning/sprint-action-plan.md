# Plan de acción: issues #57, #58 y #60

Fecha: 2026-09-09. Base local revisada: `a824187`.

Fuentes: [#57](https://github.com/Ian9Franco/MIM/issues/57), [#58](https://github.com/Ian9Franco/MIM/issues/58), [#60](https://github.com/Ian9Franco/MIM/issues/60), sus comentarios y [PR #59](https://github.com/Ian9Franco/MIM/pull/59), confirmado como mergeado.

Este documento propone el trabajo restante. La revisión de código fue dirigida a estas iniciativas; el inventario exhaustivo de #60 sigue pendiente. No se implementaron funciones ni se modificaron issues.

## Estado actual de Server Manager — 2026-09-09

La primera superficie integrada está en `/servers`: conexión SSH/SFTP con verificación de host y comparación de mods contra un build AllHost existente. La lectura incompleta devuelve advertencias y **ningún diff**, para no confundir errores con archivos ausentes. Las credenciales no se persisten; la conexión se cierra al terminar/cancelar.

La matriz actual de implementación/integración/validación está en [ROADMAP §9](ROADMAP.md#9-server-manager--sincronización-remota-issue-58--en-progreso). Los módulos SRV-3 a SRV-7 existentes no cierran su aceptación. Persistencia, reinicio, escrituras, configs/mundos, hosting externo y packaging Electron siguen pendientes.

La tabla y el orden siguientes conservan el plan histórico y no prevalecen sobre esa matriz.

## Estado comprobado al redactar el plan original

| Issue | Existe / Completado | Falta |
|---|---|---|
| #57 | **COMPLETO (NET-1 & NET-2):** Contratos puros, clasificación determinista, política de retry con jitter y presupuesto, `fetchWithRetry`, `fetchJsonWithRetry` y `DraftDownloadBroker`. | Ninguno (Issue #57 cerrado con 100% de cobertura en tests). |
| #58 | **Foundation + SRV-1 + SRV-2 + SRV-3:** Contratos puros, scanner desde Buffer, validator adapter, diff, plan, auditoría pura, UI de auditoría, preflight bidireccional, reconciliación de configs, snapshots durables pre-mutación, detección de stale plans y memory store. | Executor/rollback (SRV-4), SAGE remoto (SRV-5), administración (SRV-6) y multiplayer (SRV-7). |
| #60 | **ARCH-0, ARCH-1 & ARCH-2:** Clasificación de ownership completa, grafo analizado, anomalía de eventos resuelta, `npm workspaces` configurado, comandos scoped (`build:hub`, `lint:hub`, `build:all`, `lint:all`), CI actualizado y extracción de `@mim/contracts-core` con pureza validada. | Extracciones de engines `@mim/*` (ARCH-3), `apps/desktop` (ARCH-4), `apps/hub` (ARCH-5), CI scoped y versionado (ARCH-7/8). |

Verificación local realizada: `npm run lint:all`, `npm run test:network`, `npm run test:server`, `npm run build:hub` y `npm run arch:analyze` pasaron al 100%.

## Orden recomendado

```text
BASE → [COMPLETO] ARCH-0 → [COMPLETO] ARCH-1 → [COMPLETO] ARCH-2 → [COMPLETO] NET-1 → [COMPLETO] NET-2 → [COMPLETO] SRV-1
  └─────────────────────────────────────────────────────────────────────────────────────────→ [COMPLETO] SRV-2 → [COMPLETO] SRV-3
                                                                                                  ↓
                                                                                    deploy/rollback (SRV-4) → SAGE (SRV-5)
                                                                                                         ↓
                                                                                              administración → multiplayer

ARCH-0 (listo) → ARCH-1 (listo) → ARCH-2 (listo) → ARCH-3 (engines) → ARCH-4 (desktop) → ARCH-5 (hub) → CI/releases
```

## Entregas funcionales

| ID | Trabajo | Depende de | Estado | Criterio de aceptación |
|---|---|---|---|---|
| BASE | Reconciliar fase 0 de #58 con #59 y baseline. | Nada | **COMPLETO** | Evidencia por archivo/test/merge; foundation validada. |
| NET-1 | Contratos, clasificación y política pura de retry. | BASE | **COMPLETO** | Pruebas deterministas de DNS, timeout, TLS, HTTP, cancelación y jitter acotado. |
| NET-2 | Adapters Node/Desktop y browser; integrar helper, broker y flujo real de Hub. | NET-1 | **COMPLETO** | Diagnóstico en ambas superficies; recuperación controlada y sin retries multiplicados. Cierra #57. |
| SRV-1 | SFTP de lectura, configuración de conexión y descubrimiento remoto. | BASE + contrato NET-1 | **COMPLETO** | Fixture SFTP real: JAR/config/log, permisos, cancelación y timeout; cero mutaciones. |
| SRV-2 | UI de auditoría: proyecto deseado → manifest remoto → validator/diff → reporte. | SRV-1 | **COMPLETO** | Duplicados, outdated respecto del proyecto, dependencias y client-only visibles; auditoría incompleta marcada como parcial. |
| SRV-3 | Endurecer plan/preflight, desired state desde builder, snapshots e historial durables. | SRV-2 | **COMPLETO** | Validar ambos estados, hashes, configs y snapshot obligatorio; bloquear plan obsoleto por drift. |
| SRV-4 | Executor con staging, apply, verificación, rollback y recuperación tras reinicio. | SRV-3 | **UI en main** | Falta validación VPS/Electron y recovery post-reinicio. |
| SRV-5 | SAGE remoto: logs + manifest + cambios recientes. | SRV-2 para ingesta; SRV-4 para correlación | **UI en main (PR #89)** | Falta log de hosting real (SAGE-01). |
| SRV-6a | server.properties, configs, backups y metadata de mundos. | SRV-4 | **UI properties/backups en main (PR #90)** | Falta mundo `level.dat` real y restore. |
| SRV-6b | NBT remoto, ProcessControl y consola/RCON por capacidades. | SRV-6a | **RCON UI en main; NBT/proceso no** | Fixture no levanta Minecraft. |
| SRV-7 | Manifest distribuible, preflight cliente, sync común, perfiles y telemetría opcional. | SRV-4 + contratos estables | **Motor + UI/API en main (diagnóstico)** | Falta descarga automática de mods, perfiles y validación VPS. |

NET-2 y SRV-1 pueden alternarse según disponibilidad de fixtures. La primera entrega visible será poder analizar un servidor y entender los fallos de conectividad.

La Definition of Done textual de #58 llega hasta deploy con rollback y SAGE remoto, pero su checklist incluye administración y multiplayer. Para completar todo el alcance solicitado, este plan mantiene el epic abierto hasta SRV-7. SRV-5 es un hito funcional; un cierre anticipado requeriría redefinir explícitamente el alcance y dar seguimiento separado al resto.

## Diseño de #57

- Separar diagnóstico de decisión de retry. Contrato con fase, categoría, runtime/origen, evidencia, status/código, duración y acción sugerida; sanear endpoint y excluir secretos.
- Modelar fases como ok/failed/unknown/unsupported/skipped. El navegador no debe afirmar DNS/TCP/TLS exitosos sin evidencia; una prueba desde backend describe la conexión del backend.
- Diagnosticar progresivamente tras fallos, con timeout global, cancelación, concurrencia limitada y caché breve. No deducir caída de Internet de un solo proveedor; firewall/proxy son hipótesis. Añadir contexto de salud de proveedores cuando exista evidencia disponible.
- Backoff exponencial con jitter, techo y presupuesto total; respetar Retry-After. No reintentar errores permanentes, certificados inválidos o cancelación. Para mutaciones, exigir idempotencia o reconciliar resultado incierto antes de repetir.
- Un solo dueño del retry por operación. Offline pausa; reconexión reactiva de forma controlada. Reanudar transferencias sólo si el transporte y la integridad lo permiten.
- Migrar `lib/core/fetchJsonWithRetry.ts`, que hoy reintenta respuestas no exitosas y devuelve strings, y `lib/downloads/DraftDownloadBroker.ts`, que reconoce `RateLimited` y aplica backoff sin jitter.
- Tests con reloj/aleatoriedad inyectables y fixtures; validar un flujo real en Desktop y Hub sin depender de caídas de servicios externos.

## Brechas de #58 que resolver antes del executor

- `FileTransport` exige write/remove incluso para lectura, usa Buffer y deja move opcional. Separar capacidades de lectura/escritura y garantías de reemplazo; evitar filtrar contratos Node al navegador.
- El plan actual exige snapshot sólo para acciones destructivas. El executor debe exigirlo antes de toda mutación, incluidas instalaciones, registrando archivos previamente inexistentes para rollback.
- El manifest incluye configs, pero el diff compara mods. Agregar reconciliación explícita de configs antes de prometer sincronización completa.
- El diff compara el hash más fuerte de cada artefacto aunque sean algoritmos distintos. Comparar un algoritmo común; sin evidencia, marcar no verificado. Unificar identidad entre diff y acciones.
- La auditoría valida el estado observado: el preflight debe validar también el deseado, dependencias y compatibilidad de instancia.
- Persistir snapshot, ID de operación y journal antes de mutar. Revalidar estado remoto para detectar cambios desde la auditoría. Un rename individual no constituye una transacción de varios archivos: usar staging y compensación con garantías explícitas del transporte.
- Fallo de rollback implica estado recovery-required visible y bloqueo de nuevos deploys. SFTP solo no demuestra proceso offline; bloquear escrituras sensibles con estado desconocido.
- SFTP requiere identidad de host verificada, credenciales fuera de logs, raíz acotada, validación de rutas/symlinks y límites de lectura/concurrencia.
- Probar instalación/reemplazo/eliminación/configs, permisos, disco lleno, desconexión, hashes incorrectos, drift, concurrencia, reinicio y fallo de recuperación en una instancia de prueba.

## Migración de #60

| Hito | Entrega | Gate |
|---|---|---|
| ARCH-0 | Clasificar ownership: surfaces, engines, orquestación, infraestructura, contratos y tooling. Grafo real, aliases, ciclos, duplicación y fronteras dudosas. | Evidencia por archivo/import; un candidato justificado. Sin mover carpetas. |
| ARCH-1 | Conservar npm como propuesta inicial; workspaces y lockfile reproducible, comandos scoped y compatibilidad de comandos actuales. | npm ci desde checkout limpio; no introducir tooling adicional sin necesidad comprobada. |
| ARCH-2 | Primera extracción candidata: contratos puros de `lib/instances/types.ts`, confirmada por el grafo. Separar converters/validator y tipos de plan. | API pública, consumidores migrados y checker sin imports inversos. |
| ARCH-3 | Extraer fronteras estables de diff/reconciliation, scanner/validator, SAGE, NBT, Aduana y security. | Un dominio por PR, pruebas conservadas, I/O en adapters; no confundir independencia de UI con compatibilidad browser. |
| ARCH-4 | Desktop explícito en apps/desktop: UI y Electron. | Assets, tracing, prepare, secret-store, scraper, packaging y release correctos; probar instalador y portable Windows. |
| ARCH-5 | web → apps/hub; eliminar duplicación semántica comprobada. | ✅ *CERRADO* (Move a apps/hub, workspaces apps/*, types/lints/builds OK) |
| ARCH-6 | Surface explícita de Server Manager cuando la auditoría esté estable. | ✅ *CERRADO* — Sección Desktop `/servers`; sin `@mim/server-ui` ni Hub. [ADR-008](../adr/ADR-008-server-manager-desktop-surface.md) |
| ARCH-7 | CI por superficie y dependencias afectadas, con gate global de contratos/ciclos. | Builds independientes, coverage preservado, exports públicos y ausencia de dependencias inversas. |
| ARCH-8 | Política de versión de plataforma, releases por app y compatibilidad de schemas. | Documentación verificable; packages privados salvo necesidad concreta de publicación. |

ARCH-1/2 pueden comenzar tras el inventario sin esperar el cierre de #58. Evitar extracción y feature simultáneas sobre los mismos módulos. Cada PR deja main construible y una reversión localizable.

Hallazgos para ARCH-0/1:

- `lib/events/server.ts` importa el tipo de plan desde `lib/server/reconciliation.ts`; `lib/instances/index.ts` reexporta el adapter de PackValidator. Mover carpetas enteras arrastraría dependencias.
- El checker interpreta `@/` desde raíz, aunque Hub tiene su propio tsconfig. Sólo protege algunos engines e ignora imports de packages: ampliar resolución, cobertura y ciclos antes de usarlo como garantía del monorepo.
- CI hace typecheck de Hub pero el build de producción sólo ejecuta el root. Añadir build independiente de Hub antes de su traslado. Revisar también el comando de lint propio de Hub durante la fundación del workspace.
- Los nombres de packages definitivos surgen del grafo; no crear un package por cada carpeta ni un shared sin ownership.

## Ejecución y cierre

Respetar el límite de dos PR activos indicado en el comentario de #60: una entrega funcional y, cuando haya espacio, una frontera estructural. El inventario puede continuar con WIP lleno. Según el proceso ya documentado, Dumbledore delimita, McGonagall implementa la frontera y Hermione verifica merge/estado; Harry conserva su roadmap. Este plan no despacha tareas ni modifica automatizaciones.

Antes de cada PR: comprobar base y WIP actual, declarar aceptación y pruebas, separar movimientos de cambios funcionales. Al cerrar: registrar PR/commit y evidencia en el issue. No relajar CI para facilitar la migración.

Gates: suite afectada, tipos/lint, API guard si cambian rutas, arquitectura y CI global; build y UI cuando corresponda. Para extracciones, instalación limpia; para runtime Desktop, packaging Windows.

Primer bloque ejecutable: BASE → ARCH-0 → NET-1 → SRV-1/NET-2 → SRV-2. Después priorizar garantías del executor y continuar extracciones con fronteras claras.

Se necesitará una instancia SFTP de prueba y evidencia fiable del estado del proceso para validar escrituras; fixtures permiten avanzar antes. Hosting concreto y UX final no bloquean contratos ni auditoría inicial. Estimar calendario después del inventario y de comprobar el entorno remoto, no a partir del número de checkboxes.

## Correcciones de recuperación y retry — 2026-09-09

MIM Server sigue siendo una funcionalidad nueva sin integración operativa completa. Los módulos SRV-4 a SRV-7 y ARCH-3/4 ya existen en el código; las filas pendientes anteriores conservan el plan original y no deben interpretarse como evidencia de ausencia de implementación ni de aceptación completa.

El endurecimiento del executor distingue ausencia confirmada (`ENOENT`) de errores de lectura, rechaza JAR sin contenido, respalda ambas rutas al cambiar el nombre de un mod y representa las eliminaciones de configuración como `remove`. El snapshot y el executor comparten la resolución de rutas; las entradas legacy corregidas delegan al package para evitar divergencias. En red, `maxDelayMs` limita el backoff propio y nunca recorta `Retry-After`: si la espera supera el presupuesto restante se rechaza el retry.

Las regresiones usan transporte en memoria con fallos inyectados y reloj determinista, y se ejecutan desde `npm test`. Este alcance no acredita SFTP real, persistencia tras reinicio (el store actual es en memoria), integración visible ni disponibilidad de MIM Server para usuarios. Esas validaciones permanecen pendientes.

Validación de esta corrección: `npm test` (26 suites), tipos de raíz y Hub, `npm run lint:all`, lint de los módulos de dominio modificados y `npm run build:all`. El lockfile raíz incorpora los workspaces y alinea Zod con Hub; `npm ci --dry-run --ignore-scripts --offline` acepta su resolución, sin acreditar una instalación limpia real.
