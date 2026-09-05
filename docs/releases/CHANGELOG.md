
# MIM — Changelog Maestro de Cambios

> Auditoría completa de cambios, features y mejoras de Minecraft Intelligent Manager.  
> **Versión Actual:** v11.4.0  
> **Estado:** Beta activa — los números de versión reflejan hitos de features, no madurez de producción.  
> **Última actualización:** 2026-09-05

> [!NOTE]
> **Nota sobre el versionado:** Este proyecto es desarrollado por un solo dev. Los números de versión altos (v10.x/v11.x) reflejan iteraciones de features, no una escala de madurez equivalente a software empresarial. Para el estado real de calidad técnica (tests, deuda conocida, áreas en trabajo), ver [PROJECT_STATUS.md](./PROJECT_STATUS.md).

---

## 🚀 Versión 11.3.0 — Mandatory withApiGuard Universal Defense & Modular Architecture (2026-09-04)

### 🛡️ Universal Perimeter Defense (`withApiGuard`)
- **100% de Rutas Críticas Blindadas**: 40 de 40 endpoints públicos y externos (14 MIMweb + 26 Desktop) protegidos con `withApiGuard`, rate limiting por IP, cabeceras de seguridad y validación Zod estricta (Modrinth, CurseForge, YouTube, Bedrock y SAGE).
- **Auditor Automatizado en CI (`lint:api-guard`)**: Herramienta de escaneo estricto integrada en GitHub Actions (`.github/workflows/ci.yml`) y en `test-runner.js` que falla el build automáticamente si cualquier ruta pública o de APIs externas no implementa `withApiGuard`.
- **Soporte Dinámico de Parámetros de Ruta**: Extensión de `withApiGuard` con `paramsSchema` y `RouteContext` para validar rutas dinámicas (e.g. `picks/[slug]`) con total compatibilidad con Next.js 15+.

### 🧩 Modularización de Código & Regla de < 600 Líneas
- **Modularización de ProfileTab**: Reducción de `ProfileTab.tsx` de 1,310 líneas a 283 líneas maestras orquestando 12 submódulos dedicados en `web/components/profile/`.
- **Modularización de SageMimbotCopilot**: Reducción de 609 líneas a 478 líneas extrayendo subcomponentes en `components/sage/parts/mimbot/` (`MimbotConfigModal`, `MimbotMessageBubble`, `MimbotQuickQuestions`).
- **UX MIM-Bot Mejorada**: Botón de copiado en 1 clic de respuestas con feedback visual, 4.5s de Undo ante reseteo accidental de conversación, desacoplamiento de errores 429 de cuota, y truncado contextual automático a los últimos 6 turnos.

### 🧪 Verificación de Sistemas & Calidad
- **13/13 Suites de Pruebas Pasando al 100%**: Incorporado el auditor perimetral al runner unificado (`npm test`) con 0 regresiones.
- **Tipado Estricto Verificado**: Cero errores de compilación TypeScript en raíz y MIMweb.

---

## 🚀 Versión 10.5.1 — MIM-Bot Bully Intelligence & CI Type Hardening (2026-09-03)

### 🤖 MIM-Bot: Bully Gamer Persona & Mini-Chat On-Demand
- **Personalidad Bully Auténtica**: Transformación de MIM-Bot en un asistente ácido, condescendiente y burlón que roastea tostadoras y preguntas novatas, garantizando al mismo tiempo un 100% de precisión técnica en compatibilidad, loaders y mecánicas de mods.
- **Identidad Visual Slime Animada**: Reemplazo de emojis de rayo (`⚡`) e iconos de chispas por el favicon animado saltarín (`.animate-slime` con `@keyframes slime-squish`) en botones pill de activación, banners de análisis y burbujas de respuesta en el chat interactivo.
- **Resiliencia & Fallback Offline**: Cascada de modelos (Gemini 2.5 Flash -> 2.0 Flash -> 1.5 Flash) con generación heurística local en caso de cuota agotada (HTTP 429), manteniendo la misma personalidad incisiva sin degradar la UI.

