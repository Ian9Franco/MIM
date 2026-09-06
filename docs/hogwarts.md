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
