# MIM – Documentación Consolidada (Maestra)

> **Minecraft Intelligent Manager** — Gestor inteligente de mods, builds y assets para packs de Minecraft.  
> Workspace root: `D:\.mine\`
> Versión Documentación: 2026-05-06 (Beta 5.0)

---

## 📑 Índice

1. [Estructura de Directorios (Source)](#1-estructura-de-directorios-source)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Categorización y Subcategorías](#3-categorización-y-subcategorías)
4. [Lógica de Funcionamiento e Inteligencia](#4-lógica-de-funcionamiento-e-inteligencia)
5. [Proceso de Build (alluser / allhost)](#5-proceso-de-build-alluser--allhost)
6. [Backend: El Motor de Inteligencia (/lib)](#6-backend-el-motor-de-inteligencia-lib)
7. [Frontend: Estética y Componentes](#7-frontend-estética-y-componentes)
8. [Endpoints Clave (API Routes)](#8-endpoints-clave-api-routes)
9. [Security Layer (Threat Detection Engine)](#9-security-layer-threat-detection-engine)
10. [Integraciones Externas (FOMO)](#10-integraciones-externas-fomo)
11. [Razonamiento de UX y Principios](#11-razonamiento-de-ux-y-principios)

---

## 1. Estructura de Directorios (Source)

El núcleo del sistema es la carpeta `source`, donde los archivos se almacenan de forma ultra-categorizada.

```
D:\.mine\
├── manager\                # Código fuente de la aplicación (Next.js)
├── assets\                 # Archivos indiferentes de versión (shaders, schematics)
├── presets\                # Configuraciones (.toml, .json) por versión
├── builds\                 # Output de los builds generados
└── source\                 # Almacén categorizado por versión
    └── [Versión]\          # Ej: 1.20.1 / 1.21.1
        ├── common\         # Independientes del Modloader (resourcepacks, datapacks)
        ├── forge\
        ├── neoforge\
        └── fabric\
            ├── .local\     # Client-side
            ├── .server\    # Server-side
            └── .essential\ # Core / Content
```

---

## 2. Arquitectura del Sistema

MIM utiliza una arquitectura **Event-Driven** y **File-Based** para garantizar que la UI siempre refleje el estado real del disco.

### Componentes de Arquitectura:
1. **Frontend (Next.js 14):** Dashboard reactivo que consume APIs internas.
2. **API Layer:** Endpoints de Next.js que ejecutan lógica de servidor (Node.js).
3. **Core Engine (/lib):**
   - **Watcher (chokidar):** Vigila descargas y emite eventos SSE.
   - **Scanner (adm-zip):** Inspecciona metadatos dentro de los JARs.
   - **Security (bytecode):** Analiza riesgos antes de la clasificación.
   - **Builder:** Orquesta la creación de paquetes finales.

---

## 3. Categorización y Subcategorías

La categorización es jerárquica y estandarizada en `lib/constants.ts`.

### .local (Client-side)
| Subcategoría | Uso |
|--------------|-----|
| animaciones  | Movimientos de jugador, emotes |
| sonidos      | Motores de audio, ambientación |
| rendimiento  | Sodium, Iris, optimizaciones gráficas |
| qol          | Mejoras de interfaz, utilidades cliente |
| particulas   | Efectos visuales mejorados |

### .server (Server-side)
| Subcategoría | Uso |
|--------------|-----|
| estructuras  | Generación de mundo servidor |
| qol          | Utilidades para administración/jugadores |
| rendimiento  | Optimización de ticks, pregen de mapa |
| terreno      | Biomas y terreno técnico |

### .essential (Core / Content)
Categorías que añaden contenido real al juego (animales, armas, magia, tecnología).

---

## 4. Lógica de Funcionamiento e Inteligencia

### Flujo de Ingesta (La Aduana)
1. **Detección:** Watcher detecta archivo en `Downloads`.
2. **Escaneo Automático:** Se extrae versión, loader y se genera hash SHA1.
3. **Validación de Versión:** Si el mod no coincide con el proyecto activo, la UI vibra (`shake`) y se marca en rojo.
4. **Clasificación:** Hotkeys `1`, `2`, `3` disparan el movimiento físico al almacén.

---

## 5. Proceso de Build (alluser / allhost)

### alluser (Cliente)
- **Fusión:** `.essential` + `.local` + `resourcepacks` + `shaders`.
- **Salida:** ZIP plano con carpeta `mods/` unificada.

### allhost (Servidor)
- **Fusión:** `.essential` + `.server` + `datapacks`.
- **Salida:** Carpeta lista para hosting con configuraciones aplicadas.

---

## 6. Backend: El Motor de Inteligencia (/lib)

### JAR Scanner
Inspecciona metadatos sin extraer el archivo:
- **Fabric:** Lee `fabric.mod.json`.
- **Forge/NeoForge:** Lee `META-INF/mods.toml` via regex.

### Watcher (Real-Time)
Usa Server-Sent Events (SSE) para notificar al frontend. Detecta archivos **Nuevos** y **Eliminados** (`unlink`) para mantener la UI sincronizada sin refrescar.

---

## 7. Frontend: Estética y Componentes

### Paleta de Colores (Modern / Vampire)
| Token       | Hex       | Uso |
|-------------|-----------|-----|
| Dark Purple | `#200D2D` | Fondo base |
| Wisteria    | `#BB96E4` | Acentos primarios, bordes |
| Sun Glow    | `#FFD066` | Highlights, hotkeys (Vampire) |
| Cyan Accent | `#06B6D4` | Acento principal en modo Modern |
| Risk Red    | `#EF4444` | Alertas de seguridad o versión |

