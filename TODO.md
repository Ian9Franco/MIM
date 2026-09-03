# MIM — TODO técnico

> Backlog honesto para pasar de "proyecto ambicioso" a "producto serio".  
> Basado en revisión real del código (no solo el README): commits, arquitectura, lógica de motores, endpoints, seguridad.  
> **Autor de la revisión:** análisis propio + retroalimentación externa (Septiembre 2026)

Para el contexto de calidad actual del proyecto ver [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md).

---

## 🔴 Prioridad Crítica

### Testing — la deuda más grave

- [ ] **Tests unitarios para `lib/intelligence/sage/`** — parser, classifier, scorer, correlator.
  - Es lógica pura sin dependencias de IO. La más fácil de testear y la más crítica de cubrir.
  - El corpus de 125 casos del SAGE_EVALUATION es ideal para construir el fixture set.
  - `parser.ts` en particular: probar que ANSI stripping, loader fingerprinting y frame extraction dan output correcto para logs reales de Forge, Fabric, NeoForge y Quilt.
- [ ] **Tests para `lib/security/security-scanner.ts`**
  - Es la pieza que más confianza le pide al usuario. Un fallo silencioso = "le dijimos que estaba limpio" cuando no lo verificamos.
  - Cubrir: JAR limpio, JAR con flag de riesgo, timeout de VirusTotal, hash ya en caché.
- [ ] **Al menos 1 test de integración por API route crítica**
  - Prioridad: `app/api/sage/`, `app/api/security/`, `web/app/api/fomo/translate`.
  - No hace falta 100% de cobertura — sí hace falta saber que la ruta responde y valida input básico.

### Catch{} vacíos — 69 auditados y eliminados

- [x] **Auditar y eliminar todos los `catch {}` sin cuerpo** en toda la base de código (backend, API routes, servicios, hooks y frontend). *(Resuelto — Sep 2026)*
  - `lib/security/` — scanner robustecido; si falla AdmZip o lectura, marca como `UNVERIFIED` / anomalía de manifiesto en vez de asumir éxito limpio.
  - `lib/scanner.ts` y `enhanced-mod-scanner.ts` — errores de TOML, Fabric JSON y Mixin targets reportados en consola y propagados a `warnings`.
  - `lib/intelligence/sageRecoveryEngine.ts` — lectura de logs reporta advertencia en vez de tragar el error.
  - `app/api/` y `services/` — fallos de I/O, cache y red loggeados con contexto.
- [x] **Regla aplicada:** `catch (err) { console.warn/error('[módulo] operación fallida:', err); }` o propagación explícita.

### Validación de input — 78 endpoints, Zod iniciado

- [x] **Instalar `zod`** en `web/` (Zod 4) y aplicar validación estricta de schema en `web/app/api/fomo/translate`. *(Resuelto — Sep 2026)*
- [ ] **Prioridad 1 — endpoints públicos de MIMweb** (expuestos en `mim-hub.vercel.app`):
  - [x] `web/app/api/fomo/translate` — validado con Zod (rechaza textos vacíos o mayores a 3000 chars con HTTP 400).
  - [ ] `web/app/api/fomo/community-*` — endpoints de datos de comunidad.
  - [ ] Cualquier endpoint que haga de proxy a terceros (CurseForge, Modrinth).
- [ ] **Prioridad 2 — endpoints de Electron** (riesgo menor, pero igualmente merecen schema).

### Rate limiting — blindaje de superficie pública

- [x] **Implementar rate limiting en memoria / sliding window** (`web/lib/rateLimiter.ts`). *(Resuelto — Sep 2026)*
- [x] **Prioridad máxima: `fomo/translate`** — blindado con máximo 20 requests/minuto por IP con cabeceras `Retry-After` y `HTTP 429`. *(Resuelto — Sep 2026)*
- [x] **Eliminación de DoS involuntario en `translate`** — eliminado el `Promise.all` que disparaba decenas de llamadas HTTP concurrentes por línea; reemplazado por chunks semánticos por lotes y graceful fallback. *(Resuelto — Sep 2026)*

