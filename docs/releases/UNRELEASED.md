# Cambios Pendientes (Unreleased)

<!--
Anota aquí los cambios acumulados de PRs o commits.
Al ejecutar 'npm run release:auto', este contenido se trasladará automáticamente
a 'docs/releases/release-notes-vX.X.X.md' y a 'docs/releases/CHANGELOG.md'.
-->

### Planificación auditada y publicación manual por tag

- Reconciliados Who's Next y Unicorn con evidencia de código: los cierres anteriores quedan en el backlog histórico y los alcances incompletos permanecen pendientes.
- Incorporadas tareas de calidad de código, UI/E2E, onboarding, trazabilidad y rigor de evaluación SAGE/MimBot, con criterios de cierre. Son planificación, no nuevas capacidades entregadas.
- Corregida la selección de tag en la release manual de GitHub Actions: el tag solicitado fija checkout, notas y publicación; las entradas inválidas se rechazan antes de compilar. Agregada regresión local del bloque real de resolución y sus consumidores.
- Documentadas las fuentes que usa release:auto y la diferencia entre nombre visible de release, cuerpo editorial y descripción del repositorio.
- API-01: ampliadas las regresiones de los wrappers reales `withApiGuard` para cubrir `Retry-After`, JSON malformado, `paramsSchema`, excepciones estructuradas y valores parseados que llegan al handler. El objetivo API-01 sigue pendiente de reconciliación post-merge por Hermione.
- SAGE-08: verificado post-merge sobre PR #62 / `a729cba`; la suite importa `modExplainer.ts` real y ejecuta también `/api/fomo/explain`, cubriendo metadata, imágenes, grounding y fallback con proveedor controlado. Este cierre no equivale a evals generales de MimBot ni cierra otras fases Unicorn.
- ARCH-01: separada y verificada la persistencia del caché SAGE en adaptadores Node/browser; `cacheEngine.ts` ya no usa `eval("require")`, conserva su API pública y CI valida tests de runtime, typecheck, DAST y build Web. El empaquetado Windows/Electron no fue ejecutado y no se presenta como evidencia.
- REC-03 Phase 2: mergeada en PR #63 la extracción de Drafts desde `useHomeController` a `useHomeDrafts`, con contrato público preservado, validación defensiva y regresiones dedicadas. La fase sigue pendiente de verificación final porque no se reprodujo todavía el recorrido visible create/edit/delete/refresh con sesión browser/Supabase; Phase 3 permanece bloqueada.
- **Server Manager (lectura SFTP / `/servers`, Refs #58)**:
  - Transporte SFTP de solo lectura con huella de host obligatoria, descubrimiento remoto y `POST /api/server/inspect`.
  - Pantalla Desktop `/servers` (link en el header) que compara mods contra el último build AllHost.
  - Fixture local `npm run dev:server-fixture` y suite `npm run test:server`. Escritura remota, persistencia durable de snapshots y hosting externo siguen pendientes.
  - Build Desktop (en revisión): `ssh2` queda marcado como `serverExternalPackages` para evitar que Turbopack intente empaquetar su implementación criptográfica nativa; la validación remota del build sigue siendo criterio de cierre.
- **MIMBOT-GW / Model Gateway & Context Builder**:
  - BOT-05 en revisión: el ciclo de vida de requests del gateway propaga cancelación y timeout a Gemini/OpenRouter, y el mini-chat de proyectos deja de construir URLs con credenciales para usar el proveedor seleccionado.
  - Abstracción de proveedores `AIProvider` (`GeminiProvider`, `OpenRouterProvider`) con selector `createAIProvider.ts`. Gemini permanece como default; GLM vía OpenRouter es opt-in (`MIMBOT_AI_PROVIDER=openrouter`).
  - GLM-5.3 Flash disponible como candidato (`z-ai/glm-5.3-flash:free` con cascada al tier pago), no como reemplazo silencioso de Gemini.
  - Capa de ensamblado `ContextBuilder` con etiquetado estricto de evidencia (`[EVIDENCE: MANIFEST]`, `[EVIDENCE: LOCAL]`, `[EVIDENCE: SAGE]`, `[EVIDENCE: FOMO_GRAPH]`, `[EVIDENCE: GALLERY]`) e invariantes de grounding que impiden al LLM inventar hechos o contradecir diagnósticos deterministas.
  - Migración de `lib/intelligence/modExplainer.ts`, `lib/intelligence/sage/sageMimbotEngine.ts`, `app/api/fomo/explain/route.ts` y `app/api/sage/chat/route.ts` al nuevo pipeline de proveedores.
  - Nuevo endpoint `POST /api/fomo/explain-deps` para interpretación estructurada del árbol de dependencias de mods.
  - Soporte BYOK de OpenRouter en `lib/core/settings.ts` y variables de entorno.
  - Suite de pruebas unitarias en `scripts/__tests__/context-builder.test.ts` con 100% de aserciones pasando.
