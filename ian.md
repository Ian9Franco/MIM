# 🚀 Guía de Despliegue, Releases, Flujo con IAs y Standalone — MIM

Esta guía es tu manual rápido personal para verificar cambios, gestionar el flujo de PRs con IAs externas, crear releases automáticas en GitHub y compilar el ejecutable `.exe` nativo en tu máquina local.

---

## ⚡ 1. Los 2 Comandos Automatizados de 1 Solo Paso (Fast Track)

Diseñados para cuando querés máxima velocidad con garantía técnica absoluta: ejecutan **tooooodos los testeos** de forma obligatoria y resuelven el flujo en un solo comando.

### 🛡️ Modo A: Auditor Seguro de PRs (Safe Auditor / `pr:audit`)
```bash
npm run pr:audit <numero_de_pr | nombre_rama>
# Alias idéntico: npm run gatekeeper 15
```
**¿Qué hace automáticamente y de forma 100% segura?**
1. **Trae el PR:** Descarga (`git fetch`) y hace checkout de la rama del PR.
2. **Auditoría de Sincronización:** Compara commits y diff contra `origin/main` y verifica si la rama quedó desactualizada.
3. **Ejecuta absolutamente todas las compuertas de calidad (Fail-Closed):**
   - `lint:api-guard` (100% de rutas blindadas con `withApiGuard`)
   - `lint:architecture` (aislamiento estricto core vs UI/Desktop)
   - `test:architecture` (tests de contrato de fronteras)
   - `tsc --noEmit` (tipado estricto Raíz/Desktop)
   - `tsc web` (tipado estricto MIMweb)
   - `npm test` (16 suites unificadas del sistema, 144+ escenarios)
4. **Emite un Veredicto Estructurado Formal (Sin auto-push destructivo):**
   - **`READY`:** Todas las compuertas pasaron en verde y la rama está al día con `origin/main`. Listo para ser promovido de forma explícita con `npm run pr:promote`.
   - **`HOLD`:** Las compuertas pasaron pero la rama está atrasada con respecto a `origin/main`. Solicita actualizar con `git merge origin/main` y re-auditar antes de mergear.
   - **`REQUEST_CHANGES`:** Alguna compuerta falló. Bloquea el flujo, no toca `main` y genera un reporte detallado con fecha y hora en:
     `logs/pr-audits/audit-failed-PR-<id>-YYYY-MM-DD_HH-mm-ss.log`

5. **Promoción Manual Explícita:**
   Una vez que el PR obtiene el veredicto `READY`, ejecutas:
   ```bash
   npm run pr:promote
   ```
   *(Hace checkout a `main`, mergea, re-verifica compuertas en `main` y sube a `origin/main`).*


---

### 📦 Modo B: Release & Deploy Automático a GitHub (1-Click)
```bash
npm run release:auto
# Opcional especificando tipo o mensaje:
# npm run release:auto minor "Nuevo motor de seguridad"
# npm run release:auto patch "Correcciones menores"
```
**¿Qué hace automáticamente en 1 solo paso?**
1. **Ejecuta todos los testeos primero:** No toca ninguna versión ni sube nada si falla alguna compuerta.
2. **Calcula la versión semántica:** Detecta cambios y calcula el bump (`patch`/`minor`/`major`).
3. **Crea backup local:** Guarda rama de seguridad `backup/YYYY-MM-DDTHH-mm-ss`.
4. **Sincroniza la versión global:** Actualiza automáticamente `package.json`, `README.md`, `docs/architecture/MIM.md`, `docs/releases/CHANGELOG.md`, `docs/planning/PROJECT_STATUS.md` y `docs/planning/ROADMAP.md`.
5. **Commit y Tag:** Genera `chore(release): vX.Y.Z` y crea el tag `vX.Y.Z`.
6. **Push a GitHub:** Sube `main` y el tag `vX.Y.Z` a `origin`, disparando la GitHub Action [.github/workflows/release.yml](.github/workflows/release.yml) para compilar el ejecutable `.exe` de Windows y publicar la Release oficial.
7. **Cero pausas:** No pide confirmaciones `y/n`, hace todo el ciclo de principio a fin.

---

## 🎛️ 2. Los Comandos de Control Manual Paso a Paso (Conservados)

