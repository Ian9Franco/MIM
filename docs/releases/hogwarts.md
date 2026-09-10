# Bitácora Hogwarts de Pull Requests

Registro cronológico y auditable de los Pull Requests cerrados creados por Hermione — MIM Commit Review, Harry — MIM Roadmap Cycle y McGonagall — PR estructural MIM.

Mantengo esta bitácora como historial, no como roadmap. Las entradas históricas son append-only: si un dato factual necesitara corrección, se agregará una nota fechada en lugar de reescribir el pasado con una elegancia bastante sospechosa.

> Horario: `America/Argentina/Buenos_Aires` (UTC-03:00).
>
> Los PRs creados exclusivamente para mantener esta bitácora no se registran aquí, para evitar una cadena recursiva de burocracia documental.

---

## 2026-09-05 14:49:07 — Harry — PR #19

- **Título:** ⚡ Aíslo la caché SAGE y cubro su recuperación
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/19
- **Resumen:** aisló la prueba de persistencia de la caché SAGE en un directorio temporal y agregó una regresión que verifica recuperación ante JSON corrupto y reparación del archivo persistido en el siguiente guardado.

## 2026-09-05 14:58:03 — Hermione — PR #16

- **Título:** 🪄 El release deja de conjurar comandos desde el mensaje
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/16
- **Resumen:** reemplazó la interpolación de mensajes de commit dentro de comandos shell por argumentos literales de Git mediante `execFileSync`, reduciendo el riesgo de ejecución accidental de metacaracteres durante `release:auto`.

## 2026-09-05 15:32:25 — McGonagall — PR #20

- **Título:** 🏰 McGonagall: encerré las credenciales en safeStorage
- **Resultado:** `CERRADO SIN MERGE`
- **PR:** https://github.com/Ian9Franco/MIM/pull/20
- **Resumen:** proponía migrar las credenciales Desktop a Electron `safeStorage`, eliminar su retorno por `/api/settings`, retirar la copia persistente de Gemini en el navegador y cubrir la migración con tests.
- **Motivo:** motivo no determinado. GitHub registra el PR como cerrado sin merge; una implementación relacionada ingresó después a `main` mediante commits separados, lo cual no cambia el resultado factual de este PR.

## 2026-09-05 17:29:12 — Hermione — PR #23

- **Título:** 📚 Hermione: corrijo el contrato y actualizo la bitácora
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/23
- **Resumen:** corrigió la documentación del contrato público de `/api/settings` después de la separación de secretos y agregó cierres verificables previos a la bitácora Hogwarts.

## 2026-09-05 17:29:12 — Harry — PR #26

- **Título:** ⚡ Harry: aseguro los temporales de caché con randomUUID
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/26
- **Resumen:** reemplazó `Math.random()` por `crypto.randomUUID()` en el nombre temporal usado por la escritura atómica de la caché SAGE, manteniendo un fallback acotado para el caso anómalo en que Node crypto no esté disponible.

## 2026-09-05 19:06:23 — Hermione — PR #28

- **Título:** 📚 Hermione: corrijo el enlace de estado del release
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/28
- **Resumen:** corrigió en `docs/releases/CHANGELOG.md` el enlace obsoleto de `PROJECT_STATUS.md`, apuntándolo a la ubicación canónica `docs/planning/PROJECT_STATUS.md` para que también funcione correctamente al renderizarse como cuerpo de un GitHub Release.

## 2026-09-05 20:11:26 — McGonagall — PR #30

- **Título:** 🏰 McGonagall: formalizo los errores de SAGE
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/30
- **Resumen:** formalizó el contrato de errores de `/api/sage/chat` con códigos internos estables, retryability, severidad y acción recomendada; preservó los identificadores legados y agregó una suite de regresión ejecutada por CI.

## 2026-09-05 21:30:45 — Harry — PR #31

- **Título:** ⚡ Harry: aseguro los temporales de VirusTotal
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/31
- **Resumen:** reemplazó `Math.random()` por `crypto.randomUUID()` en el sufijo temporal usado por la escritura atómica de la caché de VirusTotal, manteniendo intactos la cola FIFO, el merge en disco, los reintentos y el fallback de copia.

## 2026-09-05 23:36:14 — Harry — PR #34

