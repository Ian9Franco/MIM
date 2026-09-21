/** Layout compartido: FOMO principal + panel de detalles al lado (no solapado). */

/** Ancho máximo del sidebar FOMO cuando detalles están cerrados. */
export const FOMO_MAIN_MAX_WIDTH = 1400;

/** Expresión CSS del ancho cerrado (compartida entre estados). */
export const FOMO_MAIN_WIDTH_CLOSED = `min(80vw, ${FOMO_MAIN_MAX_WIDTH}px)`;

/** Reserva de ancho para FOMO cuando detalles están abiertos (panel + gap). */
export const FOMO_MAIN_RESERVE_WHEN_DETAILS = 692;

/** Panel de detalles (un poco más estrecho que antes). */
export const FOMO_DETAILS_PANEL_WIDTH = 652;

/** Hueco visible entre FOMO y detalles — deja ver el fondo del overlay. */
export const FOMO_DETAILS_VISUAL_GAP = 28;

/** @deprecated Usar FOMO_MAIN_RESERVE_WHEN_DETAILS — reserva para layout principal. */
export const FOMO_DETAILS_RESERVE = FOMO_MAIN_RESERVE_WHEN_DETAILS;

/** Ancho del sidebar FOMO cuando el panel de detalles está abierto. */
export function fomoMainWidthWhenDetailsOpen(): string {
  return `min(${FOMO_MAIN_WIDTH_CLOSED}, calc(100vw - ${FOMO_MAIN_RESERVE_WHEN_DETAILS}px))`;
}

/** Posición `left` del panel de detalles (borde derecho de FOMO + gap). */
export function fomoDetailsPanelLeft(): string {
  return `calc(${fomoMainWidthWhenDetailsOpen()} + ${FOMO_DETAILS_VISUAL_GAP}px)`;
}

/** Evalúa anchos en px para tests (soporta `min()` anidado y `calc()`). */
export function evaluateFomoLayoutWidth(expr: string, viewportWidth: number): number {
  const trimmed = expr.trim();
  const minMatch = trimmed.match(/^min\((.+),\s*(.+)\)$/);
  if (minMatch) {
    const left = evaluateFomoLayoutWidth(minMatch[1], viewportWidth);
    const right = evaluateFomoLayoutWidth(minMatch[2], viewportWidth);
    return Math.min(left, right);
  }
  return evaluateFomoLayoutWidthPart(trimmed, viewportWidth);
}

function evaluateFomoLayoutWidthPart(part: string, viewportWidth: number): number {
  const trimmed = part.trim();
  if (trimmed.endsWith("vw")) {
    const n = Number.parseFloat(trimmed);
    return (viewportWidth * n) / 100;
  }
  if (trimmed.endsWith("px")) {
    return Number.parseFloat(trimmed);
  }
  const calcMatch = trimmed.match(/^calc\((\d+)vw\s*-\s*(\d+)px\)$/);
  if (calcMatch) {
    const vw = Number.parseFloat(calcMatch[1]);
    const px = Number.parseFloat(calcMatch[2]);
    return (viewportWidth * vw) / 100 - px;
  }
  return NaN;
}