Si preferís revisar manualmente antes de decidir si promover o no, disponés del flujo interactivo tradicional:

### Flujo Manual de PRs:
```bash
# Paso 1: Inspeccionar PR y correr testeos sin mergear todavía
npm run pr:review <numero_o_rama>

# Paso 2: Si te gustó y pasó los tests ➔ Subir a main
npm run pr:promote

# Paso 3: Si no te gustó o querés volver sin tocar nada
npm run pr:return
```

### Asistente Manual de Release (Con Menú y Confirmaciones):
```bash
npm run release
```
*Abre el asistente interactivo original (`Choose your weapon: Release / Rollback / Sync`), preguntándote cada paso y confirmación antes de pushear.*

---

## 📋 3. Verificación Rápida de Salud (Chequeo Previo)

Si querés probar tus cambios locales manualmente antes de lanzar un commit o PR:

```bash
# 1. Chequeo estricto de tipos de TypeScript (Desktop y Hub)
npx tsc --noEmit; npx tsc --project apps/hub/tsconfig.json --noEmit

# 2. Verificación de blindaje estructural de APIs y Fronteras Arquitectónicas
npm run lint:api-guard
npm run lint:architecture
npm run test:architecture

# 3. Correr la suite de pruebas unificada (15 suites del sistema)
npm test
```

---

## 🚦 4. Pre-Push Gate — espejo local de CI (anti-sorpresa PR / Codacy)

Antes de `git push`, corré el mismo checklist que GitHub Actions. Así detectás fallos de tsc, eslint, tests, DAST y builds **en tu máquina**, no en el PR.

```bash
# Espejo completo de .github/workflows/ci.yml (~15–25 min)
npm run pre:push

# Sin test:coverage ni builds de producción (~8 min)
npm run pre:push:quick

# Solo tipos + eslint + arquitectura + simulacro Codacy (~2–4 min)
npm run pre:push:lint

# Simulacro Codacy solo (ESLint estricto en el diff vs main)
npm run codacy:diff

# Incluye cambios sin commitear en el diff
npm run codacy:diff:worktree

# Paridad total con Codacy Cloud (Semgrep, duplicación; primera vez tarda)
npm run codacy:cli
```

**Simulacro Codacy (antes del PR):**

| Comando | Qué hace |
| :--- | :--- |
| `npm run codacy:diff` | ESLint estricto (`eslint.codacy.mjs`) solo en archivos del diff vs `origin/main`, con `exclude_paths` de `.codacy.yml` |
| `npm run codacy:diff:worktree` | Igual + archivos staged/unstaged |
| `npm run codacy:cli` | CLI oficial `@codacy/analysis-cli --diff` (ESLint9 + Stylelint + Spectral en Windows) |
| `npm run codacy:init` | Genera `.codacy/codacy.config.json` (una vez; ~3–10 min) |
| `npm run codacy:init:remote` | Misma config que Codacy Cloud (requiere `CODACY_API_TOKEN`) |

**Windows:** Opengrep/Semgrep no tiene binario `win32` — las reglas de seguridad del PR las corre Codacy Cloud (Linux). En Windows usá `codacy:diff` como gate principal; `codacy:cli` corre sin `--install` por defecto (rápido). Forzá descarga de analizadores: `npm run codacy:cli -- --install`.

**Dependencias:** `@codacy/analysis-cli` y `yaml` están en `devDependencies`; corré `npm install` antes del primer `codacy:cli`.

**Qué cubre `pre:push` (paridad con CI):**

| Job CI | Compuerta local |
| :--- | :--- |
| lint-and-typecheck | tsc ×2, eslint ×2, api-guard, architecture |
| test-and-evaluate | test:coverage, sage-errors/stream/guardrails, eval:mimbot |
| dast-security-audit | dast-scan.js |
| build-production | `npm run build` + `build:hub` |

**Codacy:** `pre:push:lint` ya corre `codacy:diff`. Para reglas idénticas a la nube (security/duplicación), usá `codacy:init:remote` una vez y después `codacy:cli` antes del push.

Si falla, los logs quedan en `logs/pre-push-gates/` y `logs/codacy-diff-gates/`.

**Flujo recomendado antes de abrir PR:**

```bash
npm run codacy:diff:worktree   # mientras codeás (diff + working tree)
npm run pre:push:lint          # tsc + eslint + arquitectura + codacy:diff
npm run pre:push               # una vez listo para pushear
git push -u origin HEAD
```

