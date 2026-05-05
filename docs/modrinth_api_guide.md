# Guía de Uso: API de Modrinth (Labrinth v2) - MIM Implementation

Esta guía detalla cómo interactuar con la API de Modrinth de manera eficiente para gestionar mods, resource packs, shaders y datapacks, basada en la implementación actual del **Minecraft Intelligent Manager (MIM)**.

---

## 1. Configuración Básica

### Base URL
- **Producción:** `https://api.modrinth.com/v2`

### Cabeceras (Headers) Obligatorias
Modrinth requiere identificación clara. Sin un `User-Agent`, las peticiones pueden ser bloqueadas o limitadas.
- **User-Agent:** `MIM-App/1.0 (contact@mim.local)` (Estandarizado en el backend).

### Autenticación
Usa `MODRINTH_API_KEY` en tu `.env.local` para aumentar los límites de tasa (rate limits).
- **Header:** `Authorization: <tu_token>`

---

## 2. Gestión de Versiones y Archivos

### Consulta de Versiones Compatibles
- **Endpoint:** `GET /project/{id|slug}/version`
- **Filtros Críticos (Query Params):**
  - `loaders`: Debe enviarse como JSON array stringificado (ej: `?loaders=["forge"]`).
  - `game_versions`: JSON array stringificado (ej: `?game_versions=["1.20.1"]`).
- **Implementación en MIM:** Se usa `URLSearchParams` para codificar correctamente estos arrays.

### Control de Caché (Next.js)
**IMPORTANTE:** Next.js cachea agresivamente las peticiones `fetch`. Para evitar que errores temporales o respuestas vacías queden grabadas permanentemente:
- Usa `cache: "no-store"` en las llamadas de servidor.
- Configura `export const dynamic = "force-dynamic"` en las rutas de API que consultan Modrinth.

---

## 3. Gestión de Dependencias

Las dependencias se resuelven a nivel de **Versión**, no de Proyecto.
- **Campo:** `dependencies` (array de objetos).
- **Tipos de Dependencia:**
  - `required`: El sistema debe alertar o descargar automáticamente.
  - `optional`: Mostrar como sugerencia.
- **Resolución Visual:** En MIM, usamos indicadores de color:
  - **Rojo:** Requerido.
  - **Primario (Violeta):** Opcional.
- **Batch Resolution:** Para mostrar nombres legibles de dependencias, MIM agrupa todos los `project_id` y usa `GET /projects?ids=["..."]` para obtener los títulos en una sola llamada.

---

## 4. Sincronización Local (Hash Lookup)

Este es el núcleo de la precisión en MIM.
### Generación de Hash
- El motor de escaneo (`lib/scanner.ts`) calcula el **SHA1** de cada archivo `.jar` al ser detectado.
- Este hash se almacena en el objeto `ModMeta` local.

### Búsqueda Masiva de Actualizaciones
No busques actualizaciones por nombre de archivo. Usa el sistema de hashes:
- **Endpoint:** `POST /version_files`
- **Body:** `{ "hashes": ["hash1", "hash2", ...], "algorithm": "sha1" }`
- **Ventaja:** Identifica exactamente qué versión de qué mod tiene el usuario, incluso si renombró el archivo.

---

## 5. UI/UX y Visualización (Diseño Premium)

### FOMO Sidebar
- **Layout:** Rejilla de **2 columnas** (`grid-cols-2`) para maximizar la densidad de información.
- **Estilo:** Fondo con `backdrop-blur(20px)` y tarjetas opacas (`rgba(255,255,255,0.08)`) para un look moderno y premium.

### Detalles y Changelogs
- **Changelogs:** Se muestran completos en la vista de detalles.
- **Contenedor:** Usa `max-h-40` con `overflow-y-auto` para que los changelogs largos no rompan el layout pero sigan siendo legibles.
- **Markdown:** El `body` del proyecto y el `changelog` deben renderizarse con soporte para HTML sanitizado.

---

## 6. Notas de Rendimiento

1. **User-Agent:** Mantener siempre el mismo para construir reputación con el CDN de Modrinth.
2. **Integridad:** Siempre verificar el `hashes.sha1` del archivo descargado contra el hash del servidor para prevenir archivos corruptos.
3. **Fallbacks:** Si la búsqueda filtrada por `loader/version` falla, MIM reintenta sin filtros para mostrar al menos "otras versiones" disponibles del mismo mod.

---

## Recursos
- [Swagger UI - Modrinth](https://api.modrinth.com/docs/swagger-ui)
- [Documentación Técnica de Labrinth](https://docs.modrinth.com)