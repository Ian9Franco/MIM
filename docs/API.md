# MIM — API Documentation

> Guía completa de integraciones API de Minecraft Intelligent Manager.  
> Modrinth, CurseForge, VirusTotal, y Supabase Cloud.  
> **Versión Actual:** v9.3.0 (Arquitectura Modular & Premium UI)  
> **Última actualización:** 2026-05-21

---

## 📑 Tabla de Contenidos

1. [Filosofía de Integración](#1-filosofía-de-integración)
2. [Modrinth API (Labrinth v2)](#2-modrinth-api-labrinth-v2)
3. [CurseForge API (Eternal v1)](#3-curseforge-api-eternal-v1)
4. [VirusTotal API v3](#4-virustotal-api-v3)
5. [Supabase & Community Cloud API](#5-supabase--community-cloud-api)
6. [MIM Core APIs (Control Interno)](#6-mim-core-apis-control-interno)
7. [Gestión de Rate Limits y Resiliencia](#7-gestión-de-rate-limits-y-resiliencia)

---

## 1. Filosofía de Integración

MIM actúa como un puente inteligente y reactivo entre los archivos locales del usuario y los repositorios globales. El core del sistema prioriza la **precisión de hashes técnicos** por sobre la **fragilidad de nomenclaturas nominales**.

| Feature | Modrinth (Labrinth) | CurseForge (Eternal) | VirusTotal v3 | Supabase |
| :--- | :--- | :--- | :--- | :--- |
| **Primacía** | Principal (Estructura de Descargas) | Secundaria (Catálogo/Fallback) | Seguridad (Verificación) | Social (Comunidad Cloud) |
| **Auth** | Opcional (Key sube cuotas) | Obligatoria (Key de Partner) | Opcional (Key pública) | Obligatoria (Auth JWT) |
| **Matching** | SHA1 exacto (100% acierto) | Murmur2 / ID de proyecto | SHA256 exacto | UUID de usuario (Sync) |

---

## 2. Modrinth API (Labrinth v2)

### Base URL
```
https://api.modrinth.com/v2
```

### Endpoints Críticos

#### Matching Masivo por SHA1
```http
POST /version_files
Content-Type: application/json

{
  "hashes": ["a1b2c3d4e5f6...", "b2c3d4e5f6g7..."],
  "algorithm": "sha1"
}
```
* **Optimización MIM**: Este endpoint unifica las consultas de múltiples JARs. MIM agrupa las solicitudes para hidratar la librería local en una sola consulta de red en lugar de ejecutar cientos de llamadas.

#### Descarga Directa
```http
GET /version/{version_id}/download
```
* **Orquestador**: Gestionado por `lib/modding/downloadQueue.ts` para realizar descargas secuenciales no invasivas.

---

## 3. CurseForge API (Eternal v1)

### Base URL
```
https://api.curseforge.com/v1
```

### Particularidades Técnicas
- **Búsqueda Heurística**: Dado que CurseForge no admite consultas por SHA1 directo para todos los proyectos, MIM extrae `projectID` o hashes `Murmur2` de los metadatos JAR y busca concordancia.
- **Picks Curados**: El endpoint `/api/curseforge/picks` resuelve conteos dinámicos en caliente de mods CurseForge mediante diccionarios pre-calculados en el backend para evitar respuestas vacías de API.

---

## 4. VirusTotal API v3

### Base URL
```
https://www.virustotal.com/api/v3
```

### Lógica de Escaneo en Dos Pasos
1. **Paso Local**: Escaneo de bytecode de Java por heurística estática rápida (`lib/security/`).
2. **Paso Cloud**: Consulta en background por hash SHA256 de forma asíncrona hacia la API de VirusTotal para evitar cuotas y rate limits.

---

## 5. Supabase & Community Cloud API

MIM expone una capa interactiva social en la nube, conectando a la base de datos Supabase PostgreSQL.

### Autenticación
* Manejada mediante Supabase Auth en el componente `@/components/fomo/core/LoginPortal`.

### Esquema Comunitario (`profiles`)
La tabla de perfiles en Supabase almacena los datos de los clubes de modding de forma pública:
```sql
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    color TEXT CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    club_data JSONB NOT NULL DEFAULT '{"mods": [], "authors": [], "youtubeChannels": []}'::jsonb
);
```

### Sincronización (`clubService.ts`)
* **Cliente ➔ Nube**: `syncMyClubToCloud()` construye el JSON de metadatos locales desde `followed_mods` y `followed_authors` almacenados en IndexedDB y realiza un `upsert` directo con políticas RLS de Supabase.

---

## 6. MIM Core APIs (Control Interno)

### 6.1 Extracción de YouTube Showcase
`GET /api/fomo/youtube-showcase?channel={url}&limit={n}&type={videos|shorts}`

* **Heurísticas**: Analiza el canal especificado utilizando `yt-dlp` en local, extrae los enlaces de descarga de mods y mapea los slugs para enriquecer los showcases.
* **Caché Física**: Almacena las consultas locales en la ruta portable `.MIM/source/.mim-index/` indexando por hash MD5 para evitar peticiones repetitivas.
* **Filosofía de Resiliencia**: El backend y frontend tratan la reproducción multimedia como una **característica secundaria de conveniencia**. Si `yt-dlp` falla o se desactualiza debido a cambios del reproductor de YouTube:
  - El endpoint devuelve un flag de error controlado.
  - La interfaz expone botones de acción directos **"Abrir en YouTube"** en las tarjetas visuales.
  - El sistema de búsqueda, categorización y descarga de mods de FOMO sigue operando al 100%.

### 6.2 Auditoría de Logs (SAGE API)
`GET /api/project/logs` | `DELETE /api/project/logs`

* Lector restringido de logs locales (`latest.log` y `crash-reports/`). Protege la carga contra Directory Traversal.
* Interconecta directamente con `lib/intelligence/sageRecoveryEngine.ts` para diagnosticar fallas de compatibilidad e inyecciones de Mixin.

---

## 7. Gestión de Rate Limits y Resiliencia

* **IndexedDB Caching**: Persistencia asíncrona local en `lib/storage/indexeddb.ts` que almacena descripciones de Modrinth y CurseForge con políticas Stale-While-Revalidate (SWR), reduciendo el consumo de API en un 97%.
* **SafeDownloader Gate**: Las descargas simultáneas se limitan mediante colas con delay adaptativo para respetar las cuotas de descarga y evitar bloqueos temporales de IP (HTTP 429).
