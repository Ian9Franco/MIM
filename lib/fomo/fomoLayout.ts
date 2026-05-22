/** Layout compartido: FOMO principal + panel de detalles al lado (no solapado). */

/** Reserva de ancho para FOMO cuando detalles están abiertos (no reducir FOMO al acortar detalles). */
export const FOMO_MAIN_RESERVE_WHEN_DETAILS = 692;

/** Panel de detalles (un poco más estrecho que antes). */
export const FOMO_DETAILS_PANEL_WIDTH = 652;

/** Hueco visible entre FOMO y detalles — deja ver el fondo del overlay. */
export const FOMO_DETAILS_VISUAL_GAP = 28;

/** @deprecated Usar FOMO_MAIN_RESERVE_WHEN_DETAILS — reserva para layout principal. */
export const FOMO_DETAILS_RESERVE = FOMO_MAIN_RESERVE_WHEN_DETAILS;

/** Ancho del sidebar FOMO cuando el panel de detalles está abierto. */
export function fomoMainWidthWhenDetailsOpen(): string {
  return `min(72vw, calc(100vw - ${FOMO_MAIN_RESERVE_WHEN_DETAILS}px))`;
}

/** Posición `left` del panel de detalles (borde derecho de FOMO + gap). */
export function fomoDetailsPanelLeft(): string {
  return `calc(${fomoMainWidthWhenDetailsOpen()} + ${FOMO_DETAILS_VISUAL_GAP}px)`;
}
