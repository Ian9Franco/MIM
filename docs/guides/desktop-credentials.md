# Credenciales en MIM Desktop vs MIMhub (Vercel)

Guía de dónde vive cada clave de API, qué pasa al instalar una release nueva y cómo recuperar credenciales de versiones anteriores.

---

## Resumen por superficie

| Clave | MIMhub (Vercel) | MIM Desktop |
| :--- | :--- | :--- |
| **Gemini / AI Studio** | Variable de entorno `GEMINI_API_KEY` en el proyecto Vercel | Settings → almacenamiento cifrado (`safeStorage`) en `%USERPROFILE%\.mim-index\` |
| **OpenRouter** | `OPENROUTER_API_KEY` en Vercel (opcional) | Settings → mismo almacén cifrado |
| Modrinth / CurseForge / VirusTotal | Env o no configuradas en hub | Settings → almacén cifrado |

En **MIMhub** no hace falta abrir Settings para Gemini: la clave la inyecta Vercel en runtime.

En **Desktop** hay que configurarla una vez en **Settings → Claves de API**. El proceso Electron la persiste fuera del directorio de instalación.

---

## Ubicación canónica (Desktop)

Tras el arranque, Electron fija:

```
%USERPROFILE%\.mim-index\
├── mim-settings.json          # preferencias públicas (sin claves en texto plano)
└── mim-secrets.enc.json       # claves cifradas con OS safeStorage
```

El servidor Next.js embebido recibe `MIM_PORTABLE_DIR` y `MIM_DESKTOP_RUNTIME=1`, de modo que `lib/core/settings.ts` no cambie silenciosamente a rutas de desarrollo (`D:\.MIM\source\...`).

---

## Por qué a veces “desaparecían” las claves al actualizar

Versiones anteriores podían dejar credenciales en rutas distintas:

- `mim-settings.json` con claves en **texto plano** junto al ejecutable o en `.next/standalone/`
- `mim-secrets.enc.json` en otra carpeta `.mim-index` (p. ej. perfil vs instalación portable)
- En desarrollo, auto-switch a `D:\.MIM\source\.mim-index` que **no aplica** en builds empaquetados

Al instalar una release nueva, si el instalador no reutilizaba el mismo directorio de datos, el usuario veía Settings vacío aunque la clave siguiera en una ruta legacy.

### Comportamiento actual (post fix)

Al iniciar Desktop empaquetado:

1. Resuelve `%USERPROFILE%\.mim-index` (nunca `D:` en producción).
2. **Recupera** `mim-settings.json` y `mim-secrets.enc.json` desde rutas legacy conocidas si faltan en la ubicación canónica.
3. **Importa** claves en texto plano desde settings legacy hacia el almacén cifrado.
4. Descifra campo a campo: un fallo en una clave no borra el resto.

Si tras actualizar no ves la clave, revisá manualmente si existe `%USERPROFILE%\.mim-index\mim-secrets.enc.json`. Si está vacío pero tenés un backup de `mim-settings.json` antiguo con `geminiApiKey`, volvé a pegar la clave en Settings una vez; la migración la moverá al almacén cifrado.

---

## Verificación rápida

1. Desktop → Settings → guardar Gemini u OpenRouter.
2. Cerrar la app por completo y reabrir: el panel de cuotas / validación debe seguir marcando la clave como configurada.
3. Instalar sobre una release anterior (mismo usuario Windows): las claves deben persistir sin reconfigurar.

Comandos de desarrollo:

```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.scripts.json scripts/__tests__/secure-settings.test.ts
npm run test:openrouter-account
npm run eval:mimbot
```

---

## Relacionado

- [Model Gateway (ADR-007)](../adr/ADR-007-mimbot-model-gateway.md)
- [PENDING §3 — MIMbot](../PENDING.md#3-mimbot--model-gateway-backlog-llm)
- Panel **Uso de IA** en Settings (`GET /api/settings/ai-quota`) — contadores locales + uso OpenRouter vía API del proveedor (BOT-06b)
