# Arquitectura MIM
> **Versión actualizada:** 2026-05-05 — Multi-Theme Support, Contrast Fixes y FOMO 2.0

Este documento define la estructura del workspace `.mine` y el almacén inteligente basado en categorías estrictas.

## Diseño y Estética (UI/UX)
El frontend utiliza un sistema de **Design Tokens** dinámicos que permite el cambio de temas en tiempo real sin recargar la página.

*   **Theme Orchestration:** Implementado en `theme/tokens.ts` y `globals.css` mediante variables CSS nativas.
*   **Contrast Handling:** Adaptación automática de colores de acento (ej: Gold → Deep Amber en modo Light) para cumplir con estándares de accesibilidad.
*   **FOMO 2.0 Layout:** Sistema de rejilla de 2 columnas con componentes "Theme-Aware" que eliminan el uso de colores estáticos en el código.
*   **Glassmorphism Premium:** Uso extensivo de `backdrop-filter` y sombras complejas para dar profundidad al panel lateral.

## Estructura de Directorios (Workspace)
El workspace `D:\.mine\` organiza todo el ecosistema de MIM:

```
D:\.mine\
├── manager\                # Código fuente de la aplicación (Next.js)
│   ├── app\                 # API routes y páginas
│   ├── components\          # UI organizada por dominio
│   ├── lib\                 # Core logic (scanner, builder, watcher)
│   └── docs\                # Documentación técnica
├── assets\                  # Archivos indiferentes de versión
│   ├── shaders\             # Shaderpacks globales
│   └── schematics\          # Planos de estructuras
├── presets\                 # Configuraciones por versión
│   └── [Versión]\          # configs, options.txt
├── builds\                  # Output de builds generados
│   └── [projectName]\      # alluser.zip, allhost/
└── source\                  # Almacén categorizado por versión
    └── [Versión]\           # Ej: 1.20.1 / 1.21.1
        ├── common\          # Indiferentes de loader
        │   ├── resourcepacks\
        │   └── datapacks\
        ├── forge\
        │   ├── .local\      # Client-side mods
        │   ├── .server\     # Server-side mods
        │   └── .essential\  # Core content mods
        ├── neoforge\       # Misma estructura interna
        └── fabric\         # Misma estructura interna
