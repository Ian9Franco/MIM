# MIM – Documentación Consolidada

> **Minecraft Intelligent Manager** — Gestor inteligente de mods, builds y assets para packs de Minecraft.  
> Workspace root: `D:\.mine\`

---

## Índice

1. [Estructura de Directorios (Source)](#1-estructura-de-directorios-source)
2. [Categorización Interna de Mods](#2-categorización-interna-de-mods)
3. [Lógica de Funcionamiento e Inteligencia](#3-lógica-de-funcionamiento-e-inteligencia)
4. [Proceso de Build (alluser / allhost)](#4-proceso-de-build-alluser--allhost)
5. [Especificación de Salida: Estructura alluser](#5-especificación-de-salida-estructura-alluser)
6. [Arquitectura de Archivos del Proyecto](#6-arquitectura-de-archivos-del-proyecto)
7. [Backend: El Motor de Inteligencia (/lib)](#7-backend-el-motor-de-inteligencia-lib)
8. [Frontend: Interface (/app)](#8-frontend-interface-app)
9. [Endpoints Clave (API Routes)](#9-endpoints-clave-api-routes)
10. [Estética y Diseño Frontend](#10-estética-y-diseño-frontend)
11. [Razonamiento de UX](#11-razonamiento-de-ux)

---

## 1. Estructura de Directorios (Source)

El núcleo del sistema es la carpeta `source`, donde los archivos se almacenan de forma ultra-categorizada.

```
D:\.mine\
├── manager\                # Código fuente de la aplicación (Next.js)
├── assets\                 # Archivos indiferentes de versión
│   ├── shaders\            # Perfiles de sombreadores
│   └── schematics\         # Planos de estructuras
├── presets\                # Configuraciones (.toml, .json) por versión
│   └── [Versión]\
├── builds\                 # Output de los builds generados
└── source\                 # Almacén categorizado por versión
    └── [Versión]\          # Ej: 1.20.1 / 1.21.1
        ├── common\         # Independientes del Modloader
        │   ├── resourcepacks\
        │   └── datapacks\
        ├── forge\
        │   ├── .local\
        │   ├── .server\
        │   └── .essential\
        ├── neoforge\
        │   ├── .local\
        │   ├── .server\
        │   └── .essential\
        └── fabric\
            ├── .local\
            ├── .server\
            └── .essential\
