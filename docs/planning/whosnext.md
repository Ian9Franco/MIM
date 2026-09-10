# MIM — Who's Next

Roadmap pendiente revisado el 2026-09-10 contra `main` post PR #68/#70. Las evaluaciones son insumos de revisión; sus recomendaciones no autorizan implementaciones ni publicaciones por sí mismas. Los cierres comprobados están en [el backlog histórico](../releases/backlog-v10-historic.md#revision-de-cierres-2026-09-06). Ver [auditoría y flujo de release](../releases/release-audit.md).

## 1. Proceso y contratos API

- [x] **API-02 — Generalizar schemas Zod compartidos (cerrado en mutaciones core).** `build`, `delete`, `staging` y `tweak` usan `bodySchema`/`querySchema` del guard; `/api/settings/validate-keys` expone `useStoredGemini` para validación server-side. Pendiente: inventario del resto de handlers y contratos compartidos con clientes.

## 2. Funcionamiento y UX de MimBot

- [ ] **BOT-01 — Historial local opt-in.** Guardar/restaurar conversaciones por firma de crash, con borrado explícito y prueba de recarga/cambio de crash.
- [ ] **BOT-02 — Primera experiencia antes de BYOK.** Preparar ejemplos estáticos de respuestas y explicar el valor antes de pedir una clave. La alternativa de backend gratuito requiere decidir presupuesto y cuota con el usuario antes de implementarla.
- [ ] **BOT-03 — Seguimientos contextuales.** Mantener dos sugerencias relevantes tras el primer intercambio, sin repetir preguntas ya respondidas.
- [x] **BOT-04 — Estado de conexión veraz (cerrado).** `SageMimbotCopilot` valida con `/api/settings/validate-keys` (`useStoredGemini: true`), muestra badge por estado (`validating`/`valid`/`invalid`/`rate_limited`) y bloquea envío hasta conexión verificada. `probeGeminiApiKey()` centraliza la sonda sin exponer la clave en URL.
- [x] **BOT-05a — Gateway request lifecycle (cerrado).** PR #68: `requestLifecycle.ts`, propagación de `signal`/timeout en SAGE/FOMO/providers, MIM-Bot Chat usa el provider seleccionado sin credenciales en URL. No cierra el roadmap completo MIMBOT-GW.
- [x] **Naming — MIM-Bot Chat (cerrado).** PR #70: vocabulario `mim-bot-chat` / `mimBotChat()` en código, API mode y docs.
- [ ] **BOT-05b — Resolver soporte multi-proveedor en SAGE follow-up.** Revisar el proveedor OpenAI de `sageMimbotEngine.ts` frente al endpoint Gemini/OpenRouter; decidir si integrarlo o retirar la rama desconectada antes de cambiar el producto.
- [ ] **BOT-06 — Distinguir límites de cuota.** Usar metadatos reales del proveedor para separar límites temporales y diarios; no inferir un tipo de cuota a partir de cualquier 429. Verificar límites, precios y políticas vigentes antes de mostrarlos: los números históricos del roadmap no constituyen evidencia actual.
- [ ] **BOT-07 — Cola para análisis por lotes (condicional).** Sólo si se incorpora ese flujo: concurrencia acotada, cancelación y espera según cuota real.
- [ ] **BOT-08 — Caché de las cuatro quick questions durante 24 horas.** Clave por crash/pregunta/modo, expiración e invalidación verificadas. La caché actual de diagnósticos no cierra este requisito.
- [ ] **BOT-09 — Transparencia BYOK.** Verificar términos oficiales aplicables a plan/región/proveedor y redactar aviso sobre qué datos se envían, retención y uso. No prometer privacidad por el solo hecho de usar una key propia.

## 3. Calidad y arquitectura — revisión recruiter

Fuente: [recruiter-review.md](../guides/recruiter-review.md), señales amarillas/rojas y próximos pasos. Las métricas y opiniones del informe requieren fuentes; no se toman sus percentiles, autoría inferida ni usuarios reales como hechos comprobados.