- **Título:** ⚡ Harry: elimino un any en la suite de Security
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/34
- **Resumen:** reemplazó por `unknown` el parámetro opcional de error del helper `fail` en la suite de Security, eliminando un `any` innecesario sin cambiar la ejecución, las aserciones ni la lógica de producción.

## 2026-09-06 01:53:14 — McGonagall — PR #36

- **Título:** 🏰 McGonagall: transmito las respuestas de SAGE
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/36
- **Resumen:** cambió `/api/sage/chat` a streaming incremental desde Gemini SSE hacia un contrato NDJSON propio de MIM, agregó cancelación en cliente, errores tipados durante el stream y regresiones específicas ejecutadas por CI.

## 2026-09-06 02:27:18 — Harry — PR #38

- **Título:** ⚡ Valido el borrado de proyectos antes del handler
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/38
- **Resumen:** movió la validación de `projectName` de `POST /api/project/delete` al `bodySchema` Zod de `withApiGuard`, eliminando el parseo manual del body sin alterar las protecciones de path containment ni la lógica de borrado.

## 2026-09-06 11:42:02 — Hermione — PR #40

- **Título:** 📚 Hermione: documento lo que realmente salió en v11.4.4
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/40
- **Resumen:** agregó notas canónicas específicas para v11.4.4 con los cambios de transición y superficies coleccionables realmente incluidos en ese release, evitando que la documentación pública saltara de v11.4.4 a detalles de v11.3.0.

## 2026-09-06 11:42:35 — Harry — PR #41

- **Título:** ⚡ Valido el borrado de archivos antes del handler
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/41
- **Resumen:** movió el contrato `{ path | paths }` de `POST /api/delete` al `bodySchema` Zod de `withApiGuard`, eliminando parseo manual antes de la lógica de filesystem sin cambiar todavía la política de rutas permitidas.

## 2026-09-06 13:32:12 — McGonagall — PR #42

- **Título:** 🏰 McGonagall: separo Discover del controlador
- **Resultado:** `CERRADO SIN MERGE`
- **PR:** https://github.com/Ian9Franco/MIM/pull/42
- **Resumen:** proponía extraer Discover desde `useHomeController.ts` hacia un sub-hook preservando el contrato público y agregando regresiones de búsqueda.
- **Motivo:** Codacy reportó 5 issues nuevos —4 críticos de seguridad y 1 medio de complejidad— y la implementación fue reemplazada por el enfoque más acotado y validado del PR #43.

## 2026-09-06 13:32:22 — McGonagall — PR #43

- **Título:** 🏰 McGonagall: separo Discover con fronteras seguras
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/43
- **Resumen:** completó la Phase 1 del refactor de `useHomeController.ts`: extrajo Discover a un hook de composición y módulos separados para caché, decodificación de payloads y búsqueda con endpoints estáticos, mantuvo intactos los consumidores y agregó 20 regresiones al runner obligatorio.

## 2026-09-06 14:56:59 — Hermione — PR #45

- **Título:** 📚 Hermione: verifico Discover y alineo su documentación
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/45
- **Resumen:** verificó contra `main` la Phase 1 de Discover, alineó `docs/whosnext.md` y `docs/planning/ROADMAP.md` con esa extracción y registró los cierres #40–#43 sin alterar código de producción.

## 2026-09-06 15:06:40 — Harry — PR #44

- **Título:** ⚡ Limito el borrado a Downloads
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/44
- **Resumen:** confinó `POST /api/delete` a archivos directos de la carpeta Downloads configurada, reutilizó `resolveWithin` para contención y validó el lote completo antes del primer borrado.

## 2026-09-06 18:54:23 — Hermione — PR #48

- **Título:** 🧪 Hermione: hago veraz el contrato de release
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/48
- **Resumen:** corrigió el generador de release para no certificar quality gates omitidos, hizo robusta la inserción cronológica del changelog ante LF/CRLF, agregó regresiones al runner obligatorio y corrigió atribuciones factuales de v11.4.5.

## 2026-09-07 02:22:45 — Harry — PR #51

- **Título:** ⚡ Harry: pruebo contratos pendientes de withApiGuard
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/51
- **Resumen:** amplió la suite del wrapper real `withApiGuard` para verificar `Retry-After`, JSON malformado, `paramsSchema`, valores parseados entregados al handler y excepciones convertidas en respuestas 500 estructuradas, sin modificar código de producción.

## 2026-09-07 10:58:15 — Hermione — PR #52

