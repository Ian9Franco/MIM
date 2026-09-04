/**
 * SAGE 3.0 Live Log Profiler & Preventative Health Monitor
 * 
 * Inspects continuous log streams (`latest.log`, `debug.log`) in clients and servers
 * to detect performance bottlenecks, packet spam, entity runaway, and memory degradation
 * before catastrophic failures occur.
 */

export interface LogAnomaly {
  type: "tick_lag" | "memory_pressure" | "packet_spam" | "error_flood" | "registry_warning";
  severity: "low" | "medium" | "high" | "critical";
  occurrences: number;
  snippet: string;
  sourceMod?: string;
  message: string;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  category: "mod" | "jvm" | "config";
  description: string;
  targetMod?: string;
  suggestedValue?: string;
}

export interface LogProfileReport {
  totalLinesAnalyzed: number;
  anomalies: LogAnomaly[];
  healthScore: number; // 0 (catastrophic) to 100 (pristine)
  recommendations: OptimizationRecommendation[];
  summary: string;
}

/**
 * Analyzes continuous runtime logs (`latest.log` / `debug.log`).
 */
export function profileLogStream(logContent: string, loader = "fabric"): LogProfileReport {
  const lines = logContent.split(/\r?\n/);
  const anomalies: LogAnomaly[] = [];
  const recommendations: OptimizationRecommendation[] = [];

  let tickLagCount = 0;
  let tickLagSnippet = "";
  let gcPressureCount = 0;
  let gcSnippet = "";
  let packetSpamCount = 0;
  let packetSnippet = "";
  let errorFloodCount = 0;

  const modWarningCounts = new Map<string, number>();

  for (const line of lines) {
    const lower = line.toLowerCase();

    // 1. Tick Lag / Server Overload detection
    if (lower.includes("can't keep up") || lower.includes("running") && lower.includes("ticks behind")) {
      tickLagCount++;
      if (!tickLagSnippet) tickLagSnippet = line.trim();
    }

    // 2. Memory / GC Pressure
    if (lower.includes("gc overhead") || lower.includes("allocation stall") || lower.includes("out of memory")) {
      gcPressureCount++;
      if (!gcSnippet) gcSnippet = line.trim();
    }

    // 3. Packet spam / Network overload
    if (lower.includes("dropped packet") || lower.includes("packet flood") || lower.includes("sending packet too fast")) {
      packetSpamCount++;
      if (!packetSnippet) packetSnippet = line.trim();
    }

    // 4. Repeated exceptions / Error flood
    if (line.includes("Exception:") || line.includes("Error:") || line.includes("FATAL")) {
      errorFloodCount++;
      const modMatch = line.match(/\[([a-zA-Z0-9_-]+)\]/);
      if (modMatch && modMatch[1]) {
        const mId = modMatch[1].toLowerCase();
        modWarningCounts.set(mId, (modWarningCounts.get(mId) || 0) + 1);
      }
    }
  }

  // Calculate anomalies
  if (tickLagCount > 0) {
    anomalies.push({
      type: "tick_lag",
      severity: tickLagCount > 5 ? "critical" : "high",
      occurrences: tickLagCount,
      snippet: tickLagSnippet,
      message: `El servidor/partida está perdiendo ticks (${tickLagCount} advertencias de 'Can't keep up'). La CPU no logra mantener los 20 TPS estables.`,
    });
  }

  if (gcPressureCount > 0) {
    anomalies.push({
      type: "memory_pressure",
      severity: "critical",
      occurrences: gcPressureCount,
      snippet: gcSnippet,
      message: `Presión extrema sobre la memoria RAM (${gcPressureCount} avisos de GC). Riesgo inminente de freeze o OutOfMemoryError.`,
    });
  }

  if (packetSpamCount > 0) {
    anomalies.push({
      type: "packet_spam",
      severity: packetSpamCount > 10 ? "high" : "medium",
      occurrences: packetSpamCount,
      snippet: packetSnippet,
      message: `Se detectó saturación en el pipeline de paquetes de red (${packetSpamCount} incidencias). Causa desincronización y rubberbanding.`,
    });
  }

  // Identify top spamming mod
  for (const [mod, count] of modWarningCounts.entries()) {
    if (count > 8) {
      anomalies.push({
        type: "error_flood",
        severity: "medium",
        occurrences: count,
        snippet: `[${mod}] spamming warnings`,
        sourceMod: mod,
        message: `El mod '${mod}' está emitiendo errores repetitivos (${count} veces), degradando el rendimiento de I/O y saturando el log.`,
      });
    }
  }

  // Calculate Health Score (100 base)
  let healthScore = 100;
  healthScore -= tickLagCount * 8;
  healthScore -= gcPressureCount * 25;
  healthScore -= packetSpamCount * 4;
  healthScore -= Math.min(20, errorFloodCount * 2);
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Generate Proactive Recommendations
  if (loader === "fabric" || loader === "quilt") {
    recommendations.push({
      id: "rec-ferritecore",
      title: "Instalar FerriteCore",
      category: "mod",
      targetMod: "ferritecore",
      description: "Reduce el consumo de RAM de Minecraft hasta en un 40% optimizando el almacenamiento de bloques y modelos.",
    });
    recommendations.push({
      id: "rec-modernfix",
      title: "Instalar ModernFix",
      category: "mod",
      targetMod: "modernfix",
      description: "Acelera tiempos de inicio y soluciona memory leaks habituales en mods modernos.",
    });
    if (tickLagCount > 0) {
      recommendations.push({
        id: "rec-lithium",
        title: "Instalar Lithium",
        category: "mod",
        targetMod: "lithium",
        description: "Optimiza la física, la IA de los mobs y la carga de chunks del servidor sin alterar mecánicas vanilla.",
      });
    }
  } else {
    // Forge / NeoForge recommendations
    recommendations.push({
      id: "rec-modernfix-forge",
      title: "Instalar ModernFix (Forge/NeoForge)",
      category: "mod",
      targetMod: "modernfix",
      description: "Elimina cuellos de botella de renderizado y fugas de recursos en el loader de Forge.",
    });
  }

  if (gcPressureCount > 0 || healthScore < 70) {
    recommendations.push({
      id: "rec-jvm-flags",
      title: "Ajustar Flags de JVM (Generational ZGC / G1GC)",
      category: "jvm",
      suggestedValue: "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200",
      description: "Configurar un colector de basura moderno reduce los microtirones causados por la recolección de memoria.",
    });
  }

  const summary = healthScore >= 85
    ? "Estado del juego saludable con rendimiento óptimo."
    : healthScore >= 60
    ? "Rendimiento degradado con alertas moderadas en los logs."
    : "Estado crítico: Se detectaron cuellos de botella severos que requieren optimización inmediata.";

  return {
    totalLinesAnalyzed: lines.length,
    anomalies,
    healthScore,
    recommendations,
    summary,
  };
}
