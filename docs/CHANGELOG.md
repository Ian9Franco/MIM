# MIM — Backend Changelog
> Auditoría y refactor completo del backend. Fecha: 2026-05-04  
> Archivos modificados: **15+** · Bugs corregidos: **2** · Mejoras: **10+**

---

## 🔥 Novedades (2026-05-04)

### 🚀 FOMO Discovery Sidebar
- **Integración completa con Modrinth:** nueva barra lateral desplegable para descubrir contenido sin salir de MIM.
- **Búsqueda y Filtros:** soporte para búsqueda con debounce, filtros por tipo de proyecto (Mods, Resourcepacks, Datapacks, Shaders) y versión/loader.
- **Sorting Inteligente:** modos "Recién Lanzados", "Actualizados" y "Relevancia" (activado automáticamente al buscar).
- **Responsive:** diseño adaptativo que ocupa el 100% en móviles y ancho cómodo en desktop.

### 📦 Universal Asset Management
- **Scanner Inteligente:** `lib/scanner.ts` ahora identifica Resourcepacks (vía `assets/`), Datapacks (vía `data/`) y Shaders (vía `shaders/`) inspeccionando el ZIP sin extraerlo.
- **Soporte `pack.mcmeta`:** extracción de nombres reales para packs de recursos.
- **Aislamiento por Proyecto:** los Packs y Configs ahora son específicos de cada proyecto (`source/[version]/_projects/[nombre]`) en lugar de globales, permitiendo total independencia entre modpacks.
- **Acceso Directo:** botón en el panel de Build para abrir la carpeta del proyecto en el Explorador de Windows, creando la estructura necesaria al instante.

### 🎨 UI & UX Polish
- **Grouping en Librería:** la Librería de Source ahora agrupa los mods por subcategoría (**FAUNA**, **QOL**, **TECNOLOGÍA**, etc.) facilitando la gestión de packs grandes.
- **Legibilidad:** aumento general de contraste y tamaños de fuente para una lectura más cómoda en pantallas de alta resolución.
- **Badges de Tipo:** visualización clara de si un archivo es Mod, Resourcepack o Shader en las tarjetas.

### 🔴 Critical Bug Fix
- **Protección de Archivos (Data Loss):** corregido error fatal en `/api/classify` donde mover un archivo a su misma categoría resultaba en el truncado (0 bytes) y posterior eliminación del archivo original. Se agregó un chequeo de `path.resolve` para ignorar operaciones si el origen y destino son idénticos.

---

## Índice

