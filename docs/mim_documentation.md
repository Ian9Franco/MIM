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
│   ├── api/
│   │   ├── watcher/route.ts    # SSE: stream de descargas detectadas
│   │   ├── classify/route.ts   # POST: mover mod a categoría destino
│   │   └── build/route.ts      # POST: disparar build alluser
│   ├── layout.tsx              # Shell global (header, fuentes, CSS vars)
│   ├── page.tsx                # Dashboard principal (La Aduana)
│   └── globals.css             # Variables CSS, tokens de diseño
├── components/                 # UI Components desacoplados
│   ├── ModCard.tsx             # Tarjeta de mod pendiente
│   ├── HotkeyCard.tsx          # Card de categoría rápida (1/2/3)
│   ├── SkeletonLoader.tsx      # Estado de carga con shimmer
│   └── SubcategoryPanel.tsx    # Panel de sub-categorías expandido
├── lib/                        # Lógica backend (Node.js, solo server)
│   ├── constants.ts            # SUBCATEGORIES, rutas base, loaders — SSOT
│   ├── scanner.ts              # Inspección de JARs (adm-zip)
│   ├── watcher.ts              # Observador de descargas (chokidar)
│   └── builder.ts              # Lógica de aplanamiento y exportación
├── docs/
│   ├── mim_documentation.md    # Este archivo
│   └── frontend.md             # Guía de estética frontend
├── tailwind.config.ts
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

### `GET /api/watcher`
Abre un canal SSE. Devuelve eventos `data: JSON\n\n` cada vez que cae un `.jar`/`.zip` en Downloads.

**Evento emitido:**
```json
{ "path": "/home/user/Downloads/alexscaves-1.0.jar", "fileName": "alexscaves-1.0.jar", "meta": { "version": "1.0.0", "loader": "forge" } }
```

### `POST /api/classify`
Mueve físicamente un mod a su categoría de destino en `source/`.

**Body:**
```json
{ "sourcePath": "C:/Users/.../Downloads/mod.jar", "targetCategory": ".essential\\fauna", "version": "1.20.1", "modloader": "forge" }
```

**Validaciones:**
- Campos requeridos presentes.
- `targetCategory` válido según `SUBCATEGORIES` (evita path traversal accidental).
- Archivo fuente existente.

### `POST /api/build`
Dispara el build `alluser`.

**Body:**
```json
{ "version": "1.20.1", "loader": "forge", "projectName": "Netherious Server" }
```

**Validaciones:**
- `loader` debe ser uno de `["forge", "neoforge", "fabric"]`.
- Campos requeridos presentes.

---

## 10. Estética y Diseño Frontend

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

### Skeleton Loader
Replica el patrón de Scrap.io: shimmer sweep + pulse lines + indicador flotante con spinner.

---

## 11. Razonamiento de UX

- **Fricción Cero:** Si MIM detecta que el mod es de una versión diferente al proyecto activo, la tarjeta se pone en rojo y vibra antes de guardarlo.
- **Memoria de Clasificación:** *(Pendiente)* Si clasificás `AlexsCaves.jar` como `bosses`, la próxima versión del mismo mod pre-seleccionará `bosses` automáticamente.
- **Symlinks (Futuro):** Para ahorrar espacio, el perfil activo podría usar symlinks a `source/` en vez de copias físicas. Las copias físicas reales solo ocurren al generar el `.zip` de distribución.
- **Sinytra Connector Flag:** *(Pendiente)* Habilitaría una vista combinada Fabric+Forge para builds híbridos.
