# MIM — Who's Next
Roadmap de lo que sigue, basado en revisión de código real (v11.2.0). Dividido en: proceso/arquitectura general, y una sección específica de MimBot (funcionamiento + UX/UI) porque es donde más fricción de usuario vi.

---

## 1. Proceso — lo único que de verdad urge

- [x] *Hacer withApiGuard obligatorio, no opcional.* 112/112 handlers HTTP blindados, con enforcement estructural fail-closed por AST en `npm run lint:api-guard`.
  - [x] Barrido de las rutas restantes, empezando por las que llaman APIs externas o de IA.
  - [x] Regla de CI o lint que falle el build si un route.ts nuevo no importa withApiGuard (`npm run lint:api-guard`).
  - [x] Ítem de checklist y guía estándar en CONTRIBUTING.md.

- [x] **Cerrar el enforcement real de `withApiGuard` — follow-up de auditoría v11.3.0.**
  El objetivo es que CI no pueda aprobar una ruta desprotegida por falso positivo ni porque quedó fuera de una lista manual.

  - [x] **Reemplazar la detección textual por validación estructural.**
    `verify-api-guard.ts` hoy acepta cualquier archivo que contenga `withApiGuard(`.
    Validar que cada handler HTTP exportado (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, etc.) esté realmente envuelto.
    Preferir AST con TypeScript Compiler API o `ts-morph` para evitar falsos positivos por comentarios, imports, strings o código muerto.

  - [x] **Hacer fail-closed todas las rutas Desktop.**
    Toda ruta `app/api/**/route.ts` debe requerir `withApiGuard` por defecto.
    No depender de `CRITICAL_DESKTOP_PATTERNS` para decidir cuáles son críticas.

  - [x] **Reemplazar la inclusión manual por una allowlist de excepciones.**
    Si una ruta legítimamente no debe usar `withApiGuard`, declararla explícitamente en una allowlist y documentar el motivo.
    Una ruta nueva debe fallar CI por defecto hasta quedar protegida o exceptuada de forma consciente.

  - [x] **Agregar casos negativos al auditor.**
    CI debe fallar si una ruta:
    - solo tiene el texto `withApiGuard(` en un comentario o string;
    - lo importa pero no lo usa;
    - lo invoca en código que no corresponde al handler exportado.

  - [x] **Convertir `scripts/__tests__/api-guard.test.ts` en tests reales del wrapper.**
    Importar y ejecutar `withApiGuard` sobre handlers de prueba, en vez de validar únicamente `checkRateLimit`, `getClientIp` y schemas Zod aislados.

    - [x] Rate limit real: respuesta `429`, `Retry-After` y bloqueo efectivo del handler.
    - [x] Headers defensivos: `X-Content-Type-Options` y `X-RateLimit-*`.
    - [x] Query inválida, body inválido y JSON malformado → `400`.
    - [x] `paramsSchema` dinámico: caso válido e inválido.
    - [x] Excepción dentro del handler → `500` estructurado.
    - [x] Happy path: query/body/params parseados y tipados llegan correctamente al handler.

  - [x] **Criterio de cierre.**
    Una ruta API nueva sin guard debe romper CI automáticamente;
    una ruta con guard falso/decorativo también;
    y los comportamientos principales de `withApiGuard` deben estar cubiertos ejecutando el wrapper real.

## 2. Funcionamiento de MimBot

- [x] *Aplicar withApiGuard a api/sage/chat ya.* Blindado con rate limit defensivo (25 req/min) y validación Zod estricta.
- [x] *No guardar la API key de Gemini en texto plano.* Desktop migra las cuatro credenciales desde `mim-settings.json` a Electron `safeStorage`, la API sólo devuelve estado redactado y Gemini dejó de persistirse en `localStorage`; MIMweb conserva la key únicamente durante la sesión activa.
- [x] *Recortar el contexto de conversación antes de enviarlo.* Truncado automático a los últimos 6 turnos en `api/sage/chat`.
- [x] *Streaming de respuesta.* `/api/sage/chat` consume Gemini por SSE y entrega al cliente un stream NDJSON tipado (`start`, `delta`, `done`, `error`); la UI renderiza deltas en curso y cancela el upstream al reiniciar, cambiar de crash o desmontarse.
- [x] *Manejo de rate-limit/cuota de la propia API de Gemini.* Diferenciación explícita de código 429 (`RATE_LIMITED`) con mensaje claro en el chat sin reabrir el panel de API key.
- [ ] *Persistir el historial del chat* (por lo menos localmente) en vez de perderlo apenas cambia el crash analizado o se recarga la página. Aunque sea opt-in ("guardar esta conversación").

