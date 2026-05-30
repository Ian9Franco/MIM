import React, { memo } from "react";
import { COLORS } from "@/theme/tokens";

/**
 * @fileoverview Iconografía Vectorial de Plataformas (Modrinth & CurseForge).
 * ─────────────────────────────────────────────────────────────────────────────
 * Componentes SVG puros y memorizados para evitar re-renderizados innecesarios
 * en listas masivas como la FOMO Sidebar o VirtualizedLibrary.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * ModrinthIcon: Representación oficial en verde corporativo (#1bd672).
 * Utiliza viewBox y dimensiones fijas para evitar layout shifts.
 */
export const ModrinthIcon = memo(() => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="14" width="14" className="shrink-0" style={{ color: "#1bd672" }}>
    <path d="M12.252 0.004a11.78 11.768 0 0 0 -8.92 3.73 11 10.999 0 0 0 -2.17 3.11 11.37 11.359 0 0 0 -1.16 5.169c0 1.42 0.17 2.5 0.6 3.77 0.24 0.759 0.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c0.44 0.05 2.54 0.07 2.76 0.02 0.2 -0.04 0.22 0.1 -0.26 -1.7l-0.36 -1.37 -1.01 -0.06a8.5 8.489 0 0 1 -5.18 -1.8 5.34 5.34 0 0 1 -1.3 -1.26c0 -0.05 0.34 -0.28 0.74 -0.5a37.572 37.545 0 0 1 2.88 -1.629c0.03 0 0.5 0.45 1.06 0.98l1 0.97 2.07 -0.43 2.06 -0.43 1.47 -1.47c0.8 -0.8 1.48 -1.5 1.48 -1.52 0 -0.09 -0.42 -1.63 -0.46 -1.7 -0.04 -0.06 -0.2 -0.03 -1.02 0.18 -0.53 0.13 -1.2 0.3 -1.45 0.4l-0.48 0.15 -0.53 0.53 -0.53 0.53 -0.93 0.1 -0.93 0.07 -0.52 -0.5a2.7 2.7 0 0 1 -0.96 -1.7l-0.13 -0.6 0.43 -0.57c0.68 -0.9 0.68 -0.9 1.46 -1.1 0.4 -0.1 0.65 -0.2 0.83 -0.33 0.13 -0.099 0.65 -0.579 1.14 -1.069l0.9 -0.9 -0.7 -0.7 -0.7 -0.7 -1.95 0.54c-1.07 0.3 -1.96 0.53 -1.97 0.53 -0.03 0 -2.23 2.48 -2.63 2.97l-0.29 0.35 0.28 1.03c0.16 0.56 0.3 1.16 0.31 1.34l0.03 0.3 -0.34 0.23c-0.37 0.23 -2.22 1.3 -2.84 1.63 -0.36 0.2 -0.37 0.2 -0.44 0.1 -0.08 -0.1 -0.23 -0.6 -0.32 -1.03 -0.18 -0.86 -0.17 -2.75 0.02 -3.73a8.84 8.839 0 0 1 7.9 -6.93c0.43 -0.03 0.77 -0.08 0.78 -0.1 0.06 -0.17 0.5 -2.999 0.47 -3.039 -0.01 -0.02 -0.1 -0.02 -0.2 -0.03Zm3.68 0.67c-0.2 0 -0.3 0.1 -0.37 0.38 -0.06 0.23 -0.46 2.42 -0.46 2.52 0 0.04 0.1 0.11 0.22 0.16a8.51 8.499 0 0 1 2.99 2 8.38 8.379 0 0 1 2.16 3.449 6.9 6.9 0 0 1 0.4 2.8c0 1.07 0 1.27 -0.1 1.73a9.37 9.369 0 0 1 -1.76 3.769c-0.32 0.4 -0.98 1.06 -1.37 1.38 -0.38 0.32 -1.54 1.1 -1.7 1.14 -0.1 0.03 -0.1 0.06 -0.07 0.26 0.03 0.18 0.64 2.56 0.7 2.78l0.06 0.06a12.07 12.058 0 0 0 7.27 -9.4c0.13 -0.77 0.13 -2.58 0 -3.4a11.96 11.948 0 0 0 -5.73 -8.578c-0.7 -0.42 -2.05 -1.06 -2.25 -1.06Z" fill="currentColor" />
  </svg>
));

/**
 * CurseForgeIcon: Representación oficial en yunque naranja (curseforgeOrange).
 */
export const CurseForgeIcon = memo(() => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="14" width="14" className="shrink-0" style={{ color: COLORS.curseforgeOrange }}>
    <path d="M18.326 9.2145S23.2261 8.4418 24 6.1882h-7.5066V4.4H0l2.0318 2.3576V9.173s5.1267 -0.2665 7.1098 1.2372c2.7146 2.516 -3.053 5.917 -3.053 5.917L5.0995 19.6c1.5465 -1.4726 4.494 -3.3775 9.8983 -3.2857 -2.0565 0.65 -4.1245 1.6651 -5.7344 3.2857h10.9248l-1.0288 -3.2726s-7.918 -4.6688 -0.8336 -7.1127z" fill="currentColor" />
  </svg>
));

/**
 * BedrockIcon: Diamante pixelado de Minecraft representando Bedrock Edition.
 * Color verde vibrante (#00AA00) — referencia al mundo de Bedrock.
 */
export const BedrockIcon = memo(() => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    height="14"
    width="14"
    className="shrink-0"
    style={{ color: "#00CC44" }}
    fill="currentColor"
  >
    {/* Diamante pixelado al estilo Minecraft */}
    <path d="M12 2L6 7l-4 5 4 5 6 5 6-5 4-5-4-5-6-5zm0 2.8l4.5 3.7L12 12 7.5 8.5 12 4.8zM6.8 9l4.2 3.4L7 16.2 3.8 12 6.8 9zm10.4 0L20.2 12 17 16.2l-4-3.8L17.2 9zM12 13.6l4 3.8-4 3.4-4-3.4 4-3.8z" />
  </svg>
));