### Principios de Diseño
- **Glassmorphism:** Capas con `backdrop-blur-md` y transparencias.
- **Escalado:** Fuente base de `17px` (15% mayor) para legibilidad.
- **Micro-interacciones:** Hovers con elevación y sombras de neón sutiles.
- **Skeleton Loaders:** Estados de carga con animación `shimmer` sweep.

---

## 8. Endpoints Clave (API Routes)

- `/api/watcher`: Stream de eventos de archivos.
- `/api/classify`: Mueve archivos al almacén.
- `/api/modrinth/*`: Integración con Modrinth (Actualizaciones, Descargas).
- `/api/curseforge/*`: Integración con CurseForge.
- `/api/security/scan`: Análisis de bytecode.

---

## 9. Security Layer (Threat Detection Engine)

Analiza archivos `.class` para detectar patrones de malware:
- **Process Execution:** `Runtime.exec()`.
- **Network Calls:** Apertura de sockets.
- **Reflection Abuse:** Uso peligroso de `setAccessible`.
- **Native Code:** Carga de `.dll` / `.so`.

**Risk Scoring:** Genera un puntaje 0-100 con insignias visuales (Clean, Caution, Suspicious, Critical).

---

## 10. Integraciones Externas (FOMO)

### FOMO v3.0 (Find Out More, Obviously)
- **Dual-Source:** Alterna entre Modrinth y CurseForge.
- **Sync de Colecciones:** Importa tus colecciones de Modrinth directamente.
- **Layout Glass Gutter:** Redimensionamiento dinámico de sidebars con efecto de vidrio flotante.
- **Cross-Platform Exclusivity Check:** (En Roadmap) Identificador visual de disponibilidad en plataforma contraria.

---

## 11. Razonamiento de UX y Principios

1. **Fricción Cero:** Uso intensivo de Hotkeys para categorización masiva.
2. **Aislamiento:** Proyectos estancos para evitar conflictos entre versiones de Minecraft.
3. **Visibilidad de Datos:** Changelogs integrados en notificaciones para actualizaciones informadas.
4. **Herramientas Concretas:** Priorizamos la utilidad técnica (Diagnosis Engine) sobre asistentes genéricos.

---

## 12. Automatización e Inteligencia de Datos

### Universal Tagging (Modrinth Enrichment)
MIM no solo lee los archivos locales, sino que enriquece la información mediante la API de Modrinth:
- **Hashing SHA1:** Se genera el hash del archivo local para buscar el proyecto exacto.
- **Thematic Tags:** Se recuperan categorías como "Optimization", "Adventure", "Library", etc.
- **UI Integration:** Los tags aparecen como "pills" visuales en las tarjetas de mods (Discovery, Pendientes y Librería).

### Modo "Auto" (Categorización Inteligente)
Sistema de reglas basado en tags temáticos para mover archivos automáticamente:
- **Regla Library:** Tags `library` o `api-and-library` → `.essential\librerias`.
- **Regla Tech:** Tag `technology` → `.essential\tecnologia`.
- **Regla Audio:** Tags `audio` o `sound` → `.local\sonidos`.

### Motor de Compatibilidad Avanzado
Lógica de validación contextual para evitar crasheos:
- **Excepción 1.20.1:** Reconocimiento de interoperabilidad entre Forge y NeoForge exclusivamente para esta versión de Minecraft.
- **Rango de Versiones:** Detección de compatibilidad para versiones terminadas en `+` (ej: `1.20+` es compatible con `1.20.1`).

---
*MIM — Minecraft Intelligent Manager Master Documentation*
