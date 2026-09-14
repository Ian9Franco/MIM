# Guía de Onboarding para Desarrolladores y Contribuidores

Bienvenido al repositorio de **MIM (Minecraft Intelligent Manager)**. Esta guía está diseñada para permitir a cualquier desarrollador, auditor de seguridad o contribuidor externo configurar el entorno de desarrollo, ejecutar las suites de pruebas y comenzar a programar de manera productiva en menos de 10 minutos.

**Versión de referencia:** v11.4.8 · monorepo npm (`apps/*`, `packages/*`).

---

## 1. Requisitos Previos

- **Node.js**: 20.x LTS (18.x puede funcionar; CI usa Node 20).
- **npm**: 9.x o superior (workspaces).
- **Git**: Configurado con soporte para terminaciones de línea (CRLF/LF).
- **Sistema Operativo**: Windows es la plataforma principal para Electron; macOS y Linux sirven para Hub y tests headless.

---

## 2. Puesta en Marcha (Setup)

### Paso 1: Clonar e Instalar Dependencias

El Hub (`apps/hub`) y los packages (`packages/*`) se instalan con el `npm install` de la raíz. **No existe la carpeta `web/`.**

```bash
git clone https://github.com/Ian9Franco/MIM.git
cd MIM
npm install
```

### Paso 2: Variables de Entorno (Opcional para desarrollo local)

Copia o crea `.env.local` en la raíz. El Hub puede usar el mismo archivo o `apps/hub/.env.local` en Vercel/local.

```env
# Claves de terceros (opcionales; el sistema cuenta con fallbacks y mocks seguros)
CURSEFORGE_API_KEY=tu_clave_de_curseforge
GEMINI_API_KEY=tu_clave_de_gemini
OPENROUTER_API_KEY=sk-or-v1-...   # opcional — chat texto vía GLM; ver guía MIM-Bot
MODRINTH_API_KEY=tu_token_de_modrinth
DEEPL_API_KEY=tu_clave_de_deepl_free
```

Guía completa BYOK / free tier para MIM-Bot: [mimbot-byok-setup.md](./mimbot-byok-setup.md).  
Credenciales Desktop (Electron `safeStorage`): [desktop-credentials.md](./desktop-credentials.md).

---

## 3. Verificación y Testing

`npm test` corre el runner unificado (`scripts/test-runner.js` + `scripts/test-suites.js`): ~36 suites (NBT, SAGE 125 casos, Aduana, security, Server Manager, Hub contracts, gates de arquitectura, etc.).

```bash
npm test
```

Listado canónico de suites: `scripts/test-suites.js`. El README de `scripts/__tests__/` documenta en detalle la suite NBT; el resto de tests viven en el mismo directorio.

### Verificación de Tipos TypeScript

```bash
# Core / Desktop
npx tsc --noEmit

# Hub (apps/hub)
npx tsc --project apps/hub/tsconfig.json --noEmit
```

---

## 4. Ejecución en Desarrollo

```bash
# Aplicación Desktop (Next.js App Router en la raíz; Electron via start:standalone)
npm run dev

# Portal público MIM Hub (Next.js 16, puerto 3001)
npm --prefix apps/hub run dev

# Fixture SFTP local para Server Manager (/servers)
npm run dev:server-fixture
```

Empaquetado Windows: `npm run package:win` (no existe `electron:build`).

---

## 5. Mapa Mental del Repositorio

```
MIM/
├── app/                  # Rutas y API locales de Desktop (Next.js App Router)
├── apps/
│   ├── desktop/          # Workspace de empaquetado Electron
│   └── hub/              # MIM Hub PWA (Next.js 16 en Vercel)
│       ├── app/api/      # Endpoints públicos con withApiGuard + Zod
│       ├── lib/apiGuard.ts
│       └── middleware.ts # Cabeceras defensivas (HSTS, CSP, etc.)
├── packages/             # Contratos y engines puros (@mim/*)
├── lib/                  # Motores de dominio independientes de la UI
├── components/           # UI Desktop por dominio
├── docs/                 # Índice: docs/README.md
│   ├── planning/         # ROADMAP, project-status, whosnext
│   ├── architecture/     # overview, mim-core, boundaries
│   ├── engines/          # SAGE, Aduana, NBT, FOMO
│   ├── security/         # threat-model, bytecode-scanner
│   └── guides/           # Esta guía (onboarding.md)
├── standalone/           # Electron shell
└── scripts/              # Tests, benchmarks, release
```

Pendientes consolidados: [docs/PENDING.md](../PENDING.md).

---

## 6. Reglas de Contribución Clave

1. **No crear carpeta `src/`**: el código vive en `app/`, `apps/`, `packages/`, `lib/`, `components/`, `hooks/`, `services/`.
2. **Modularidad estricta**: ningún componente debe superar **600 líneas de código funcional**.
3. **Defensa sistémica en APIs**: todo endpoint nuevo en `app/api/` o `apps/hub/app/api/` **debe** usar `withApiGuard` con esquemas Zod (`npm run lint:api-guard`).
4. **Cero regresiones**: `npm test` y `npx tsc --noEmit` (más `tsc` del Hub) deben pasar. Antes de pushear: `npm run pre:push` o `pre:push:lint`.