## 3. UX/UI de MimBot

Miré el componente (SageMimbotCopilot.tsx) en detalle. Funciona, pero hay fricción real:

- [ ] *La primera experiencia es un muro de configuración.* Un usuario nuevo abre MimBot y lo primero que ve es un panel pidiendo una API key de Gemini, con un link externo a AI Studio. Alternativas:
  - Ofrecer un modo "prueba gratis" con un backend propio (con cuota chica) para las primeras N preguntas, y recién ahí pedir la key propia.
  - O, si eso no es viable por costo, al menos mostrar un preview de qué tipo de respuestas da MimBot (ejemplos estáticos) para justificar el paso de conseguir la key antes de pedirla.
- [x] *El toggle Bully/Estándar no explica las consecuencias antes de usarlo.* Tooltips descriptivos y etiquetas accesibles agregadas.
- [x] *No hay forma de copiar una respuesta o un bloque de código.* Botón de copiar respuesta agregado a cada mensaje del modelo con feedback visual instantáneo.
- [x] *El botón de reiniciar chat (RotateCcw) no pide confirmación.* Implementado mecanismo de deshacer (Undo) de 4.5 segundos para restaurar la conversación si se presiona por error.
- [ ] *Los "quick questions" son buenos pero estáticos una vez que el chat ya tiene mensajes.* Después del primer intercambio, desaparecen. Se podría mantener un set de sugerencias contextuales más chico (2 chips) ligado a la última respuesta, tipo "preguntas de seguimiento sugeridas" (patrón común en copilots).
- [x] *El estado de error se mezcla con el estado de "falta key".* Desacoplado: el error 429 de cuota o rate limit se muestra inline en el chat sin desconfigurar la clave del usuario.
- [x] *Accesibilidad básica:* los botones ahora cuentan con `aria-label` descriptivos para lectores de pantalla.
- [x] *El indicador "Gemini Conectado" es engañoso.* Resuelto: validación preventiva con ping liviano a `/api/settings/validate-keys` antes de reflejar el estado conectado.

## 4. Deuda de fondo & Arquitectura (ya en curso, seguir empujando)

- [x] Verificación estricta de fronteras de arquitectura (`npm run lint:architecture`, AST dependency boundary verifier en CI).
- [ ] Bajar el uso de `any` (935 casos) — priorizar `lib/security/`, `lib/intelligence/sage/` y hooks orquestadores (`useHomeController.ts`).
- [ ] Generalizar esquemas Zod a más rutas (actualmente 17/93).
- [ ] Seguir sumando tests — el patrón de crecimiento (5→10→12→13 suites) está bien, no aflojar.
- [ ] Revisar el `eval("require")` en `sage/cacheEngine.ts` — reemplazar por imports estáticos si es posible.
- [ ] Modularización progresiva de componentes monolíticos (> 500 líneas):
  - [ ] `web/components/tabs/DiscoverTab.tsx` (862 líneas) y `web/components/DraftDetailView.tsx` (819 líneas).
  - [ ] `components/fomo/core/FomoVersionOverlay.tsx` (869 líneas).
  - [ ] `web/hooks/useHomeController.ts` — continuar modularización por ownership; Discover ya no pertenece al controlador, pero Drafts/Profile/Community y otras responsabilidades siguen pendientes.
    - [x] Phase 1 — Discover extraído y verificado en PR #43; el contrato público permanece compuesto desde `useHomeController` y la búsqueda/cache/payload quedan detrás de fronteras separadas.
    - [ ] Phase 2+ — reevaluar Drafts y Profile/Community en Hogwarts Council antes de nuevas extracciones; no perseguir reducción de líneas como objetivo aislado.
