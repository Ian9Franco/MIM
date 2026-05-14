<div align="center">

<!-- Logo principal de MIM -->
<img src="public/icon.png" width="120" height="120" alt="MIM Logo" style="border-radius: 24px;">

# 🎮 Minecraft Intelligent Manager

### **El único gestor de modpacks que no pierde mods, no rompe mundos y te ahorra horas de debugging.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**⚡ Gestión inteligente | 🔄 Sincronización Total | 🔍 Escaneo de- **Version**: Beta 5.8
**

[📖 Documentación](./docs/) • [🗺️ Roadmap](./ROADMAP.md) • [📝](./CHANGELOG.md) • [🔧 API](./API.md) • [🏗️ Arquitectura](./MIM.md)

</div>

---

## 💡 El Problema

> “Descargué 47 mods para mi pack de Minecraft 1.20.1 Forge… ahora crashea como si hubiera invocado a Satanás. ¿Cuál fue el mod culpable? ¿Cuál se actualizó? ¿Por qué las texturas se ven bugeadas?”

Crear modpacks debería ser divertido.  
En la práctica, parece una relación tóxica con la carpeta Downloads.

- ❌ Descargas mods desde 5 lugares distintos y terminan perdidos en el limbo de Descargas
- ❌ No sabes si ese `.jar` es para Forge, Fabric, Quilt o fue escrito por un chamán
- ❌ Actualizar mods manualmente = 3 horas de tutoriales dudosos en YouTube 
- ❌ Copiar archivos a `/mods` a mano = errores, versiones cruzadas, arrepentimiento y duplicados
- ❌ Un solo mod incompatible = crash. Y Minecraft te responde con un poema satánico en logs
- ❌ Tus texturas se ven rotas, parpadean o se traslapan porque tus Resource Packs se están cargando en el orden incorrecto

## ✅ La Solución

MIM convierte ese caos hermoso en un flujo de trabajo limpio, rápido y sin rituales oscuros.

En **3 clics**:
1. **Descargas mods** ➔ MIM los detecta automáticamente en Downloads
2. **Clasificas con hotkeys (1,2,3)** ➔ orden en segundos
3. **Build** ➔ ZIP listo para jugar, compartir o presumir

### 🔧 Tweak Control: Adiós a los ojos flotantes
¿Cansado de ver que tus aldeanos tienen los ojos flotando a tres bloques de distancia por culpa de un pack mal ordenado? 
MIM incluye un gestor interactivo de **Resource Packs y Shaders**:
* **Prioridad Real Visual**: Invierte e interactúa con el orden visual de tus texturas con un sistema de prioridad idéntico al de Minecraft, directamente desde la barra lateral.
* **Validación de Fresh Animations**: Detecta automáticamente dependencias visuales críticas y te recomienda el orden perfecto para evitar colisiones y fallos gráficos al instante.

Menos tiempo peleando con `.jar` y configuraciones.  
Más tiempo jugando. Como debería ser.

### ✨ Features que realmente importan

