# 🚀 Guía de Despliegue, Releases, Flujo con IAs y Standalone — MIM

Esta guía es tu manual rápido personal para verificar cambios, gestionar el flujo de PRs con IAs externas, crear releases automáticas en GitHub y compilar el ejecutable `.exe` nativo en tu máquina local.

---

## 📋 1. Verificación Rápida Post-Edición (Chequeo Previo)

Antes de hacer commit, crear una release o dar por terminada una tarea, ejecutá estos comandos para asegurar que el código compila, está blindado y pasa todas las pruebas:

```bash
# 1. Chequeo estricto de tipos de TypeScript (Desktop y Web)
npx tsc --noEmit; npx tsc --project web/tsconfig.json --noEmit

# 2. Verificación de blindaje estructural de APIs (Fail-Closed)
npm run lint:api-guard

# 3. Correr la suite de pruebas unificada (13 suites, 144 escenarios)
npm test
```

*Si estos comandos terminan sin errores, el proyecto está 100% listo para producción.*

---

## 🤖 2. Flujo con IAs: Revisión y Promoción Rápida de PRs

MIM tiene configurado un flujo profesional de ingeniería donde **vos sos el Gatekeeper**:
- **La IA externa:** Trabaja en ramas y abre Pull Requests. No puede pushear a `main` porque GitHub Rulesets la frena hasta pasar CI.
- **Vos con Antigravity en local:** Tenés permiso de **Bypass de Administrador**. Tus pushes directos a `main` entran sin trabas.

### ¿Cómo auditar y mergear un PR de la IA en 1 paso?

Usá tu helper local interactivo [`npm run pr:review`](file:///d:/Dev/CodeProjects/MIM/scripts/workflow/review-pr.js):

#### Paso A: Inspeccionar el PR
Pasale el número de PR o el nombre de la rama:
```bash
npm run pr:review 15
# o también con el nombre de la rama:
npm run pr:review feat/nueva-funcion
```
**¿Qué hace automáticamente?**
1. **Pre-flight:** Verifica que no tengas cambios sin commitear en tu rama para no perder nada.
2. **Checkout:** Se descarga el PR de GitHub y se para en esa rama.
3. **Diff & Commits:** Te muestra en pantalla los commits agregados y qué archivos se tocaron contra `main`.
4. **Compuertas de Calidad:** Corre `lint:api-guard`, `tsc --noEmit` y `npm test`.
5. **Veredicto:** Te confirma en verde si superó todos los controles o te avisa en rojo qué falló.

#### Paso B: Si te gusta y pasó los tests ➔ Subir a `main`
```bash
npm run pr:review --promote
```
*Automáticamente vuelve a `main`, se sincroniza con origin, mergea la rama del PR y **pushea a `origin/main`** con tu bypass de admin.*

#### Paso C: Si no te gustó o querés volver sin tocar nada
```bash
npm run pr:review --return
```
*Te devuelve a tu `main` intacto.*

---

## 🏷️ 3. Crear la Release con el Asistente

Para gestionar la versión semántica y preparar el tag de Git de forma interactiva:

```bash
npm run release
```

### ¿Qué hace este comando?
1. **Detecta cambios**: Revisa el estado de tu Git (`git status`).
2. **Te pide el tipo de versión**:
   * `patch` (ej. 11.3.0 ➔ 11.3.1): Para corrección de errores menores.
   * `minor` (ej. 11.3.0 ➔ 11.4.0): Para nuevas funciones o módulos.
   * `major` (ej. 11.3.0 ➔ 12.0.0): Para grandes saltos arquitectónicos.
3. **Crea un backup automático**: Guarda una rama de seguridad local (`backup/YYYY-MM-DDTHH-mm-ss`).
4. **Crea el commit y el tag**: Actualiza el número de versión en `package.json`, sincroniza `docs/architecture/MIM.md` y `docs/releases/CHANGELOG.md`, hace el commit y crea el tag de git local (ej. `v11.4.0`).

---

## ☁️ 4. Subir la Release con GitHub Actions (Publicación en la Nube)

Una vez que `npm run release` creó el tag local, solo debés subirlo a GitHub:

```bash
# Subir tus commits de la rama main junto con los nuevos tags
git push origin main --tags
```

*(Si querés subir solo el tag específico: `git push origin v11.4.0`)*

### ¿Qué pasa en GitHub automáticamente?
1. GitHub Actions detecta el tag `v*` y activa [.github/workflows/release.yml](file:///.github/workflows/release.yml).
2. Levanta un servidor virtual con **Windows**.
3. Ejecuta `npm run package:win` (que incluye `npm run build:standalone`).
4. `electron-builder` compila y firma el instalador de Windows.
5. Se publica automáticamente la **Release Oficial** en la pestaña *Releases* de tu repositorio con el instalador `.exe` listo para que cualquiera lo descargue.

---

## 💻 5. Crear el `.exe` para Usarlo en Local (En tu PC)

Si querés probar la aplicación de escritorio en tu máquina o generar el `.exe` directamente sin esperar a GitHub Actions:

### Opción A: Compilar el Instalador `.exe` de Windows (Recomendado)

```bash
npm run package:win
```

* **¿Dónde queda el archivo listo?**
  * Al finalizar, el instalador se guarda en la carpeta:
    `dist/MIM Setup <version>.exe`
  * También tenés la versión portable desempaquetada lista para abrir en:
    `dist/win-unpacked/MIM.exe`

---

### Opción B: Probar la Versión Standalone sin crear el instalador (Modo Rápido)

Si solo querés abrir la ventana de Electron para probar tus cambios al instante:

```bash
# Paso 1: Preparar la build standalone (solo necesario si hiciste cambios de código)
npm run build:standalone

# Paso 2: Abrir Electron
npm run start:standalone
```

---

## 🛠️ 6. Resumen de Comandos Frecuentes

| Objetivo | Comando |
| :--- | :--- |
| **Verificar compilación y tipos** | `npx tsc --noEmit; npx tsc --project web/tsconfig.json --noEmit` |
| **Verificar blindaje estructural API Guard** | `npm run lint:api-guard` |
| **Correr todas las pruebas (13 suites)** | `npm test` |
| **Auditar un PR o rama de la IA** | `npm run pr:review <numero_o_rama>` |
| **Promover y mergear el PR a main** | `npm run pr:review --promote` |
| **Volver a main sin mergear** | `npm run pr:review --return` |
| **Build + preparar assets (local/standalone)** | `npm run build:standalone` |
| **Lanzar Electron localmente** | `npm run start:standalone` |
| **Iniciar asistente de nueva Release** | `npm run release` |
| **Subir la Release a GitHub Actions** | `git push origin main --tags` |
| **Compilar el instalador `.exe` local** | `npm run package:win` |

> ⚠️ Siempre usar `build:standalone` (no `build`) para testear en Electron. El paso extra corre `prepare.js` que copia `.next/static` y `public/` al directorio standalone — sin eso los CSS y assets no cargan.