```

---

## 2. Categorización Interna de Mods

Dentro de cada carpeta de Modloader (`forge`, `neoforge`, `fabric`):

### A. `.local` (Client-side)
| Sub-categoría |
|---------------|
| animaciones   |
| sonidos       |
| rendimiento   |
| qol           |
| particulas    |

### B. `.server` (Server-side)
| Sub-categoría |
|---------------|
| estructuras   |
| qol           |
| rendimiento   |
| terreno       |

### C. `.essential` (Core / Content)
| Sub-categoría           |
|-------------------------|
| fauna                   |
| hostiles                |
| estructuras y mazmorras |
| arsenal                 |
| bosses                  |
| vanilla + & qol         |
| dimensiones             |
| progreso y rpg          |
| comidas                 |
| librerias               |
| tecnologia              |
| combate avanzado        |

> **Fuente única de verdad:** `lib/constants.ts` exporta el objeto `SUBCATEGORIES` que consume tanto el frontend como los API routes.

---

## 3. Lógica de Funcionamiento e Inteligencia

### Motor de Búsqueda (Cross-Loader Logic)

- **Fabric:** Solo busca en `source/[versión]/fabric/`.
- **Forge / NeoForge:** Busca en su carpeta nativa.
  - **Sinytra Connector Flag:** Si el usuario activa este flag, la app habilita una vista compartida con los mods de `fabric/` de la misma versión.

### Gestión de Assets Universales

- **Shaders y Schematics:** Son indiferentes de versión. La app los mapea globalmente desde `assets/` y permite asignarlos a builds sin mover el archivo original.

### Flujo de Ingesta

1. **Inbox:** El usuario arrastra/descarga un mod a la carpeta `Downloads`.
2. **Detección:** El watcher (chokidar) detecta el nuevo `.jar` / `.zip`.
3. **Clasificación:** MIM lee los metadatos y sugiere la categoría. El usuario confirma con un click o hotkey.
4. **Almacenamiento:** El archivo se mueve físicamente a `source/[versión]/[loader]/[categoria]/[sub]/`.

---

## 4. Proceso de Build (alluser / allhost)

Los builds se generan en `D:\.mine\builds\[projectName]\`.

### alluser (Para Jugadores)
- **Origen:** `.essential` + `.local` + `common/resourcepacks` + `assets/shaders`
- **Acción:** Aplanamiento de todos los `.jar` en `mods/` (sin sub-carpetas).
- **Salida:** ZIP listo para descomprimir en `%appdata%\.minecraft`.

### allhost (Para el Servidor) *(pendiente de implementación)*
- **Origen:** `.essential` + `.server` + `common/datapacks`
- **Acción:** Aplanamiento de `.jar` en `mods/` y preparación de `world/` con datapacks inyectados.
- **Salida:** Carpeta o ZIP lista para subir al hosting (ej. Netherious).

### Orden Lógico del Script de Build
1. **Limpiar:** Borrar residuos de builds anteriores.
2. **Mapear:** Leer categorías del manifiesto (`SUBCATEGORIES`).
3. **Aplanar mods:** Copiar `.jar` con prioridad `.essential` > `.local` en caso de duplicados.
4. **Copiar resourcepacks** desde `common/resourcepacks/`.
5. **Copiar shaderpacks** desde `assets/shaders/`.
6. **Inyectar Config:** Copiar `presets/[versión]/` sobre el build final (sobrescribe defaults).
7. **Verificar:** Asegurar que no existan archivos de `.server` en el paquete `alluser`.

---

## 5. Especificación de Salida: Estructura alluser

```
alluser/
├── mods/           # Todos los .jar de [.essential] + [.local] (planos)
├── config/         # Presets de configuración (.toml, .json, .txt)
├── resourcepacks/  # Packs de texturas de source/[Versión]/common/resourcepacks/
├── shaderpacks/    # Shaders de assets/shaders/
└── options.txt     # (Opcional) Ajustes de video, controles y sonido
```

### Flujo de Instalación para el Usuario Final
1. **Descarga:** Recibe `NombreDelPack_alluser.zip`.
2. **Extracción:** Descomprime en `%appdata%\.minecraft`.
3. **Resultado:** El juego detecta automáticamente la lista plana de mods, los configs y los recursos.

---

## 6. Arquitectura de Archivos del Proyecto

```
D:\.mine\manager\
├── app/
│   ├── api/                    # API Routes
│   │   ├── build/              # POST: disparar build alluser
│   │   ├── classify/           # POST: mover mod a categoría destino
│   │   ├── unclassify/         # POST: mover a Downloads
│   │   ├── library/            # GET: listar mods clasificados
│   │   ├── watcher/            # SSE: stream de descargas detectadas
│   │   ├── delete/             # POST: eliminar archivos
│   │   ├── open-folder/        # POST: abrir carpetas en explorer
│   │   ├── project/            # GET/POST: gestión de proyectos
│   │   ├── settings/           # GET/POST: configuración persistente
│   │   ├── curseforge/
│   │   │   └── discover/       # GET: búsqueda CurseForge
│   │   └── modrinth/
│   │       ├── discover/       # GET: búsqueda Modrinth
│   │       ├── download/       # POST: descarga directa
│   │       ├── collections/    # GET: colecciones del usuario
│   │       ├── check-updates/  # POST: verificar actualizaciones
│   │       ├── presets/        # GET: colecciones curadas (Starter Tech, etc.)
│   │       ├── versions/       # GET: versiones de un proyecto
│   │       ├── project/        # GET: detalles de proyecto
│   │       └── export-descriptions/ # POST: exportar descripciones
│   ├── layout.tsx              # Shell global (Server Component)
│   ├── page.tsx                # Dashboard principal (La Aduana)
│   ├── globals.css             # Variables CSS, tokens de diseño
│   └── favicon.ico
├── components/                 # UI Components organizados por dominio
│   ├── fomo/                   # FOMO Sidebar - Descubrimiento
│   │   ├── FomoSidebar.tsx     # Panel lateral principal
│   │   ├── FomoCollections.tsx # Colecciones del usuario
│   │   ├── FomoDiscoverFilters.tsx # Filtros de búsqueda
│   │   ├── FomoModCard.tsx     # Tarjeta de mod en búsqueda
│   │   ├── FomoPagination.tsx  # Paginación de resultados
│   │   ├── FomoPresets.tsx     # Plantillas curadas
│   │   ├── FomoVersionOverlay.tsx # Selector de versión
│   │   ├── types.ts            # Tipos específicos de FOMO
│   │   └── utils.ts            # Helpers de FOMO
│   ├── library/                # Librería de mods clasificados
│   │   ├── LibrarySection.tsx  # Grid de mods clasificados
│   │   ├── ModCard.tsx         # Tarjeta de mod con metadata
│   │   ├── PendingFilesSection.tsx # Archivos pendientes de clasificar
│   │   ├── QuickCategorizeSection.tsx # Hotkeys de categorización
│   │   └── SubcategoryPanel.tsx # Panel de sub-categorías
│   ├── projects/               # Gestión de proyectos
│   │   ├── BuildPanel.tsx      # Panel de construcción con progreso
│   │   ├── ProjectEditor.tsx   # Editor de proyectos
│   │   └── ProjectsSection.tsx # Lista de proyectos
│   ├── layout/                 # Componentes de layout
│   │   ├── AlertSidebar.tsx    # Panel de alertas y notificaciones
│   │   ├── RootLayoutClient.tsx # Client wrapper con providers
│   │   ├── SettingsModal.tsx   # Modal de configuración
│   │   └── ThemeToggle.tsx     # Toggle dark/light mode
│   └── ui/                     # Primitivas UI reutilizables
│       ├── primitives.tsx      # Botones, inputs, badges base
│       ├── HotkeyCard.tsx      # Tarjetas de atajos de teclado
│       ├── SkeletonLoader.tsx  # Estado de carga con shimmer
│       ├── DescriptionModal.tsx # Modal de descripción de mod
│       ├── SectionHeading.tsx  # Encabezados de sección
│       └── EmptyState.tsx      # Estado vacío ilustrado
├── lib/                        # Lógica backend (Node.js, solo server)
│   ├── constants.ts            # SUBCATEGORIES, rutas base, loaders — SSOT
│   ├── scanner.ts              # Inspección de JARs (adm-zip)
│   ├── watcher.ts              # Observador de descargas (chokidar)
│   ├── builder.ts              # Lógica de aplanamiento y exportación
│   ├── settings.ts             # Persistencia de configuración (mim-settings.json)
│   └── types.ts                # Tipos TypeScript globales (ModHit, Project, etc.)
├── docs/
│   ├── mim_documentation.md    # Este archivo
│   ├── frontend.md             # Guía de estética frontend
│   ├── CHANGELOG.md            # Auditoría de cambios
│   ├── recuerda.md             # Roadmap estratégico
│   ├── arquitectura.md         # Diagramas de arquitectura
│   └── modrinth_api_*.md       # Guías de integración
├── public/                     # Assets estáticos
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## 7. Backend: El Motor de Inteligencia (/lib)