| Feature | Qué hace | Impacto real |
|:---|:---|:---|
| **🚀 FOMO 3.0** | Descubrimiento ultra-denso con Modrinth + CurseForge en una sola vista | Navegación hasta 50% más rápida |
| **✨ Spotlight Feed** | Exhibición curada en tiempo real de novedades, selecciones de la comunidad (Community Picks) y proyectos virales tanto de Modrinth como de CurseForge | Descubre tendencias y joyas ocultas al instante sin salir del gestor |
| **👥 Seguidos (Following)** | Seguimiento dedicado de creadores y proyectos con lupa de búsqueda híbrida (`author:` y `project:`) para comparar al instante versiones y plataformas en un catálogo combinado ("Ambos") | Detecta discrepancias de versión entre plataformas y unifica lanzamientos en un solo display |
| **📚 Collections Update** | Sincronización de colecciones de Modrinth con plantillas pre-armadas | Organiza tus mods en colecciones compartibles |
| **🔍 Modpack Search** | Búsqueda de modpacks con visualización de mods incluidos y dependencias | Analiza modpacks completos antes de descargar |
| **🤖 Modo Auto v2** | Clasificación jerárquica estricta: `Entorno > Tipo > Tags` | 95% menos clicks y organización impecable garantizada |
| **💾 Persistent Metadata** | Almacenamiento IndexedDB para identificar mods por hash (SHA1) | Evita re-escaneos y mantiene el contexto del entorno (Client/Server) |
| **🛡️ Security Scanner** | Bytecode analysis + VirusTotal + alertas centralizadas | Seguridad real, no “trust me bro” |
| **🧠 SAGE Engine** | Diagnóstico de crashes, soporte `.mcmeta` y rescate de jugadores (`UUID.dat`) | Detecta y corrige fallos antes del rage quit |
| **🔔 ALRT Center** | Centro unificado de alertas de seguridad, crashes y config | Todo lo importante en un solo lugar |
| **⚡ Bulk Actions** | Selección masiva y acciones en lote | 10x más rápido, 100x menos sufrimiento |
| **🔌 Sinytra Support** | Compatibilidad Fabric ➔ Forge | Tu biblioteca deja de tener fronteras |
| **🎹 Keybind Editor** | Edita controles de mods sin abrir Minecraft | Control total, cero menús infernales |
| **🔧 Priority Stack** | Orden visual de resource packs y reglas tipo **Fresh Animations** | Evita bugs visuales y packs peleándose como primos en Navidad |
| **⚙️ TWEAK Optimizer** | Perfiles automáticos de rendimiento y tuning heurístico de JVM args según hardware detectado | Maximiza FPS y estabilidad sin tocar configuraciones manuales complejas |

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

### ✅ Completado (Beta 5.7)
- **Real Metadata Persistence**: Almacenamiento en IndexedDB de entidades completas por mod (ID, versión, entorno) usando el hash SHA1 como clave única.
- **Priority Classification System**: Motor de clasificación jerárquica estricta que prioriza el entorno (Client/Server) y el tipo (Library/Mod) sobre los tags semánticos.
- **Environment-Aware UI**: Badges distintivos (🖥️ CLIENT, ☁️ SERVER, 🌐 BOTH) en cada ModCard con hidratación asíncrona desde la base de datos local.

### ✅ Completado (Beta 5.6)
- **Spotlight Feed & Project Followers**: Exhibición curada de novedades y seguimiento de creadores con búsqueda híbrida entre plataformas.
- **Collections & Modpack Dependencies**: Sincronización de colecciones de Modrinth y caché local de dependencias internas de CurseForge.
- **Stock Ticker & Contraste Maestro**: Marquesina autodesplazable superior y tokens semánticos de contraste.
- **Rule-Based Optimization Engine**: Sistema inteligente de optimización de recursos, perfiles automáticos y sugerencias de JVM args según hardware.
- **Tailwind CSS v4 Native Migration**: Adopción de la nueva escala simplificada, remoción de clases de corchetes arbitrarios (`z-100`, `w-100`/`w-400`, `max-w-400`) y migración a gradientes modernos nativos (`bg-linear-to-r`).
- **SAGE Recovery Engine**: Motor de recuperación interactiva de 1-clic ante crashes de Minecraft, integrando descargas de dependencias con FOMO y edición de perfiles de jugador `.dat` con backups automáticos.
- **Static Bytecode Audit & Security Modals**: Modal premium que detalla llamadas de sistema sospechosas (`ProcessBuilder`, sockets de red, reflexiones JNI), VirusTotal y Whitelisting local.
- **MIM Event Bus & Debugger UI**: Bus asíncrono tipado y agrupado por lotes a 60fps con un panel visual interactivo de monitorización del sistema en vivo.
- **ALRT Unified Center & Incident Correlation**: Capa centralizada de alertas e incidentes compuestos que asocia eventos cruzados (ej. descarga + falta de dependencias) con campaneo rítmico inteligente.
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
- Conflict Detection Engine (Análisis estático de Mixins).

### 📋 Próximo
- Intelligent Pack Validation & Build Gate (Mod Packaging Assistant repensado).
- Showcase Demo Deployable.

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
