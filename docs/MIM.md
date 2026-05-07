# MIM — Arquitectura y Funcionamiento Completo

> Documentación técnica maestra de Minecraft Intelligent Manager.  
> Arquitectura, flujos de datos, componentes y decisiones de diseño.  
> **Versión:** Beta 5.2 | **Última actualización:** 2026-05-07

---

## 📑 Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Estructura de Directorios](#3-estructura-de-directorios)
4. [Flujo de Datos](#4-flujo-de-datos)
5. [Core Engine](#5-core-engine)
6. [Frontend Architecture](#6-frontend-architecture)
7. [API Layer](#7-api-layer)
8. [Integraciones Externas](#8-integraciones-externas)
9. [Sistemas de Seguridad](#9-sistemas-de-seguridad)
10. [Optimizaciones de Performance](#10-optimizaciones-de-performance)
11. [Decisiones Técnicas](#11-decisiones-técnicas)

---

## 1. Visión General

**Minecraft Intelligent Manager (MIM)** es una aplicación de gestión de modpacks que transforma el caos de crear modpacks en un flujo de trabajo de **3 clics**. Combina un scanner inteligente de JARs, integración dual con Modrinth/CurseForge, y un sistema de diagnóstico de crashes (SAGE) en una interfaz glassmórfica moderna.

### Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Frontend | Next.js 14 (App Router) | UI Reactiva, Server Components |
| Estilos | Tailwind CSS | Glassmorphism, theming |
| Backend | Next.js API Routes | Endpoints REST + SSE |
| Native | Tauri (Rust) | Versión de escritorio |
| File System | chokidar | File watching en tiempo real |
| Storage | IndexedDB | Cache persistente local |

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  FOMO Panel  │  │   Library    │  │ SAGE Alerts  │  │ Tweak Controls │  │
│  │  (Discovery) │  │   (Grid)     │  │  (Diagnosis) │  │  (Settings)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ React + TypeScript
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ /discover  │ │ /classify  │ │ /security  │ │ /watcher   │ │ /library │  │
│  │ /download  │ │ /build     │ │ /scan      │ │ (SSE)      │ │          │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ Node.js
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CORE ENGINE                                      │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   JAR Scanner    │  │  File Watcher    │  │ Security Engine  │          │
│  │  (scanner.ts)    │  │  (watcher.ts)    │  │(security-scanner)│          │
│  │                  │  │                  │  │                  │          │
│  │ • Fabric/Forge   │  │ • chokidar       │  │ • Bytecode scan  │          │
│  │ • SHA1 hashes    │  │ • SSE events     │  │ • Risk scoring   │          │
│  │ • Metadata parse │  │ • Real-time sync │  │ • VirusTotal     │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │     Builder      │  │   Smart Cache    │  │  SAGE Engine     │          │
│  │   (builder.ts)   │  │ (smart-cache.ts) │  │   (SAGE)         │          │
│  │                  │  │                  │  │                  │          │
│  │ • Zip creation   │  │ • IndexedDB      │  │ • Crash logs     │          │
│  │ • Project merge  │  │ • TTL strategies │  │ • Dependencies   │          │
│  │ • Deduplication  │  │ • SWR pattern    │  │ • Connector diag │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
 ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
 │  Modrinth    │          │  CurseForge  │          │  VirusTotal  │
 │     API      │          │     API      │          │     API      │
 └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 3. Estructura de Directorios

### Workspace de MIM

```
D:\.mine\                         # Root del workspace
├── manager\                      # Código fuente de la app (Next.js)
│   ├── app\                      # Next.js App Router
│   │   ├── api\                 # API Routes
│   │   │   ├── modrinth\        # Integración Modrinth completa
│   │   │   ├── curseforge\      # Integración CurseForge
│   │   │   ├── classify\        # Clasificación de mods
│   │   │   ├── security\        # Análisis de seguridad
│   │   │   └── ...
│   │   ├── layout.tsx            # Root layout + providers
│   │   └── page.tsx              # Dashboard principal
│   ├── components\               # React components
│   │   ├── fomo\                 # FOMO Sidebar components
│   │   ├── library\               # Library Grid components
│   │   ├── projects\              # Project management
│   │   └── layout\               # Layout components
│   ├── lib\                      # Core logic
│   │   ├── scanner.ts            # Parser de JARs
│   │   ├── builder.ts            # Compresión y builds
│   │   ├── watcher.ts            # File watcher + SSE
│   │   ├── security-scanner.ts   # Análisis de bytecode
│   │   ├── smart-cache.ts        # Sistema de caché
│   │   └── types.ts              # TypeScript types
│   └── docs\                     # Documentación
│
├── assets\                       # Archivos indiferentes de versión
│   ├── shaders\                   # Shaders packs
│   └── schematics\               # Esquemas de construcción
│
├── presets\                      # Configuraciones por versión
│   ├── 1.20.1\                   # Configs para 1.20.1
│   └── 1.21.1\                   # Configs para 1.21.1
│
├── builds\                       # Output de builds generados
│   └── [nombre-proyecto]\         # Carpetas por proyecto
│
└── source\                       # Almacén categorizado por versión
    └── [Versión]\                 # Ej: 1.20.1 / 1.21.1
        ├── common\                # Independientes del Modloader
        │   └── resourcepacks\    # Texture packs
        ├── forge\                 # Mods Forge
        │   ├── .local\            # Client-side
        │   │   ├── animaciones\   # Mods de animación
        │   │   ├── sonidos\       # Mods de audio
        │   │   ├── rendimiento\   # Optimizaciones
        │   │   ├── qol\           # Calidad de vida
        │   │   └── particulas\    # Efectos visuales
        │   ├── .server\           # Server-side
        │   │   ├── estructuras\   # Generación de mundo
        │   │   ├── qol\           # Utilidades servidor
        │   │   ├── rendimiento\   # Optimización servidor
        │   │   └── terreno\       # Biomas y terreno
        │   └── .essential\        # Core / Content
        │       ├── fauna\         # Animales y criaturas
        │       ├── magia\          # Sistemas de magia
        │       ├── tecnologia\    # Mods tech (Create, etc.)
        │       ├── aventura\       # Aventura y exploración
        │       ├── almacenamiento\# Sistemas de storage
        │       ├── decoracion\    # Decoración y construcción
        │       ├── herramientas\  # Herramientas nuevas
        │       ├── combate\        # Armas y combate
        │       ├── comida\        # Alimentos y farming
        │       ├── librerias\     # APIs y librerías
        │       └── transporte\    # Vehículos y transporte
        ├── neoforge\              # Estructura similar
        └── fabric\                # Estructura similar
```

---

## 4. Flujo de Datos

### 4.1 Flujo de Ingesta (La Aduana)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Downloads│────▶│ Watcher  │────▶│ Scanner  │────▶│ Security │────▶│   UI     │
│  Folder  │     │ (chokidar)│     │  (JAR)   │     │  Scan    │     │ Pending  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                 │                 │
                      │                 │                 │
                      ▼                 ▼                 ▼
                ┌──────────┐     ┌──────────┐     ┌──────────┐
                │   SSE    │     │  SHA1    │     │  Risk    │
                │  Events  │     │  Hash    │     │  Score   │
                └──────────┘     └──────────┘     └──────────┘
```

**Pasos:**
1. **Detección:** Watcher detecta archivo nuevo en Downloads
2. **Escaneo:** Se extrae versión, loader, metadata y se genera hash SHA1
3. **Validación:** Security Engine analiza bytecode y consulta VirusTotal
4. **Enriquecimiento:** Se consultan tags en Modrinth vía hash
5. **UI Update:** El archivo aparece en "Pending" con badges de versión/tags

### 4.2 Flujo de Clasificación

```
Usuario presiona "1" (Tecnología)
         │
         ▼
┌─────────────────────────────────────┐
│  Validación de Compatibilidad       │
│  • ¿Loader coincide?                │
│  • ¿Versión coincide?               │
│  • ¿Es 1.20.1 con Forge/NeoForge?   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Movimiento Físico (fs.rename)      │
│  Downloads ──▶ .essential/tecnologia/│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  UI Update (Optimistic + Confirm)   │
└─────────────────────────────────────┘
```

### 4.3 Flujo de Build

```
┌─────────────────┐
│  User clicks    │
│  "Build Project"│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Builder.orchestrate()                          │
│  1. Merge .essential + .local + resourcepacks │
│  2. Create ZIP structure                        │
│  3. Apply configs from presets/                 │
│  4. Copy to builds/ folder                      │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Output:                            │
│  • ZIP para distribución            │
│  • Carpeta para servidor            │
└─────────────────────────────────────┘
```

---

## 5. Core Engine

### 5.1 JAR Scanner (`lib/scanner.ts`)

Detecta metadatos sin extraer el archivo completamente:

```typescript
// Fabric
fabric.mod.json → {
  id: string,
  version: string,
  depends: { [modId]: versionRange },
  environment: "client" | "server" | "*"
}

// Forge/NeoForge
META-INF/mods.toml → {
  modId: string,
  version: string,
  dependencies: [...],
  modLoader: string
}
```

**Heurísticas:**
- Extracción de versión desde nombre de archivo
- Normalización de versiones (`mod+1.20.1.jar` → `1.20.1`)
- Fallback a estructura de carpetas

### 5.2 File Watcher (`lib/watcher.ts`)

```typescript
// Server-Sent Events para notificaciones en tiempo real
chokidar.watch(downloadsPath)
  .on('add', file => emit('new_file', data))
  .on('unlink', file => emit('file_removed', data))
```

**Características:**
- Detecta archivos nuevos y eliminados
- Delay de 500ms para archivos grandes
- SSE streaming para UI reactiva

### 5.3 Security Scanner (`lib/security-scanner.ts`)

Análisis de bytecode Java para detectar patrones de malware:

| Categoría | Patrones Detectados | Peso |
|-----------|-------------------|------|
| Process Execution | `Runtime.exec()`, `ProcessBuilder` | 25 |
| Native Code | `System.loadLibrary()`, JNI | 20 |
| Reflection Abuse | `setAccessible(true)`, `defineClass()` | 15 |
| Network Calls | `URL.openConnection()`, `Socket` | 15 |
| Obfuscation | Nombres cortos/random | 10 |
| File System | Borrado masivo, escritura fuera de `.minecraft` | 10 |
| Manifest Anomalies | Sin metadata, contiene `.exe` | 3 |

**Risk Score:** 0-100 con niveles:
- 🟢 0-30: Clean
- 🟡 31-60: Caution
- 🟠 61-85: Suspicious
- 🔴 86-100: Critical

### 5.4 Smart Cache (`lib/smart-cache.ts`)

Sistema de caché con IndexedDB:

```typescript
interface CacheStrategy {
  ttl: number;                    // Time to live
  staleWhileRevalidate: number;   // Período de gracia
  backgroundRefresh: boolean;    // Refresco silencioso
}

// TTLs por tipo de dato
const strategies = {
  modrinth_description: 7 * 24 * 60 * 60 * 1000,  // 7 días
  modrinth_search: 30 * 60 * 1000,                 // 30 minutos
  mod_updates: 15 * 60 * 1000,                     // 15 minutos
};
```

### 5.5 Builder (`lib/builder.ts`)

Orquesta la creación de paquetes finales:

```typescript
type BuildMode = 'alluser' | 'allhost';

// alluser: Cliente
// • .essential + .local + resourcepacks + shaders
// • Salida: ZIP plano con carpeta mods/

// allhost: Servidor  
// • .essential + .server + datapacks
// • Salida: Carpeta lista para hosting
```

---

## 6. Frontend Architecture

### 6.1 Component Hierarchy

```
RootLayout
├── ThemeProvider (Dark/Light mode)
├── Header (z-[150])
│   ├── ALRT Button (Alert Center)
│   ├── SAGE Button (Diagnosis)
│   ├── TWEAK Button (Settings)
│   └── FOMO Button (Discovery)
├── Main Content Area
│   ├── ProjectsSection (Sidebar izquierdo)
│   ├── LibraryGrid (Centro)
│   │   ├── VirtualizedLibrary (para 700+ mods)
│   │   └── ModCard (icons Base64, badges)
│   └── PendingFilesSection (Clasificación rápida)
├── FOMO Sidebar (Portal - Izquierda)
│   ├── FomoDiscover (Modrinth/CurseForge)
│   ├── FomoCollections (Mis colecciones)
│   └── FomoVersionOverlay (Detalles)
├── Tweak Sidebar (Portal - Derecha)
│   ├── ResourcePack Stack
│   ├── Keybind Editor
│   └── Game Options
└── Alert Sidebar (Notificaciones)
```

### 6.2 Glassmorphism UI

```css
/* Design System */
--bg-dark-purple: #200D2D;
--accent-wisteria: #BB96E4;
--accent-sun-glow: #FFD066;
--accent-cyan: #06B6D4;
--risk-red: #EF4444;

/* Glass Effect */
.glass-panel {
  background: rgba(32, 13, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(187, 150, 228, 0.2);
  border-radius: 1rem;
}
```

### 6.3 Virtual Scrolling

Para bibliotecas de 700+ mods:

```typescript
// Solo renderiza ~15 elementos visibles
<VirtualizedLibrary
  items={library}
  renderItem={ModCard}
  overscan={5}
/>

// Resultado:
// • DOM nodes: ~15 (vs 700+)
// • Memory: 40-60MB (vs 200-300MB)
// • Scroll: 60fps consistente
```

---

## 7. API Layer

### 7.1 Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/watcher` | GET | SSE stream de eventos de archivos |
| `/api/library` | GET | Lista de mods clasificados |
| `/api/classify` | POST | Mover archivos a categorías |
| `/api/unclassify` | POST | Retornar a Downloads |
| `/api/build` | POST | Compilar modpack |
| `/api/security/scan` | POST | Analizar bytecode |
| `/api/modrinth/discover` | GET | Buscar en Modrinth |
| `/api/modrinth/download` | POST | Descargar desde Modrinth |
| `/api/modrinth/check-updates` | POST | Verificar actualizaciones batch |
| `/api/curseforge/discover` | GET | Buscar en CurseForge |
| `/api/settings` | GET/POST | Configuración persistente |

### 7.2 Server-Sent Events

```typescript
// /api/watcher/route.ts
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      watcherEmitter.on('new_file', (data) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  });
  
  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Ventajas sobre WebSockets:**
- Unidireccional nativo (suficiente para este caso)
- Auto-reconnect del browser
- Integración limpia con Next.js streaming
- Latencia <100ms

---

## 8. Integraciones Externas

### 8.1 Modrinth (Primaria)

```typescript
Base: https://api.modrinth.com/v2
Auth: Optional (MODRINTH_API_KEY)

// Matching preciso
POST /version_files
{ hashes: ["sha1_1", "sha1_2"], algorithm: "sha1" }

// Batch enrichment
GET /projects?ids=["AAAA","BBBB"]
```

### 8.2 CurseForge (Secundaria)

```typescript
Base: https://api.curseforge.com/v1
Auth: Required (CURSEFORGE_API_KEY)

// Discovery only (no matching por hash)
GET /v1/mods/search?gameId=432&classId=6

// Manual download para algunos mods
```

### 8.3 VirusTotal (Seguridad)

```typescript
Base: https://www.virustotal.com/api/v3
Auth: Optional (VIRUSTOTAL_API_KEY)

// Verificación de reputación
GET /files/{sha256_hash}
```

---

## 9. Sistemas de Seguridad

### 9.1 Capas de Seguridad

```
┌─────────────────────────────────────────┐
│  Capa 1: Bytecode Analysis (Local)      │
│  • Heurísticas de comportamiento        │
│  • Risk scoring 0-100                   │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Capa 2: Known Malware DB (Local)     │
│  • SHA1 blacklist                       │
│  • Mods populares whitelist             │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Capa 3: VirusTotal (Cloud)             │
│  • SHA256 hash lookup                   │
│  • Community reputation                 │
└─────────────────────────────────────────┘
```

### 9.2 SAGE Engine

**S**ystematic **A**nalyzer for **G**litches & **E**xceptions

```typescript
// Análisis de crash logs
interface CrashAnalysis {
  exceptionType: string;
  causedBy: string;
  mixins: string[];
  dependencies: {
    missing: string[];
    providedBy: Map<string, string>;
  };
  sinytraRisk: number;  // 0-100%
  recommendedAction: string;
}
```

**Funcionalidades:**
- Parser de stack traces Java
- Detector de dependencias faltantes
- Diagnóstico de Sinytra Connector
- Acción directa → FOMO para instalar dependencias

---

## 10. Optimizaciones de Performance

### 10.1 Benchmarks

| Escenario | Antes | Ahora | Mejora |
|-----------|-------|-------|--------|
| Carga inicial (1000 mods) | 3-5 min | 15-30 seg | 90% |
| API calls (primer uso) | ~2050 | ~1000 | 50% |
| API calls (uso posterior) | ~2050 | ~50 | 97% |
| Memory usage | 200-300MB | 40-60MB | 80% |
| Scroll performance | 20-30fps | 60fps | 100% |

### 10.2 Técnicas Aplicadas

1. **Virtual Scrolling**: Solo renderiza elementos visibles
2. **Aggressive Memoization**: Reducción 60% CPU
3. **Smart Cache**: TTL dinámico + SWR
4. **Web Workers**: Background scanning sin bloquear UI
5. **Lazy Loading**: Descripciones on-demand
6. **Bulk Requests**: 99% menos llamadas API
7. **IndexedDB**: Persistencia sin bloquear main thread

---

## 11. Decisiones Técnicas

### 11.1 Por qué SSE en lugar de WebSockets

**Contexto:** El watcher de archivos necesita notificar al frontend cuando nuevos `.jar` aparecen en Downloads.

**Opciones consideradas:**
- WebSockets: Full-duplex, pero overkill para unidireccional
- Polling: Simple, pero desperdicia batería/requests
- **SSE elegido:** Unidireccional nativo, auto-reconnect, integración limpia con Next.js

**Resultado:** Latencia <100ms, 0 conexiones persistentes innecesarias.

### 11.2 Por qué IndexedDB sobre JSON

**Problema:** JSON-based storage se vuelve lento con 1000+ mods.

**Solución:** IndexedDB ofrece:
- Queries indexadas
- Almacenamiento estructurado
- No bloquea el main thread
- Escalable a 10,000+ mods

### 11.3 Por qué Dual-Source (Modrinth + CurseForge)

**Problema:** No todos los mods están en ambas plataformas.

**Solución:**
- Misma interfaz `ModHit` para ambas fuentes
- Toggle en UI sin cambiar lógica de negocio
- CurseForge para discovery, Modrinth para descarga directa

**Trade-off:** CurseForge API key opcional (muchos usuarios solo usan Modrinth).

### 11.4 Por qué SHA1 sobre nombres de archivo

**Problema:** Los nombres de archivo pueden cambiar, los hashes no.

**Solución:** Matching 100% preciso basado en SHA1:
- Modrinth soporta búsqueda por hash directamente
- Elimina falsos positivos
- Permite deduplicación local eficiente

---

## 12. Flujos de Usuario

### 12.1 Flujo Típico (Crear Modpack)

```
1. DESCUBRIR (FOMO)
   └── Buscar mods en Modrinth/CurseForge
   └── Seleccionar y descargar múltiples mods
   
2. CLASIFICAR (Hotkeys)
   └── Presionar "1" → Tecnología
   └── Presionar "2" → Fauna
   └── Presionar "3" → Calidad de Vida
   
3. CONSTRUIR (Build)
   └── Click en "Build Project"
   └── ZIP listo en builds/
   
4. DIAGNOSTICAR (SAGE)
   └── Si hay crash: SAGE analiza el log
   └── Identifica mod culpable
   └── Sugiere solución / descarga fix
```

### 12.2 Flujo de Actualización

```
1. User abre app
2. Smart cache verifica si hay updates (>15 min)
3. Si es necesario: POST /version_files con todos los hashes
4. UI muestra badge "Update available" en mods desactualizados
5. User puede ignorar o descargar actualización
```

---

*MIM — Arquitectura técnica senior para gestión de modpacks*
