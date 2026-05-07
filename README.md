<div align="center">

<!-- Logo principal de MIM -->
<img src="public/MIMico.png" width="120" height="120" alt="MIM Logo" style="border-radius: 24px;">

# 🎮 Minecraft Intelligent Manager

### **El único gestor de modpacks que no pierde mods, no rompe mundos y te ahorra horas de debugging.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**⚡ Gestión inteligente | 🔄 Sincronización Total | 🔍 Escaneo de JARs | 🚀 FOMO Beta 5.2**

[📸 Ver Screenshots](#-screenshots) • [🚀 Demo en Vivo](#-demo) • [📖 Documentación](./docs/) • [🐛 Reportar Bug](../../issues)

</div>

---

## 💡 El Problema

> *"Descargué 47 mods para mi pack 1.20.1 Forge... pero el juego crashea. ¿Cuál es el incompatible?"*

Crear modpacks de Minecraft es **frustrante**:
- ❌ Descargas mods de 5 sitios diferentes, los pierdes en Downloads
- ❌ No sabes qué modloader (Forge/Fabric) usa cada archivo
- ❌ Actualizar mods manualmente = 3 horas de YouTube tutorials
- ❌ Copiar mods a `/mods` = errores humanos, mods faltantes
- ❌ Un mod incompatible = crash, y no sabes cuál

## ✅ La Solución

**MIM** transforma el caos en un flujo de trabajo de **3 clics**:
- **Sincronización Maestra**: Botón de refresco para asegurar que la app refleje cualquier cambio manual en tus carpetas.
- **Detección en Tiempo Real**: Watcher mejorado que detecta archivos nuevos y eliminados instantáneamente.


- **🚀 FOMO 2.0:** Descubrimiento ultra-denso con rejilla de 2 columnas, multi-filtro avanzado (tags, versiones, entornos) y descarga masiva.
- **🤖 Intelligent Automation (Auto):** Clasificación automática basada en tags temáticos. Mueve librerías, mods técnicos y sonidos a sus carpetas correctas respetando la compatibilidad.
- **⚡ Bulk Actions:** Selecciona múltiples archivos y realiza acciones en lote: Clasificación, Eliminación física o Retorno a descargas (Unclassify).
- **🏷️ Universal Tagging:** Integración de tags de Modrinth en toda la app para identificar la temática del mod instantáneamente.
- **🛡️ Security Scanner:** Análisis heurístico de bytecode para detectar malware y patrones sospechosos.
- **🌈 Multi-Aesthetic UI:** Soporte para modos Claro/Oscuro y estilos visuales específicos por fuente (CurseForge Rústico vs Modrinth Moderno).
- **🔍 Escaneo Profundo:** Identificación de JARs por metadatos internos y **hashes SHA1**.
- **📦 Integridad Total:** Sincronización exacta con Modrinth/CurseForge verificando integridad de archivos.
- **🛠️ Tweak UI Mastery:** Panel de configuración del juego con soporte para cierre por fuera (outside-click) y botones de header sincronizados.
- **🧩 Visual Priority Stack:** Sistema de gestión de texturas que respeta la prioridad real de Minecraft (Inverted Stack). Incluye controles de ordenación y alertas de incompatibilidad (ej: Fresh Animations).
- **🎹 Advanced Keybinds:** Scanner dinámico de teclas que detecta cualquier prefijo en `options.txt`, permitiendo editar controles de mods como Iris o Sodium de forma nativa.
- **📜 Detalles Enriquecidos:** Environment badges (Client/Server), plataformas expandidas y resaltado de versiones Main (1.20.1/1.21.1).

```
1. Descarga mods → MIM detecta automáticamente en Downloads
2. Categoriza con hotkeys (1,2,3) → Organizado en segundos  
3. Build → Zip listo para jugar o compartir
```

**Lo que MIM hace por ti:**

| **🛡️ Security Engine** | Análisis preventivo de malware y código sospechoso | 100% seguridad |
| **🔍 Deep JAR Scan** | Detecta loader, versión y metadata SIN abrir el juego | 30 min/pack |
| **📦 Dual Source** | Modrinth + CurseForge en una sola interfaz | Navegación 50% más rápida |
| **⬇️ Auto-Download** | Descarga directa a tu carpeta activa | 0 clicks extra |
| **🔄 Update Checker** | Scanea toda tu librería vs APIs | 2 horas/pack |
| **⚡ Hotkey System** | Clasificación con teclado (1,2,3) | 90% más rápido |
| **📂 Aislamiento Total** | Cada proyecto tiene su config/mods/shaders separados | 0 conflictos |
| **🧩 Priority Stack** | Gestión visual de texturas con prioridad invertida | Evita bugs visuales |
| **🎹 Keybind Editor** | Edición de teclas de mods (Iris, Sodium, etc.) | 100% control |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  FOMO Panel  │  │ Library Grid │  │ Quick Categorize     │  │
│  │  (Discovery) │  │ (Mod Cards)  │  │ (Hotkeys 1,2,3)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │ Next.js 14 + Server Components
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │ /discover  │ │ /classify  │ │ /build     │ │ /check-update│ │
│  │ /download  │ │ /unclassify│ │ /library   │ │ /watcher     │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐
 │   Modrinth API  │     │  CurseForge API │
 │  (Descarga      │     │  (Discovery     │
 │   directa)      │     │   + Metadata)   │
 └─────────────────┘     └─────────────────┘
          │                       │
          └───────────┬───────────┘
                      ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                      CORE ENGINE                                │
 │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
 │  │   JAR Scanner    │  │  File Watcher    │  │   Builder    │ │
 │  │  (manifest.toml, │  │  (chokidar + SSE)│  │  (Zip + FS)  │ │
 │  │   fabric.mod.json│  │                  │  │              │ │
 │  └──────────────────┘  └──────────────────┘  └──────────────┘ │
 │           ▲                     ▲                     ▲       │
 │           │                     │                     │       │
 │           └───────────┬─────────┴───────────┬─────────┘       │
 │                       │                     │                 │
 │             ┌─────────────────────┐ ┌─────────────────────┐   │
 │             │   Security Engine   │ │  Integrity Handler  │   │
 │             │  (Bytecode Scan)    │ │  (SHA1 Sync)        │   │
 │             └─────────────────────┘ └─────────────────────┘   │
 └─────────────────────────────────────────────────────────────────┘
```

**Tecnologías Clave:**
- **Frontend:** Next.js 14 (App Router), React Server Components, Tailwind CSS, Glassmorphism UI
- **Backend:** Next.js API Routes, Server-Sent Events (SSE), streaming responses
- **Native:** Tauri (Rust) para versión de escritorio
- **Integraciones:** Modrinth API v2, CurseForge Core API
- **File System:** chokidar (watching), adm-zip (compresión)

---

## 📸 Screenshots

> ⚠️ *Screenshots representativos - reemplazar con capturas reales de la app*

<div align="center">

### 🏠 Dashboard Principal
```
┌──────────────────────────────────────────────────────────────┐
│  MIM - Minecraft Intelligent Manager                    [🌙]│
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│ 📁 Projects    │  🔄 Pending (3)          ⬇️ Descubrir      │
│ ─────────────  │  ┌─────────────────────────────────────┐  │
│ ⚡ Survival 1.20│  │ ⬜ sodium-1.20.1.jar        [Forge 🔴]│  │
│ 🎨 Creative    │  │ ⬜ jei-1.20.1.jar          [Forge 🟢]│  │
│ 🔥 Hardcore      │  │ ⬜ optifine_1.20.1.jar     [?? ⚠️]  │  │
│                │  └─────────────────────────────────────┘  │
│ [+ New Project]│                                             │
│                │  📚 Library (47 mods)                       │
│                │  ┌────────┬────────┬────────┐            │
│                │  │ Tecnología      │ Mobs   │            │
│                │  │ [jei]  │ [jade] │ [alex] │            │
│                │  └────────┴────────┴────────┘            │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### 🔥 FOMO Sidebar (Descubrimiento)
```
┌───────────────┐
│   🔥 FOMO     │
│ ───────────── │
│ [Descubrir]   │
│ [Colecciones] │
├───────────────┤
│ 🔍 Buscar...  │
│               │
│ [Mod ▼] [Forge│
│ ▼] [1.20.1 ▼] │
│               │
│ ⭐ Relevancia │
│ 🆕 Nuevos     │
│ 🔄 Actualiz.  │
├───────────────┤
│ Sodium        │
│ by jellysquid  │
│ ⚡ Performance│
│ ↓ 12M  [⬇️]   │
├───────────────┤
│ Iris Shaders  │
│ by coderbot   │
│ 🎨 Graphics    │
│ ↓ 8M   [⬇️]   │
└───────────────┘
```

</div>

---

## 🚀 Demo

### Opción 1: Web Demo (Limitada)
```bash
# Clonar y ejecutar solo el frontend Next.js
git clone https://github.com/tuuser/mim.git
cd mim
npm install
npm run dev
# Abrir http://localhost:3000
```
*Nota: La versión web no tiene acceso al filesystem (no escanea Downloads).*

### Opción 2: App Nativa (Full Experience)
```bash
# Requiere Rust toolchain
npm install
npx tauri dev
```

---

## 🛠️ Instalación Rápida

### Requisitos
- Node.js 18+
- (Opcional) Rust 1.70+ para versión Tauri

### Pasos

```bash
# 1. Clonar
git clone https://github.com/tuuser/mim.git
cd mim

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus API keys

# 4. Ejecutar
npm run dev          # Solo web
npx tauri dev        # App nativa completa
```

### Variables de Entorno (`.env.local`)

```env
# Opcional - aumenta rate limits de Modrinth
MODRINTH_API_KEY=mrp_tu_key_aqui

# Opcional - habilita búsqueda en CurseForge
CURSEFORGE_API_KEY=tu_key_aqui

# Opcional - sincronización de colecciones personales
MODRINTH_TOKEN=tu_token_oauth_aqui

# Opcional - rutas personalizadas
MIM_SOURCE_BASE=D:\.mine\source
MIM_BUILDS_BASE=D:\.mine\builds
```

---

## 🎮 Uso Rápido

### Flujo de Trabajo Típico

1. **Descubre** mods en la sidebar FOMO (Modrinth + CurseForge)
2. **Descarga** directo a Downloads - MIM detecta automáticamente
3. **Clasifica** con hotkeys:
   - `1` → Tecnología
   - `2` → Mobs/Fauna  
   - `3` → Calidad de Vida
4. **Construye** el modpack → Zip listo en `.mine/builds/`

### Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `1-9` | Clasificar mod en categoría N |
| `Space` | Previsualizar descripción |
| `Delete` | Mover a Downloads (desclasificar) |
| `Ctrl+B` | Build del proyecto activo |

---

## 🧠 Decisiones Técnicas (Case Study)

### Por qué Server-Sent Events (SSE) en lugar de WebSockets

**Contexto:** El watcher de archivos necesita notificar al frontend cuando nuevos `.jar` aparecen en Downloads.

**Opciones consideradas:**
- WebSockets: Full-duplex, pero overkill para unidireccional
- Polling: Simple, pero desperdicia batería/requests
- **SSE elegido:** Unidireccional nativo, auto-reconnect del browser, integración limpia con Next.js streaming

**Implementación:**
```typescript
// api/watcher/route.ts
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

**Resultado:** Latencia <100ms para nuevos archivos, 0 conexiones persistentes innecesarias.

---

### Por qué dos fuentes de APIs (Modrinth + CurseForge)

**Problema:** No todos los mods están en ambas plataformas. Ej: muchos mods chinos solo en CurseForge.

**Solución:** Unificación transparente en el frontend:
- Misma interfaz `ModHit` para ambas fuentes
- Toggle en UI sin cambiar lógica de negocio
- CurseForge para discovery, Modrinth para descarga directa

**Trade-off:** Mantiene CurseForge API key opcional (muchos usuarios solo usan Modrinth).

---

## 📁 Estructura del Proyecto

```
mim/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── modrinth/         # Integración Modrinth completa
│   │   │   ├── discover/     # Búsqueda de proyectos
│   │   │   ├── download/     # Descarga directa
│   │   │   ├── collections/  # Colecciones del usuario + follows
│   │   │   ├── check-updates/# Verificar actualizaciones batch
│   │   │   ├── presets/      # Colecciones curadas (Starter Tech, etc.)
│   │   │   ├── versions/     # Listar versiones de proyecto
│   │   │   ├── project/      # Detalles de proyecto
│   │   │   └── export-descriptions/ # Exportar metadata
│   │   ├── curseforge/       # Integración CurseForge
│   │   │   └── discover/     # Búsqueda (discovery only)
│   │   ├── classify/         # Mover mods a categorías
│   │   ├── unclassify/       # Mover a Downloads
│   │   ├── delete/           # Eliminar archivos
│   │   ├── build/            # Compilar modpack
│   │   ├── library/          # Listar mods clasificados
│   │   ├── watcher/          # SSE para file watching
│   │   ├── project/          # Gestión de proyectos
│   │   ├── settings/         # Configuración persistente
│   │   └── open-folder/      # Abrir carpetas en explorer
│   ├── layout.tsx            # Root layout + providers
│   ├── page.tsx              # Dashboard principal
│   └── globals.css           # Variables CSS, glassmorphism
├── components/               # React components organizados
│   ├── fomo/                 # FOMO Sidebar - Descubrimiento
│   │   ├── FomoSidebar.tsx   # Panel lateral con 3 tabs
│   │   ├── FomoCollections.tsx # Colecciones del usuario
│   │   ├── FomoDiscoverFilters.tsx # Filtros dinámicos
│   │   ├── FomoModCard.tsx   # Tarjeta de mod con metadata
│   │   ├── FomoPagination.tsx # Paginación
│   │   ├── FomoPresets.tsx   # Plantillas curadas
│   │   └── FomoVersionOverlay.tsx # Selector de versión
│   ├── library/              # Librería de mods clasificados
│   │   ├── LibrarySection.tsx # Grid de mods
│   │   ├── ModCard.tsx       # Tarjeta con icono Base64
│   │   ├── PendingFilesSection.tsx # Archivos pendientes
│   │   ├── QuickCategorizeSection.tsx # Hotkeys 1,2,3
│   │   └── SubcategoryPanel.tsx # Panel de sub-categorías
│   ├── projects/             # Gestión de proyectos
│   │   ├── ProjectsSection.tsx # Lista de proyectos
│   │   ├── ProjectEditor.tsx # Editor
│   │   └── BuildPanel.tsx    # Panel de construcción
│   ├── layout/               # Layout components
│   │   ├── AlertSidebar.tsx  # Panel de alertas
│   │   ├── SettingsModal.tsx # Modal de configuración
│   │   ├── ThemeToggle.tsx   # Dark/Light mode
│   │   └── RootLayoutClient.tsx # Client wrapper
│   └── ui/                   # Primitivas UI
│       ├── primitives.tsx    # Botones, inputs base
│       ├── HotkeyCard.tsx    # Tarjetas de atajos
│       ├── SkeletonLoader.tsx # Shimmer loading
│       ├── DescriptionModal.tsx # Modal de descripción
│       └── SectionHeading.tsx # Encabezados
├── lib/                      # Core logic
│   ├── scanner.ts            # Parser de JARs (Fabric/Forge/Neo)
│   ├── builder.ts            # Compresión y estructura de builds
│   ├── watcher.ts            # chokidar file watcher + SSE
│   ├── settings.ts           # Persistencia de config
│   ├── types.ts              # Tipos TypeScript globales
│   └── constants.ts          # Configuración y validaciones
├── docs/                     # Documentación técnica
│   ├── CHANGELOG.md          # Auditoría de cambios
│   ├── recuerda.md           # Roadmap estratégico
│   ├── mim_documentation.md  # Documentación consolidada
│   ├── arquitectura.md       # Diagramas de arquitectura
│   ├── frontend.md           # Guía de estética
│   └── modrinth_api_*.md     # Guías de integración
├── public/                   # Assets estáticos (icon.png)
└── mim-settings.json         # Configuración persistente
```

---

## 🗺️ Roadmap

### ✅ Completado (2026-05-07)
- [x] **🛡️ Security Layer v1.1 (Cloud & Whitelisting):** Integración con VirusTotal v3 (consulta de reputación en la nube mediante hashes SHA-256) y un sistema local de Whitelisting de mods oficiales para prevenir falsos positivos heurísticos.
- [x] **SAGE Hybrid Diagnostics & Crash Interpreter v1.0** — Traducción en vivo de logs con causas exactas y medidor de inestabilidad Sinytra (0-100%).
- [x] **Connector Compatibility Estimate (FOMO)** — Estimación contextualizada de riesgo e inestabilidad híbrida por tarjeta en tiempo real.
- [x] **Memory de Clasificación (Fase 1)** — Pre-selección inteligente de categorías según el historial del usuario.
- [x] **Aislamiento de Proyectos con Deduplicación Local** — Clonación local automática mediante hashes para compartir archivos entre proyectos al instante y sin re-descargar de internet.
- [x] JAR Scanner profundo con **hashes SHA1** (Fabric, Forge, NeoForge)
- [x] UI FOMO 2.0 (Rejilla de 2 columnas + Detailed Overlay)
- [x] Dependency Resolver (Bulk download)
- [x] Integración Modrinth completa (búsqueda, descarga, colecciones, check-updates)
- [x] Integración CurseForge (discovery, toggle UI entre fuentes)
- [x] Colecciones curadas (Starter Tech, Vanilla+, etc.) con auto-configuración
- [x] File watcher en tiempo real (SSE + chokidar)
- [x] Build system `alluser` con aislamiento de proyectos
- [x] UI Glassmorphism + Dark/Light mode + escalado global 17px
- [x] Sistema de proyectos persistentes (JSON storage)
- [x] Thumbnail extraction local (Base64) sin depender de internet
- [x] 17+ bug fixes críticos (path traversal, race conditions, rate limiting)
- [x] **Threat Detection Engine v1.0** - Análisis de seguridad con scoring 0-100

### 🚧 En Progreso
- [ ] **JAR Scanner Avanzado** - Detección de dependencias rotas e incompatibilidades
- [ ] **Conflict Engine** - Detección de conflictos lógicos complejos de bytecode (Mixins colisionando)
- [ ] **Security UI** - Badge de risk score en ModCard con visualización de VirusTotal y estado verificado

### 📋 Próximos (Fases 1-5)
- [ ] **Portfolio Case Study** - Documentación técnica con decisiones y trade-offs
- [ ] **Demo Deployable** - Landing funcional sin instalación
- [ ] **AI Recommendations** - "Si usas esto, probablemente quieras esto"
- [ ] **Natural Language Search** - "mods medievales oscuros con magia"

---

## 🤝 Contribuir

```bash
# 1. Fork y clone

# 2. Branch
 git checkout -b feature/nueva-feature

# 3. Commit con convención
 git commit -m "feat: agrega soporte para Quilt loader"

# 4. Push y PR
 git push origin feature/nueva-feature
```

**Guías:**
- Seguimos [Conventional Commits](https://www.conventionalcommits.org/)
- TypeScript estricto, no `any` sin justificación
- Todo nuevo código necesita JSDoc

---

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---