- [ ] **REC-01 — Reducir `any` con baseline reproducible.** Extiende la deuda de tipado existente: medir por carpeta con criterio documentado, priorizar `useHomeController`, `useAlertManager` y fronteras core, sustituir por tipos/unknown validado. Cierre: comparación antes/después y typecheck sin errores; no usar 935 como conteo actualizado.
- [ ] **REC-02 — Reducir warnings de ESLint.** El techo ya bajó a 471; falta reducir deuda. Agrupar reglas y módulos, corregir una categoría por PR y bajar el presupuesto tras medir. No cerrar por cambiar sólo el número ni ocultar warnings.
- [ ] **REC-03 — Modularizar responsabilidades y documentar decisiones.** Continuación de la tarea existente: `DiscoverTab.tsx`, `DraftDetailView.tsx`, `FomoVersionOverlay.tsx`; continuar `useHomeController` en Profile/Community. Discover Phase 1 está archivado como cumplido. Drafts Phase 2 fue mergeado en PR #63 y conserva contrato/tests, pero sigue `BLOCKED` para verificación final hasta reproducir el recorrido visible create/edit/delete/refresh con sesión browser/Supabase. Cierre por extracción: contrato público preservado, pruebas de comportamiento y ADR breve de trade-offs; revalidar ownership antes de extraer. Phase 3 no está desbloqueada.
- [ ] **REC-04 — Cubrir UI y flujos completos.** Agregar 3–5 E2E reproducibles (Discover → detalle → descarga, errores y reintentos) y tests de componentes críticos. Aislar proveedores/datos y documentar ejecución en CI. Reportar cobertura UI separada de SAGE/NBT; no presentar la cobertura acotada como global.
- [ ] **REC-05 — Onboarding verificable y continuidad.** Partir de las guías existentes; documentar mapa de responsabilidades, diagnóstico de fallos y recuperación. Cierre: una persona distinta sigue el recorrido y se registran obstáculos y correcciones. Documentar no equivale a eliminar el bus factor.
- [ ] **REC-06 — Trazabilidad del trabajo con IA.** Documentar decisiones humanas, asistencia de agentes y revisión aplicada con ejemplos verificables de PRs. No deducir identidad o autoría por nombres de commits ni afirmar competencias sin evidencia.
- [ ] **REC-07 — Colaboración externa.** Elegir con Ian un proyecto OSS y una contribución acotada; registrar discusión/review y resultado real. Depende de participación humana; esta tarea no autoriza contactar ni publicar en otro proyecto.
- [ ] **REC-08 — Narrativa de portfolio y pitch de dos minutos.** Traducir sincronización offline, diagnóstico determinista y análisis estático a capacidades transferibles; preparar respuestas con trade-offs para arquitectura, debugging, seguridad, escala y ownership. Validar con Ian rol objetivo y atribuciones personales antes de redactar la versión final.
- [ ] **REC-09 — Alinear claims con evidencia.** Auditar README, estado, evaluaciones y backlog: fecha/alcance de métricas, autores, usuarios, CI, cobertura y garantías. Separar valoración subjetiva de medición; corregir cifras sin fuente, porcentajes de mercado y afirmaciones absolutas de producción/alucinación. Elegir un recorrido crítico para observabilidad y documentar señales y diagnóstico, sin agregar infraestructura sólo para portfolio.

## 4. Evaluación SAGE y MimBot

Fuente: [sage-eval.md](../engines/sage-eval.md) y su generador `scripts/evaluation/sage-eval.ts`. El documento reporta resultados y límites; las tareas siguientes surgen de contrastarlos con el evaluador. Su benchmark determinista no cierra Unicorn §1.3/Fase 3 para MimBot.

- [ ] **SAGE-01 — Procedencia y generalización del corpus.** Registrar origen, anonimización, licencia y distinción real/sintético/representativo por caso; detectar duplicados y separar un conjunto reservado de logs no usados para ajustar reglas. Incluir trazas truncadas, wrappers, categorías ambiguas y errores combinados. Cierre: resultado independiente por loader/categoría y límites explícitos.
- [ ] **SAGE-02 — Métricas Top-1/Top-3 correctamente denominadas.** El evaluador incluye los casos sin culpable en el denominador y los cuenta por categoría correcta. Separar atribución sobre casos con culpable de acierto sistémico sin culpable, mostrando numerador/denominador; conservar una métrica histórica claramente etiquetada para comparar.
- [ ] **SAGE-03 — Reporte y umbrales verificables.** Reemplazar etiquetas incondicionales “Exceeded”/“Ultra-fast” por comparación real, validar tamaño/categorías y fallar el gate ante regresión de umbrales. Agregar casos que fuerzan incumplimiento; hoy el script escribe el reporte sin ese gate.
- [ ] **SAGE-04 — Latencia reproducible.** Informar entorno, versión, calentamiento, repeticiones y p50/p95 además de media; distinguir diagnóstico local de latencia/costo de la llamada LLM. No extrapolar 0.06 ms al chat.
- [ ] **SAGE-05 — Evals de MimBot y evidencia visible.** Dataset fijo de 15–20 preguntas (crash, dependencias, mods, cuota y ambigüedad), baseline versionada por modelo/prompt, medir exactitud, cobertura causal, referencias, alucinaciones, costo y latencia. Distinguir log, proveedor, sistema local e inferencia en la respuesta; vincular con Unicorn §1.3/1.6.
- [ ] **SAGE-06 — Verificar guardrails en el recorrido real.** Probar atribuciones contradictorias, consejos peligrosos, prompt injection y ausencia de evidencia contra el endpoint/stream. `guardrails.ts` existe, pero su existencia y la instrucción del prompt no prueban que cada respuesta de chat esté validada. Cierre: política definida ante violación y tests que ejecuten el flujo; retirar garantías absolutas del reporte y su generador.
- [ ] **SAGE-07 — Una fuente de evaluación.** Duplicación resuelta: la fuente canónica es `docs/engines/sage-eval.md`.

## 5. Seguimiento de Unicorn

Ver [matriz de estado del plan](unicorn.md#revision-de-estado-2026-09-06). Permanecen abiertos los alcances completos de tool calling, recuperación contextual, routing por complejidad, capacidades, pipeline de confianza, idempotencia/jobs generales, storage avanzado, matrix/mutation/fault testing y contratos entre dominios. Una implementación parcial no cierra la fase completa. Las decisiones pospuestas no se contabilizan como funcionalidades entregadas.