---

## 🟠 Prioridad Alta

### KNOWN_MALWARE_HASHES — base real de firmas

- [x] **Cargada base de datos curada de IOCs reales** (`lib/security/security-data.ts`) con 19 firmas verificadas de malware documentado en Minecraft (Fracturiser Stage 0, 1, 2, troyanos Necro RAT y Skyblock token stealers). *(Resuelto — Sep 2026)*
- [x] **Soporte dual SHA-1 y SHA-256** con normalización case-insensitive y helper `checkKnownMalwareThreat` con metadata y atribución de amenaza. *(Resuelto — Sep 2026)*
- [x] **Control de concurrencia en caché de VirusTotal** (`saveVTCache`) mediante mutex atómico y archivo temporal para evitar colisiones. *(Resuelto — Sep 2026)*
- [x] **Eliminación de catch silencioso en `AdmZip`** de `security-scanner.ts` — si un archivo está corrupto o protegido, se marca con advertencia (`manifest_anomaly`) en vez de asumir falsamente que está limpio. *(Resuelto — Sep 2026)*

### Reducir `any` en zonas críticas (1023 casos totales)

- [ ] **No perseguir todos.** Solo las zonas donde un tipo mal inferido puede esconder un bug real:
  - [ ] `lib/security/` — datos de JARs no confiables de terceros.
  - [ ] `lib/intelligence/sage/` — pipeline de diagnóstico.
  - [ ] `app/api/*/route.ts` y `web/app/api/*/route.ts` — entradas de red.
- [ ] Activar `"noImplicitAny": true` en `tsconfig.json` para los subdirectorios críticos si el tsconfig lo permite por path mapping.

### Dependencia del endpoint no-oficial de Google Translate

- [ ] **Auditar qué endpoints consumen `translate.googleapis.com/translate_a/single`.**
  - Es el endpoint que usa el traductor web de Google. No es la API oficial de pago.
  - Puede cambiar sin aviso. Puede banear la IP del servidor de Vercel.
  - Está fuera del ToS de Google para uso programático.
