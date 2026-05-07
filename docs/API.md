# MIM — API Documentation

> Guía completa de integraciones API: Modrinth, CurseForge y VirusTotal.  
> Estrategias de optimización, rate limiting y seguridad.  
> **Versión:** Beta 5.2 | **Última actualización:** 2026-05-07

---

## 📑 Tabla de Contenidos

1. [Filosofía de Integración](#1-filosofía-de-integración)
2. [Modrinth API (Labrinth v2)](#2-modrinth-api-labrinth-v2)
3. [CurseForge API (Eternal v1)](#3-curseforge-api-eternal-v1)
4. [VirusTotal API v3](#4-virustotal-api-v3)
5. [Estrategias de Optimización](#5-estrategias-de-optimización)
6. [Gestión de Rate Limits](#6-gestión-de-rate-limits)
7. [Seguridad y Cache](#7-seguridad-y-cache)

---

## 1. Filosofía de Integración

MIM actúa como un puente inteligente entre los archivos locales del usuario y los repositorios globales. La prioridad es la **precisión técnica** (hashes) sobre la **fragilidad nominal** (nombres de archivo).

| Feature | Modrinth | CurseForge | VirusTotal |
| :--- | :--- | :--- | :--- |
| **Primacía** | Principal (API Moderna) | Secundaria (Legado/Extensiva) | Seguridad (Verificación) |
| **Auth** | Opcional (Key sube límites) | Obligatoria (Key de Partner) | Opcional (Key pública) |
| **Matching** | Basado en Hash SHA1 (100% exacto) | Heurístico / Búsqueda ID | Basado en Hash SHA256 |
| **Actualizaciones** | Automatizadas via API | Mixtas (API + Descarga manual) | On-demand |

---

## 2. Modrinth API (Labrinth v2)

### Configuración
```typescript
Base URL: https://api.modrinth.com/v2
User-Agent: MIM-App/1.0 (contact@mim.local)  // Obligatorio
Auth Header: Authorization: MIM_API_KEY
```

### Variables de Entorno
```env
# Opcional - aumenta rate limits
MODRINTH_API_KEY=mrp_tu_key_aqui

# Opcional - sincronización de colecciones personales
MODRINTH_TOKEN=tu_token_oauth_aqui
```

### Endpoints Críticos

#### Búsqueda de Proyectos
```http
GET /search?query={q}&facets=[["categories:{loader}"],["versions:{game_version}"]]
```

**Parámetros:**
- `query`: Término de búsqueda
- `facets`: Filtros por loader y versión de Minecraft
- `index`: Tipo de ordenamiento (relevance, downloads, newest, updated)
- `offset`: Paginación
- `limit`: Máximo 100 resultados por página

#### Matching por Hash (Más Preciso)
```http
POST /version_files
Content-Type: application/json

{
  "hashes": ["a1b2c3d4e5f6...", "b2c3d4e5f6g7..."],
  "algorithm": "sha1"
}
```

**Respuesta:** Devuelve versión exacta del archivo basado en su hash SHA1. Método 100% exacto de MIM.

#### Versiones de Proyecto
```http
GET /project/{id|slug}/version
```

**Respuesta:** Lista de versiones disponibles con dependencias y metadata.

#### Enriquecimiento de Proyectos (Batch)
```http
GET /projects?ids=["AAAA","BBBB","CCCC"]
```

**Optimización:** MIM agrupa hasta 100 IDs por request para minimizar llamadas.

#### Descargas
```http
GET /version/{version_id}/download
```

MIM descarga directamente desde el CDN de Modrinth y verifica el hash post-descarga.

### Colecciones
```http
GET /collection/{collection_id}
GET /user/{id}/collections
```

Integración completa para importar colecciones personales y "Following".

---

## 3. CurseForge API (Eternal v1)

### Configuración
```typescript
Base URL: https://api.curseforge.com/v1
Auth Header: x-api-key: CURSEFORGE_API_KEY
Header Requerido: Accept: application/json
```

### Variables de Entorno
```env
# Opcional - habilita búsqueda en CurseForge
CURSEFORGE_API_KEY=tu_key_aqui
```

### Endpoints

#### Búsqueda de Mods
```http
GET /v1/mods/search
```

**Parámetros críticos:**

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `gameId` | `432` | Minecraft |
| `classId` | `6` | Mods (default) |
| | `12` | Resource Packs |
| | `6552` | Shaders |
| | `6945` | Datapacks |
| | `4471` | Modpacks |
| `modLoaderType` | `1` | Forge |
| | `4` | Fabric |
| | `5` | Quilt |
| | `6` | NeoForge |
| `gameVersion` | `1.20.1` | Versión de Minecraft |
| `pageSize` | Máx 50 | Límite por página |
| `index` | Offset | Paginación (max 10,000 resultados) |

**Restricción importante:** `index + pageSize <= 10,000`

### Particularidades Técnicas

#### Algoritmos de Hash
- `1` = SHA1
- `2` = MD5

#### Tipos de Versión
- `1` = Release
- `2` = Beta
- `3` = Alpha

#### Descargas Externas
CurseForge requiere que algunos mods se descarguen manualmente desde su web. MIM detecta esto y muestra el botón **"Abrir Externo"** en lugar de "Descargar".

#### Matching Heurístico
CurseForge no soporta búsqueda masiva por SHA1 como Modrinth. MIM utiliza:
1. `modId` extraído del JAR
2. `fileFingerprint` (Murmur2)
3. Búsqueda por nombre + scoring interno

---

## 4. VirusTotal API v3

### Propósito
Verificación de reputación de archivos mediante hashes SHA-256 para detectar malware conocido.

### Configuración
```typescript
Base URL: https://www.virustotal.com/api/v3
Auth Header: x-apikey: VIRUSTOTAL_API_KEY
```

### Variables de Entorno
```env
# Opcional - habilita verificación de seguridad en la nube
VIRUSTOTAL_API_KEY=tu_api_key_aqui
```

### Endpoints

#### Consulta de Archivo por Hash
```http
GET /files/{sha256_hash}
```

**Respuesta incluye:**
- `last_analysis_stats`: Resultados de análisis (malicious, suspicious, undetected, harmless)
- `total_votes`: Votos de la comunidad
- `reputation`: Reputación del archivo

#### Análisis de URL
```http
POST /urls
```

Para verificar URLs de descarga sospechosas.

### Integración en MIM

El Security Layer consulta VirusTotal como **segunda capa de verificación**:

1. **Primera capa**: Análisis heurístico local de bytecode (0-100 score)
2. **Segunda capa**: Consulta VirusTotal para hashes SHA-256
3. **Whitelisting**: Mods populares conocidos (Sodium, Iris, etc.) se marcan como seguros automáticamente

---

## 5. Estrategias de Optimización

### Sistema de Caché Inteligente

MIM implementa `lib/smart-cache.ts` con IndexedDB para minimizar llamadas API:

| Tipo de Dato | TTL | Estrategia |
|--------------|-----|------------|
| Descripciones | 7 días | Stale-While-Revalidate |
| Búsquedas | 30 minutos | Background refresh |
| Proyectos | 2 horas | Cache + API fallback |
| Updates | 15 min - 1 hora | Stale-While-Revalidate |

### Resolución por Lotes (Bulk Operations)

**Antes (ineficiente):**
```
1000 mods → 1000 requests individuales ❌
```

**Ahora (optimizado):**
```
1000 mods → 1 POST /version_files (bulk hash)
         → 10 GET /projects?ids=[...] (batch de 100)
         → ~11 requests totales ✅
```

**Reducción:** ~99% menos llamadas API

### Concurrencia Controlada

```typescript
const CONCURRENCY_LIMIT = 5;  // Máximo 5 requests paralelas
```

MIM procesa requests en lotes de 5 para evitar HTTP 429 (Rate Limit).

---

## 6. Gestión de Rate Limits

### Modrinth
- **Sin API Key:** 60 requests/minuto
- **Con API Key:** 600 requests/minuto
- **Estrategia MIM:** Cache agresivo + bulk requests

### CurseForge
- **Límite:** Variable según tier de partner
- **Estrategia MIM:** Fallback a Modrinth para descargas

### VirusTotal
- **Free tier:** 4 requests/minuto
- **Público:** 500 requests/día
- **Estrategia MIM:** Solo consultas on-demand, no en batch

### Manejo de Errores

```typescript
// Retry con exponential backoff
if (response.status === 429) {
  const delay = Math.pow(2, retryCount) * 1000;
  await sleep(delay);
  retryCount++;
}
```

---

## 7. Seguridad y Cache

### Seguridad Pre-Descarga

Antes de clasificar cualquier archivo descargado:

1. **Bytecode Scan**: Análisis local de patrones sospechosos
2. **SHA1 Blacklist**: Verificación contra base de datos local de malware
3. **VirusTotal Check**: Consulta de reputación vía SHA-256
4. **Risk Scoring**: Generación de badge de seguridad (0-100)

### Estrategia SWR (Stale-While-Revalidate)

```typescript
{
  ttl: 15 * 60 * 1000,           // 15 minutos
  staleWhileRevalidate: 60 * 60 * 1000,  // 1 hora extra
  backgroundRefresh: true        // Refresco silencioso
}
```

**Flujo:**
1. Usuario solicita datos
2. Si hay cache válida (< TTL): servir inmediatamente
3. Si está en período stale (TTL < edad < TTL+SWR): servir + refrescar en background
4. Si expiró completamente: esperar nueva data

### Persistencia de Caché

```
SOURCE_BASE/.mim-index/remote-cache.json
```

Cache en disco duro con TTL de 12 horas para datos de actualización.

---

## 📊 Métricas de Optimización

| Escenario | Antes | Ahora | Mejora |
|-----------|-------|-------|--------|
| 1000 mods - Carga inicial | 2050 API calls | ~1000 calls | 50% |
| 1000 mods - Uso posterior | 2050 API calls | ~50 calls | 97% |
| Verificación de updates | 1000 requests | 1 bulk POST | 99.9% |
| Colección 300 mods | 300 requests | 4 requests | 98.7% |
| Memory usage | 200-300MB | 40-60MB | 80% |
| Tiempo de carga | 3-5 min | 15-30 seg | 90% |

---

*MIM API Strategy — Precisión técnica sobre fragilidad nominal*
