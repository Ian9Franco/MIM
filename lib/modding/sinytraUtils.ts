export interface CompatibilityPrediction {
  percentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  label: string;
  reason: string;
}
export function predictConnectorCompatibility(title: string, categories: string[] = []): CompatibilityPrediction {
  const t = title.toLowerCase();
  const cats = (categories || []).map((c: any) => {
    if (typeof c === "string") return c.toLowerCase();
    if (c && typeof c === "object") {
      if (typeof c.name === "string") return c.name.toLowerCase();
      if (typeof c.slug === "string") return c.slug.toLowerCase();
    }
    return "";
  }).filter(Boolean);

  // 1. Caso crítico: Ecosistema Sodium/Iris (Incompatibles por diseño o requieren ports nativos)
  if (
    t.includes("sodium") || t.includes("rubidium") || t.includes("iris") || t.includes("oculus") || 
    t.includes("canvas") || t.includes("indium") || t.includes("vulkan")
  ) {
    return {
      percentage: 12,
      riskLevel: "VERY_HIGH",
      label: "Incompatible",
      reason: "Modifica el motor de renderizado base de Minecraft. Sinytra no puede traducir mods que reemplacen el pipeline de renderizado completo."
    };
  }

  // Sistema de puntuación dinámico
  let score = 98; // Empezamos casi perfecto
  const reasons: string[] = [];

  // 2. Penalizaciones por Renderizado y Optimización (Altísimo riesgo)
  if (t.includes("render") || t.includes("lighting") || t.includes("shader") || t.includes("embeddium") || cats.some(c => c.includes("rendering"))) {
    score -= 50;
    reasons.push("renderizado");
  }
  if (t.includes("performance") || t.includes("optimization") || t.includes("optifine") || cats.some(c => c.includes("optimization"))) {
    score -= 40;
    reasons.push("optimización");
  }

  // 3. Físicas y ASM / Core mods
  if (t.includes("physics") || t.includes("asm") || t.includes("core") || t.includes("mixin")) {
    score -= 30;
    reasons.push("manipulación de bytecode");
  }

  // 4. Interface / GUI / HUD (Riesgo medio)
  if (t.includes("hud") || t.includes("gui") || t.includes("interface") || t.includes("menu") || t.includes("inventory")) {
    score -= 15;
    reasons.push("interfaz de usuario");
  }
  if (t.includes("map") || t.includes("radar")) {
    score -= 10;
    reasons.push("mapeo/radar");
  }

  // 5. Networking / Sonido / Librerías
  if (t.includes("voice") || t.includes("sound") || t.includes("audio")) {
    score -= 15;
    reasons.push("sistema de audio");
  }
  if (t.includes("api") || t.includes("lib") || t.includes("library")) {
    score -= 5; // Las librerías suelen ser estables pero si fallan rompen todo
    reasons.push("dependencia de librería");
  }

  // 6. Worldgen / Biomas (Suelen ser estables en contenido, pero ojo con las estructuras)
  if (t.includes("biom") || t.includes("worldgen") || t.includes("structure")) {
    score -= 5;
    reasons.push("generación de mundo");
  }

  // Generar variación orgánica (Hashing simple basado en el título)
  // Esto hace que "Mod A" siempre de 87% y "Mod B" de 84%, en lugar de clavados en 85%.
  let hash = 0;
  for (let i = 0; i < t.length; i++) {
    hash = (hash << 5) - hash + t.charCodeAt(i);
    hash |= 0; // Convertir a entero de 32 bits
  }
  const variance = Math.abs(hash % 7); // Variación de 0 a 6%
  score -= variance;

  // Asegurar límites
  score = Math.max(5, Math.min(98, score));

  // Determinar nivel y etiqueta basados en el score final
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" = "LOW";
  let label = "Alta Estabilidad";
  let finalReason = "Mod de contenido puro o estándar. Altísima probabilidad de funcionar sin problemas.";

  if (score < 30) {
    riskLevel = "VERY_HIGH";
    label = "Muy Inestable";
    finalReason = `Riesgo crítico por tocar ${reasons.join(" y ")}. Es muy probable que cause crashes al iniciar.`;
  } else if (score < 60) {
    riskLevel = "HIGH";
    label = "Riesgo Alto";
    finalReason = `Riesgo elevado debido a ${reasons.join(" y ")}. Puede requerir configuraciones especiales o parches.`;
  } else if (score < 85) {
    riskLevel = "MEDIUM";
    label = "Estabilidad Media";
    finalReason = `Estabilidad aceptable. Modifica ${reasons.join(", ")}, pero Sinytra suele manejarlos bien.`;
  } else if (reasons.length > 0) {
    riskLevel = "LOW";
    label = "Estable";
    finalReason = `Probabilidad alta de éxito. Solo toca ligeramente ${reasons.join(", ")}.`;
  }

  return {
    percentage: score,
    riskLevel,
    label,
    reason: finalReason
  };
}