- **Título:** 📚 Hermione: cierro API-01 y registro #51
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/52
- **Resumen:** reconcilió el cierre verificado de API-01 retirándolo de `docs/whosnext.md` sin ampliar el cierre a API-02 ni a una fase Unicorn más amplia, y registró PR #51 en la bitácora Hogwarts.

## 2026-09-07 10:58:52 — Harry — PR #53

- **Título:** ⚡ Harry: pruebo el explainer multimodal real
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/53
- **Resumen:** reemplazó una suite que reproducía lógica del explainer por pruebas que importan `modExplainer.ts`, verifican payload multimodal, grounding y fallback local, y registró la suite en el runner obligatorio; dejó explícitamente pendiente la cobertura HTTP de `/api/fomo/explain` antes de cerrar SAGE-08.

## 2026-09-07 11:33:08 — McGonagall — PR #55

- **Título:** 🏰 McGonagall: separo el runtime del caché SAGE
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/55
- **Resumen:** separó la persistencia del caché SAGE en adaptadores Node/browser, retiró `eval("require")` del selector de runtime, conservó la API pública, rutas y formato del caché, y agregó regresiones de persistencia/recovery ejecutadas por CI.

## 2026-09-07 15:41:38 — Hermione — PR #56

- **Título:** 📚 Hermione: cierro ARCH-01 y registro #55
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/56
- **Resumen:** reconcilió el cierre verificado de ARCH-01 retirándolo de `docs/whosnext.md`, actualizó `UNRELEASED` y el backlog histórico con el alcance probado y su limitación de empaquetado Electron, y registró PR #55 en la bitácora Hogwarts.

## 2026-09-07 23:03:55 — Harry — PR #62

- **Título:** ⚡ Harry: pruebo el consumidor HTTP del explainer
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/62
- **Resumen:** amplió la suite SAGE-08 para ejecutar el consumidor HTTP real `/api/fomo/explain` sobre `modExplainer.ts`, verificando metadata, imágenes, grounding y fallback con proveedor controlado, sin cambiar producción.

## 2026-09-08 01:51:41 — McGonagall — PR #63

- **Título:** 🏰 McGonagall: separo Drafts del controlador
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/63
- **Resumen:** extrajo el ownership de Drafts desde `useHomeController.ts` hacia `useHomeDrafts` y contratos/adaptadores específicos, preservó la superficie pública y agregó regresiones de persistencia, eventos, Modrinth y composición; la verificación visible post-merge sigue pendiente.

## 2026-09-08 11:07:56 — Hermione — PR #64

- **Título:** 📚 Hermione: reconcilio SAGE-08 y REC-03
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/64
- **Resumen:** reconcilió SAGE-08 como verificado en la documentación canónica, mantuvo REC-03 Phase 2 explícitamente bloqueada por falta de validación visible autenticada y registró los cierres #62 y #63 en la bitácora Hogwarts.

## 2026-09-09 19:08:06 — Hermione — PR #67

- **Título:** 🧪 Hermione: reparo el build del Hub en CI
- **Resultado:** `CERRADO SIN MERGE`
- **PR:** https://github.com/Ian9Franco/MIM/pull/67
- **Resumen:** corrigió en su rama la raíz de Turbopack del Hub y demostró el build remoto; el PR se cerró sin merge porque el mismo arreglo causal ya había ingresado a `main` por otra vía.
- **Motivo:** supersedido por el arreglo equivalente ya presente y verificado en `main`.

## 2026-09-10 11:41:31 — Hermione — PR #69

- **Título:** 🧪 Hermione: externalizo ssh2 del build Desktop
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/69
- **Resumen:** externalizó `ssh2` del bundle de Next mediante `serverExternalPackages`; el cambio quedó integrado en la rama de #68 y luego llegó a `main`, donde CI #191 verificó el build Desktop y el Hub.

## 2026-09-10 14:14:40 — McGonagall — PR #68

- **Título:** 🏰 McGonagall: cierro el ciclo de vida del gateway
- **Resultado:** `MERGEADO`
- **PR:** https://github.com/Ian9Franco/MIM/pull/68
- **Resumen:** cerró el subalcance de lifecycle/credenciales del gateway MIMBOT-GW: propagación de cancelación y timeout, retry cancelable, uso efectivo del proveedor seleccionado en mini-chat y credenciales fuera de URLs; el merge exacto pasó el CI obligatorio en `main`.