### 🛠️ Corrección de Tipos Estrictos (Vercel & GitHub Actions CI)
- **Paridad en Contratos `ModHit`**: Incorporación de campos opcionales `slug?: string` y `loaders?: string[]` en `web/components/SpotlightMarquees.tsx` y `lib/core/types.ts`, eliminando errores de compilación `TS2339`.
- **Compatibilidad Web Crypto API**: Corrección de tipos en `lib/vault/vaultEngine.ts` (raíz y subproyecto web) para compatibilidad con TypeScript 5+ (`salt as BufferSource`, `iv as BufferSource`, `ciphertextBytes as BufferSource` y `bufferToHex` polimórfico para `ArrayBuffer | Uint8Array`).
- **Configuración de Audio Web**: Extensión de `FomoSoundKind` en `web/lib/sounds.ts` para admitir `"pop"` y `"sparkle"`.

---

## 🚀 Versión 10.5.0 — Systems Engineering Finalization & Scope Freeze (2026-09-03)

### 🧠 SAGE 2.0 Forensics & RAG Hardening
- **Corpus Canónico de Evaluación**: Suite automatizada con 125 casos reales logrando 100% Macro F1, 84% Top-1 mod culpable y 0.05ms de latencia media por log.
- **Recuperación Semántica (RAG) & Guardrails**: Integración de base de conocimiento de compatibilidad con similitud de tokens y restricciones matemáticas contra alucinaciones de LLMs.
- **Fronteras Operativas y Non-Goals**: Declaración explícita de límites arquitectónicos sin ejecución dinámica de bytecode riesgoso.

### ⚡ Motor Aduana Multi-Escala
- **Benchmarks Empíricos**: Hashing verificado de 2,083.9 MB/s (SHA-1) y 940.3 MB/s (SHA-512) con aceleración de caché de 8.0x a 8.5x escalando de 1k a 25k archivos.

### 🌐 Sistemas Distribuidos & Resiliencia
- **Last-Write-Wins (LWW) Calibrado**: Resolución determinista con timestamps ISO 8601 y desempate por UUID de cliente, eliminando locks distribuidos pesados.
- **Offline-First & Idempotencia**: Cola transaccional FIFO en IndexedDB con replays idempotentes (`UUIDv5`) y rollback optimista de UI ante rechazos de RLS.

### 🛡️ Seguridad & Recuperación Binaria NBT
- **Análisis Estático de Amenazas en Bytecode**: Detección sin ejecución de droppers, evasión por reflexión y librerías nativas JNI no administradas.
- **Invariante de Cero Pérdida de Datos**: Recuperación quirúrgica NBT v19133 con backup verificado y escritura atómica (12/12 integration tests passing).

### 📚 Documentación Bilingüe & Standalone Release
- **Paridad de Idiomas**: Documentación técnica integral disponible en inglés (`README.md`) y español (`README.es.md`).
- **Release Empaquetado**: Distribución standalone completa para Windows en instalador NSIS y binario portable.

---

## 🚀 Versión 10.4.0 — Suite Ecosistema Unificada & MIMweb Mobile (2026-05-30)

### 🖥️ Desktop & Web
- **MIM Desktop (Electron 42)**: Runtime nativo de escritorio con backend Next.js Standalone y empaquetado optimizado para Windows.
- **MIMweb (FOMO Hub)**: Aplicación web mobile-first con curación remota de drafts y reproductor adaptativo.
- **Showcases & Spotlight**: Fallback robusto a YouTube ante bloqueos de red y aislamiento de fallas de media.

---

## 🚀 Versión 10.2.2 — FOMO Dependency & API Hardening (2026-05-26)

### 📦 Gestión de Dependencias (yt-dlp)
- **Instalador Integrado**: Implementación de un gestor de binarios independiente (`lib/ytdlp/updater.ts`) que actualiza `yt-dlp` directamente desde los releases de GitHub para garantizar la estabilidad de los showcases.
- **Tools UI**: Añadida nueva pestaña de "Herramientas" en el modal de Settings para auditar y actualizar dependencias externas con un solo clic.