```

## Descubrimiento Inteligente (FOMO 3.0)
El panel FOMO centraliza el descubrimiento de contenido mediante una arquitectura de filtros avanzados, un diseño de columnas reactivas inteligentes y una navegación multi-capa tridimensional sin solapamientos:

*   **Multi-Faceted Search:** Soporte para filtros combinados (AND/OR) en Modrinth para versiones de juego, modloaders, entornos y categorías.
*   **Aislamiento Estético:** 
    *   **Modrinth:** Estilo moderno, redondeado y con efectos de cristal (Glassmorphism).
    *   **CurseForge:** Estilo "Rústico y Cuadrado" (Retro Minecraft vibe) para diferenciar visualmente el origen de los datos.
*   **Persistencia de Estado:** Las selecciones de usuario se almacenan en `localStorage`, permitiendo que la lista de descarga sobreviva a cambios de vista o recargas.
*   **Environment Awareness:** Los metadatos de proyecto incluyen ahora `client_side` y `server_side`, optimizando la clasificación automática en las carpetas `.local` y `.server`.
*   **Multitarea Coherente y "Glass Gutter":**
    *   **Contracción de Ancho**: Cuando los detalles de un mod se abren en la barra lateral derecha (la cual se expande a `600px`), FOMO se contrae fluidamente a `calc(100vw - 600px - 40px)`.
    *   **Canal Flotante de 40px**: Esta diferencia expone una franja vertical del fondo desenfocado de la aplicación. Al mantener sus esquinas redondeadas (`borderRadius: "0 2rem 2rem 0"`), se crea la ilusión tridimensional de dos paneles flotantes de cristal.
    *   **Restricción Dinámica de Grilla**: Para evitar que las tarjetas colapsen al reducirse el ancho, el sistema fuerza dinámicamente la grilla a exactamente **2 columnas** (en vez de 3) tanto en la vista de Descubrir como en Colecciones.
*   **Gestión de Clicks Mejorada (Fricción Cero):**
    *   **Selección por Tarjeta**: Permite seleccionar mods clickeando en cualquier zona vacía de la tarjeta del mod.
    *   **Detención de Burbujeo**: Los botones de acción (`Detalles`, `Descargar`, `Web`, `Colección`) emplean `e.stopPropagation()` para ejecutar sus operaciones individuales sin disparar ni alterar accidentalmente el estado de selección del mod.

## Motor de Escaneo e Integridad
El `lib/scanner.ts` no solo extrae metadatos JSON; ahora genera un **hash SHA1** único para cada archivo. Esto permite:
- Vincular archivos locales con proyectos de Modrinth/CurseForge con precisión del 100%.
- Detectar actualizaciones reales comparando hashes y versiones.
- Verificar que las descargas no estén corruptas.
- **Base de Seguridad:** El hash se utiliza como identificador único en la base de datos de amenazas conocidas.

## Capa de Seguridad (Threat Detection Engine)
El sistema ahora integra un análisis heurístico de seguridad (`lib/security-scanner.ts`):
1. **Bytecode Analysis:** Escaneo de archivos `.class` sin descompilación completa para detectar:
   - `process_execution`: Uso de `Runtime.exec` o `ProcessBuilder`.
   - `network_call`: Apertura de sockets o conexiones HTTP.
   - `reflection_abuse`: Uso de `setAccessible(true)` para saltar protecciones.
   - `native_code`: Carga de librerías `.dll` o `.so` (JNI).
2. **Risk Scoring:** Cada hallazgo suma puntos a un score de 0-100.
3. **Niveles de Riesgo:**
   - **0-30 (Clean):** Seguro.
   - **31-60 (Caution):** Patrones sospechosos menores.
   - **61-85 (Suspicious):** Alto riesgo, requiere revisión manual.
   - **86-100 (Critical):** Malware detectado o patrones altamente peligrosos.

## Categorización Interna (Subcategorías)

### .local (Client-side / Localside)
| Subcategoría | Contenido típico |
|--------------|------------------|
| animaciones  | Mods de animación de jugador |
| sonidos      | Mods de audio y sonidos |
| rendimiento  | Sodium, OptiFine, etc. |
| qol          | Quality of Life mods |
| particulas   | Efectos visuales |

### .server (Server-side)
| Subcategoría | Contenido típico |
|--------------|------------------|
| estructuras  | Generación de estructuras |
| qol          | QoL para servidores |
| rendimiento  | Mods de optimización server |
| terreno      | Generación de mundo server |

### .essential (Core / Content)
| Subcategoría           | Contenido típico |
|------------------------|------------------|
| fauna                  | Animales, criaturas pasivas |
| hostiles               | Mobs enemigos |
| estructuras y mazmorras | Dungeons, estructuras |
| arsenal                | Armas y herramientas |
| bosses                 | Jefes y combates épicos |
| vanilla + & qol        | Mejoras a vanilla |
| dimensiones            | Nuevas dimensiones |
| progreso y rpg         | Sistemas de progresión |
| comidas                | Alimentos y farming |
| librerias              | Mods de dependencia |
| tecnologia             | Tech mods (Create, etc.) |
| combate avanzado       | Sistemas de combate |

> **Fuente única de verdad:** `lib/constants.ts` → `SUBCATEGORIES`

## Proceso de Build

### alluser (Build para Jugadores)
- **Origen:** `.essential` + `.local` + `common/resourcepacks` + `assets/shaders`
- **Acción:** Aplanar todos `.jar` en `mods/` + copiar recursos
- **Salida:** `builds/[projectName]/[projectName]_alluser.zip`
- **Estado:** ✅ Implementado con verificación anti-server-leak

### allhost (Build para Servidor)
- **Origen:** `.essential` + `.server` + `common/datapacks`
- **Acción:** Aplanar mods + inyectar datapacks en `world/`
- **Salida:** `builds/[projectName]/[projectName]_allhost/`
- **Estado:** ✅ Implementado

## Sistema de Proyectos Persistentes
Los proyectos se guardan en `mim-settings.json`:
```json
{
  "sourceBase": "D:\\.mine\\source",
  "buildsBase": "D:\\.mine\\builds",
  "downloadsPath": "C:\\Users\\...\\Downloads"
}
```

Cada proyecto tiene: `id`, `name`, `version` (1.20.1), `loader` (forge/neoforge/fabric)

## Nota sobre Source Compartido
`source/` es un **almacén único** por versión+loader. Si dos proyectos usan `1.20.1/forge`, comparten el mismo pool de mods — eso es intencional (sin duplicar archivos en disco). El `projectName` diferencia los outputs en `builds/`.

### Futuro: Sinytra Connector Flag
Habilitaría vista combinada `fabric/` + `forge/` para builds híbridos. Pendiente de implementación.