### A. `constants.ts` — Fuente Única de Verdad
Exporta `SUBCATEGORIES`, `SOURCE_BASE`, `BUILDS_BASE`, `LOADERS`. Tanto el frontend como los API routes lo importan para eliminar strings hardcodeados.

### B. `scanner.ts` — Escaneo de Metadata
Utiliza `adm-zip` para leer el JAR en memoria sin extraerlo.

| Loader     | Archivo leído                              | Campo extraído |
|------------|--------------------------------------------|----------------|
| Fabric     | `fabric.mod.json`                          | `version`, `id` |
| NeoForge   | `META-INF/neoforge.mods.toml`              | `version` (regex) |
| Forge      | `META-INF/mods.toml`                       | `version` (regex) |

**Retorno:** `{ version, loader, isCompatibleWithConnector }`

### C. `watcher.ts` — Observador de Descargas
- Usa **chokidar** para vigilar `~/Downloads`.
- Filtra a `.jar` y `.zip`.
- `ignoreInitial: true` → solo reacciona a archivos **nuevos** desde el inicio del app.
- Emite el evento `new_file` en el `watcherEmitter` (EventEmitter compartido).

### D. `builder.ts` — Lógica de Build
- Limpia el `buildPath` antes de empezar.
- Recorre `.essential` → `.local` (orden de prioridad para duplicados).
- Copia `resourcepacks`, `shaderpacks`, `config` si los directorios existen.
- Retorna `{ success, message, modsCount, buildPath }`.

---

## 8. Frontend: Interface (/app)