### 🛂 Aduana Centralizada (Deduplicación)
- **Módulo Compartido**: Unificación de la lógica de "Aduana" (`lib/fomo/aduana.ts`) para evitar descargas redundantes. Ahora tanto Modrinth como CurseForge comparten el mismo escaneo rápido por hash (SHA1/SHA512).
- **Copias Locales Dinámicas**: Si un mod ya existe en la librería global (`sourceBase`), la Aduana cancela la conexión HTTP y hace una copia en milisegundos hacia la carpeta de descargas del usuario, tolerando cambios dinámicos de rutas.

### 🌐 Paridad de APIs (Slugs en CurseForge)
- **Traductor Inteligente de Slugs**: Modificadas las rutas de CurseForge (`project`, `versions`, `mod-gallery`) para soportar búsquedas por `slug`. Si se provee un texto en lugar de un ID numérico, MIM consulta a escondidas la API de búsqueda de CurseForge, recupera el ID numérico y procesa la petición de manera transparente, logrando paridad total con la API nativa de Modrinth.
- **Gallery Fixes**: Mapeo arreglado del campo `icon_url` en la API de Modrinth para prevenir la falta de íconos en los proyectos de FOMO.

---

## 🚀 Versión 9.6.0 — SAGE Sandboxing, NBT Inline & TWEAK Overrides (2026-05-23)

### 🛡️ SAGE Player Rescue & NBT Editing
- **Sandboxing Estricto de Mundos**: Reestructuración del flujo de selección (2 pasos) para garantizar que los archivos `.dat` de jugadores estén estrictamente contextualizados y vinculados a su mundo origen, evitando colisiones inter-mundos.
- **NBT Inline Editing**: Eliminación de modales superpuestos en favor de una edición directa (`inline`) dentro del árbol de NBT. Los administradores pueden editar valores, tipos y eliminar claves directamente desde los nodos del inventario.
- **Crash Fixes**: Resolución del crash de React (`NaN`) al castear de forma segura los NBT Bytes de los slots del inventario.

### ⚙️ TWEAK Resource Pack Overrides
- **Forzado de Packs Incompatibles**: Al compilar y guardar el orden de los Resource Packs en `options.txt`, MIM ahora registra automáticamente la lista exacta en el array `incompatibleResourcePacks`. Esto bypassa la seguridad de Vanilla y previene que Minecraft desactive texturas por formato antiguo.
- **Layout y Drag & Drop**: Renovación de la vista de Packs Disponibles (Librería Global) a un grid de 2 columnas, y adición de lógica de "arrastrar hacia fuera" (Drag to Deactivate) desde la vista modal ampliada.

### 🎨 UI & Rendering
- **3D Profile Canvas (Skinview3d)**: Reescalado y optimización del render 3D del perfil del usuario en el `LayoutHeader` con desbordamiento (`overflow`) controlado, logrando un avatar más inmersivo sin expandir las dimensiones verticales de la barra superior.
- **Corrección Minotar API**: Ajuste del endpoint de extracción de skins (de `/skins/` a `/skin/`) para prevenir fallos críticos y cuelgues del motor WebGL.

---

## 🚀 Versión 9.3.0 — Arquitectura Modular & FOMO Cloud Premium UX (2026-05-21)

### 🏛️ Reorganización de Directorios (Modularización Completa)
- **Frontend Categorizado**: Agrupación de todos los componentes en `components/fomo/` en subcarpetas cohesivas por dominio funcional:
  - `community/` — perfiles, clubs, favoritos y pool comunitario online.
  - `discover/` — buscador de proyectos y tarjetas visuales unificadas.
  - `showcase/` — reproductor flotante PiP y tarjetas de video.
  - `collections/` — importador de colecciones de Modrinth.
  - `followed/` — listados de autores y creadores seguidos.
  - `spotlight/` — destacados y marquesinas de novedades en caliente.
  - `sidebar/` — contenedor de barra lateral y navegación.
  - `core/` — skeletons, layouts comunes y CSS global de FOMO.