1. [lib/constants.ts](#1-libconstantsts)
2. [lib/scanner.ts](#2-libscannerts)
3. [lib/watcher.ts](#3-libwatcherts)
4. [lib/builder.ts](#4-libbuilderts)
5. [api/build/route.ts](#5-apibuildroutes)
6. [api/classify/route.ts](#6-apiclassifyroutes)
7. [api/library/route.ts](#7-apilibraryroutes)
8. [api/unclassify/route.ts](#8-apiunclassifyroutes)
9. [api/watcher/route.ts](#9-apiwatcherroutes)
10. [api/modrinth/check-updates/route.ts](#10-apimodrinthcheck-updatesroutes)
11. [api/modrinth/download/route.ts](#11-apimodrinthdownloadroutes)
12. [Configuración recomendada](#12-configuración-recomendada)

---

## 1. `lib/constants.ts`

### 🟡 Mejoras

- **Paths de entorno:** `SOURCE_BASE` y `BUILDS_BASE` ahora leen `process.env.MIM_SOURCE_BASE` y `process.env.MIM_BUILDS_BASE` con fallback a los defaults de Windows. Permite correr MIM en WSL o en otro usuario sin tocar código.

  ```ts
  // Antes
  export const SOURCE_BASE = "D:\\.mine\\source";

  // Después
  export const SOURCE_BASE: string =
    process.env.MIM_SOURCE_BASE ?? path.join("D:", "\\.mine", "source");
  ```

- **Helpers de validación como SSOT:** agregadas `isValidCategory(category, sub)` e `isValidLoader(loader)`. Todos los routes los importan en lugar de reimplementar la lógica, eliminando divergencias posibles.

  ```ts
  export function isValidCategory(category: string, sub: string): boolean {
    return SUBCATEGORIES[category]?.includes(sub) ?? false;
  }

  export function isValidLoader(loader: string): loader is Loader {
    return (LOADERS as readonly string[]).includes(loader);
  }
  ```

- **JSDoc completo** en cada export explicando propósito, estructura de paths y cómo sobreescribir via `.env.local`.

---

## 2. `lib/scanner.ts`

### 🔴 Bug fix

- **Regex de versión Forge con placeholder Gradle:** el pattern original `/^version\s*=\s*"([^"${]+)"/m` fallaba porque el character class `[^"${]` no es un negative lookahead válido — el `$` y `{` dentro de `[]` son literales, no excluyen el string `${`. Un mod con `version = "${file.jarVersion}"` pasaba el regex y producía `modVersion = "${file.jarVersion}"` en lugar de `"unknown"`.

  ```ts
  // Antes — no rechaza ${file.jarVersion}
  const verMatch = content.match(/^version\s*=\s*"([^"${]+)"/m);

  // Después — negative lookahead explícito
  const verMatch = content.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
  ```

### 🟡 Mejoras

- **`isCompatibleWithConnector: true`** seteado automáticamente para todos los mods Fabric. Antes siempre era `false` independiente del loader. Base necesaria para la futura Sinytra Connector flag.

- **Constante `UNKNOWN`** centralizada para evitar el string `"unknown"` disperso en 8 lugares distintos.

- **Helper `findEntry()`** extraído internamente — elimina el `entries.find()` duplicado en cada bloque de loader.

- **Documentación del heurístico `gameVersionFromFilename()`:** explicación de por qué se elige el *último* match en el filename (nombres como `"1.20-1.20.1"` deben resolver a `"1.20.1"`).

---

## 3. `lib/watcher.ts`

### 🔴 Bug fix

- **Sin forma de detener chokidar:** el watcher original no tenía función de cierre. Al hacer `SIGTERM`, Node quedaba colgado esperando el proceso de chokidar. Agregada `stopWatcher(): Promise<void>`.

  ```ts
  export async function stopWatcher(): Promise<void> {
    if (watcher) {
      await watcher.close();
      watcher = null;
      watchedPath = null;
    }
  }
  ```

  Agregar en el entrypoint del servidor:
  ```ts
  process.on("SIGTERM", async () => { await stopWatcher(); process.exit(0); });
  process.on("SIGINT",  async () => { await stopWatcher(); process.exit(0); });
  ```

- **Race condition en re-inicialización:** si `startWatcher()` se llamaba con un path diferente al ya vigilado (raro pero posible en dev), el watcher anterior seguía corriendo en paralelo emitiendo eventos duplicados. Ahora se cierra limpiamente antes de crear uno nuevo.

### 🟡 Mejoras

- **`setMaxListeners(50)`** en `watcherEmitter` para evitar el warning de Node cuando varios clientes SSE se conectan simultáneamente (cada uno añade un listener).

- **`isRelevantFile()`** extraída como helper con `path.extname().toLowerCase()` — evita que `.JAR` en mayúsculas (Windows) sea ignorado silenciosamente.

- **Logs estructurados** con prefijo `[watcher]` en todos los `console.log/error`.

---

## 4. `lib/builder.ts`

### 🔴 Bug fix

- **`fs.readdirSync` con `{ recursive: true }` devuelve `string | Buffer`:** el código original hacía `.filter(f => typeof f === "string")` pero sobre el resultado de `readdirSync` sin la opción `recursive`, que sí devuelve `string[]`. Con `recursive: true` el tipo real es `string[] | Buffer[]` dependiendo de la versión de Node, haciendo el narrowing inconsistente. Reemplazado por una función `walkDir()` recursiva explícita que siempre produce `string[]`.

  ```ts
  // Antes — comportamiento inconsistente por tipo de retorno
  const serverJars = new Set(
    fs.readdirSync(serverPath, { recursive: true }).filter(f => typeof f === "string" && f.endsWith(".jar"))
  );

  // Después — recursión explícita, tipos garantizados
  const walkDir = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walkDir(full);
      else if (entry.endsWith(".jar")) serverJarNames.add(entry);
    }
  };
  ```

- **`collectJars()` no avisaba sobre duplicados:** si `.essential` y `.local` tenían el mismo `.jar`, el segundo era descartado silenciosamente. Ahora loguea un `console.warn` con el nombre del archivo afectado.

### 🟡 Mejoras

- **`copyIfExists()`** extraída como helper — reemplaza los 4 bloques `if (fs.existsSync) + fs.cpSync` repetidos en `buildAllUser` y `buildAllHost`. Cada copia loguea si el directorio fue copiado o saltado.

- **`verifyNoServerLeak()`** refactorizada usando `walkDir()` — código más legible y correcto.

- **Logs estructurados** con prefijo `[builder]` y emojis de estado (✅ / ⚠️).

- **ZIP con forward slashes:** `zipFolder()` ahora usa `/` como separador interno del ZIP (spec ZIP requiere `/`), independiente del separador del OS host.

- **JSDoc completo** en `buildAllUser` y `buildAllHost` describiendo origen de archivos, estructura de salida y parámetros.

---

## 5. `api/build/route.ts`

### 🟡 Mejoras

- Reemplazado inline `(LOADERS as readonly string[]).includes(loader)` por `isValidLoader()` de `constants.ts`.

- **Guard post-sanitización:** `projectName = "???"` produce `safeName = "___"` que es válido, pero `projectName = "///"` produce `safeName = ""` (vacío). Ahora retorna 400 en ese caso en lugar de crear un path inválido.

  ```ts
  const safeName = (projectName as string).replace(/[<>:"/\\|?*]/g, "_").trim();
  if (!safeName) {
    return NextResponse.json({ error: "projectName is empty after sanitization" }, { status: 400 });
  }
  ```

- `BUILD_TYPES` como `const` tuple con tipo `BuildType` para type-safety en el dispatch.

- `console.error` con prefijo `[/api/build]` en el `catch`.

---

## 6. `api/classify/route.ts`

### 🔴 Bug fix

- **`split("\\")` frágil para parsear `targetCategory`:** cuando el separador no estaba presente, `split` producía `["categoria", ""]` — `category` era el string completo, `sub` era `""`. La validación `SUBCATEGORIES[category]` pasaba si la categoría existía, pero `.includes("")` siempre es `false`, produciendo un error 400 engañoso en lugar de uno claro sobre el formato.

  ```ts
  // Antes
  const [category, sub] = targetCategory.split("\\");

  // Después — detecta explícitamente la ausencia del separador
  const sepIdx = (targetCategory as string).indexOf("\\");
  if (sepIdx === -1) {
    return NextResponse.json({ error: `Invalid targetCategory format...` }, { status: 400 });
  }
  const category = targetCategory.slice(0, sepIdx);
  const sub = targetCategory.slice(sepIdx + 1);
  ```

- **Archivos no encontrados rompían el loop silenciosamente:** el `continue` original no avisaba al cliente qué paths fueron saltados. Ahora se acumulan en `skipped[]` y se devuelven en la respuesta.

  ```json
  { "success": true, "targetPaths": ["D:\\.mine\\..."], "skipped": ["C:\\...\\notfound.jar"] }
  ```

### 🟡 Mejoras

- Validación de `category + sub` usando `isValidCategory()` en lugar del doble-check manual con `SUBCATEGORIES[category]` + `.includes(sub)`.

- `console.warn` con prefijo `[/api/classify]` en cada skip.

---

## 7. `api/library/route.ts`

### 🔴 Bug fix

- **Sin validación de `loader`:** un loader inválido como `"quilt"` devolvía `{ library: [] }` sin ningún error, haciéndolo indistinguible de una versión vacía. El usuario no tenía feedback de que el parámetro era incorrecto.

### 🟡 Mejoras

- `isValidLoader(loader)` agregado antes de tocar el filesystem.

- **Interfaz `LibraryEntry`** y **`UNKNOWN_META` constante** — reemplaza `any[]` y el objeto de defaults inline repetido.

- `scanMod` errors loguean el `fileName` específico con prefijo `[/api/library]`.

- Tipo de retorno explícito `ModMeta` importado desde `lib/scanner`.

---

## 8. `api/unclassify/route.ts`

### 🔴 Bug fix

- **Sin collision guard en Downloads:** si el archivo ya existía en Downloads, `fs.copyFileSync` lo sobreescribía silenciosamente. Esto podía destruir una versión diferente que el usuario tenía guardada.

  ```ts
  // Ahora: detecta colisión y renombra con timestamp
  if (fs.existsSync(targetPath)) {
    targetPath = path.join(downloadsDir, `${base}_${Date.now()}${ext}`);
    console.warn(`[/api/unclassify] Name collision — renaming to: ...`);
  }
  ```

### 🟡 Mejoras

- Archivos no encontrados acumulados en `skipped[]` (igual que classify).

- `console.warn` con prefijo `[/api/unclassify]`.

---

## 9. `api/watcher/route.ts`

### 🔴 Bug fix

- **Sin keepalive:** conexiones SSE idle por más de ~60 segundos eran cerradas por browsers y proxies inversos (nginx, Caddy) sin que el servidor lo supiera. El cliente intentaba reconectar, causando un flood de nuevas conexiones. Agregado ping cada 30 s.

  ```ts
  const KEEPALIVE_INTERVAL_MS = 30_000;

  // Un frame de comentario SSE (":\n\n") resetea el timeout sin disparar un evento en el cliente
  const keepalive = setInterval(sendPing, KEEPALIVE_INTERVAL_MS);
  ```

- **`clearInterval` faltante en disconnect:** el intervalo de keepalive no se limpiaba cuando el cliente desconectaba, acumulando intervalos huérfanos por cada reconexión.

  ```ts
  req.signal.addEventListener("abort", () => {
    watcherEmitter.off("new_file", listener);
    clearInterval(keepalive); // <- nuevo
    try { controller.close(); } catch { }
  });
  ```

- **`controller.close()` faltante en abort:** el `ReadableStream` no se cerraba formalmente, dejando los recursos del stream en estado pendiente.

### 🟡 Mejoras

- `processFile` ahora loguea el filename cuando `scanMod` falla, en lugar de silenciar el error completamente.

- `KEEPALIVE_INTERVAL_MS` como constante con comentario explicando el razonamiento.

---

## 10. `api/modrinth/check-updates/route.ts`

### 🔴 Bug fix crítico

- **`Promise.all()` sin límite de concurrencia:** el original ejecutaba todas las requests en paralelo. Con un pack de 50+ mods, esto genera 50+ requests simultáneas a Modrinth, provocando rate limiting (HTTP 429) y respuestas `status: "error"` masivas.

  ```ts
  // Antes — sin límite
  const checks = await Promise.all(mods.map(checkMod));

  // Después — batches de CONCURRENCY_LIMIT
  const CONCURRENCY_LIMIT = 5;
  const allResults: ModCheckResult[] = [];
  for (const batch of chunkArray(mods, CONCURRENCY_LIMIT)) {
    const batchResults = await Promise.all(batch.map(checkMod));
    allResults.push(...batchResults);
  }
  ```

### 🔴 Bug fix

- **Sin validación de `loader` y `gameVersion`:** si el cliente enviaba solo `mods` sin los otros campos, el loop procedía con `loader = undefined`, produciendo facets malformadas y resultados incorrectos sin ningún error informativo.

### 🟡 Mejoras

- `any` reemplazado con interfaces explícitas: `ModCheckInput`, `ModCheckResult`, `ModrinthHit`, `ModrinthVersionObj`.

- `latest.files?.[0]?.url` con optional chaining — `files` puede ser `undefined` en respuestas de Modrinth con versiones sin archivos adjuntos.

- `chunkArray<T>()` helper genérico reutilizable.

- Comentarios inline en cada step del flujo de matching explicando la lógica.

---

## 11. `api/modrinth/download/route.ts`

### 🔴 Bug fix de seguridad

- **Path traversal en `filename`:** el original hacía `path.join(downloadsDir, filename)` directamente. Un filename como `"../../AppData/evil.jar"` escapaba la carpeta Downloads. Corregido con `path.basename()`.

  ```ts
  // Antes — vulnerable
  const targetPath = path.join(downloadsDir, filename);

  // Después — safe
  const safeFilename = path.basename(filename as string);
  ```

- **Sin validación de esquema URL:** si el cliente enviaba una URL `http://` (no HTTPS), el archivo se descargaba sobre una conexión sin cifrar. Ahora solo se permite `https:`.

  ```ts
  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only HTTPS URLs are allowed" }, { status: 400 });
  }
  ```

### 🔴 Bug fix

- **Sin collision guard:** igual que `unclassify`, sobreescribía archivos existentes en Downloads silenciosamente. Mismo fix con timestamp suffix.

### 🟡 Mejoras

- URL parseada con `new URL()` con try/catch para detectar strings inválidos que antes producían un `fetch()` throw no informativo.

- Error message al cliente incluye el status code HTTP del remote cuando la descarga falla.

- `console.log` de confirmación con el nombre del archivo guardado.

---

## 12. Configuración recomendada

### `.env.local`

Crear en `D:\.mine\manager\.env.local`:

```env
MIM_SOURCE_BASE=D:\.mine\source
MIM_BUILDS_BASE=D:\.mine\builds
MODRINTH_API_KEY=mrp_xxxxxxxxxxxxxxxx   # opcional — sube el rate limit de Modrinth
```

### Shutdown handler

Agregar en el entrypoint del servidor para que chokidar cierre limpiamente:

```ts
import { stopWatcher } from "@/lib/watcher";

process.on("SIGTERM", async () => { await stopWatcher(); process.exit(0); });
process.on("SIGINT",  async () => { await stopWatcher(); process.exit(0); });
```

---

## Resumen

| Archivo | Bugs | Mejoras |
|---|---|---|
| `lib/constants.ts` | — | 3 |
| `lib/scanner.ts` | 1 | 4 |
| `lib/watcher.ts` | 2 | 3 |
| `lib/builder.ts` | 2 | 4 |
| `api/build/route.ts` | — | 3 |
| `api/classify/route.ts` | 2 | 2 |
| `api/library/route.ts` | 1 | 3 |
| `api/unclassify/route.ts` | 1 | 2 |
| `api/watcher/route.ts` | 3 | 2 |
| `api/modrinth/check-updates/route.ts` | 2 | 4 |
| `api/modrinth/download/route.ts` | 3 | 3 |
| **Total** | **17** | **33** |