`npm run pr:audit <rama>` sigue siendo útil **después** del push (veredicto READY/HOLD + comparación con origin/main), pero no incluye eslint ni builds — por eso existe `pre:push`.

---

## 💻 5. Crear el `.exe` Standalone en Local (En tu PC)

Si querés probar la aplicación de escritorio en tu máquina o generar el `.exe` sin esperar a GitHub Actions:

### Opción A: Compilar el Instalador `.exe` de Windows (Recomendado)
```bash
npm run package:win
```
* **¿Dónde queda el archivo listo?**
  * Al finalizar, el instalador se guarda en:
    `dist/MIM Setup <version>.exe`
  * Y la versión portable lista para abrir en:
    `dist/win-unpacked/MIM.exe`

### Opción B: Probar la Versión Standalone sin crear instalador
```bash
# Paso 1: Preparar la build standalone (obligatorio; sin esto Electron entra en espera infinita)
npm run build:standalone

# Paso 2: Abrir Electron
npm run start:standalone
```

---

## 🛠️ 6. Resumen Comparativo de Comandos

| Modo | Objetivo | Comando |
| :--- | :--- | :--- |
| ⚡ **Automático** | **Gatekeeper 1-Paso: Traer PR, testear, auto-push (o log de error)** | `npm run gatekeeper <id>` |
| ⚡ **Automático** | **Release 1-Paso: Testear, versionar, taggear y disparar deploy en GitHub** | `npm run release:auto` |
| 🎛️ **Manual** | **Auditar un PR o rama de la IA con veredicto en pantalla** | `npm run pr:review <id>` |
| 🎛️ **Manual** | **Promover y mergear a main el PR auditado** | `npm run pr:promote` |
| 🎛️ **Manual** | **Volver a main descartando la revisión** | `npm run pr:return` |
| 🎛️ **Manual** | **Asistente interactivo de release (con menú y confirmaciones)** | `npm run release` |
| 🚦 **Pre-push** | **Espejo local de CI antes de git push** | `npm run pre:push` |
| 🚦 **Pre-push** | **CI local sin builds (más rápido)** | `npm run pre:push:quick` |
| 🚦 **Pre-push** | **Solo tsc + eslint + arquitectura** | `npm run pre:push:lint` |
| 🧪 **Tests** | **Correr la suite unificada de pruebas (15 suites)** | `npm test` |
| 💻 **Desktop** | **Compilar instalador `.exe` en tu máquina local** | `npm run package:win` |
| 💻 **Desktop** | **Abrir Electron standalone en desarrollo** | `npm run start:standalone` |
| 🧪 **Server** | **Fixture SFTP local + UI `/servers` (manual)** | `npm run dev:server-fixture` |
| 🧪 **Server** | **Suite automatizada Server Manager** | `npm run test:server` |

---

## 🖥️ 7. Server Manager — prueba manual con fixture local

Entorno aislado para probar `/servers` sin contratar hosting ni tocar servidores reales. Levanta un SFTP real en loopback, prepara builds **AllHost** y **AllUser** temporales, y arranca Next en el puerto **3101**.

### Prerrequisitos

```bash
npm ci
```

Node **22** (misma versión que CI). Desde la raíz del repo.

### Paso 1 — Levantar la fixture

```bash
npm run dev:server-fixture
```

**Qué hace este comando:**

1. Inicia un servidor SSH/SFTP de prueba en `127.0.0.1` (puerto dinámico).
2. Crea un directorio temporal con:
   - `Fixture_allhost/mods/` — build de servidor de referencia (`example` v2.0.0, `missing` v1.0.0).
   - `Fixture_alluser.zip` — build de cliente (`example` v2.0.0, `missing` v1.0.0, `sodium` solo-cliente).
3. El SFTP simulado incluye `mods/`, `server.properties`, `logs/latest.log`, un crash report y un zip en `backups/`.
4. Escribe `.server-fixture.json` en la raíz con host, puerto, usuario, contraseña y huella SSH.
5. Arranca Next dev en **http://127.0.0.1:3101** con `MIM_BUILDS_BASE` apuntando al temp dir.

Dejá esa terminal abierta. Para cerrar todo: escribí `quit` y Enter (borra archivos temporales y `.server-fixture.json`).

