# 🌐 Guía de Uso e Integración de la API de Modrinth (Labrinth v2) — MIM Engine

Este documento unifica, estandariza y detalla la estrategia de integración con la API de Modrinth para el descubrimiento, control de integridad, matching inteligente y actualización de mods en el **Minecraft Intelligent Manager (MIM)**.

---

## 📑 Tabla de Contenidos
1. [Configuración Básica de la API](#1-configuración-básica-de-la-api)
2. [Gestión de Versiones y Archivos](#2-gestión-de-versiones-y-archivos)
3. [Gestión de Dependencias](#3-gestión-de-dependencias)
4. [Sincronización Local y Escaneo de JARs](#4-sincronización-local-y-escaneo-de-jars)
5. [Identificación de Mods en el Sistema de Archivos](#5-identificación-de-mods-en-el-sistema-de-archivos)
6. [Sistema de Matching Inteligente](#6-sistema-de-matching-inteligente)
7. [Detección y Comparación de Actualizaciones](#7-detección-y-comparación-de-actualizaciones)
8. [Flujo de Actualización Controlada](#8-flujo-de-actualización-controlada)
9. [Diseño de UI/UX, Estados y Estética Premium](#9-diseño-de-uiux-estados-y-estética-premium)
10. [Notas de Rendimiento y Caché](#10-notas-de-rendimiento-y-caché)

---

## 1. Configuración Básica de la API

### Base URL
*   **Producción:** `https://api.modrinth.com/v2`

### Cabeceras (Headers) Obligatorias
Modrinth requiere identificación clara para evitar penalizaciones en el tráfico y bloqueos de CDN:
*   **User-Agent:** `MIM-App/1.0 (contact@mim.local)` (Estandarizado y centralizado en el backend para construir reputación con el CDN).

### Autenticación
Usa `MODRINTH_API_KEY` en tu `.env.local` para aumentar los límites de tasa (rate limits) de la API:
*   **Header:** `Authorization: <tu_token>`

---

## 2. Gestión de Versiones y Archivos

### Consulta de Versiones Compatibles
*   **Endpoint:** `GET /project/{id|slug}/version`
*   **Filtros Críticos (Query Params):**
    *   `loaders`: Debe enviarse como JSON array stringificado (ej: `?loaders=["forge"]`).
    *   `game_versions`: JSON array stringificado (ej: `?game_versions=["1.20.1"]`).
*   **Implementación en MIM:** Se utiliza `URLSearchParams` para codificar correctamente estos arrays de manera automatizada.

### Control de Caché (Next.js)
> [!IMPORTANT]
> Next.js cachea de manera sumamente agresiva las peticiones `fetch`. Para evitar que respuestas vacías, timeouts o errores temporales queden grabados permanentemente en el servidor:
> *   Usa `cache: "no-store"` en todas las llamadas fetch del lado del servidor.
> *   Configura `export const dynamic = "force-dynamic"` en las rutas de API que interactúan con Modrinth.

---

## 3. Gestión de Dependencias

Las dependencias se resuelven a nivel de **Versión** (no de Proyecto):
*   **Campo:** `dependencies` (array de objetos).
*   **Tipos de Dependencia:**
    *   `required`: El sistema debe alertar o descargar automáticamente.
    *   `optional`: Mostrar al usuario como sugerencias de valor.
*   **Resolución Visual en MIM**:
    *   **Rojo / Alerta:** Dependencia requerida.
    *   **Primario / Violeta / Wisteria:** Dependencia opcional.
*   **Batch Resolution (Optimización de Ancho de Banda):** Para evitar realizar decenas de llamadas individuales para mostrar títulos legibles, MIM agrupa todos los `project_id` detectados en el array de dependencias y realiza una sola llamada masiva:
    `GET /projects?ids=["id1","id2",...]`

---

## 4. Sincronización Local y Escaneo de JARs

Este es el núcleo de la precisión técnica en MIM para evitar depender de nombres frágiles de archivos.

### Generación de Hash SHA1
El motor de escaneo de MIM (`lib/scanner.ts`) calcula el hash **SHA1** de cada archivo `.jar` en el momento que es detectado por el watcher. El hash es almacenado en el objeto de metadatos del mod (`ModMeta`).

### Búsqueda Masiva de Actualizaciones (Hash Lookup)
*   **Endpoint:** `POST /version_files`
*   **Body:** `{ "hashes": ["hash1", "hash2", ...], "algorithm": "sha1" }`
*   **Ventaja Absoluta:** Identifica exactamente la versión y el mod del usuario con 100% de precisión, incluso si el archivo original fue renombrado de forma arbitraria.

---

## 5. Identificación de Mods en el Sistema de Archivos

Confiar en nombres de archivos de mods (ej: `sodium-fabric-mc1.20.1-0.5.3.jar`) es frágil. MIM lee el interior de los archivos `.jar` (los cuales son archivos ZIP estructurados):

### Lectura Interna de Metadata
MIM utiliza `adm-zip` para leer los metadatos de configuración empaquetados según el loader:
*   **Fabric:** `fabric.mod.json`
*   **Forge / NeoForge:** `META-INF/mods.toml`
*   **Quilt:** `quilt.mod.json`

### Campos Extraídos por el Escáner
*   `id` / `mod id` (Identificador del mod, ej: `sodium`).
*   `name` / `nombre del mod` (Ej: `Sodium`).
*   `version` (Versión exacta instalada).
*   `loader` (Compatibilidad técnica).
*   `author` / `authors` (Para complementar búsquedas).

---

## 6. Sistema de Matching Inteligente

### El Desafío
Modrinth opera sus endpoints principales usando `project_id` y `slug`, pero **no expone** búsquedas exactas directas por el `mod_id` de Java. Por lo tanto, MIM implementa una capa de resolución heurística.

### Algoritmo de Coincidencia (Matching Heuristics)
1.  **Búsqueda Inicial:** Se consulta `GET /search` usando:
    *   Nombre o ID del mod como query.
    *   Loader y versión de Minecraft como filtros de facetas (`facets`).
    *   *Ejemplo:* `query=Sodium&facets=[["categories:fabric"],["versions:1.20.1"]]`
2.  **Validación y Scoring Interno:** No se asume el primer resultado de forma directa. Se calcula un puntaje de coincidencia (`matchScore` de 0 a 100) evaluando:
    *   Similitud de `title` y `slug`.
    *   Coincidencia de loader y tags en `categories`.
    *   Presencia de autores comunes.
3.  **Acciones según Puntaje:**
    *   `score > 85`: Auto-match automático (sin intervención).
    *   `score bajo`: Se solicita confirmación manual al usuario para prevenir la instalación accidental de mods incompatibles que dañen el pack.
4.  **Persistencia Local de Relaciones:** Una vez resuelto el matching (`localMod` ↔ `modrinthProject`), se guarda en la base de datos local para evitar llamadas redundantes:
    ```json
    {
      "localPath": ".../mods/sodium.jar",
      "modId": "sodium",
      "installedVersion": "0.5.3",
      "projectId": "AANobbMI",
      "slug": "sodium",
      "lastChecked": "2026-05-05"
    }
    ```

---

## 7. Detección y Comparación de Actualizaciones

### Consulta de Versión Reciente
Se utiliza el endpoint `/project/{id}/version` filtrando por el loader activo y la versión del proyecto de Minecraft.

### Comparación Semántica (SemVer)
*   **Regla de Oro:** **No** realizar comparaciones alfabéticas planas (ej: `"10" > "2"` falla).
*   **Mecanismo:** Se utiliza un parser semántico de versiones (SemVer) con un fallback robusto en caso de que el creador del mod utilice patrones de versionado no estándar.

---

## 8. Flujo de Actualización Controlada

Para evitar pérdidas de datos o roturas de packs de mods, MIM implementa un proceso de actualización civilizado y controlado:
1.  **Backup Automático:** Se realiza una copia de respaldo del archivo `.jar` existente.
2.  **Descarga Directa:** El nuevo `.jar` se baja a la carpeta intermedia de `/Downloads`.
3.  **Detección de Watcher**: El watcher de descargas de MIM identifica el nuevo archivo y lo valida.
4.  **Reemplazo Seguro:** Se intercambia el archivo viejo por el nuevo de forma atómica en el directorio del proyecto activo.

---

## 9. Diseño de UI/UX, Estados y Estética Premium

### Estados de Actualización del Mod
Cada mod clasificado muestra visualmente su estado frente a los servidores de Modrinth:
*   🟢 **Updated:** El mod está al día.
*   🟡 **Update Available:** Hay una nueva versión segura compatible.
*   ⚪ **Unknown Match:** Requiere confirmación manual del usuario.
*   🔴 **Unsupported Source:** El mod no proviene de Modrinth (ej: CurseForge sin API o mods privados).

### Layout del Visualizador
*   **FOMO Sidebar (Buscador):** Grilla responsiva de columnas dinámicas que se ajusta a 2 columnas cuando los detalles están expandidos para evitar colisiones estéticas, decorada con un desenfoque de fondo premium (`backdrop-blur-md`).
*   **Detalles y Changelogs:** Visualización interactiva en pestañas que aloja changelogs de versiones completas renderizadas con Markdown y con un límite de scroll seguro (`overflow-y-auto`) para evitar roturas del layout lateral derecho.

---

## 10. Notas de Rendimiento y Caché

1.  **Límite de Concurrencia (Anti-Rate Limit) en Endpoints:**
    *   La API `/api/modrinth/check-updates` implementa un despachador en lotes con un límite estricto de concurrencia de **`5 peticiones paralelas`** usando `chunkArray()`. Esto evita la expulsión por rate-limiting (HTTP 429) en modpacks grandes de 50+ mods.
2.  **Integridad de Archivos:** Las descargas siempre comparan el SHA1 devuelto por el CDN de Modrinth contra el archivo descargado físicamente para descartar corrupciones de red.
3.  **Fallbacks de Búsqueda:** Si el filtrado estricto por loader/versión no arroja coincidencias, MIM reintenta una búsqueda abierta para que el usuario pueda visualizar si el mod tiene versiones publicadas en otras plataformas.
4.  **Intervalo de Caché:** Las consultas de actualizaciones tienen un TTL sugerido de 12 a 24 horas por mod, con conmutador manual para forzar un re-escaneo instantáneo.