- [x] Ampliación de formatos en auditoría de licencias: soporte para manifiestos Quilt (`quilt.mod.json`).

---

## 5. Pipeline de Inferencia y Cascada de Modelos (`api/sage/chat`)

- [x] *Conectar la caché determinista al endpoint de chat:* Integrar `cacheEngine.ts` (`computeCrashSignature` y `getCachedDiagnosis`) con `api/sage/chat` para responder y enriquecer de forma instantánea sobre firmas de crash ya analizadas.
- [x] *Memoria de modelo en la cascada:* Guardar en memoria el último modelo de Gemini que respondió con éxito (`gemini-flash-lite-latest` → `3.5-flash-lite` → `3.5-flash` → `3.6-flash`) y priorizarlo en las siguientes peticiones para evitar round-trips fallidos cuando el modelo principal devuelve 429.
- [x] *Diferenciar presupuestos de tokens (`maxOutputTokens`):*
  - Modo Bully: ~250–280 tokens (respuestas cortas, ácidas y directas).
  - Modo Estándar: ~650–700 tokens (diagnóstico estructurado en 3 secciones: resumen técnico, causa raíz y mitigación).
- [x] *Ajustar temperatura en modo Bully:* Reducir de 0.7 a 0.5 para conservar el estilo satírico sin arriesgar la exactitud del diagnóstico técnico ni alucinar dependencias.
- [x] *Truncar la ventana de contexto de conversación:* Enviar únicamente los últimos 6 turnos de mensajes para no diluir la atención del modelo ni inflar innecesariamente el consumo de tokens en sesiones extensas.
- [ ] *Resolver soporte multi-proveedor:* Conectar el soporte de OpenAI (`gpt-4o` presente en `sageMimbotEngine.ts`) al endpoint de chat como proveedor alternativo en caso de agotamiento de Google AI Studio, o depurar el código no conectado.

> ℹ️ **Benchmark de Modelos Evaluado (Sep 2026):**
> Se mantiene como modelo base **Gemini 3.5 Flash-Lite** ($0.30 / $2.50 por 1M tokens) al estar optimizado por Google para alto volumen y parsing de documentos pre-procesados. Modelos más caros (Claude Haiku 4.5 a $1.00/$5.00) no justifican el costo para prompts que ya reciben el crash resumido por SAGE, y modelos ultra-económicos (GPT-5 nano a $0.05/$0.40) muestran degradación en resolución de dependencias complejas.

---

## 6. Gestión de Cuota y Resiliencia en Free Tier (RPM / TPM / RPD)

- [x] *Diferenciación de error 429 en UI:* Desacoplar el error de cuota/frecuencia del error de falta de clave (401), evitando que la UI desconfigure la API key del usuario.
- [ ] *Diferenciación contextual de límites de cuota:*
  - Distinguir en el mensaje de error si se alcanzó el límite por minuto (**RPM ~15** o **TPM ~250k**) que requiere esperar unos segundos.
  - Distinguir si se alcanzó el límite diario (**RPD ~1.000–1.500**) que resetea a medianoche hora Pacífico.
- [ ] *Encolamiento de peticiones concurrentes:* Si en el futuro SAGE permite analizar múltiples logs o reportes en lote, procesar en cola secuencial para no superar el límite de 15 RPM del free tier.
- [ ] *Caché persistente local en disco/localStorage:* Extender la memoria de respuestas cacheadas para las 4 preguntas rápidas iniciales (quick questions) asociadas a una firma de crash durante 24 horas.

---

## 7. Privacidad y Transparencia de Datos en BYOK

- [ ] *Aviso de privacidad del Free Tier de Google:* Incorporar un aviso visible en el panel de configuración de MIM-Bot explicando con transparencia que Google AI Studio en su capa gratuita puede utilizar los prompts para entrenamiento de modelos (mientras que cuentas con facturación habilitada o keys privadas no lo hacen).
- [x] *Validación preventiva de API Key:* Implementado en `/api/settings/validate-keys` asegurando que la clave nunca viaje en la URL.
