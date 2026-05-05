# MIM – Guía de Estética Frontend
> **Versión actualizada:** 2026-05-05 — Glassmorphism, FOMO UI 2.0 (High Density), Security Badges

## Paleta de Colores

| Token       | Hex       | Tailwind custom token | Uso |
|-------------|-----------|-----------------------|-----|
| Dark Purple | `#200D2D` | `bg-dark-purple`      | Fondo base, sidebar |
| Wisteria    | `#BB96E4` | `text-wisteria`       | Acentos primarios, bordes |
| Sun Glow    | `#FFD066` | `text-sun-glow`       | Highlights, badges, hotkeys |
| Forge Orange| `#E6A15C` | N/A (inline)          | Indicador Forge (FOMO toggle) |
| CF Orange   | `#F16436` | N/A (inline)          | Indicador CurseForge |
| Risk Red    | `#EF4444` | N/A (inline)          | Alerta crítica (Security/Version error) |
| Safety Green| `#22C55E` | N/A (inline)          | Estado seguro (Clean) |

Definidas como variables CSS en `globals.css` y mapeadas en `tailwind.config.ts`.

## Escalado Global

- **Base font size:** 17px (15% más grande que default 16px) para mejor legibilidad.
- **Pixel-perfect icons:** `image-rendering: pixelated` para iconos de Minecraft.
- **Implementación:** `globals.css` → `html { font-size: 17px; }`

---

## Principios de Diseño

- **Siempre animado:** Todo elemento tiene transición o animación activa.
- **Border-radius en todo:** `rounded-[1rem]` como mínimo. Nunca esquinas crudas.
- **Smooth transitions:** `transition-all duration-300` en hovers.
- **Glassmorphism:** `bg-[#1a0a24]/80 backdrop-blur-md` para capas flotantes.
- **Glow effects:** `shadow-[0_0_20px_rgba(187,150,228,0.2)]` en hover.

---

## Skeleton Loader

Patrón adaptado del componente `SkeletonCopy` de referencia (Scrap.io style):

```
┌──────────────────────────────────────────────────┐
│ ▌  [████░░░░░░░░░░░░]   [░░░░░░]                 │ ← shimmer sweep
│                                                  │
│     [████████████░░░░░░░░░] (3/4 w)             │ ← grow animation
│     ● [░░░░░░░░░░░░░░] (1/2 w)                  │ ← pulse dot + line
│                                                  │
│           ┌─────────────────────────┐            │
│           │ ◌ BUSCANDO DESCARGAS... │  ← bounce  │
│           └─────────────────────────┘            │
└──────────────────────────────────────────────────┘
```

### Keyframes requeridos

```css
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%);  }
}
@keyframes grow {
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-5px) rotate(-1deg); }
  75%       { transform: translateX(5px)  rotate(1deg);  }
}
```

> Estas animaciones se definen inline en `SkeletonLoader.tsx` para no depender de `tailwind.config.ts`.

---

## Componentes y su Estética

### Componentes FOMO (`components/fomo/`)

#### `FomoSidebar`
- Ancho: `w-[750px]` (Expandido para 2 columnas)
- Background: `bg-[#200D2D]/95 backdrop-blur-xl`
- **Layout:** Rejilla de 2 columnas para resultados de búsqueda.
- 3 Tabs con indicadores de estado activo.
- Toggle Modrinth/CF con colores distintivos (verde/naranja).

#### `FomoModCard`
- Layout horizontal con thumbnail izquierda.
- Thumbnail: `w-16 h-16 object-contain` con `image-rendering: pixelated`.
- Badge de fuente: "Modrinth" (verde) / "CurseForge" (naranja).
- **Security Badge:** Indicador de riesgo (Clean/Caution/Suspicious/Critical).
- Hover: glow sutil + elevación.

#### `FomoVersionOverlay`
- Full overlay con backdrop blur.
- **Tabs:** Historial, Dependencias, Descripción.
- Lista de versiones scrollable con changelogs renderizados.
- Destaca versión compatible con proyecto activo.
- **Dependency Resolver:** Colores por estado (Requerido: Rojo, Opcional: Violeta).
- Botón "Descargar" primario amarillo.

### Componentes de Layout (`components/layout/`)

#### `AlertSidebar`
- Slide-in desde derecha
- Background: `bg-[#1a0a24]/95`
- Alertas categorizadas por severidad

#### `SettingsModal`
- Centered modal con backdrop oscuro
- Formularios con inputs glassmorphism
- Persistencia a `mim-settings.json`

#### `ThemeToggle`
- Switch animado sol/luna
- Iconos pixelados

### Componentes de Library (`components/library/`)

#### `ModCard` (Pendiente/Clasificado)
- Fondo: `bg-[#1a0a24]`
- Borde normal: `border-[#BB96E4]/20`
- Borde seleccionado: `border-[#FFD066]` + glow amarillo
- Borde error (versión incorrecta): `border-red-500/50` → rojo
- Animación de error: `animate-[shake_0.5s_ease-in-out]`
- Icono extraído localmente (Base64) o placeholder

#### `QuickCategorizeSection`
- Grid de `HotkeyCard`
- Atajos: 1 (Essential), 2 (Local), 3 (Server)
- Muestra panel de subcategorías on-select

### `HotkeyCard` (`components/ui/`)
- Hover: `hover:-translate-y-2` + `hover:shadow-[0_10px_30px_rgba(255,208,102,0.15)]`
- Número: `text-white/30` → `text-[#FFD066]` on hover
- Ícono: `group-hover:scale-110 group-hover:rotate-3`

### `SubcategoryPanel`
- Background: `bg-[#1a0a24]/90 backdrop-blur-xl`
- Border: `border-[#BB96E4]/30`
- Sombra: `shadow-[0_0_30px_rgba(187,150,228,0.15)]`
- Aparición: `animate-[grow_0.3s_ease-out_forwards] origin-top`
- Botones: hover cambia a `bg-[#BB96E4] text-[#200D2D]` con glow

---

## Referencia: Componente Skeleton Original

```tsx
// Skeleton animation example (from frontguide.txt reference)
// Adapted to MIM color palette in components/SkeletonLoader.tsx
// Original used Tailwind classes; MIM uses inline styles for keyframes.
```