### Sección 1: La Aduana (Dashboard Principal)
- **Estado:** Lista de `pendingFiles` poblada via SSE.
- **UI:** Tarjetas horizontales (`ModCard`). Badge de cantidad en el título.
- **Interacción:**
  - Click en tarjeta → `selectedFile`
  - Auto-badge `[1.20.1] [Forge]` si el scanner tuvo éxito.
  - Si `version !== activeProject.version` → tarjeta se pone en rojo (vibra con `shake` animation).

### Sección 2: Categorización Rápida
- **Hotkeys:**
  - `1` → `.essential`
  - `2` → `.local`
  - `3` → `.server`
  - `Esc` → deseleccionar
- **Sub-categorías:** Se despliegan en `SubcategoryPanel` al presionar el número o hacer click.
- Mientras no hay archivo seleccionado, los `HotkeyCard` se muestran con `opacity-40` y `pointer-events-none`.

### Gestión de Proyectos
- `PROJECTS[]` en `page.tsx` define los proyectos disponibles.
- Al cambiar de proyecto se resetea el archivo seleccionado y el panel de sub-categorías.

---

## 9. Endpoints Clave (API Routes)

### File Watcher
#### `GET /api/watcher`
Abre un canal SSE. Devuelve eventos `data: JSON\n\n` cada vez que cae un `.jar`/`.zip` en Downloads.

**Evento emitido:**
```json
{ "path": "/home/user/Downloads/alexscaves-1.0.jar", "fileName": "alexscaves-1.0.jar", "meta": { "version": "1.0.0", "loader": "forge" } }
```

**Features:**
- Keepalive cada 30s para mantener conexión viva
- Auto-reconnect del browser
- 500ms delay para archivos grandes (race condition fix)

### Gestión de Mods
#### `POST /api/classify`
Mueve físicamente un mod a su categoría de destino en `source/`.

**Body:**
```json
{ "sourcePath": "C:/Users/.../Downloads/mod.jar", "targetCategory": ".essential\\fauna", "version": "1.20.1", "modloader": "forge" }
```

**Validaciones:**
- SSOT de categorías via `isValidCategory()`
- Guard de colisión (origen !== destino)
- Lista de `skipped[]` en respuesta

#### `POST /api/unclassify`
Mueve mods clasificados de vuelta a Downloads.

**Features:**
- Collision guard con timestamp (no sobrescribe)
- Lista de `skipped[]` en respuesta

#### `POST /api/delete`
Elimina archivos físicamente.

#### `GET /api/library`
Lista mods clasificados por versión + loader.

**Query params:** `?version=1.20.1&loader=forge`

### Build System
#### `POST /api/build`
Dispara el build `alluser` o `allhost`.

**Body:**
```json
{ "version": "1.20.1", "loader": "forge", "projectName": "Netherious Server", "type": "alluser" }
```

**Types:** `alluser` (cliente), `allhost` (servidor)

### Modrinth Integration
#### `GET /api/modrinth/discover`
Búsqueda de proyectos en Modrinth.

**Query params:** `?query=sodium&loader=fabric&version=1.20.1&project_type=mod`

#### `POST /api/modrinth/download`
Descarga directa a carpeta Downloads del sistema.

**Body:** `{ "url": "https://...", "filename": "mod.jar" }`

**Security:**
- `path.basename()` sanitization (anti path traversal)
- Solo HTTPS permitido
- Collision guard con timestamp

#### `GET /api/modrinth/collections`
Obtiene colecciones del usuario (creadas + followed).

**Headers:** Requiere `Authorization: mrp_...`

#### `GET /api/modrinth/presets`
Colecciones curadas built-in (Starter Tech, Vanilla+, etc.)

#### `GET /api/modrinth/versions`
Lista versiones disponibles de un proyecto.

#### `POST /api/modrinth/check-updates`
Verifica actualizaciones batch para lista de mods.

**Optimización:** Batching con límite de concurrencia (5 requests paralelas)

### CurseForge Integration
#### `GET /api/curseforge/discover`
Búsqueda en CurseForge via API de Eternal.

**Query params:** similares a Modrinth

**Nota:** Descarga manual (abrir externo) ya que CF requiere API key adicional.

### Sistema de Proyectos
#### `GET|POST /api/project`
CRUD de proyectos. Persistencia en `mim-settings.json`.

### Configuración
#### `GET|POST /api/settings`
Gestión de settings (sourceBase, buildsBase, downloadsPath).

#### `POST /api/open-folder`
Abre carpetas en explorer del sistema operativo.

