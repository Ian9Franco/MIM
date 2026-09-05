# MIM — Roadmap Oficial & Estado de Evolución (v11.4.0)

> Roadmap unificado de evolución técnica de Minecraft Intelligent Manager.  
> **Versión Actual:** v11.4.0 | **Última actualización:** 2026-09-05  
> *(Historial de hitos de versiones anteriores preservado en [docs/releases/ROADMAP_v10_HISTORIC.md](../releases/ROADMAP_v10_HISTORIC.md)).*

---

## 1. Proceso & Seguridad de API (Completado en v11.3.0)

- [x] **Hacer withApiGuard obligatorio, no opcional:**
  - [x] Barrido de 100% de rutas en `web/app/api/` y `app/api/` (112 handlers protegidos).
  - [x] Regla de CI que falla estructuralmente con AST si un `route.ts` no usa `withApiGuard` (`npm run lint:api-guard`).
  - [x] Soporte para allowlist formalizada y documentada de excepciones.
  - [x] Suite de tests exhaustiva del wrapper con casos negativos, validación Zod y rate limits reales.
  - [x] CI/CD: Branch protection ruleset en GitHub configurado para `main` con bypass admin para pushes locales.
  - [x] Helper local interactivo para auditar PRs de IAs en un solo paso (`npm run pr:review`).

---

## 2. Funcionamiento de MimBot (En curso)

- [x] *Aplicar withApiGuard a api/sage/chat:* Blindado con rate limit defensivo (25 req/min) y validación Zod estricta.
- [ ] *No guardar la API key de Gemini en texto plano:* Cifrar en disco o usar `safeStorage` del SO en Electron.
- [x] *Recortar el contexto de conversación antes de enviarlo:* Truncado automático a los últimos 6 turnos en `api/sage/chat`.
- [ ] *Streaming de respuesta:* Implementar streaming de tokens en Gemini para mejorar sensación de velocidad en respuestas largas.
- [x] *Manejo de rate-limit/cuota de la propia API de Gemini:* Diferenciación explícita de código 429 (`RATE_LIMITED`) con mensaje claro en el chat sin desconfigurar la key.
- [ ] *Persistir el historial del chat:* Guardar historial localmente (opt-in) para no perderlo al cambiar de crash o recargar.

---

## 3. UX/UI de MimBot (En curso)

- [ ] *Mejorar primera experiencia (onboarding sin key):* Ofrecer modo de prueba inicial o preview estático de ejemplos de respuesta antes de exigir la API key.
- [x] *Explicación de modo Bully vs. Estándar:* Tooltips descriptivos y etiquetas claras.
- [x] *Copia de mensajes y código:* Botón de copiar respuesta con feedback visual inmediato.
- [x] *Confirmación de reinicio:* Mecanismo de deshacer (Undo) de 4.5 segundos al resetear la conversación.
- [ ] *Preguntas de seguimiento sugeridas:* Chips contextuales dinámicos ligados a la última respuesta del modelo.
- [x] *Desacoplar error 429 del error 401:* Los límites de cuota se muestran inline sin desloguear la clave.
- [x] *Accesibilidad:* Atributos `aria-label` descriptivos en todos los botones del copiloto.
- [x] *Validación preventiva de API Key:* Ping liviano al guardar la clave antes de marcar "Gemini Conectado" (`/api/settings/validate-keys`).

---

## 4. Deuda de fondo & Arquitectura

- [x] Verificación estricta de fronteras de arquitectura (`npm run lint:architecture`, AST dependency boundary verifier en CI).
- [ ] Bajar el uso de `any` (935 casos) — priorizar `lib/security/`, `lib/intelligence/sage/` y hooks orquestadores (`useHomeController.ts`).
- [ ] Generalizar esquemas Zod a más rutas (actualmente 17/93).
- [ ] Seguir sumando tests — meta: mantener 100% pass en todas las suites de `npm test`.
- [ ] Revisar el `eval("require")` en `sage/cacheEngine.ts` — reemplazar por imports estáticos si es posible.
- [ ] Modularización progresiva de componentes monolíticos (> 500 líneas):
  - [ ] `web/components/tabs/DiscoverTab.tsx` (862 líneas) y `web/components/DraftDetailView.tsx` (819 líneas).
  - [ ] `components/fomo/core/FomoVersionOverlay.tsx` (869 líneas).
  - [ ] `web/hooks/useHomeController.ts` (1,525 líneas) modularizar en sub-hooks (`useHomeFilters`, `useHomeDrafts`, `useHomeSearch`, `useHomeCommunity`).
- [x] Ampliación de formatos en auditoría de licencias: soporte para manifiestos Quilt (`quilt.mod.json`).

---

## 5. Pipeline de Inferencia & Cascada de Modelos (`api/sage/chat`)

- [x] *Caché determinista conectada:* Integración de `cacheEngine.ts` con `api/sage/chat` para diagnósticos instantáneos de firmas conocidas.
- [x] *Memoria de modelo en la cascada:* Recordar el último modelo exitoso (`flash-lite-latest` → `3.5-flash-lite` → `3.5-flash` → `3.6-flash`) para evitar round-trips fallidos tras un 429.
- [x] *Presupuestos de tokens diferenciados:* Modo Bully (~250 tokens) vs. Modo Estándar (~700 tokens estructurados).
- [x] *Ajuste de temperatura en modo Bully:* Reducida a 0.5 para conservar estilo satírico sin alucinar dependencias.
- [x] *Ventana de contexto acotada:* Últimos 6 turnos para no inflar consumo de tokens.
- [ ] *Soporte multi-proveedor:* Conectar `gpt-4o` de `sageMimbotEngine.ts` como proveedor de respaldo ante agotamiento de cuota de Google AI Studio.

---

## 6. Gestión de Cuota y Resiliencia en Free Tier

- [x] *Diferenciación de error 429 en UI:* Desacoplar cuota/frecuencia de falta de clave.
- [ ] *Diferenciación contextual de límites:* Distinguir en el mensaje si se alcanzó el límite por minuto (RPM ~15 / TPM ~250k) o el límite diario (RPD ~1.500).
- [ ] *Encolamiento de peticiones concurrentes:* Procesar en cola secuencial para no superar el límite de 15 RPM.
- [ ] *Caché persistente local para quick questions:* Guardar respuestas de preguntas frecuentes por 24 horas.

---

## 7. Privacidad y Transparencia en BYOK

- [ ] *Aviso de privacidad del Free Tier de Google:* Notificar con claridad que la capa gratuita de AI Studio puede usar datos para entrenamiento (a diferencia de tiers pagos).
- [x] *Ping preventivo de clave:* Validar conectividad antes de confirmar el estado de conexión (endpoint seguro sin key en URL).
