# MIM — Estado Real del Proyecto

> Este documento existe por una razón concreta: la documentación técnica de MIM es ambiciosa y detallada, pero algunos commits y secciones usan frases como "100% completo" o "producción" que no reflejan con precisión el estado real. Este documento lo corrige — no para restar mérito al trabajo hecho, sino porque la credibilidad a largo plazo vale más que el marketing a corto plazo.

**Última actualización:** Septiembre 2026  
**Versión:** v11.4.0 (Desarrollo Activo)  
**Autor:** Ian Franco (único desarrollador)  
*(Nota: Este documento es una auditoría de madurez y transparencia técnica. Para el plan de tareas y evolución activa, consultar [ROADMAP.md](./ROADMAP.md)).*

---

## La Verdad sobre "Solo-Dev" a Esta Escala

MIM tiene ~85k líneas de código, 78 API endpoints, un cliente Electron, una PWA web, un backend Supabase y 7 motores de dominio especializados. Todo eso fue construido por una sola persona, combinando experiencia real de años en la comunidad de modding de Minecraft con aprendizaje continuo de ingeniería de software.

Eso tiene implicaciones honestas:
- **Lo que funciona bien** fue validado con uso real, benchmarks medidos y retroalimentación de usuarios de la comunidad (no devs, pero sí jugadores reales).
- **Lo que está en deuda** es conocido y documentado — no es un descubrimiento sorpresa.
- **Lo que se llama "producción"** es más precisamente *beta activa con cimientos sólidos*.

No hay inversores que engañar ni equipo que impresionar. Esta honestidad es lo que hace que el proyecto sea confiable.

---

## Lo que está sólido (con evidencia)

### SAGE Crash Intelligence Engine
- **Estado:** Funcional y evaluado.
- **Evidencia:** 125 casos reales de crash logs de Minecraft, cubriendo las 8 categorías de fallo. 100% Macro F1, 84% Top-1 culprit attribution, 0.06ms latencia media.
- **Por qué es creíble:** El corpus de evaluación fue construido con logs reales que yo mismo acumulé diagnosticando crashes de mi comunidad. No son datos sintéticos.
- **Caveat honesto:** El corpus tiene 125 casos. Logs muy raros o altamente customizados de modpacks de nicho pueden degradar al `UNKNOWN_RUNTIME` category, que es el comportamiento correcto.

### Aduana Storage Engine
- **Estado:** Benchmarkeado y en uso.
- **Evidencia:** Tests de throughput medidos localmente (SHA-1: 2,083 MB/s, SHA-512: 940 MB/s). Speedup de caché 8x medido de 1K a 25K archivos.
- **Caveat honesto:** Los benchmarks son en hardware específico (mi máquina). Los números exactos van a variar según el sistema. El speedup relativo de caché es el dato más reproducible.

### NBT Binary Recovery
- **Estado:** 12/12 integration tests passing. Invariante de zero data loss.
- **Por qué importa:** Este motor toca archivos de jugador — inventarios, coordenadas, datos de mundo. Un error acá destruye datos irreemplazables. El backup `.mim_bak` obligatorio antes de cualquier modificación no es opcional.

### Electron Security Configuration
- **Estado:** Correcto.
- `nodeIntegration: false` — el renderer process no puede acceder a Node.js directamente.
- `contextIsolation: true` — preload scripts aislados del renderer context.
- `sandbox: true` — renderer en sandbox OS-level.
- Esto no es trivial. Muchas apps Electron lo hacen mal.

### Supabase RLS
- **Estado:** Políticas reales, no placeholders.
- Las políticas usan `auth.uid() = profile_id` en inserts/updates/deletes. La lectura pública está separada de la escritura propia. No es RLS de relleno.

---

## Lo que está en deuda (documentado honestamente)

### Testing Automatizado (Resuelto — Sep 2026)

**Estado:** ✅ Suites automatizadas implementadas y pasando al 100% (`npm test` — 8 suites, 144 escenarios, 0 fallos).  
**Cobertura alcanzada:**
- `lib/intelligence/sage/`: Unit tests puros para desinfección ANSI, loader fingerprinting (Forge, Fabric, NeoForge, Quilt), mixin frames, categorización y correlación de mods.
- `lib/security/`: Unit tests para JARs limpios, detección dual de firmas Fracturiser (SHA-1/SHA-256), mitigación de archivos corruptos y fallback de VirusTotal.
- Endpoints API críticos: Tests de integración para validación de contratos, manejo de errores tipados y fallback de IA en `/api/sage/`, `/api/security/` y `/api/fomo/translate`.

### 69 catch{} vacíos (Resuelto — Sep 2026)

**Estado:** ✅ 100% auditados y erradicados en toda la base de código (`lib/`, `app/api/`, `services/`, `hooks/`, `components/` y `web/`).  
**Resultado:** En escaneo de seguridad y I/O, los fallos ya no asumen éxito ciego; se registran advertencias contextuales y se marcan como `UNVERIFIED` o anomalías. En UI, los fallos de parseo de localStorage se advierten explícitamente en consola en lugar de silenciarse.

### Validación de input API routes (En progreso — Zod aplicado a rutas críticas)

**Estado:** Schemas de Zod implementados en endpoints de MIMweb expuestos (`/api/fomo/translate`, `/api/fomo/community-rankings`, `/api/fomo/explain`) y en rutas locales de mutación de Electron (`/api/security/scan`, `/api/sage/diagnose`, `/api/modding/download-queue`).  
**Resultado:** Payloads malformados o con tipos inválidos son rechazados de inmediato con HTTP 400 y mensaje descriptivo estructurado.

### Rate limiting & Blindaje de Proxies

