# 🌐 Guía de Integración: APIs Externas (Modrinth & CurseForge) — MIM Engine

Este documento centraliza la estrategia de integración de **MIM (Minecraft Intelligent Manager)** con las dos plataformas de mods más importantes del ecosistema. Define cómo el motor de búsqueda, el control de integridad y el sistema de actualizaciones interactúan con las APIs de **Modrinth** y **CurseForge**.

---

## 📑 Tabla de Contenidos
1. [Filosofía de Integración](#1-filosofía-de-integración)
2. [Modrinth (Labrinth v2)](#2-modrinth-labrinth-v2)
3. [CurseForge (Eternal v1)](#3-curseforge-eternal-v1)
4. [Estrategias Comunes de MIM](#4-estrategias-comunes-de-mim)
5. [Gestión de Dependencias y Seguridad](#5-gestión-de-dependencias-y-seguridad)

---

## 1. Filosofía de Integración
MIM actúa como un puente inteligente entre los archivos locales del usuario y los repositorios globales. La prioridad es la **precisión técnica** (hashes) sobre la **fragilidad nominal** (nombres de archivo).

| Feature | Modrinth | CurseForge |
| :--- | :--- | :--- |
| **Primacía** | Principal (API Moderna) | Secundaria (Legado/Extensiva) |
| **Auth** | Opcional (Key sube límites) | Obligatoria (Key de Partner) |
| **Matching** | Basado en Hash SHA1 (100% exacto) | Heurístico / Búsqueda ID |
| **Actualizaciones** | Automatizadas via API | Mixtas (API + Descarga manual) |

---

## 2. Modrinth (Labrinth v2)

### Configuración
- **Base URL:** `https://api.modrinth.com/v2`
- **User-Agent:** `MIM-App/1.0 (contact@mim.local)` (Obligatorio para evitar bloqueos).
- **Auth:** `MODRINTH_API_KEY` en `.env.local` enviada como header `Authorization`.

### Endpoints Críticos
- **Búsqueda:** `GET /search?query={q}&facets=[["categories:{loader}"],["versions:{game_version}"]]`
- **Matching por Hash:** `POST /version_files` (Body: `{ "hashes": [...], "algorithm": "sha1" }`). Es el método más preciso de MIM.
- **Versiones:** `GET /project/{id|slug}/version`.
- **Descargas:** MIM descarga directamente desde el CDN de Modrinth y verifica el hash post-descarga.

---

## 3. CurseForge (Eternal v1)

### Configuración
- **Base URL:** `https://api.curseforge.com/v1`
- **Auth:** `CURSEFORGE_API_KEY` (Key de partner) en `.env.local` enviada como header `x-api-key`.
- **Header Requerido:** `Accept: application/json`.

### Parámetros de Búsqueda (`/v1/mods/search`)
- **gameId**: `432` (Minecraft).
- **Límites de Paginación**: Máximo 50 por página. Límite total de 10,000 resultados `(index + pageSize <= 10,000)`.
- **Filtros de Clase (classId)**:
    | ID | Tipo de Contenido |
    | :--- | :--- |
    | `6` | Mods (Default) |
    | `12` | Resource Packs |
    | `6552` | Shaders |
    | `6945` | Datapacks |
    | `4471` | Modpacks |

- **Tipos de Mod Loader (`modLoaderType`)**:
    | ID | Loader |
    | :--- | :--- |
    | `1` | Forge |
    | `4` | Fabric |
    | `5` | Quilt |
    | `6` | NeoForge |

### Particularidades y Datos Técnicos
- **Algoritmos de Hash**: CurseForge utiliza IDs numéricos para algoritmos: `1` para **SHA1** y `2` para **MD5**.
- **Tipos de Versión (`releaseType`)**: `1` (Release), `2` (Beta), `3` (Alpha).
- **Descargas Externas**: Debido a las políticas de CurseForge, algunos mods requieren que el usuario visite la web oficial. MIM detecta esto y muestra el botón "Abrir Externo" en lugar de "Descargar".
- **Matching Heurístico**: CurseForge no soporta búsqueda masiva por SHA1 de la misma forma que Modrinth. MIM utiliza el `modId` extraído del JAR o el `fileFingerprint` (Murmur2) para intentar localizar el proyecto.

---

## 4. Estrategias Comunes de MIM

### Sistema de Matching Heurístico
Cuando no hay un hash exacto disponible:
1. **Búsqueda por Nombre/ID:** Se consulta la API con los metadatos del JAR.
2. **Scoring Interno:** Se calcula un `matchScore` (0-100) evaluando títulos, slugs, autores y compatibilidad de loaders.
3. **Confirmación:** Un `score > 85` dispara un auto-match; de lo contrario, se solicita confirmación al usuario.

### Límite de Concurrencia (Anti-Rate Limit)
MIM implementa un despachador en lotes para evitar el error **HTTP 429**:
- **Concurrencia Máxima:** 5 peticiones paralelas.
- **Mecanismo:** `chunkArray()` en el backend antes de procesar actualizaciones masivas.

---

## 5. Gestión de Dependencias y Seguridad

### Resolución de Dependencias
Las dependencias se resuelven a nivel de **Versión**:
- **Required:** Bloqueo visual o descarga automática.
- **Optional:** Sugerencia premium al usuario.
- **Batch Resolution:** MIM agrupa IDs de dependencias y realiza una sola llamada masiva (`/projects?ids=[...]`) para ahorrar ancho de banda.

### Seguridad (Threat Detection)
Antes de clasificar cualquier archivo descargado de estas APIs, MIM ejecuta:
1. **Bytecode Scan:** Busca patrones sospechosos (llamadas de red, ejecución de procesos).
2. **SHA1 Blacklist:** Verifica el hash contra bases de datos de malware conocido.
3. **Risk Scoring:** Genera una insignia de seguridad (0-100) visible en la UI.

---
*Documentación Unificada — MIM API Strategy*
