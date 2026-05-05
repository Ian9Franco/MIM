# Guía de Uso: API de CurseForge (v1) - MIM Implementation

Esta guía detalla cómo integrar la API de CurseForge en el **Minecraft Intelligent Manager (MIM)**, optimizando la búsqueda, visualización y gestión de dependencias para una experiencia premium.

---

## 1. Configuración Básica

### Base URL
- **Producción:** `https://api.curseforge.com/v1`

### Cabeceras (Headers) Obligatorias
A diferencia de Modrinth, CurseForge requiere una API Key de partner.
- **x-api-key:** `$2a$10$xgwjj...` (Almacenada en `.env.local` como `CURSEFORGE_API_KEY`).
- **Accept:** `application/json`

---

## 2. Búsqueda y Filtrado (Search Mods)

### Endpoint Principal
- **GET** `/v1/mods/search`

### Parámetros Críticos (Query Params)
Para que MIM se sienta fluido y relevante, utiliza estos parámetros:

| Parámetro | Valor Sugerido | Descripción |
| :--- | :--- | :--- |
| `gameId` | `432` | Minecraft (Obligatorio). |
| `classId` | `6` | Mods (ver sección de Categorías para otros). |
| `searchFilter` | `query` | El texto de búsqueda del usuario. |
| `sortField` | `2` | Ordenar por **Popularidad** (Descargas). |
| `sortOrder` | `desc` | De mayor a menor. |
| `gameVersion` | `1.20.1` | Filtrar por versión específica de MC. |
| `modLoaderType`| `4` | Filtrar por Loader (1=Forge, 4=Fabric, etc). |

**Ejemplo de URL Optimizada:**
```
https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&searchFilter=JourneyMap&sortField=2&sortOrder=desc&pageSize=10
```

---

## 3. Gestión de Versiones y Archivos

### El Endpoint "Dealer"
- **GET** `/v1/mods/{modId}/files`
Este endpoint es vital para la instalación. Devuelve todos los archivos disponibles para un mod.

### Lógica de Selección en MIM:
1. **Filtrar por Entorno:** Buscar archivos que coincidan con la versión de Minecraft y el Loader del proyecto actual.
2. **Release Type:** Priorizar archivos con `releaseType: 1` (Release) sobre `2` (Beta) o `3` (Alpha), a menos que el usuario especifique lo contrario.
3. **Hashes:** Utiliza el array `hashes` para verificar la integridad del archivo tras la descarga.

### Changelogs
- **GET** `/v1/mods/{modId}/files/{fileId}/changelog`
*Nota: Devuelve HTML crudo. Debe ser sanitizado antes de renderizarse.*

---

## 4. Resolución de Dependencias

Las dependencias en CurseForge están vinculadas a archivos específicos (`files`).

### Estructura del JSON:
```json
"dependencies": [
  {
    "modId": 419699,
    "relationType": 3
  }
]
```

### Mapeo de `relationType`:
- **3 (Required):** El sistema **debe** descargar este `modId` automáticamente o impedir la instalación.
- **2 (Optional):** Mostrar al usuario como "Sugerencia".
- **1 (Embedded Library):** Ya viene dentro del .jar, no requiere acción.
- **4 (Tool) / 5 (Incompatible):** Informativo.

---

## 5. UI/UX: El Flow de MIM

Para mantener un rendimiento óptimo y una estética premium, sigue este flujo:

1. **Search View:** Muestra tarjetas con `logo.thumbnailUrl`, `name`, `summary` y `downloadCount`.
2. **Detail View:** Al abrir el detalle, realiza un fetch dedicado a `/v1/mods/{modId}` para obtener la galería de imágenes (`screenshots`) y los links sociales (`websiteUrl`, `sourceUrl`).
3. **Descripción:** La descripción detallada se obtiene de `/v1/mods/{modId}/description`.
   > [!WARNING]
   > CurseForge entrega descripciones en HTML. Usa una librería de sanitización para evitar ataques XSS y asegurar que el estilo se adapte al tema oscuro/claro de MIM.

---

## 6. Referencias de Enums (Cheat Sheet)

### Mod Loader Types (`modLoaderType`)
- `0`: Any
- `1`: Forge
- `2`: Cauldron
- `3`: LiteLoader
- `4`: Fabric
- `5`: Quilt
- `6`: NeoForge

### Class IDs (`classId`)
- `6`: Mods
- `12`: Resource Packs
- `17`: Worlds
- `4471`: Modpacks
- `6552`: Shaders

### Sort Fields (`sortField`)
- `1`: Featured
- `2`: Popularity
- `3`: Last Updated
- `4`: Name
- `5`: Author
- `6`: Total Downloads
- `11`: Date Created

---

## Recursos
- [Documentación Oficial - CurseForge API](https://docs.curseforge.com/)
- [Categorías de Minecraft](https://api.curseforge.com/v1/categories?gameId=432)