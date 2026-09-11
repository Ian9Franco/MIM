/**
 * MIM — Backend Response Voice (Web App)
 * ─────────────────────────────────────────────────────────────────────────────
 * Mensajes de respuesta con personalidad propia para MIMweb.
 */

export const mimMsg = {
  translateDegraded: () =>
    "⚠️ El servicio de traducción está temporalmente saturado o bloqueado. Mostrando texto original en inglés.",
  translateRateLimited: () =>
    "🛑 Demasiadas peticiones de traducción seguidas. Esperá un minuto antes de seguir.",
  badRequest: (detail?: string) =>
    detail ? `❌ Bad request: ${detail}` : "❌ Bad request. El payload llegó mal formado.",
  internalError: (context?: string) =>
    context ? `❌ Error interno en ${context}.` : "❌ Error interno inesperado."
};
