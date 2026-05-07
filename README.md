<div align="center">

<!-- Logo principal de MIM -->
<img src="public/icon.png" width="120" height="120" alt="MIM Logo" style="border-radius: 24px;">

# 🎮 Minecraft Intelligent Manager

### **El único gestor de modpacks que no pierde mods, no rompe mundos y te ahorra horas de debugging.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**⚡ Gestión inteligente | 🔄 Sincronización Total | 🔍 Escaneo de JARs | 🚀 FOMO Beta 5.2**

[📖 Documentación](./docs/) • [🗺️ Roadmap](./ROADMAP.md) • [📝 Changelog](./CHANGELOG.md) • [🔧 API](./API.md) • [🏗️ Arquitectura](./MIM.md)

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

```bash
1. Descarga mods → MIM detecta automáticamente en Downloads
2. Categoriza con hotkeys (1,2,3) → Organizado en segundos  
3. Build → Zip listo para jugar o compartir
```

### ✨ Features Destacadas

| Feature | Descripción | Impacto |
|---------|-------------|---------|
| **🚀 FOMO 3.0** | Descubrimiento ultra-denso con Modrinth + CurseForge | Navegación 50% más rápida |
| **🤖 Modo Auto** | Clasificación automática basada en tags temáticos | 90% menos clicks |
| **🛡️ Security Scanner** | Análisis de bytecode + VirusTotal + Alertas unificadas | 100% protección |
| **🧠 SAGE Engine** | Diagnóstico de crashes, soporte de `.mcmeta` y rescate de jugadores (`UUID.dat` editor) | Corrección instantánea de fallos |
| **🔔 ALRT Center** | Centro unificado de alertas en tiempo real (seguridad, crashes y configuración) | Campaneo rítmico inteligente (`seen/unseen`) |
| **⚡ Bulk Actions** | Selección y acciones en lote | 10x más rápido |
| **🔌 Sinytra Support** | Mods Fabric en proyectos Forge | Expande tu biblioteca |
| **🎹 Keybind Editor** | Edita controles de mods (Iris, Sodium y Key binds dinámicos) | Control total sin entrar al juego |
| **🧩 Priority Stack** | Ordenación y control visual de resource packs (Reglas de Fresh Animations) | Evita bugs visuales al instante |

---

## 🚀 Instalación Rápida

### Requisitos
- Node.js 18+
- (Opcional) Rust 1.70+ para versión Tauri nativa

### Pasos

```bash
# 1. Clonar
git clone https://github.com/tuuser/mim.git
cd mim

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (opcional)
cp .env.example .env.local
# Editar .env.local con tus API keys si las tienes

# 4. Ejecutar
npm run dev          # Versión web (limitada)
npx tauri dev        # App nativa completa (recomendada)
```

### Variables de Entorno (`.env.local`) - Todas Opcionales

```env
# Modrinth - aumenta rate limits
MODRINTH_API_KEY=mrp_tu_key_aqui

# CurseForge - habilita búsqueda adicional
CURSEFORGE_API_KEY=tu_key_aqui

# VirusTotal - verificación de seguridad
VIRUSTOTAL_API_KEY=tu_key_aqui

# Rutas personalizadas
MIM_SOURCE_BASE=D:\.mine\source
MIM_BUILDS_BASE=D:\.mine\builds
```

---

## 🎮 Guía Rápida de Uso

### Flujo de Trabajo Típico

1. **Descubre** mods en la sidebar FOMO (🔥 botón)
   - Alterna entre Modrinth y CurseForge
   - Filtra por versión, loader, categorías
   - Descarga directa a tu carpeta

2. **Clasifica** automáticamente o con hotkeys:
   | Tecla | Categoría |
   |-------|-----------|
   | `1` | Tecnología |
   | `2` | Fauna/Mobs |
   | `3` | Calidad de Vida |
   | `Delete` | Volver a Downloads |

3. **Construye** el modpack:
   - Click en "Build Project" (o `Ctrl+B`)
   - ZIP listo en `.mine/builds/`
   - Copia a tu `.minecraft/mods`

### Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `1-9` | Clasificar en categoría N |
| `Space` | Ver descripción del mod |
| `Delete` | Desclasificar (volver a Downloads) |
| `Ctrl+B` | Build del proyecto activo |
| `F` | Abrir/cerrar FOMO |

---

## 📁 Estructura del Workspace

MIM organiza tus archivos en `D:\.mine\` (o tu ruta configurada):

```bash
D:\.mine\
├── source\                    # Almacén de mods categorizados
│   └── 1.20.1\               # Por versión de Minecraft
│       ├── forge\.essential\  # Mods esenciales
│       │   ├── tecnologia\    # Create, Mekanism...
│       │   ├── fauna\        # Alex's Mobs...
│       │   └── librerias\    # APIs y dependencias
│       ├── forge\.local\     # Client-side
│       │   ├── rendimiento\   # Sodium, Iris...
│       │   └── sonidos\      # Ambientación
│       └── common\           # Resource packs, shaders
├── builds\                    # Output de builds
├── presets\                   # Configuraciones por versión
└── manager\                   # Código de la app
```

---

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [CHANGELOG.md](./CHANGELOG.md) | Historial completo de cambios y mejoras |
| [ROADMAP.md](./ROADMAP.md) | Logros alcanzados y features futuras |
| [API.md](./API.md) | Integraciones con Modrinth, CurseForge, VirusTotal |
| [MIM.md](./MIM.md) | Arquitectura técnica completa |
| [docs/](./docs/) | Documentación técnica adicional |

---

## 🛡️ Seguridad

MIM implementa **3 capas de seguridad**:

1. **Bytecode Analysis (Local)** - Detecta patrones sospechosos
2. **Whitelist (Local)** - Mods populares verificados
3. **VirusTotal (Cloud)** - Verificación de reputación vía hash

**Risk Score:** 0-100 con badges visuales (🟢🟡🟠🔴)

---

## 🗺️ Roadmap

### ✅ Completado (Beta 5.3)
- **ALRT Unified Center**: Centro unificado de alertas con campaneo continuo e indicador inteligente (`seen/unseen`).
- **SAGE Player Rescue**: Edición local de archivos `.dat` (inventario, spawn, posición) para rescatar jugadores con crashes.
- **SAGE .mcmeta Reader**: Soporte nativo para escaneo y lectura de metadatos de resource packs.
- **Tweak Keybind Editor**: Lector dinámico de controles de mods directamente desde `options.txt`.
- **Tweak Resource Pack Priority Stack**: Ordenamiento invertido visual y regla automática de validación para **Fresh Animations**.
- Security Layer con VirusTotal.
- SAGE Crash Diagnostics.
- Sinytra Connector Support.
- Auto-clasificación por tags y Bulk Actions.
- FOMO 3.0 con CurseForge y alineación pixel-perfect.
- Virtual scrolling (700+ mods).

### 🚧 En Progreso
- Conflict Detection Engine.
- Auto-Optimization de Java Args.

### 📋 Próximo
- AI Recommendations con análisis semántico.
- Natural Language Search.
- Demo Deployable.

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

*Hecho con ⚡ por desarrolladores de modpacks, para desarrolladores de modpacks.*