---

## 10. Security Layer (Threat Detection Engine)

### Overview
Sistema de análisis de seguridad para detectar comportamientos potencialmente maliciosos en mods de Minecraft antes de su instalación.

### Arquitectura del Scanner
- **Archivo:** `lib/security-scanner.ts`
- **Endpoint:** `POST /api/security/scan`
- **Scoring:** 0-100 (Clean | Caution | Suspicious | Critical)

### Categorías de Amenazas
| Categoría | Peso | Descripción |
|-----------|------|-------------|
| Process Execution | 25 | `Runtime.exec()`, `ProcessBuilder` |
| Native Code | 20 | `System.loadLibrary()`, JNI |
| Reflection Abuse | 15 | `setAccessible(true)`, `defineClass()` |
| Network Calls | 15 | Sockets, HTTP connections |
| Obfuscation | 10 | Nombres ofuscados, string encryption |
| File System | 10 | Borrado masivo, escritura fuera de .minecraft |
| Known Malware | 100 | SHA-1 hash en blacklist |

---

## 11. FOMO UI 3.0 & Descubrimiento

### Novedades de la Versión 3.0 (Dynamic Glass Layout)
- **Alineación Tridimensional Floating Glass Gutter**:
  - Al abrirse la vista de detalles, la barra lateral derecha se ensancha de `380px` a **`600px`** (`max-w-[90vw]`).
  - El sidebar de FOMO se contrae dinámicamente de `75vw` a **`calc(100vw - 600px - 40px)`**, dejando una franja vertical libre de **`40px`** que deja ver el fondo con blur de la app principal.
  - Se mantiene el radio de esquinas derechas de FOMO (`borderRadius: "0 2rem 2rem 0"`), haciendo que ambos paneles parezcan hojas de vidrio flotante.
- **Grilla Reactiva Forzada**:
  - **Detalles Cerrados**: Grilla responsiva de hasta **3 columnas** (`grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`).
  - **Detalles Abiertos**: La grilla se fuerza automáticamente a exactamente **2 columnas** tanto en la pestaña de Descubrir como en Colecciones para prevenir el colapso visual de las tarjetas.
- **Fricción Cero en Selección de Tarjetas**:
  - El usuario puede conmutar el estado de selección de un mod haciendo click en **cualquier parte vacía de la tarjeta**.
  - Todos los botones internos de acción (`Detalles`, `Descargar`, `Web`, `Colección`) utilizan `e.stopPropagation()` para ejecutar sus directivas sin gatillar selectores accidentales.
- **FomoVersionOverlay Portaleado**:
  - El panel de inspección se renderiza dinámicamente usando un **React Portal** apuntando a `#fomo-details-sidebar-portal`.
  - Incorpora un **DOM Polling Finder** que reintenta buscar el contenedor de portal cada `20ms` hasta 10 veces en caso de race conditions durante el renderizado asincrónico.
  - Ofrece pestañas enriquecidas para **Changelogs** (en Markdown completo), **Dependency Resolver** (con colores según severidad) y verificación de integridad **SHA1**.

---

## 12. Estética y Diseño Frontend

### Paleta de Colores
| Token       | Hex       | Uso                            |
|-------------|-----------|--------------------------------|
| Dark Purple | `#200D2D` | Fondo base                     |
| Wisteria    | `#BB96E4` | Acentos primarios, borders     |
| Sun Glow    | `#FFD066` | Highlights, badges, hotkeys    |

### Animaciones
- **Shimmer:** sweep horizontal sobre skeleton cards.
- **Grow:** aparición suave `scaleX(0→1)` para panels y tarjetas.
- **Shake:** vibración de tarjeta cuando la versión no coincide.
- **Pulse / Bounce:** indicadores de estado en tiempo real.
- Todos los elementos tienen `border-radius` redondeado (`rounded-[1rem]` o `rounded-full`).
- Transiciones `transition-all duration-300` en hover states.

---

## 13. Razonamiento de UX

- **Fricción Cero:** Si MIM detecta que el mod es de una versión diferente al proyecto activo, la tarjeta se pone en rojo y vibra antes de guardarlo.
- **Seguridad Preventiva:** El risk score se muestra visualmente antes de la clasificación para evitar riesgos accidentales.
- **Aislamiento Total:** Cada proyecto es una burbuja hermética; lo que instalas en uno no afecta a los demás.