**Estado:** ✅ Implementado en `web/app/api/fomo/translate` mediante `web/lib/rateLimiter.ts` (máx 20 req/min por IP, cabeceras `Retry-After`, HTTP 429).  
**Eliminación de DoS:** Se erradicó el `Promise.all` por línea que bombardeaba Google Translate; ahora procesa chunks semánticos y cuenta con soporte para proveedores oficiales (DeepL Free, Google Cloud Translation v2, LibreTranslate) con degradación elegante.

### KNOWN_MALWARE_HASHES — base real de firmas

**Estado:** ✅ Implementado y verificado.  
`lib/security/security-data.ts` ahora cuenta con 19 firmas SHA-1 y SHA-256 documentadas del incidente **Fracturiser** (Stage 0 droppers, Stage 1 utility, Stage 2 harvesters) y troyanos/stealers de Minecraft (Necro RAT, Discord token stealers).  
El escáner (`lib/security/security-scanner.ts`) evalúa dualmente SHA-1/SHA-256 y atribuye el nombre e IOC exacto de la amenaza con score crítico (100). Validado en suite automatizada.

### Erradicación de `any` en zonas críticas (Resuelto — Sep 2026)

**Estado:** ✅ Erradicado en `lib/security/`, `lib/intelligence/sage/` y API routes de entrada de red (`app/api/` y `web/app/api/`). Se reemplazó por tipos e interfaces fuertemente tipadas y type guards seguros.

---

## Lo que se llama "producción" y lo que realmente es

En los commits y la documentación aparecen frases como:
- "MIM Desktop (Electron 42): Runtime nativo de escritorio **100% completo**"
- "v10.5.0 — Systems Engineering Finalization"
- "Portfolio Engineering Artifact" con estado "Finalizado y Congelado"

**La realidad más matizada:**
- El Electron desktop funciona, está benchmarkeado y resuelve los problemas para los que fue diseñado. Eso es real.
- "100% completo" se refiere a que las features planeadas para esa versión están implementadas. No significa "sin deuda técnica".
- "Finalizado y Congelado" significa que el scope de features está congelado, no que el código no necesite trabajo de calidad.

Esto importa porque un developer o inversor que lea el historial de commits y vea "100% completo" dos días antes de un cambio arquitectónico nota la inconsistencia. La confianza se construye siendo preciso.

**Descripción más honesta del proyecto:** Beta activa con cimientos de ingeniería sólidos (Electron security, RLS, Event Bus, benchmarks reales), en iteración de calidad (tests, error handling, validación de input).

---

## El Background que No Aparece en el Código

La documentación técnica de MIM habla de SAGE, benchmarks y arquitecturas distribuidas. Lo que no documenta es de dónde viene el conocimiento que hace que esas decisiones sean correctas:

- **Años administrando modpacks** para una comunidad real significa conocer exactamente cómo se ve un `MIXIN_FAILURE` versus un `VERSION_CONFLICT` en un log de Forge, qué makes una versión de Java "incompatible" con una versión de NeoForge, y por qué CurseForge y Modrinth tienen el mismo mod con nombres distintos.
- **Experiencia de usuario real** significa que las features de MIM no son especulativas — existen porque alguien (yo, o alguien en mi comunidad) tuvo ese problema exacto.
- **Marketing de comunidad** — administré la presencia de proyectos de modding, entendí cómo comunicar features técnicas a una audiencia que no es developer pero sí exigente.

Ese contexto operativo es lo que diferencia MIM de un proyecto técnico sin raíces en el problema real.

---

## Comparación Honesta: Lo que Funciona vs Lo que Hay que Mejorar

| Área | Fortaleza real | Deuda conocida |
|---|---|---|
| Seguridad Electron | Configuración correcta (sandbox, contextIsolation) | — |
| Datos en Supabase | RLS real con auth.uid() | — |
| SAGE Diagnosis | Evaluado contra corpus real | Pocos tests unitarios automatizados |
| Aduana | Benchmarks medidos y reproducibles | — |
| NBT Recovery | 12/12 tests, zero-loss invariant | — |
| API Routes | 78 endpoints funcionales | 1 con Zod + RateLimit (`fomo/translate`); 77 pendientes |
| Error handling | Auditado y loggeado | 0 catch{} ciegos |
| TypeScript | Arquitectura tipada event-driven | ~1023 any |
| Security feature | Bytecode scanner + 19 firmas de IOCs | — |
| Documentación | Técnica, detallada, bilingüe | Este documento |

---

## Próximos pasos de calidad (en orden de prioridad)

1. [x] ~~**Concurrent write safety** — saveVTCache() con cola FIFO, merge en memoria y atomic rename con retry en Windows.~~ *(Resuelto — Sep 2026)*
2. [x] ~~**Catch{} vacíos** — Auditados y eliminados los 69 bloques en toda la solución.~~ *(Resuelto — Sep 2026)*
3. [x] ~~**KNOWN_MALWARE_HASHES** — Base real de 19 firmas con soporte dual SHA-1 / SHA-256.~~ *(Resuelto — Sep 2026)*
4. [x] ~~**Rate limiting** — `/api/fomo/translate` blindado por IP y sliding window.~~ *(Resuelto — Sep 2026)*
5. **Zod en API routes** — Extender esquemas al resto de mutaciones (`build`, `delete`, `staging`, `tweak`, etc.).
6. **Reducción de `any`** — Enfocado en `lib/security/` y `lib/intelligence/sage/`.
7. **Tests de integración adicionales** — Nuevas API routes.

---

*Este documento es honesto sobre el estado real del proyecto. Eso no lo hace menos ambicioso — lo hace más confiable.*