### Paso 2 — Abrir la UI

1. Abrí **http://127.0.0.1:3101/servers**
2. En la pantalla principal, creá el proyecto **Fixture** · Minecraft **1.20.1** · loader **fabric** (si no existe ya).

> Los builds AllHost/AllUser de la fixture ya están en el temp dir; no hace falta generarlos desde MIM, pero el proyecto debe llamarse **Fixture** para que coincida.

### Paso 3 — Completar el formulario SFTP

Abrí `.server-fixture.json` y copiá los datos:

| Campo | Valor típico |
| :--- | :--- |
| Host | `127.0.0.1` |
| Puerto | el que aparece en el JSON (cambia en cada ejecución) |
| Carpeta raíz | `/server` |
| Versión MC / Loader | `1.20.1` / `fabric` |
| Huella SSH | `connection.knownHostFingerprint` del JSON |
| Usuario | `fixture` |
| Contraseña | `local-fixture-only` |

Pulsá **Conectar y auditar mods**.

### Resultado esperado por flujo (checklist)

| # | Flujo | Qué probar | Resultado esperado |
| :--- | :--- | :--- | :--- |
| SRV-1/2 | Auditoría | Tras conectar | 1 mod faltante (`missing`), 1 versión distinta (`example` remoto 1.0.0 vs build 2.0.0) |
| SRV-4 | Deploy | Tras auditoría completa → **Revisar y aplicar…** | Instala `missing.jar` y reemplaza `example.jar` en el SFTP simulado |
| SRV-5 | SAGE remoto | Panel **SAGE remoto** → Diagnosticar | Clasifica el log de fixture (dependencia `missing`). Crash report también funciona. |
| SRV-6 | Admin | Panel **Administración** → cargar | Lee `server.properties` (motd Fixture SMP) y lista el zip de backup. **RCON falla** (no hay Minecraft real). |
| SRV-7 | Sync multiplayer | Panel **Sync multiplayer** → Comparar | Estado **desalineado**: hash distinto en `example`; `sodium` aparece como solo-cliente preservado. No descarga mods. |

### Comandos de la terminal de la fixture

Escribí en la terminal donde corre `dev:server-fixture` (no en otra):

| Comando | Efecto |
| :--- | :--- |
| `none` | Restaura lecturas SFTP normales |
| `denied` | Simula permiso denegado en lectura |
| `disconnect` | Simula desconexión |
| `stall` | Simula lectura colgada |
| `quit` | Cierra SFTP, Next y borra temporales |

Después de `denied`/`disconnect`/`stall`, volvé a `none` y **reingresá la contraseña** al repetir la auditoría (MIM no la guarda).

### Tests automatizados relacionados

```bash
# Suite completa Server Manager (SFTP real, deploy, SAGE, admin, sync…)
npm run test:server

# Solo motor SRV-7 (unitario, sin red)
npx ts-node -r tsconfig-paths/register --project tsconfig.scripts.json scripts/__tests__/server-multiplayer-sync.test.ts
```

### Limitaciones de la fixture (importante)

- El remoto simulado tiene `example.jar` v1.0.0 más properties, logs, crash report y un backup zip.
- **No** hay proceso Minecraft ni RCON real.
- Credenciales y clave SSH son **solo locales**; no uses esos valores en producción.
- La UI en `:3101` no es el `.exe` empaquetado; para Electron probá `npm run start:standalone` aparte.

### Cómo vamos / qué falta (cheat sheet 13-sep-2026)

| Hecho (main / local) | Falta para cerrar |
| :--- | :--- |
| SRV-1–7 UI, BOT-07, `pre:push`, UX-01–05 | Validación VPS, descarga mods SRV-7, Electron pack |
| Fixture Server Manager completa | Recorrido SFTP real |
| `eval:mimbot` estructura | Secrets + umbrales SAGE-05b |
| UX header/contraste/clics/filtro/seguidos | ARCH-7/8, REC-02–04, RFCs |

Documentación maestra de pendientes: [docs/PENDING.md](docs/PENDING.md). Matriz Server Manager: [ROADMAP §9](docs/planning/ROADMAP.md).

Documentación técnica adicional: [docs/architecture/server-audit.md](docs/architecture/server-audit.md).
