import { EventPattern } from "./types";

export const DEFAULT_PATTERNS: EventPattern[] = [
  {
    id: "inconsistent-environment",
    name: "Entorno Inconsistente",
    description: "Descarga de mod seguida de crash",
    eventSequence: [
      { eventType: "fomo:mod-downloaded", timeWindow: 30000 },
      { eventType: "sage:crash-detected", timeWindow: 60000 }
    ],
    severity: "danger",
    confidence: 85,
    recommendation: "Revisar compatibilidad del mod descargado"
  },
  {
    id: "security-degradation",
    name: "Degradación de Seguridad",
    description: "Múltiples riesgos de seguridad detectados",
    eventSequence: [
      { eventType: "sage:security-risk", timeWindow: 120000 },
      { eventType: "sage:security-risk", timeWindow: 120000 }
    ],
    severity: "danger",
    confidence: 90,
    recommendation: "Ejecutar análisis de seguridad completo"
  },
  {
    id: "config-instability",
    name: "Inestabilidad por Configuración",
    description: "Cambio de configuración seguido de crash",
    eventSequence: [
      { eventType: "tweak:config-updated", timeWindow: 10000 },
      { eventType: "sage:crash-detected", timeWindow: 30000 }
    ],
    severity: "warning",
    confidence: 75,
    recommendation: "Revertir cambios de configuración"
  },
];
