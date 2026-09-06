# Review Técnica — MIM (Minecraft Intelligent Manager)

**Perspectiva:** Recruiter dev técnico evaluando portfolio + codebase  
**Candidato:** Ian Franco Collada Pontorno  
**Repositorio:** [Ian9Franco/MIM](https://github.com/Ian9Franco/MIM) · v11.4.5  
**Fecha de evaluación:** Septiembre 2026

---

## Veredicto ejecutivo

**Recomendación: Avanzar a entrevista técnica — perfil sólido para roles mid/senior con sesgo systems/full-stack.**

MIM no es un CRUD de tutorial. Es una plataforma híbrida Desktop (Electron) + Web (PWA) con ~85k LOC, 7 motores de dominio, 94 endpoints API, CI multi-stage y documentación de nivel ingeniería. Lo más valorable no es el dominio Minecraft en sí, sino que demuestra capacidad para diseñar sistemas reales: diagnóstico determinista, sincronización offline-first, análisis estático de bytecode, recuperación binaria con invariantes de zero data loss, y gobernanza arquitectónica automatizada.

El candidato también muestra madurez poco común en portfolios solo-dev: documenta deuda técnica abiertamente (`PROJECT_STATUS.md`), corrige claims exagerados en commits recientes, y tiene ADRs formales. Eso genera confianza.

**Riesgo principal:** proyecto de una sola persona con alta complejidad acumulada. Hay que validar en entrevista qué construyó él vs. qué automatizó (commits de "Hermione"/"Notorious" sugieren uso intensivo de agentes IA).

---

## Métricas del repositorio

| Métrica | Valor |
|---------|-------|
| Líneas de código (aprox.) | ~85.000 |
| Archivos fuente (`.ts`, `.tsx`, `.js`) | 563 |
| Commits totales | 333 |
| API routes | 94 |
| Motores de dominio | 7 |
| ADRs documentados | 6 |
| Suites de test automatizadas | 21 |
| Versión actual | v11.4.5 |
| Desarrolladores activos | 1 (Ian Franco) |

---

## Perfil técnico inferido

| Dimensión | Evidencia | Nivel estimado |
|-----------|-----------|----------------|
| **Full-stack** | Next.js 16, React 19, 94 API routes, Supabase RLS | Senior- |
| **Systems / backend** | Event bus tipado, motores desacoplados, NBT parser, dedup criptográfico | Mid-Senior |
| **Desktop** | Electron 42 con sandbox + contextIsolation correctos | Mid |
| **Seguridad** | Static bytecode scanner, IOC hashes (Fracturiser), DAST en CI, rate limiting | Mid |
| **DevOps / calidad** | CI con 4 jobs, boundary linter AST, coverage auditada | Mid+ |
| **Producto / UX** | PWA mobile, FOMO Cloud, comunidad, onboarding | Mid |
| **Comunicación técnica** | README bilingüe, 6 ADRs, whitepapers, roadmap honesto | Senior (escritura) |

**Stack dominante:** TypeScript, Next.js App Router, Electron, Supabase/PostgreSQL, IndexedDB, Zod, Tailwind v4.

---

## Lo que impresiona (señales verdes)

### 1. Arquitectura con intención, no accidental

El proyecto articula 7 motores de dominio comunicados por un event bus tipado (`MimEventMap`). Las fronteras no son solo documentadas: están **verificadas en CI** con un linter AST que impide, por ejemplo, que `lib/` importe componentes UI o que `web/` dependa del runtime Electron.

```typescript
// scripts/__tests__/architecture-boundaries.test.ts
test("rejects core engine imports from UI through aliases", () => {
  const violations = inspectSource("lib/security/check.ts", 'import Button from "@/components/Button";');
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "core-engines-must-not-depend-on-ui");
});
```

Para un solo desarrollador, esto es señal de pensamiento sistémico, no de "ir pegando features".

### 2. Decisiones documentadas con ADRs

Hay 6 ADRs que cubren decisiones no triviales:

- ADR-001: Diagnóstico determinista vs. LLM
- ADR-002: Content-addressed caching
- ADR-003: Offline-first synchronization
- ADR-004: Atomic writes en NBT recovery
- ADR-005: Inspección estática vs. ejecución
- ADR-006: Typed event bus

Un recruiter técnico valora esto porque indica que el candidato puede **articular trade-offs**, no solo implementar.

### 3. Motor SAGE: ingeniería medible, no marketing vacío

El clasificador de crashes usa heurísticas estructurales multi-pass sobre logs reales de Forge/Fabric/NeoForge — conocimiento de dominio que no se improvisa:

```typescript
// lib/intelligence/sage/classifier.ts
export function classifyCrash(rawLog: string): ClassificationResult {
  const clean = stripAnsi(rawLog);
  const evidence: DiagnosisEvidence[] = [];
  const candidateCulprits: string[] = [];

  // ── 1. OUT OF MEMORY CHECK ──────────────────────────────────
  if (
    clean.includes("java.lang.OutOfMemoryError") ||
    clean.includes("Java heap space") ||
    // ...
  ) {
    evidence.push({
      code: "JVM_OOM_DETECTED",
      weight: 95,
      description: "JVM exhausted allocated heap memory or metaspace.",
    });
    return {
      category: "OUT_OF_MEMORY",
      // ...
    };
  }
```

Benchmarks reproducibles: 125 casos, 100% Macro F1, 0.06 ms/log. Separación clara entre motor determinista y capa LLM explicativa — patrón que empresas serias usan en producción.

### 4. Honestidad sobre el estado real

`PROJECT_STATUS.md` y `CONTRIBUTING.md` dicen explícitamente: *"beta activa, no producción enterprise"*. Documentan deuda (~935 `any`, componentes monolíticos de 800+ líneas, Zod parcial). Esto es **más creíble** que un README que dice "100% production ready" sin matices.

### 5. Pipeline CI serio

El pipeline incluye 4 jobs:

1. **Lint & Static Type Check** — `tsc` en root + web, ESLint, API guard AST, architecture boundaries
2. **Systems Test Suite & Benchmark Evaluation** — suites unificadas + coverage auditada (Codacy)
3. **DAST Security Audit** — escaneo de seguridad dinámico
4. **Next.js Production Build Verification** — build de producción

No es CI de badge decorativo. Incluye verificación de fronteras arquitectónicas y escaneo DAST — raro en portfolios personales.

### 6. Seguridad con criterio

- **Electron:** `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- **Supabase RLS** con `auth.uid()` real, no placeholder
- **Scanner estático de JARs** con firmas IOC del incidente Fracturiser (19 hashes SHA-1/SHA-256)
- **Rate limiting** en endpoints expuestos a IA/traducción
- **`withApiGuard` obligatorio** en rutas API (verificado en CI)

### 7. Producto desplegado y vivo

- Web Hub en [mim-hub.vercel.app](https://mim-hub.vercel.app/)
- 333 commits, PRs mergeados (#44, #45, #46, #48), releases versionadas (v11.4.5)
- Demo interactiva (`npm run demo`), benchmarks reproducibles

---

## Lo que genera dudas (señales amarillas/rojas)

### 1. Bus factor = 1 (riesgo alto)

Todo el proyecto (~85k LOC, 78+ endpoints documentados, 2 apps) es obra de una persona. Implica:

- Conocimiento tribal concentrado
- Posible dependencia de herramientas IA para mantener el ritmo
- Dificultad para escalar el equipo sin onboarding largo

**Pregunta clave en entrevista:** *"Si te vas 3 meses, ¿qué partes del sistema sobreviven sin ti?"*

### 2. Uso intensivo de agentes IA en el flujo de desarrollo

El historial de commits muestra contribuciones significativas de "Notorious" (279 commits) vs. Ian Franco (68). Commits recientes con prefijo "Hermione" sugieren automatización de docs, tests y releases.

No es intrínsecamente malo — pero hay que separar:

- ¿Diseñó la arquitectura y tomó las decisiones?
- ¿Revisó y entiende el código generado?
- ¿Puede debuggear SAGE o el NBT parser sin Copilot?

### 3. Deuda TypeScript significativa

~935 usos de `any` (según roadmap). Aunque se erradicó en zonas críticas (`lib/security/`, `lib/intelligence/sage/`), hooks como `useHomeController.ts` (57 `any`) y componentes FOMO siguen siendo puntos débiles.

### 4. ESLint con presupuesto alto de warnings

```json
"lint": "eslint app components lib --max-warnings=471"
```

471 warnings permitidos indica deuda de linting acumulada. El CI lo acota (commit reciente "acoto el presupuesto"), pero sigue siendo una señal de "ship first, polish later".

### 5. Componentes monolíticos

Varios archivos >800 líneas sin modularizar completamente:

| Archivo | Líneas |
|---------|--------|
| `web/components/tabs/DiscoverTab.tsx` | 862 |
| `web/components/DraftDetailView.tsx` | 819 |
| `components/fomo/core/FomoVersionOverlay.tsx` | 869 |
| `web/hooks/useHomeController.ts` | monolítico (refactor en curso) |

Para senior, se esperaría más progreso en extracción de responsabilidades.

### 6. Testing: bueno en motores, limitado en UI

21 suites de test custom (ts-node, no Jest/Vitest). Cobertura auditada al ~91% pero **acotada a SAGE + NBT**. No hay evidencia de tests E2E (Playwright/Cypress) ni tests de componentes React.

### 7. Dominio nicho

Minecraft modding es un ecosistema específico. Las skills transferibles (event-driven arch, offline sync, binary parsing, static analysis) son reales, pero hay que mapearlas explícitamente al rol target.

### 8. Tensión marketing vs. realidad (en corrección)

Frases históricas como "100% completo" / "Production Ready" contrastan con la realidad documentada. El candidato lo reconoce y corrige — buena señal de madurez, pero un recruiter escéptico lo notará.

---

## Evaluación por criterios de hiring

| Criterio | Score (1-5) | Comentario |
|----------|:-----------:|------------|
| **Profundidad técnica** | 4.5 | Motores reales con invariantes formales |
| **Amplitud full-stack** | 4.0 | Desktop + Web + DB + IA + seguridad |
| **Calidad de código** | 3.5 | Buena arquitectura, deuda TS/lint |
| **Testing & CI** | 4.0 | CI robusto; cobertura parcial |
| **Documentación** | 5.0 | Excepcional para portfolio solo-dev |
| **Product sense** | 4.0 | Producto desplegado con usuarios reales |
| **Colaboración / escala** | 2.5 | Sin evidencia de trabajo en equipo |
| **Honestidad / madurez** | 4.5 | Auto-crítica documentada, ADRs |
| **Transferibilidad** | 3.5 | Fuerte en systems; dominio nicho |

**Score global: 3.9 / 5 — Perfil recomendable con validación en entrevista.**

---

## Fit por tipo de rol

| Rol | Fit | Por qué |
|-----|:---:|---------|
| **Full-stack Mid (startup)** | ✅ Alto | Puede llevar features end-to-end solo |
| **Backend / Platform Engineer** | ✅ Alto | Event bus, sync distribuido, parsers binarios |
| **Frontend Engineer (React)** | ⚠️ Medio | UI compleja pero con deuda en hooks monolíticos |
| **DevOps / SRE** | ⚠️ Medio | CI sólido, pero sin K8s/Terraform/observabilidad |
| **Security Engineer** | ⚠️ Medio | Buen criterio en static analysis; no pentesting formal |
| **Tech Lead (equipo grande)** | ❌ Bajo (por ahora) | Sin evidencia de liderazgo de equipo |
| **ML/AI Engineer** | ⚠️ Medio | Integración LLM con guardrails; no entrenamiento de modelos |

---

## Preguntas que haría en entrevista técnica

1. **Arquitectura:** *"Explicame por qué elegiste Last-Write-Wins con UUID tie-breaking en vez de CRDTs para FOMO Cloud."*
2. **Debugging profundo:** *"Un crash log de NeoForge con Mixin frames transformados no matchea ninguna regla de SAGE. ¿Cómo lo extenderías?"*
3. **Seguridad:** *"¿Qué NO detecta tu scanner de bytecode estático y por qué?"*
4. **Trade-offs:** *"¿Por qué separaste el motor determinista del LLM en vez de mandar todo a Gemini?"*
5. **Escala:** *"Si MIM tuviera 10k usuarios concurrentes en FOMO Cloud, ¿qué se rompe primero?"*
6. **Ownership:** *"¿Qué partes del codebase escribiste vos vs. generaste con IA? ¿Cómo las revisás?"*
7. **Refactoring:** *"¿Cómo modularizarías `useHomeController.ts` sin romper el contrato público?"*

---

## Comparación con el mercado

**Por encima del percentil 80** de portfolios de developers con 2-4 años de experiencia:

- Documentación y ADRs
- CI con verificación arquitectónica
- Benchmarks reproducibles con corpus real
- Producto desplegado con usuarios

**En línea con el percentil 50-60** para roles senior:

- Deuda TypeScript (`any`)
- Componentes monolíticos
- Testing limitado a motores core
- Sin experiencia de equipo documentada

**Por debajo del percentil 30** para staff/principal:

- Bus factor 1
- Sin métricas de observabilidad (Datadog, tracing distribuido)
- Sin evidencia de diseño de APIs públicas consumidas por terceros

---

## Recomendación final del recruiter

> **Ian Franco demuestra capacidad de construir sistemas complejos de punta a punta con criterio de ingeniería real.** No es un "tutorial follower": diseña motores, documenta decisiones, mide performance, y es honesto sobre limitaciones. El proyecto funciona, está desplegado, y tiene usuarios reales en la comunidad de modding.
>
> **Contrataría para:** Full-stack Mid-Senior o Backend/Platform en startup/product company donde necesiten alguien que pueda ownership de features completas con autonomía.
>
> **Validaría antes de contratar:** Comprensión profunda del código (no solo dirección con IA), capacidad de trabajar en equipo/code review, y velocidad de onboarding en un codebase que no sea suyo.
>
> **No contrataría directamente para:** Tech Lead de equipo grande, Staff Engineer, o roles puramente frontend sin sesgo backend.

---

## Próximos pasos sugeridos (para fortalecer el portfolio ante recruiters)

1. **Modularizar** 2-3 componentes monolíticos y documentar el refactor en un ADR breve
2. **Reducir `any`** en hooks críticos (`useHomeController`, `useAlertManager`) — impacto visible en code review
3. **Agregar 3-5 tests E2E** con Playwright para flujos críticos (discover → detalle → download)
4. **Contribuir a un OSS externo** — demuestra colaboración fuera del bubble solo-dev
5. **Preparar un "elevator pitch" de 2 minutos** que traduzca MIM a skills genéricas:
   - *"offline-first sync engine"*
   - *"deterministic diagnostic pipeline"*
   - *"static bytecode threat analysis"*

---

## Referencias internas del proyecto

| Documento | Descripción |
|-----------|-------------|
| [README.md](../README.md) | Overview técnico y benchmarks |
| [PROJECT_STATUS.md](./planning/PROJECT_STATUS.md) | Estado real y deuda documentada |
| [ROADMAP.md](./planning/ROADMAP.md) | Plan de evolución activo |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Guía para contribuidores |
| [docs/adr/](./adr/) | Architecture Decision Records |
| [review.md](./review.md) | Feedback de producto UX/UI pendiente |

---

*Documento generado a partir de análisis de codebase, documentación, CI, historial de commits y métricas del repositorio. Septiembre 2026.*
