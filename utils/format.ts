export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getProjectTypeLabel(type: string): string {
  if (type === "mod") return "Mods";
  if (type === "resourcepack") return "Texturas";
  if (type === "shader") return "Shaders";
  if (type === "datapack") return "Data Packs";
  return "Elementos";
}

export function openExternal(url: string) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("No se pudo abrir la URL externa:", e);
  }
}

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  adventure: "Aventura",
  cursed: "Maldito",
  decoration: "Decoración",
  economy: "Economía",
  equipment: "Equipamiento",
  food: "Comida",
  game_mechanics: "Mecánicas",
  library: "Librería",
  magic: "Magia",
  management: "Gestión",
  minigame: "Minijuego",
  mobs: "Mobs",
  optimization: "Optimización",
  social: "Social",
  storage: "Almacenamiento",
  technology: "Tecnología",
  transportation: "Transporte",
  utility: "Utilidad",
  world_generation: "Generación",
  "utility-qol": "Calidad de Vida",
  "performance": "Rendimiento",
  "adventure-rpg": "Rol/Aventura",
  "api-and-library": "API/Librería",
  "world-gen": "Mundo",
  "map-and-information": "Mapas/Info",
};
