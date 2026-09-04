# Contributing to MIM

> **Contexto honesto primero:** MIM es un proyecto de un solo desarrollador activo. No hay equipo, no hay reuniones de planificación, no hay sprints. El código que ves acá es producto de meses de trabajo iterativo combinando experiencia real de modding con ingeniería de software. Este documento existe para bajar el bus factor y para que cualquier persona —incluido yo mismo después de un mes sin tocar el repo— pueda orientarse rápido.

---

## El Desarrollador

**Ian Franco** — [@Ian9Franco](https://github.com/Ian9Franco)

Soy el único desarrollador activo de MIM. Mi background no es puramente académico: llegué al código *desde* el mundo del modding de Minecraft, donde durante años administré modpacks, diagnostiqué crashes, resolví conflictos de versiones y construí setups complejos para mi comunidad. Ese conocimiento operativo es lo que guía las decisiones de diseño de MIM — no frameworks teóricos.

Lo que eso significa para el código:
- Cuando el SAGE classifier distingue un `MIXIN_FAILURE` de un `VERSION_CONFLICT`, es porque sé exactamente qué se ve diferente en un crash log real de Forge vs Fabric.
- Cuando Aduana hace deduplicación por SHA-512 antes de SHA-1, es porque vi en la práctica cómo CurseForge y Modrinth pueden servir el mismo archivo con distinto nombre.
- Cuando el builder fuerza los `incompatibleResourcePacks`, es porque me cansé de que Minecraft desactivara silenciosamente texturas de packs "viejos" que funcionaban perfectamente.

**Amigos que usan MIM:** No son devs, pero son usuarios reales del modding. Su feedback es de UX y de flujos de trabajo, no de arquitectura.

---

## Estado Real del Proyecto (Septiembre 2026)

Siendo directo: esto es un proyecto en **beta activa**, no un producto de producción en el sentido empresarial. Lo que está sólido:

| Componente | Estado real |
|---|---|
| SAGE Crash Intelligence | ✅ Funcional. Evaluado contra 125 casos reales. |
| Aduana (dedup + hashing) | ✅ Benchmarkeado. Métricas reales, no estimadas. |
| NBT Binary Recovery | ✅ 12/12 integration tests passing. Invariante de cero pérdida. |
| Electron shell (seguridad) | ✅ `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. |
| Supabase RLS | ✅ Políticas reales con `auth.uid()`, no placeholders. |
| Manejo de errores en catch{} | ✅ 0 bloques vacíos. Auditados y reemplazados por logs contextuales y advertencias explícitas. |
| KNOWN_MALWARE_HASHES | ✅ 19 firmas reales (Fracturiser, Necro, etc.) con chequeo dual SHA-1 y SHA-256 en O(1). |
| Rate limiting (endpoints web) | ✅ Implementado en `/api/fomo/translate` con aislamiento estricto por IP y sliding window. |
| Tests unitarios (SAGE, scanner) | ⚠️ En expansión. Suites de NBT, SAGE RAG, Aduana y Seguridad/RateLimit agregadas. |
| Validación de input API routes | ⚠️ Blindado `/api/fomo/translate` con Zod; pendiente expandir al resto de mutaciones. |

Esto no es una lista de vergüenzas — es una lista de trabajo pendiente con prioridades claras. El punto es que la documentación lo diga abiertamente en vez de esconderlo detrás de "v10.5.0 — Production Ready".

---

## Arquitectura Interna

### El problema que resuelve MIM (para entender las decisiones)

Un usuario promedio que instala modpacks manualmente enfrenta:
1. **Descarga y deduplicación:** Modrinth y CurseForge dan el mismo mod con diferentes nombres. Sin un sistema de hashes, terminas con duplicados.
2. **Crashes silenciosos:** Minecraft no dice qué mod causó el crash — da un stacktrace crudo de Java que la mayoría no puede leer.
3. **Corrupción de datos:** Los archivos `.dat` de jugadores (inventario, coordenadas) se corrompen. La única opción vanilla es perder los datos.
4. **Gestión de versiones:** Forge, Fabric, NeoForge, Quilt — cada loader tiene reglas diferentes de compatibilidad.

MIM ataca estos cuatro problemas con motores especializados.

### Mapa del código fuente

```
d:\.mine\manager\
├── app/                    → Next.js App Router (páginas y API routes)
│   ├── api/                → 78 endpoints (Electron + Vercel)
│   │   ├── fomo/           → Endpoints de FOMO Cloud (algunos públicos vía Vercel)
│   │   ├── sage/           → API de diagnóstico de crashes y player rescue
│   │   ├── security/       → API del escáner de bytecode y VirusTotal
│   │   └── settings/       → API de validación de rutas y API keys
│   └── (desktop)/          → Layout principal del cliente Electron
│
├── lib/                    → Motores de dominio y lógica de negocio (sin UI)
│   ├── intelligence/
│   │   ├── sage/           → SAGE Engine (parser, classifier, correlator, scorer, RAG)
│   │   └── modExplainer.ts → Asistente MIM-Bot multimodal (modo bully / standard)
│   │
│   ├── security/           → Escáner estático de bytecode Java
│   │   ├── bytecodeScanner.ts  → Inspección AST sin ejecución
│   │   ├── security-scanner.ts → Orquestador (dual hash + VirusTotal + caché)
│   │   ├── security-data.ts    → 19 firmas reales (Fracturiser, Necro RAT, stealers)
│   │   └── whitelist.ts        → Hashes conocidos limpios
│   │
│   ├── fomo/               → FOMO Cloud y almacenamiento
│   │   ├── aduana.ts       → Deduplicación CAS (SHA-512 / SHA-1)
│   │   └── supabaseClient.ts → Conector a base de datos PostgreSQL RLS
│   │
│   ├── modding/            → Builder, validator, licencias y descargas
│   │   ├── builder.ts      → Empaquetador de modpacks (AllUser ZIP, AllHost)
│   │   ├── licenseAuditor.ts → Auditoría y detección de licencias (ARR vs MIT/LGPL)
│   │   ├── nbt.ts          → Parser NBT binario v19133 con atomic swaps
│   │   └── downloadQueue.ts → Cola priorizada de descargas
│   │
│   ├── storage/            → Persistencia asíncrona
│   │   └── indexeddb.ts    → SmartCache + cola offline FIFO (IndexedDB)
│   │
│   ├── events/             → Event Bus reactivo tipado
│   │   └── eventContract.ts → MimEventMap — contrato desacoplado entre motores
│   │
│   └── core/               → Logger estructurado, settings, voice contracts
│
├── components/             → UI Desktop (React 19 + Framer Motion)
│   ├── fomo/               → FOMO Cloud UI (community, discover, showcase, overlay...)
│   ├── sage/               → UI interactiva de diagnóstico y rescate de jugadores
│   ├── security/           → UI del escáner estático y reportes de riesgo
│   └── ui/                 → Primitivos de diseño compartidos y animaciones
│
├── hooks/                  → Hooks reactivos de estado y gestión de UI
│   ├── useFomoOverlayManager.ts → Gestión de overlay, mod details y MIM-Bot
│   └── ...
│
├── services/               → Servicios cliente de integración y sincronización
├── sql/                    → Esquemas DDL y políticas de seguridad RLS de PostgreSQL
├── constants/              → Constantes del ecosistema, categorías y loaders
│
├── web/                    → Subproyecto MIMweb (Next.js independiente en Vercel)
│   ├── app/api/            → API routes públicas (explain, translate, community...)
│   ├── components/         → Componentes del hub web (ModDetailsSheet, marquees...)
│   └── lib/                → Rate limiter sliding window, traductor oficial y voice
│
├── standalone/             → Electron shell nativo
│   └── main.js             → Entry point con sandbox OS y contextIsolation
│
├── scripts/                → Tooling, evaluación y tests (NO van a producción)
│   ├── __tests__/          → Suites automatizadas (SAGE, seguridad, APIs, personalidad)
│   ├── benchmarks/         → Stress tests empíricos de Aduana (1k a 25k)
│   ├── evaluation/         → Runner de evaluación SAGE (125 casos) y RAG
│   ├── security/           → DAST dynamic security testing y comprobaciones de headers
│   ├── audit-licenses.ts   → CLI de auditoría de licencias de mods
│   └── test-runner.js      → Orquestador de testing unificado headless
│
└── docs/                   → Documentación técnica completa del ciclo de vida
    ├── adr/                → Architecture Decision Records (ADRs)
    ├── PROJECT_STATUS.md   → Estado real del proyecto y contexto solo-dev
    ├── SAGE_EVALUATION.md  → Reporte de evaluación cuantitativa (125 casos)
    ├── THREAT_MODEL.md     → Modelo de amenazas STRIDE y auditoría DAST
    └── ADUANA_BENCHMARKS.md→ Benchmarks formales de throughput y caché
```

### El Event Bus — cómo se comunican los motores

Todos los motores se comunican a través de `lib/events/eventContract.ts`. La regla: **ningún motor importa directamente de otro motor**. Solo emiten y escuchan eventos tipados.

```typescript
// Ejemplo: cómo SAGE emite un resultado
import { mimBus } from '@/lib/events/eventBus';

mimBus.emit('sage:diagnosis:complete', {
  crashId: 'abc123',
  report: { culprit: 'sodium', confidence: 92, category: 'VERSION_CONFLICT' }
});

// Escucha en UI
mimBus.on('sage:diagnosis:complete', (payload) => {
  updateCrashReport(payload.report);
});
```

Esto permite que SAGE no sepa nada de React, y la UI no sepa nada del parser de logs. El fallo en un listener nunca interrumpe la operación del motor emisor.

### El pipeline de SAGE en detalle

```
Input: string crudo (crash.log o latest.log)
  │
  ↓ lib/intelligence/sage/parser.ts
  │ - Strips ANSI escape codes
  │ - Identifica el loader (Forge/Fabric/NeoForge/Quilt) por firma de línea
  │ - Extrae: exception_type, stack_frames, mod_candidates, loader_version, java_version
  │ - Output: NormalizedCrashLog
  │
  ↓ lib/intelligence/sage/classifier.ts
  │ - Multi-pass: evalúa cada categoría de taxonomía en orden de prioridad
  │ - Categorías: MISSING_DEPENDENCY | VERSION_CONFLICT | MIXIN_FAILURE |
  │               JAVA_INCOMPATIBILITY | MOD_CONFLICT | CORRUPTED_WORLD |
  │               OUT_OF_MEMORY | UNKNOWN_RUNTIME
  │ - Output: ClassificationResult con evidencia por categoría
  │
  ↓ lib/intelligence/sage/correlator.ts
  │ - Mapea stack frames a package namespaces de mods conocidos
  │ - Cruza con la base de conocimiento de compatibilidad
  │ - Output: CulpritList (mods rankeados por evidencia)
  │
  ↓ lib/intelligence/sage/scorer.ts
  │ - Pondera: frecuencia en stack, posición en call chain, historial de conflictos
  │ - Output: ConfidenceScore (0–100) por culprit candidato
  │
  ↓ lib/intelligence/sage/knowledgeBase.ts (RAG opcional)
  │ - Similitud de tokens contra base de conocimiento local
  │ - Si hay match: añade workarounds documentados al reporte
  │
Output: SageDiagnosticReport (JSON)
```

**Por qué es determinista:** No hay LLM en el pipeline de diagnóstico. El LLM (`SageExplainer`) solo toma el JSON ya producido y lo convierte en lenguaje natural. Si el LLM falla, el JSON técnico igual está disponible.

### Aduana — por qué importa la deduplicación

CurseForge y Modrinth sirven los mismos mods con nombres distintos (`sodium-0.5.8.jar` vs `Sodium-fabric-0.5.8+mc1.20.1.jar`). Sin Aduana, el usuario termina con duplicados:

1. **Fast-path O(1):** Busca por nombre en librería. Si hay match, verifica hash.
2. **Full scan fallback:** Si no hay match por nombre, escanea por hash. Raro pero necesario.
3. **Cache de invalidación:** `mtimeMs + size` como cache key. Si el archivo cambió, se invalida automáticamente.

**Concurrencia resuelta:** `saveVTCache()` en `lib/security/security-scanner.ts` maneja escrituras serializadas mediante cola FIFO de promesas, merge en memoria, archivo temporal único y reintentos atómicos contra bloqueos `EBUSY`/`EPERM` en Windows.

---

## Cómo correr el proyecto localmente

### Prerrequisitos

- Node.js 20+ (LTS)
- Windows 10/11 (Electron shell solo buildea en Windows por ahora)
- Variables de entorno en `.env.local`

### Comandos básicos

```bash
# Instalar dependencias
npm install

# Desarrollo (Next.js + hot reload)
npm run dev

# Demo headless (sin UI de Electron)
npm run demo

# Tests
npm run test

# Build del ejecutable Electron
npm run build && npm run electron:build
```

### Para MIMweb (subproyecto)

```bash
cd web
npm install
npm run dev
```

MIMweb es un Next.js separado que se deploya en Vercel independientemente.

---

## Convenciones y Reglas del Código

### Disciplina de Commits (Conventional Commits Obligatorio)

Todo commit en el repositorio debe seguir estrictamente la especificación [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

```
<tipo>(<ámbito opcional>): <descripción concisa en minúsculas>

[cuerpo opcional explicando la motivación técnica]

[pie de commit opcional]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad o capacidad para el usuario final o motor.
- `fix`: Corrección de un error o anomalía de comportamiento.
- `chore`: Tareas de mantenimiento, dependencias o tooling que no alteran producción.
- `docs`: Modificaciones exclusivas de documentación técnica.
- `test`: Incorporación o refactorización de suites de pruebas.
- `refactor`: Cambios de estructura de código sin alterar comportamiento externo.
- `perf`: Mejoras de rendimiento o reducción de latencia/memoria.

**Ámbitos principales recomendados:** `sage`, `aduana`, `security`, `fomo`, `nbt`, `mimweb`, `electron`, `deps`.

**Ejemplos estándar:**
```
feat(sage): add MIXIN_FAILURE subtype detection for NeoForge 1.21
fix(aduana): handle concurrent cache writes with atomic swap buffers
feat(bot): add personality toggle between bully and standard modes
docs(contributing): add architecture internal map and commit conventions
test(sage): add unit tests for classifier edge cases
refactor(security): remove silent catch blocks in bytecode scanner
chore(deps): update electron to 42.1.0
```

**Prohibido terminantemente:** Mensajes genéricos como `update`, `fix stuff`, `changes`, `wip`, `web19`. El historial de Git es un documento vivo de auditoría de ingeniería.

### TypeScript — zonas estrictamente sin `any`

En `lib/intelligence/sage/`, `lib/security/` y las API routes (`app/api/*/route.ts`, `web/app/api/*/route.ts`), está prohibido el uso de `any`. Se deben utilizar interfaces bien delimitadas, genéricos o `unknown` con type guards.

### Error handling — regla mínima

```typescript
// Mal — silencia el error y asume éxito ciego
try { await saveVTCache(data); } catch {}

// Bien — loggea con contexto y degrada elegantemente
try {
  await saveVTCache(data);
} catch (err) {
  console.error('[security-scanner] saveVTCache failed:', err);
  // En motores de seguridad: marcar resultado como UNVERIFIED, no asumir limpio
}
```

### Componentes — límite de 600 líneas

Ningún componente debería superar 600 líneas de código funcional (sin contar comentarios/bloques de documentación). Si crece, extraer subcomponentes para preservar una arquitectura limpia y modular.

---

## Estado de Deuda Técnica & Endurecimiento (Septiembre 2026)

- [x] **Testing Automatizado**: 8 suites de pruebas unitarias y de integración (`npm test` — 144 escenarios pasando al 100%, 0 fallos).
- [x] **Catch Silenciados**: 69 bloques `catch {}` auditados y reemplazados por manejo de errores contextual en Web y Desktop.
- [x] **Rate Limiting**: Implementado en `/api/fomo/translate` con sliding window por IP y degradación elegante.
- [x] **Firmas de Malware Reales**: Integradas 19 firmas SHA-1/SHA-256 del incidente Fracturiser y troyanos en `lib/security/security-data.ts`.
- [x] **Validación Zod**: Schemas de validación en rutas públicas y locales de mutación.
- [x] **Toggle de Personalidad MIM-Bot**: Modos `bully` y `standard` integrados en frontend y backend.

---

## Filosofía de Producto

MIM no es un AI assistant con chat. Eso lo hace todo el mundo. MIM hace herramientas concretas que resuelven problemas reales que yo mismo tuve como usuario de modding: crashes que no podía leer, datos de jugadores perdidos, mods duplicados, texturas que Minecraft desactivaba sin avisar.

Cada feature de MIM existe porque alguien (yo, o alguien en mi comunidad) tuvo ese problema. Eso es lo que hace que las decisiones de diseño tengan sentido aunque a veces el código no sea perfecto.

> **Regla de oro:** Nunca hagas un "AI Assistant". Siempre haz "Herramientas Concretas".

---

*Si algo no está claro o está desactualizado, abrir un issue con el label `docs`.*
