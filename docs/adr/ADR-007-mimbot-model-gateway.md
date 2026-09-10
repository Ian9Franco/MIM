# ADR-007: MIMbot Model Gateway (provider-agnostic, GLM candidate)

- **Status:** Accepted
- **Deciders:** Ian Franco
- **Date:** 2026-09-09

---

## 1. Context & Problem Statement

MIMbot today calls Google Gemini (and a disconnected OpenAI branch) from feature code. Swapping the model would require refactors in the explainer, SAGE copilot, and HTTP routes. GLM-5.3 Flash is a strong cost/capability candidate for explanation, but it must not become the source of truth for diagnosis.

[ADR-001](./ADR-001-deterministic-diagnosis-vs-llm.md) already forbids LLMs from manufacturing crash causes. This record covers *how* models are reached.

## 2. Decision

1. Introduce an `AIProvider` interface (`generate`) with `GeminiProvider` and `OpenRouterProvider`.
2. Keep Gemini as the product default until a later PR enables GLM via OpenRouter behind server-side configuration.
3. Never place a managed OpenRouter key in public frontend code. BYOK remains optional and separate from MIM-managed keys.
4. Changing the primary model is a configuration decision, not a UI rewrite.
5. GLM may become primary only after context/evidence layers exist and an internal comparison against Gemini is recorded. Until then it is a candidate, not a replacement.

## 3. Consequences

### Positive

- Feature code can stop depending on a single HTTP vendor.
- GLM can be integrated without rewriting prompts or UX in the same change.
- Search grounding stays a Gemini specialist capability, not a requirement of every provider.

### Trade-offs

- SAGE chat streaming remains Gemini-specific until a later PR adds a streaming contract.
- Two provider implementations must stay compatible with the same `AIRequest` / `AIResponse` shape, including multimodal parts.
- OpenRouter is an extra network hop and an extra secret to operate.

### Out of scope for the first implementation

- Feature flags in the UI, A/B routing, semantic cache, and evaluation fixtures.

## 4. Revisión (2026-09-10)

El código de esta entrega mantiene Gemini como default (`resolveConfiguredAIProviderId` → `"gemini"` salvo `MIMBOT_AI_PROVIDER=openrouter`). GLM-4 Flash (OpenRouter) está implementado como candidato detrás de esa variable y de BYOK OpenRouter. No hay cambio de modelo primario en producto hasta un PR posterior con comparación registrada.

## 5. Revisión (2026-09-10) — BOT-GW intent routing

`generateWithModelGateway()` en `lib/intelligence/ai/modelGateway.ts` enruta por intención cuando `MIMBOT_INTENT_ROUTING` no está desactivado:

- **Texto** (`sage-chat`, `mim-bot-chat`, `mod-explain-text`, `dependency-explain`) → OpenRouter/GLM si hay clave; si no, Gemini.
- **Multimodal** (`mod-explain-multimodal`) → Gemini (visión).
- **Search grounding** (descripción escasa en mod explain) → Gemini con `tools.googleSearch`.

`MIMBOT_AI_PROVIDER=openrouter` sigue aplicando como override global cuando `MIMBOT_INTENT_ROUTING=false`.
