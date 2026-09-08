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
