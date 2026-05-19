# Plan de Rediseño: FOMO ModCards (Estilo Galería)

## 🎯 Objetivo
Transformar el diseño actual de las tarjetas de mods en la sección "Descubrir" de MIM (FOMO) para que adopten un formato visual más rico e inmersivo, inspirado en el diseño tipo "Galería" de Modrinth. El cambio debe ser **estrictamente visual (CSS/Estructura HTML)**, manteniendo intactas todas las conexiones de datos, lógica de estado y funcionalidades actuales (botones de descarga, añadir, etc.).

## 🖼️ Análisis Visual (Antes vs. Después)

### Estado Actual (Simple)
- Diseño tipo lista/bloque simple.
- Icono pequeño a la izquierda.
- Título, autor y descargas en texto plano.
- Botones de acción muy prominentes ("Añadir", "Descargar", "Detalles").

### Nuevo Diseño (Estilo Modrinth)
- **Banner Superior (Header):** Imagen de cabecera grande (16:9 aprox) que domina la tarjeta.
- **Perfil Integrado:** Icono del mod superpuesto o justo debajo del banner, acompañado del Título y Autor.
- **Descripción Compacta:** Texto truncado a 2-3 líneas (`line-clamp`).
- **Sistema de Tags (Badges):** Etiquetas visuales para categorías (Server, Utility) y Loaders (Fabric, Forge, NeoForge, Quilt) con colores distintivos.
- **Estadísticas al Pie (Footer):** Fila inferior sutil con iconos para descargas, likes (si la API lo provee) y fecha de actualización.

---

## 🛠️ Plan de Implementación Técnica

### 1. Reestructuración del Componente (DOM)
Sin modificar las props que recibe el componente actual, reestructuraremos el JSX:

```tsx
<article className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-card hover:bg-card-hover transition-colors group">
  {/* 1. Banner Image */}
  <div className="relative aspect-[2/1] w-full bg-black/50 overflow-hidden">
    {/* Imagen de galería o fallback (icono difuminado) */}
  </div>

  {/* 2. Contenido Principal */}
  <div className="p-4 flex flex-col flex-grow">
    {/* 2.1 Header: Icono + Título + Autor */}
    <div className="flex items-start gap-3 mb-2">
      <img src={mod.icon} className="w-12 h-12 rounded-lg object-cover bg-black/20" />
      <div>
        <h3 className="font-bold text-base leading-tight line-clamp-1">{mod.title}</h3>
        <p className="text-xs text-muted">by {mod.author}</p>
      </div>
    </div>

    {/* 2.2 Descripción */}
    <p className="text-sm text-foreground/80 line-clamp-2 mb-3 flex-grow">
      {mod.description}
    </p>

    {/* 2.3 Badges (Categorías y Loaders) */}
    <div className="flex flex-wrap gap-1.5 mb-4">
      {/* Mapeo de mod.categories y mod.loaders a componentes tipo "Pill" */}
    </div>

    {/* 2.4 Footer: Estadísticas y Botones (ocultos o adaptados) */}
    <div className="flex items-center justify-between text-xs text-muted mt-auto pt-3 border-t border-white/5">
      <div className="flex gap-3">
        <span>📥 {formatNumber(mod.downloads)}</span>
        <span>⏱️ {formatDate(mod.updatedAt)}</span>
      </div>
    </div>
  </div>
</article>
```

### 2. Manejo de Imágenes (Fallbacks)
Dado que no todos los mods en FOMO o CurseForge traen una imagen de "Galería" o "Banner" por defecto en la respuesta rápida:
- **Estrategia Principal:** Usar `mod.gallery[0]` o equivalente si existe.
- **Fallback Inteligente:** Si no hay banner, usar el `mod.icon` centrado, y colocar otra copia del `mod.icon` de fondo ampliada al 300% con un filtro `blur-xl` y opacidad reducida para crear un fondo dinámico que combine con los colores del mod.

### 3. Sistema de Badges (Colores Semánticos)
Crear un pequeño mapeo de clases para los loaders más comunes para imitar el aspecto de Modrinth:
- **Fabric:** `bg-amber-900/30 text-amber-200 border-amber-700/50`
- **Forge:** `bg-orange-900/30 text-orange-200 border-orange-700/50`
- **NeoForge:** `bg-yellow-900/30 text-yellow-200 border-yellow-700/50`
- **Quilt:** `bg-purple-900/30 text-purple-200 border-purple-700/50`

### 4. Adaptación de Botones de Acción
El diseño actual tiene botones grandes ("Descargar", "Añadir"). Para mantener la estética limpia del nuevo diseño, propongo:
- **Opción A (Hover State):** Ocultar los botones por defecto y mostrarlos superpuestos sobre la imagen del banner cuando el usuario pasa el mouse por encima de la tarjeta (`group-hover:opacity-100`).
- **Opción B (Footer Integrado):** Convertir los botones en íconos compactos al lado derecho de las estadísticas en el footer.

---

## 🚀 Siguientes Pasos
1. Ubicar el componente exacto que renderiza las tarjetas en `components/fomo/`. (Probablemente un componente llamado `FomoModCard` o dentro de `FomoSpotlightComponents.tsx`).
2. Aislar el CSS/Tailwind actual y reemplazarlo por la nueva estructura flex/grid.
3. Testear con datos reales (con y sin imágenes de galería) para asegurar que nada se rompa.
