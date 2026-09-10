# Guía de Onboarding para Desarrolladores y Contribuidores

Bienvenido al repositorio de **MIM (Minecraft Intelligent Manager)**. Esta guía está diseñada para permitir a cualquier desarrollador, auditor de seguridad o contribuidor externo configurar el entorno de desarrollo, ejecutar las suites de pruebas y comenzar a programar de manera productiva en menos de 10 minutos.

---

## 1. Requisitos Previos

- **Node.js**: Versión 18.x o 20.x LTS recomendada.
- **npm**: Versión 9.x o superior.
- **Git**: Configurado con soporte para terminaciones de línea (CRLF/LF).
- **Sistema Operativo**: Compatible con Windows (plataforma principal para Electron), macOS y Linux.

---

## 2. Puesta en Marcha (Setup)

### Paso 1: Clonar e Instalar Dependencias

```bash
git clone https://github.com/Ian9Franco/MIM.git
cd MIM

# 1. Instalar dependencias del core y cliente Electron
npm install

# 2. Instalar dependencias de MIMweb
cd web
npm install
cd ..
```

### Paso 2: Variables de Entorno (Opcional para desarrollo local)

Copia o crea los archivos `.env.local` en la raíz y en el directorio `web/`:

```env
# Claves de terceros (opcionales; el sistema cuenta con fallbacks y mocks seguros)
CURSEFORGE_API_KEY=tu_clave_de_curseforge
GEMINI_API_KEY=tu_clave_de_gemini
MODRINTH_API_KEY=tu_token_de_modrinth
DEEPL_API_KEY=tu_clave_de_deepl_free
```

---

## 3. Verificación y Testing

MIM cuenta con una suite de pruebas headless automatizada de 10 motores que cubren 144 escenarios críticos sin requerir dependencias externas de red:

```bash
# Ejecutar la suite integral de pruebas (10 suites)
npm test
```

### Suites Incluidas:
1. **SAGE NBT Binary Safe Recovery**: Valida la manipulación binaria y descompresión de datos NBT dañados.
2. **SAGE 2.0 Diagnostic Evaluation**: Benchmark con 125 crash logs reales de Forge, Fabric, NeoForge y Quilt.
3. **SAGE 2.0 Core Taxonomy & Parser**: Validación de sanitización ANSI, extracción de stack frames y clasificación.
4. **SAGE 2.0 AI & RAG Layer**: Verificación de guardrails y recuperación contextual de soluciones.
5. **Aduana Deduplication & Storage**: Pruebas de invariancia de almacenamiento y enlaces duros SHA-256.
6. **Security Static Bytecode Engine**: Análisis estático de clases Java y firmas maliciosas en JARs.
7. **Security Threat Intelligence & Rate Limiter**: Rate limiting por IP, mitigación de colisiones de caché y firmas de amenazas conocidas.
8. **Critical API Integration & Zod Schema Contracts**: Validación estricta de esquemas Zod en endpoints clave.
9. **MIM-Bot Personality & Heuristic Fallback Engine**: Alternancia entre modos Bully y Standard, prompts seguros y respuestas offline.
10. **Third-Party Modpack License Auditor**: Detección de metadatos de licencias (MIT, GPL, All Rights Reserved) y alertas de redistribución.

### Verificación de Tipos TypeScript:

```bash
# Compilar core y desktop
npx tsc --noEmit

# Compilar MIMweb
npx tsc --project web/tsconfig.json --noEmit
```

---

## 4. Ejecución en Desarrollo

```bash
# Iniciar la aplicación Desktop (Electron + Next.js App)
npm run dev

# Iniciar el portal web independiente (MIMweb)
cd web
npm run dev
```

---

## 5. Mapa Mental del Repositorio

Para mantener el orden arquitectónico, el proyecto sigue reglas estrictas:

```
MIM/
├── app/                  # Rutas y API locales de la app Electron (Next.js App Router)
├── web/                  # Portal web público MIMweb (Next.js 14 en Edge/Vercel)
│   ├── app/api/          # 14 endpoints públicos blindados con withApiGuard + Zod
│   ├── lib/apiGuard.ts   # Higher-Order Function de Rate Limiting y Validación
│   └── middleware.ts     # Middleware perimetral de cabeceras defensivas (HSTS, CSP, etc.)
├── lib/                  # Motores de dominio independientes de la UI
│   ├── intelligence/     # SAGE 2.0, ModExplainer, diagnóstico y taxonomía de errores
│   ├── security/         # Security Scanner, análisis estático y caché de VirusTotal
│   ├── storage/          # Aduana Storage Engine, deduplicación y gestión de archivos
│   └── modding/          # License Auditor y metadatos de modding
├── components/           # Componentes UI organizados por dominio funcional
├── hooks/                # Custom React Hooks compartidos
├── docs/                 # Documentación del ciclo de vida de software
│   ├── ARCHITECTURE.md   # Topología del sistema y diagramas Mermaid
│   ├── THREAT_MODEL.md   # Modelo de amenazas, DAST y directrices OWASP
│   ├── ROADMAP.md        # Visión y metas del proyecto
│   └── ONBOARDING.md     # Esta guía
├── scripts/              # Herramientas de soporte y suites de pruebas
└── BACKLOG.md            # Backlog dinámico vivo con priorización MoSCoW
```

---

## 6. Reglas de Contribución Clave

1. **No crear carpeta `src/`**: Todo el código de aplicación vive directamente en las raíces estructuradas descritas arriba.
2. **Modularidad estricta**: Ningún componente debe superar **600 líneas de código funcional**. Si un componente crece por encima de este límite, debe dividirse en submódulos (los bloques de comentarios y documentación interna no cuentan para este límite).
3. **Defensa sistémica en APIs**: Cualquier nuevo endpoint creado en `web/app/api/` **debe** utilizar el wrapper `withApiGuard` con esquemas Zod para query y/o body.
4. **Cero Regresiones**: Todo Pull Request debe verificar que `npm test` y `npx tsc --noEmit` completen con éxito al 100%.
