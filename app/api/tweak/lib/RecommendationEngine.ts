export function getRecommendations(
  detectedLoader: string, 
  detectedVersion: string, 
  installedMods: Set<string>,
  hardware: { totalRamGB: number; cpuCores: number; hardwareProfile: string },
  modCount: number,
  ramAllocated: number
) {
  const recommendations: any[] = [];
  const isFabric = detectedLoader.toLowerCase() === "fabric" || detectedLoader.toLowerCase() === "quilt";

  if (isFabric) {
    if (!installedMods.has("sodium")) recommendations.push({ title: "⚡ Sodium", desc: "Multiplica tus FPS x3 en Fabric.", impact: "high", action: "open-fomo", fomoQuery: "project:sodium" });
    if (!installedMods.has("iris")) recommendations.push({ title: "🌈 Iris", desc: "Soporte optimizado de shaders.", impact: "medium", action: "open-fomo", fomoQuery: "project:iris" });
    if (!installedMods.has("lithium")) recommendations.push({ title: "🧠 Lithium", desc: "Optimización de física e IA.", impact: "medium", action: "open-fomo", fomoQuery: "project:lithium" });
  } else {
    if (!installedMods.has("embeddium")) recommendations.push({ title: "⚡ Embeddium", desc: "Motor de renderizado avanzado para Forge.", impact: "high", action: "open-fomo", fomoQuery: "project:embeddium" });
    if (!installedMods.has("oculus")) recommendations.push({ title: "🌈 Oculus", desc: "Shaders de alto rendimiento para Forge.", impact: "medium", action: "open-fomo", fomoQuery: "project:oculus" });
    if (!installedMods.has("modernfix")) recommendations.push({ title: "🛠️ ModernFix", desc: "Parches de memoria y carga rápida.", impact: "high", action: "open-fomo", fomoQuery: "project:modernfix" });
  }

  if (!installedMods.has("ferritecore")) recommendations.push({ title: "🗜️ FerriteCore", desc: "Compresión de memoria de modelos.", impact: "high", action: "open-fomo", fomoQuery: "project:ferritecore" });

  if (ramAllocated <= 6) recommendations.push({ title: "Optimizar RAM Crítica", desc: "RAM insuficiente. Sugerimos bajar mipmapLevels a 0.", impact: "high", settingKey: "mipmapLevels", recommendedValue: "0" });

  return recommendations;
}
