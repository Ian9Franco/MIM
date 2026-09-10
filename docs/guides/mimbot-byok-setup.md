# MIM-Bot — Guía BYOK (Gemini + OpenRouter) orientada a uso gratuito

> **Contexto:** MIM es un proyecto sin fines de lucro hoy. Esta guía prioriza **free tier / BYOK** para no quemar presupuesto mientras el producto madura. Cuando MIM genere ingresos, podrás evaluar billing centralizado; hasta entonces, **cada usuario trae su propia clave**.

---

## 1. ¿Qué necesitás configurar?

MIM-Bot usa un **Model Gateway** (ADR-007) con dos proveedores:

| Proveedor | Rol en MIM | ¿Gratis? | ¿Obligatorio? |
|-----------|------------|----------|---------------|
| **Google Gemini** | Default, multimodal, search grounding en FOMO | [Free tier en AI Studio](https://ai.google.dev/gemini-api/docs/pricing) (límites por proyecto) | **Sí** para el copiloto SAGE y funciones visión/búsqueda |
| **OpenRouter** | Texto barato vía GLM cuando hay clave | Cuenta gratis + modelos `:free` / créditos promocionales; GLM en OpenRouter puede tener costo — revisar precio del modelo | **Opcional** (recomendado para ahorrar cuota Gemini en chat) |

**Idea clave:** con **ambas** claves, MIM enruta automáticamente:

- **Chat de texto** (SAGE, explain-deps) → OpenRouter / GLM si hay clave OpenRouter
- **Multimodal / Google Search** → Gemini (no hay reemplazo equivalente gratis hoy)

---

## 2. Setup recomendado (orden)

### Paso A — Gemini (15 min, sin tarjeta)

1. Entrá a [Google AI Studio → API Keys](https://aistudio.google.com/app/apikey).
2. Creá un proyecto (si no tenés) y generá una API key (`AIzaSy...`).
3. En **MIM Desktop** → **Ajustes** → pestaña **API Keys** → **Google Gemini API Key** → pegá la clave → **Guardar**.
4. En el copiloto SAGE, el badge debe pasar a **Gemini verificado** (validación vía `/api/settings/validate-keys`).

**Límites free tier (referencia):** varían por modelo y región. Consultá siempre la página oficial de [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) y el panel de AI Studio → *Rate limits* de tu proyecto. No asumas números fijos: Google los ajusta.

**Tip ahorro:** MIM usa modelos Flash en cascada (`gemini-flash-lite-latest`, etc.). Preferí Flash sobre Pro en free tier.

---

### Paso B — OpenRouter (10 min, sin tarjeta para empezar)

1. Creá cuenta en [openrouter.ai](https://openrouter.ai/) (email o GitHub).
2. Andá a [openrouter.ai/keys](https://openrouter.ai/keys) → **Create Key** → copiá `sk-or-v1-...`.
3. En **MIM** → **Ajustes** → **API Keys** → **OpenRouter API Key** → pegá y guardá.

**Free tier OpenRouter (referencia 2026):**

- Modelos con sufijo **`:free`** (ej. `meta-llama/llama-3.3-70b-instruct:free`) tienen costo $0 en OpenRouter.
- Sin comprar créditos: límites bajos (~50 requests/día en modelos free; ~20 RPM según documentación comunitaria — verificar en [openrouter.ai/docs](https://openrouter.ai/docs)).
- Con **$10 de créditos** (opcional, no necesario al inicio) sube el daily limit en modelos free.

**Qué usa MIM hoy:** el gateway intenta **GLM-4 Flash** (`zhipu-ai/glm-4-flash-250414`) como primer modelo OpenRouter. **Verificá en OpenRouter si ese modelo sigue siendo gratis** antes de asumir costo cero; los precios cambian. Si deja de ser free, podés:

- Usar solo Gemini (sin OpenRouter), o
- Cargar créditos mínimos en OpenRouter, o
- Abrir issue/PR para apuntar a un modelo `:free` del roster OpenRouter.

---

## 3. Cómo enruta MIM (automático)

Con `MIMBOT_INTENT_ROUTING` activo (default):

```
Pregunta de texto en SAGE/FOMO
  ├─ ¿Hay OpenRouter key? → OpenRouter (GLM cascade)
  └─ Si no → Gemini

Explain mod con imagen / search grounding
  └─ Gemini (siempre)
```

Variables opcionales (desarrollo / `.env` local):

```bash
# Claves (alternativa a Settings en dev)
GEMINI_API_KEY=AIzaSy...
OPENROUTER_API_KEY=sk-or-v1-...

# Override global (normalmente no hace falta)
# MIMBOT_AI_PROVIDER=gemini   # default
# MIMBOT_INTENT_ROUTING=false # desactiva routing por intención
```

En **Desktop**, las claves se guardan en **safeStorage** (Electron); no se escriben en plaintext en `mim-settings.json`.

---

## 4. Estrategia “free first” para MIM sin presupuesto

1. **Gemini free** para todo lo que requiera visión o búsqueda web en mods.
2. **OpenRouter** para chat de crashes y explain-deps (texto) → preserva RPM/RPD de Gemini.
3. **Caché 24 h** de quick questions (BOT-08): repetir chips no vuelve a llamar al LLM.
4. **Panel “Uso de IA (sesión local)”** en Settings (BOT-06): contadores locales RPM; no reemplaza el dashboard del proveedor.
5. **No actives billing** en Google hasta que el free tier sea insuficiente.
6. **No cargues créditos** en OpenRouter hasta que veas 429 frecuentes en texto.

---

## 5. Otras APIs de MIM (también BYOK / free)

| API | Uso | Free tier |
|-----|-----|-----------|
| **CurseForge** | Discover, versiones | Key gratis en [console.curseforge.com](https://console.curseforge.com/) — **requerida** |
| **Modrinth** | Discover, token PAT | Opcional; [modrinth.com/settings/pats](https://modrinth.com/settings/pats) |
| **VirusTotal** | Escaneo opcional | Free tier limitado en [virustotal.com](https://www.virustotal.com/) |

Estas no son MIM-Bot, pero compiten por la misma “cuota mental” de configuración en Settings.

---

## 6. Transparencia y privacidad (BYOK)

- BYOK **no** significa privacidad absoluta: Gemini y OpenRouter procesan el contenido según **sus** términos.
- MIM envía: resumen del crash SAGE, tu pregunta, últimos mensajes del chat, mods sospechosos.
- MIM **no** almacena el texto del chat en servidores propios con BYOK; retención = política del proveedor.
- Panel **Transparencia BYOK** en Settings → API Keys y en el modal del copiloto.

Enlaces oficiales:

- [Gemini API Terms](https://ai.google.dev/gemini-api/terms)
- [Google Privacy](https://policies.google.com/privacy)
- [OpenRouter Privacy](https://openrouter.ai/privacy)

---

## 7. Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| Badge “Gemini inválida” | Key mal copiada o revocada | Regenerar en AI Studio, re-guardar en Settings |
| “Cuota Gemini agotada” | RPM/RPD free tier | Esperar reset (daily ~ medianoche PT) o usar OpenRouter para texto |
| Chat responde pero muy lento | Fallback de modelos | Revisar panel de cuota local; reducir mensajes largos |
| OpenRouter 401 | Key inválida | Crear nueva key en openrouter.ai/keys |
| OpenRouter 402 / insufficient credits | Modelo de pago sin saldo | Verificar precio del modelo GLM o usar solo Gemini |
| Copiloto pide key pero Settings dice configurada | Sesión dev sin Electron | En `npm run dev`, exportá `GEMINI_API_KEY` o usá Desktop |

---

## 8. Roadmap (qué NO está gratis centralizado aún)

- **Backend MIM gestionado** con cuota compartida → requiere presupuesto y decisión de producto (BOT-02 backend gratuito **pospuesto**).
- **Costos acumulados OpenRouter en UI** (BOT-06b) → pendiente.
- **Migración legacy `web/`** a gateway completo → pendiente.

---

## 9. Checklist rápido

- [ ] Cuenta Google AI Studio + key Gemini
- [ ] Key Gemini guardada en MIM Settings
- [ ] Copiloto SAGE muestra “Gemini verificado”
- [ ] (Opcional) Cuenta OpenRouter + key `sk-or-v1-...`
- [ ] (Opcional) Key OpenRouter guardada en MIM Settings
- [ ] CurseForge key configurada (para el resto de MIM)
- [ ] Leíste Transparencia BYOK en Settings

Con eso tenés MIM-Bot operativo en modo **zero-cost lo más posible** hasta que el proyecto pueda pagar infraestructura propia.