- [ ] **Opciones de migración:**
  - [Google Cloud Translation API](https://cloud.google.com/translate) (v2 básica tiene tier gratuito de 500k chars/mes).
  - [DeepL Free API](https://www.deepl.com/pro-api) — 500k chars/mes gratis, mejor calidad.
  - LibreTranslate (self-hosted, completamente gratuito, sin ToS problemático).

---

## 🟡 Prioridad Media

### Alinear el discurso con el estado real

- [x] ~~Agregar `docs/PROJECT_STATUS.md` con estado honesto de calidad.~~ *(Hecho — Sep 2026)*
- [x] ~~Agregar nota al `CHANGELOG.md` sobre qué significa el versionado en un proyecto solo-dev.~~ *(Hecho — Sep 2026)*
- [ ] **Revisar el `README.md` raíz** para eliminar o matizar frases como "100% completo" y "producción" en las versiones anteriores que aún queden en el texto.
  - No borrar los logros reales — matizar el lenguaje para que sea preciso.

### Disciplina de commits — consistencia hacia adelante

- [ ] **Adoptar Conventional Commits de forma consistente** (ya existe el estándar en partes del repo).
  - Los tramos `web19`, `web20`, `web21` ya pasaron — no hay que reescribir historial.
  - Hacia adelante: `feat(scope): descripción`, `fix(scope): descripción`, etc.
- [ ] Considerar agregar un `commitlint` config con `husky` pre-commit hook si el volumen de commits lo justifica.

### MIM-Bot "Bully" — testear antes de asumir

- [ ] **Testear el tono incisivo con usuarios reales** de Minecraft (especialmente si incluye menores).
  - El tono "roastea pero ayuda" puede funcionar bien con jugadores veteranos y fallar con nuevos usuarios o jugadores jóvenes.
- [ ] **Implementar toggle de personalidad** (bully ↔ estándar) sin tirar el trabajo hecho.
  - Puede ser una `NEXT_PUBLIC_BOT_PERSONALITY=bully|standard` env var o un setting en la UI de configuración.
  - Bajo riesgo técnico, alto valor de usabilidad.

### Escritura concurrente en caché de VirusTotal

- [x] **Agregar protección de escritura concurrente en `saveVTCache()`** en `lib/security/security-scanner.ts`. *(Resuelto — Sep 2026)*
  - Implementado sistema de sincronización en memoria inmediata + cola FIFO de promesas (`vtWriteQueue`) para serializar escrituras en disco.
  - Re-lectura y merge con el archivo existente en disco para evitar pérdida de llaves concurrentes.
  - Escritura atómica a archivo `.tmp` único por PID + timestamp + random.
  - Bucle con backoff de 5 reintentos contra bloqueos `EBUSY` y `EPERM` de Windows, con fallback de copia y unlink.
  - Test unitario de concurrencia agregado y verificado con 10 escrituras simultáneas en `scripts/__tests__/security-malware-and-ratelimit.test.ts`.

---

## 🟢 Prioridad Baja / Mediano Plazo

### Bus factor y documentación interna

- [x] ~~Crear `CONTRIBUTING.md` técnico real con mapa de código, pipeline de SAGE y zonas de deuda.~~ *(Hecho — Sep 2026)*
- [ ] **Mantener `CONTRIBUTING.md` actualizado** a medida que el código evoluciona.
  - Particularmente: si se mueven archivos, cambiar el directory tree del doc.

### Revisión legal de licencias de mods de terceros

- [ ] **Auditar qué mods se incluyen en ZIPs distribuidos** por MIM y bajo qué licencias.
  - La mayoría de mods de Modrinth tienen licencias explícitas (MIT, LGPL, ARR).
  - Los mods "All Rights Reserved" no pueden redistribuirse en ZIPs sin permiso explícito del autor.
  - CurseForge tiene sus propios ToS sobre redistribución.
- [ ] Esto no requiere abogados — una hoja de cálculo con mod + licencia + ¿se puede redistribuir? es suficiente para empezar.

### Pentest real (cuando sea relevante)

- [ ] Esta revisión fue de código estático, no de penetración real.
- [ ] Cuando el proyecto tenga usuarios reales activos, considerar una auditoría de seguridad formal.
- [ ] Herramientas open source como `OWASP ZAP` o `nuclei` pueden dar una primera pasada automatizada.

---

## ✅ Lo que ya está bien (no tocar sin motivo)

- **Configuración de Electron:** `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. Correcto y no trivial.
- **Políticas RLS de Supabase:** `auth.uid() = profile_id` en inserts/updates/deletes. Real, no de relleno.
- **Arquitectura del motor SAGE:** pipeline limpio (parser → classifier → correlator → scorer → remediation) con separación real entre lógica determinista y capa LLM.
- **CI configurado:** con coverage real (V8/c8), no solo lint.
- **Event Bus tipado (`MimEventMap`):** cero dependencias circulares entre motores, fault isolation real.
- **NBT Recovery:** 12/12 integration tests passing, invariante de zero data loss con `.mim_bak` obligatorio.

---

## Cómo usar este TODO

Este archivo es el backlog técnico del proyecto. Actualizar los checkboxes a medida que se completan items. Para trabajo nuevo, crear un branch con el nombre del item (`fix/sage-unit-tests`, `feat/zod-api-validation`, etc.) y referenciar este TODO en el PR description.

No es necesario resolverlo todo de una. El orden de prioridades es el orden de impacto real en la calidad del proyecto.

---

*Última actualización: 2026-09-03 — Ian Franco*
