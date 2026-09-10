/**
 * BOT-09 — BYOK transparency copy (no absolute privacy claims).
 */

export type ByokProviderLink = {
  label: string;
  url: string;
};

export const MIMBOT_BYOK_DATA_SENT = [
  "Resumen del crash analizado por SAGE (categoría, excepción, loader, versión, mods sospechosos).",
  "Tu pregunta y los últimos mensajes de la conversación activa sobre ese incidente.",
  "Fragmentos del diagnóstico heurístico local cuando ayudan a contextualizar la respuesta.",
] as const;

export const MIMBOT_BYOK_NOT_PROMISED = [
  "Usar tu propia clave no garantiza privacidad absoluta: el proveedor (Google Gemini u OpenRouter) procesa el contenido según sus términos.",
  "MIM no almacena el texto del chat en servidores propios cuando usás BYOK; la retención depende del proveedor elegido.",
  "No envíes contraseñas, tokens ni datos personales en las preguntas al asistente.",
] as const;

export const MIMBOT_BYOK_PROVIDER_LINKS: ByokProviderLink[] = [
  {
    label: "Google Gemini API — Términos del servicio",
    url: "https://ai.google.dev/gemini-api/terms",
  },
  {
    label: "Google — Política de privacidad",
    url: "https://policies.google.com/privacy",
  },
  {
    label: "OpenRouter — Política de privacidad",
    url: "https://openrouter.ai/privacy",
  },
];
