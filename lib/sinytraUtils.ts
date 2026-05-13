export interface CompatibilityPrediction {
  percentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  label: string;
  reason: string;
}

export function predictConnectorCompatibility(title: string, categories: string[] = []): CompatibilityPrediction {
  const t = title.toLowerCase();
  const cats = categories.map(c => c.toLowerCase());

  // 1. Sodium/Iris/Lithium ecosystem - EXTREMELY HIGH RISK / INCOMPATIBLE
  if (
    t.includes("sodium") || t.includes("rubidium") || t.includes("iris") || t.includes("oculus") || 
    t.includes("lithium") || t.includes("canary") || t.includes("krypton") || t.includes("indium") || 
    t.includes("modernfix") || t.includes("connector-extras")
  ) {
    return {
      percentage: 15,
      riskLevel: "VERY_HIGH",
      label: "Muy Inestable",
      reason: "Toca el motor de renderizado profundo o la lógica del chunk engine. Se recomienda buscar el equivalente nativo de Forge."
    };
  }

  // 2. Heavy render/optimization/physics categories - HIGH RISK
  const hasHighRiskCat = cats.some(c => 
    c.includes("optimization") || c.includes("rendering") || c.includes("physics") || c.includes("performance") || c.includes("graphics")
  );
  if (hasHighRiskCat || t.includes("physics") || t.includes("render") || t.includes("lighting") || t.includes("embeddium") || t.includes("distant horizons")) {
    return {
      percentage: 45,
      riskLevel: "HIGH",
      label: "Riesgo Alto",
      reason: "Usa hooks de renderizado pesados o inyecciones de bytecode profundas que pueden colisionar en Forge."
    };
  }

  // 3. Gameplay/QoL/UI mods - MEDIUM RISK
  const hasMediumRiskCat = cats.some(c =>
    c.includes("gui") || c.includes("hud") || c.includes("interface") || c.includes("minimap") || c.includes("map") || c.includes("utility") || c.includes("keybind") || c.includes("networking")
  );
  if (hasMediumRiskCat || t.includes("map") || t.includes("tweaks") || t.includes("hud") || t.includes("inventory") || t.includes("menu") || t.includes("jei") || t.includes("rei") || t.includes("emi")) {
    return {
      percentage: 75,
      riskLevel: "MEDIUM",
      label: "Estabilidad Media",
      reason: "Mod de interfaz o QoL simple. Puede depender de métodos de renderizado de UI ligeros o keybinds."
    };
  }

  // 4. Pure content mods / blocks / items / biomes - HIGH STABILITY (LOW RISK)
  return {
    percentage: 92,
    riskLevel: "LOW",
    label: "Alta Estabilidad",
    reason: "Mod de contenido puro (bloques, ítems, biomas). Utiliza APIs estándar con altísima compatibilidad."
  };
}
