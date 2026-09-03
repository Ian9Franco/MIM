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
│   │   ├── sage/           → API de diagnóstico de crashes
│   │   └── security/       → API del escáner de bytecode
│   └── (desktop)/          → Layout principal del cliente Electron
│
├── lib/                    → Lógica de negocio (NO tiene componentes de UI)
│   ├── intelligence/
│   │   └── sage/           → SAGE Engine — el corazón del producto
│   │       ├── index.ts    → Orchestrator principal
│   │       ├── parser.ts   → Normalización de logs crudos
│   │       ├── classifier.ts → Taxonomía de 8 categorías
│   │       ├── correlator.ts → Atribución de mods culpables
│   │       ├── scorer.ts   → Scoring de confianza (0–100)
│   │       └── knowledgeBase.ts → RAG: base de conocimiento de compatibilidad
│   │
│   ├── security/           → Escáner estático de bytecode Java
│   │   ├── bytecodeScanner.ts  → Inspección de JARs sin ejecución
│   │   ├── security-scanner.ts → Orquestador (VirusTotal + hash)
│   │   └── whitelist.ts    → Hashes conocidos limpios
│   │
│   ├── fomo/               → FOMO Cloud (Supabase sync, Aduana)
│   │   ├── aduana.ts       → Deduplicación CAS (SHA-512 / SHA-1)
│   │   └── ...
│   │
│   ├── modding/            → Builder, validator, cola de descargas
│   │   ├── builder.ts      → Construcción de modpacks (ZIP, manifests)
│   │   ├── nbt.ts          → Parser NBT binario (v19133)
│   │   └── downloadQueue.ts → Cola priorizada de descargas
│   │
│   ├── storage/            → Persistencia asíncrona
│   │   └── indexeddb.ts    → SmartCache + cola offline (IndexedDB)
│   │
│   ├── events/             → Event Bus tipado
│   │   └── eventContract.ts → MimEventMap — contrato de eventos entre motores
│   │
│   └── core/               → Tipos transversales, supabaseClient, constantes
│
├── components/             → UI (React 19 + Framer Motion)
│   ├── fomo/               → FOMO Cloud UI (community, discover, showcase...)
│   ├── sage/               → UI de diagnóstico de crashes
│   ├── security/           → UI del escáner
│   └── ui/                 → Primitivos de diseño compartidos
│
├── web/                    → Subproyecto MIMweb (Next.js independiente, Vercel)
│   ├── app/api/            → API routes públicas (expuestas en mim-hub.vercel.app)
│   └── components/         → Componentes del hub web
│
├── standalone/             → Electron shell
│   └── main.js             → Entry point de Electron
│
├── scripts/                → Herramientas de soporte (NO van a producción)
│   └── test-runner.js      → Runner de tests personalizado
│
└── docs/                   → Documentación técnica completa
    ├── adr/                → Architecture Decision Records (ADRs)
    ├── SAGE_EVALUATION.md  → Reporte de evaluación cuantitativa
    └── THREAT_MODEL.md     → Modelo de amenazas STRIDE
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

### Commits — Conventional Commits

```
feat(sage): add MIXIN_FAILURE subtype detection
fix(aduana): handle concurrent cache writes with mutex
docs(contributing): add architecture internal map
test(sage): add unit tests for classifier edge cases
refactor(security): remove silent catch blocks in bytecode scanner
chore(deps): update electron to 42.1.0
```

**No usar:** `web19`, `update`, `fix stuff`, `changes`. El historial de commits es documentación.

### TypeScript — zonas sin any

Hay ~1023 usos de `any`. No hay que perseguirlos todos. En código **nuevo**, no se acepta `any` en:
- `lib/intelligence/sage/` — lógica pura, tipado total
- `lib/security/` — manejo de datos no confiables
- `app/api/*/route.ts` — entradas de la API

### Error handling — regla mínima

```typescript
// Mal — silencia el error
try { await saveVTCache(data); } catch {}

// Bien — loggea con contexto
try {
  await saveVTCache(data);
} catch (err) {
  console.error('[security-scanner] saveVTCache failed:', err);
  // En motores de seguridad: marcar resultado como UNVERIFIED, no asumir limpio
}
```

### Componentes — límite de 600 líneas

Ningún componente debería superar 600 líneas de código funcional. Si crece, extraer subcomponentes.

---

## Zonas de Alta Deuda Técnica (Trabajo Pendiente Documentado)

### 1. Testing — Urgente

**Estado:** 4 tests para ~85k líneas.  
**Plan:** Empezar por lógica pura — SAGE classifier, scorer, parser no tienen dependencias de IO. Luego security-scanner. Luego integration tests por API route.

### 2. Validación de input en API routes

**Estado:** 78 endpoints, cero validación con zod.  
**Riesgo:** Endpoints públicos de MIMweb sin defensa contra input malformado.  
**Plan:** Empezar por los que son proxies a terceros (fomo/translate, curseforge/*, modrinth/*).

### 3. Rate limiting

**Estado:** No implementado.  
**Riesgo:** `fomo/translate` es proxy abierto a Google Translate (API no oficial). Vector de abuso.  
**Plan:** Upstash Rate Limiting o middleware de Vercel.

### 4. KNOWN_MALWARE_HASHES

**Estado:** Array vacío en `lib/security/whitelist.ts`.  
**Problema:** El README menciona detección por hash de malware como feature. No existe.  
**Opción más honesta:** Remover la promesa hasta que exista la integración real con feeds de threat intelligence.

---

## Filosofía de Producto

MIM no es un AI assistant con chat. Eso lo hace todo el mundo. MIM hace herramientas concretas que resuelven problemas reales que yo mismo tuve como usuario de modding: crashes que no podía leer, datos de jugadores perdidos, mods duplicados, texturas que Minecraft desactivaba sin avisar.

Cada feature de MIM existe porque alguien (yo, o alguien en mi comunidad) tuvo ese problema. Eso es lo que hace que las decisiones de diseño tengan sentido aunque a veces el código no sea perfecto.

> **Regla de oro:** Nunca hagas un "AI Assistant". Siempre haz "Herramientas Concretas".

---

*Si algo no está claro o está desactualizado, abrir un issue con el label `docs`.*
