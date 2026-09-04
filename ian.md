# 🚀 Guía de Despliegue, Releases y Creación de Standalone — MIM

Esta guía es tu manual rápido paso a paso para verificar cambios, crear releases automáticas con GitHub Actions y compilar el ejecutable nativo `.exe` para usarlo en tu máquina local.

---

## 📋 1. Verificación Rápida Post-Edición (Chequeo Previo)

Antes de crear una release o hacer commit, ejecutá estos dos comandos para asegurar que el código compila y pasa todas las pruebas sin errores:

```bash
# 1. Chequeo estricto de tipos de TypeScript (Desktop y Web)
npx tsc --noEmit; npx tsc --project web/tsconfig.json --noEmit

# 2. Correr la suite de pruebas automatizadas (12/12 suites)
npm test
```

*Si ambos comandos terminan sin errores, el proyecto está 100% listo para producción.*

---

## 🏷️ 2. Crear la Release con el Asistente

Para gestionar la versión semántica y preparar el tag de Git de forma interactiva:

```bash
npm run release
```

### ¿Qué hace este comando?
1. **Detecta cambios**: Revisa el estado de tu Git (`git status`).
2. **Te pide el tipo de versión**:
   * `patch` (ej. 10.5.2 ➔ 10.5.3): Para corrección de errores menores.
   * `minor` (ej. 10.5.2 ➔ 10.6.0): Para nuevas funciones o módulos.
   * `major` (ej. 10.5.2 ➔ 11.0.0): Para grandes saltos arquitectónicos (como SAGE 3.0).
3. **Crea un backup automático**: Guarda una rama de seguridad local (`backup/YYYY-MM-DDTHH-mm-ss`).
4. **Crea el commit y el tag**: Actualiza el número de versión en `package.json`, hace el commit y crea el tag de git local (ej. `v11.0.0`).

---

## ☁️ 3. Subir la Release con GitHub Actions (Publicación en la Nube)

Una vez que `npm run release` creó el tag local, solo debés subirlo a GitHub:

```bash
# Subir tus commits de la rama main junto con los nuevos tags
git push origin main --tags
```

*(Si querés subir solo el tag específico: `git push origin v11.0.0`)*

### ¿Qué pasa en GitHub automáticamente?
1. GitHub Actions detecta el tag `v*` y activa [.github/workflows/release.yml](file:///.github/workflows/release.yml).
2. Levanta un servidor virtual con **Windows**.
3. Ejecuta `npm run package:win` (que incluye `npm run build:standalone`).
4. `electron-builder` compila y firma el instalador de Windows.
5. Se publica automáticamente la **Release Oficial** en la pestaña *Releases* de tu repositorio con el instalador `.exe` listo para que cualquiera lo descargue.

> **Tip:** También podés disparar la release manualmente desde la web de GitHub yendo a **Actions** ➔ **Release MIM Desktop** ➔ **Run workflow**.

---

## 💻 4. Crear el `.exe` para Usarlo en Local (En tu PC)

Si querés probar la aplicación de escritorio en tu máquina o generar el `.exe` directamente sin esperar a GitHub Actions:

### Opción A: Compilar el Instalador `.exe` de Windows (Recomendado)

```bash
npm run package:win
```

* **¿Qué hace?**
  1. Ejecuta `next build` con Turbopack.
  2. Corre `node standalone/prepare.js` para copiar los assets a la carpeta standalone.
  3. Ejecuta `electron-builder` para empaquetar el binario final.
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

## 🛠️ 5. Resumen de Comandos Frecuentes

| Objetivo | Comando |
| :--- | :--- |
| **Verificar compilación y tipos** | `npx tsc --noEmit; npx tsc --project web/tsconfig.json --noEmit` |
| **Correr todas las pruebas (12 suites)** | `npm test` |
| **Build + preparar assets (local/standalone)** | `npm run build:standalone` |
| **Lanzar Electron localmente** | `npm run start:standalone` |
| **Iniciar asistente de nueva Release** | `npm run release` |
| **Subir la Release a GitHub Actions** | `git push origin main --tags` |
| **Compilar el instalador `.exe` local** | `npm run package:win` |

> ⚠️ Siempre usar `build:standalone` (no `build`) para testear en Electron. El paso extra corre `prepare.js` que copia `.next/static` y `public/` al directorio standalone — sin eso los CSS y assets no cargan.