- **Core Lib Modularizado**: Segmentación de los módulos lógicos sueltos en `lib/` en carpetas especializadas de control:
  - `lib/fomo/` — lógica de perfil, clubs, normalización de banners y navegaciones.
  - `lib/modding/` — escáner técnico profundo, builder, validador y cola de descargas.
  - `lib/storage/` — motores de persistencia asíncronos y IndexedDB.
  - `lib/events/` — Event Bus centralizado y depurador interactivo.
  - `lib/intelligence/` — motor SAGE, incidente core y correlation engine.
  - `lib/security/` — escaneo de bytecode local y datos Whitelist.
  - `lib/core/` — tipos transversales, constantes y supabaseClient.

### 🎨 FOMO Cloud — Rediseño Premium e Interactivo
- **Liquid Glass sub-navigation**: Implementación de una barra de navegación interna con píldoras de desplazamiento fluido y escala elástica al alternar entre tabs (Pool ➔ Showcases ➔ Clubs).
- **Immersive Header Background**: Desenfoques masivos de cristal (`backdrop-blur-3xl`) acompañados por gradientes radiales interactivos calculados según el color de perfil activo del usuario.
- **Upgraded Card Layouts**: Elevación tridimensional activa en el eje Z al hacer hover sobre las tarjetas de la comunidad, con sombras internas profundas y bordes semi-transparentes de vidrio.
- **Drafts Colaborativos (Supabase Realtime)**: Sistema de creación de modpacks colaborativo que permite a múltiples usuarios compartir, proponer y votar modificaciones de manera asíncrona, finalizando en "Snapshots" consolidables.

### 📺 Showcases — Estrategia y Resiliencia en Video
- **Showcases como Canal de Descubrimiento**: Filosofía de diseño que reposiciona la reproducción de video como una característica secundaria de conveniencia, evitando catalogar a MIM como un "ad-free YouTube alternative".
- **Graceful Fallbacks**: Inclusión de botones directos de acción **"Abrir en YouTube"** en las tarjetas de showcases para garantizar que la app siga siendo 100% útil si la API de extracción local de `yt-dlp` sufre bloqueos externos.

### 🛠️ Corrección de Imports & Turbopack Resolvers
- **UI Primitives Fix**: Corrección definitiva del error `Module not found: Can't resolve '../ui/primitives'` re-mapeando imports relativos a la ruta absoluta unificada `@/components/ui/primitives`.
- **Database Import Fix**: Resolución del error de carga en `lib/storage/indexeddb.ts` re-enrutando las dependencias de la base de datos local hacia `@/lib/db/...`.

---

## 🚀 Versión 9.2.0 — Asynchronous Storage Architecture (2026-05-20)

### Optimización de Persistencia
- **Migración a IndexedDB**: Reemplazo completo de persistencia síncrona en `localStorage` por la base de datos IndexedDB (`mimDB`) para datos pesados de FOMO.
- **Auto-Migration**: Migración fluida y en segundo plano de datos antiguos hacia IndexedDB con limpieza automática.
- **Showcase Native Player**: Reproductor flotante PiP con barra de progreso de triple capa y volumen analógico.
- **Thumbnail Auto-Healing**: Secuencia de recuperación para corregir imágenes rotas de YouTube en videos.

---

## 🚀 Versión 9.1.2 — FOMO Cloud — UX & Plataforma (2026-05-21)

### Ajustes de Comunidad
- **Modal de Detalle de Clubs**: Renderizado vía portal para evitar problemas de solapamiento. Cierre por tecla `Escape` y bloqueo de scroll de fondo.
- **Pestaña Modpacks**: Retirada temporal de la UI pública para centrar la experiencia en compartir mods y autores.

---

## 🚀 Versión 9.0.0 — FOMO Cloud Online y Social Discovery (2026-05-20)

### Capa Social
- **Autenticación Supabase**: Conexión con Supabase para perfiles comunitarios públicos (`profiles.club_data`).
- **Rankings**: Endpoint `/api/fomo/community-rankings` para ordenar mods preferidos por la comunidad.

---

## 🚀 Beta 5.9 — Architecture & Code Consolidation (2026-05-14)

### Consolidación
- **Bytecode Conflict Engine**: Análisis de colisiones de Mixin y access transformers previos a la ejecución.
- **Modularización de Page.tsx**: Extracción de componentes DOM masivos a portales.

---

*Minecraft Intelligent Manager — Hecho con ganas para la MI.*
