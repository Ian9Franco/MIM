# MIM – Guía de Estética Frontend

## Paleta de Colores

| Token       | Hex       | Tailwind custom token |
|-------------|-----------|-----------------------|
| Dark Purple | `#200D2D` | `bg-dark-purple`      |
| Wisteria    | `#BB96E4` | `text-wisteria`       |
| Sun Glow    | `#FFD066` | `text-sun-glow`       |

Definidas como variables CSS en `globals.css` y mapeadas en `tailwind.config.ts`.

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

### `ModCard`
- Fondo: `bg-[#1a0a24]`
- Borde normal: `border-[#BB96E4]/20`
- Borde seleccionado: `border-[#FFD066]` + glow amarillo
- Borde error (versión incorrecta): `border-red-500/50` → rojo
- Animación de error: `animate-[shake_0.5s_ease-in-out]`

### `HotkeyCard`
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
