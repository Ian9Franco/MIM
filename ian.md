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
6. **Push a GitHub:** Sube `main` y el tag `vX.Y.Z` a `origin`, disparando la GitHub Action [.github/workflows/release.yml](file:///.github/workflows/release.yml) para compilar el ejecutable `.exe` de Windows y publicar la Release oficial.
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
# 1. Chequeo estricto de tipos de TypeScript (Desktop y Web)
npx tsc --noEmit; npx tsc --project web/tsconfig.json --noEmit

# 2. Verificación de blindaje estructural de APIs y Fronteras Arquitectónicas
npm run lint:api-guard
npm run lint:architecture
npm run test:architecture

# 3. Correr la suite de pruebas unificada (15 suites del sistema)
npm test
```

---

## 💻 4. Crear el `.exe` Standalone en Local (En tu PC)

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
# Paso 1: Preparar la build standalone
npm run build:standalone

# Paso 2: Abrir Electron
npm run start:standalone
```

---

## 🛠️ 5. Resumen Comparativo de Comandos

| Modo | Objetivo | Comando |
| :--- | :--- | :--- |
| ⚡ **Automático** | **Gatekeeper 1-Paso: Traer PR, testear, auto-push (o log de error)** | `npm run gatekeeper <id>` |
| ⚡ **Automático** | **Release 1-Paso: Testear, versionar, taggear y disparar deploy en GitHub** | `npm run release:auto` |
| 🎛️ **Manual** | **Auditar un PR o rama de la IA con veredicto en pantalla** | `npm run pr:review <id>` |
| 🎛️ **Manual** | **Promover y mergear a main el PR auditado** | `npm run pr:promote` |
| 🎛️ **Manual** | **Volver a main descartando la revisión** | `npm run pr:return` |
| 🎛️ **Manual** | **Asistente interactivo de release (con menú y confirmaciones)** | `npm run release` |
| 🧪 **Tests** | **Correr la suite unificada de pruebas (15 suites)** | `npm test` |
| 💻 **Desktop** | **Compilar instalador `.exe` en tu máquina local** | `npm run package:win` |
| 💻 **Desktop** | **Abrir Electron standalone en desarrollo** | `npm run start:standalone` |
