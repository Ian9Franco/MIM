export type DraftTab = "summary" | "items" | "members" | "activity";

export const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  mod:          { bg: "bg-orange-500/10",  text: "text-orange-300",  border: "border-orange-500/20",   hex: "#f97316" },
  resourcepack: { bg: "bg-purple-500/10",  text: "text-purple-300",  border: "border-purple-500/20",   hex: "#a855f7" },
  shader:       { bg: "bg-blue-500/10",    text: "text-blue-300",    border: "border-blue-500/20",     hex: "#3b82f6" },
  datapack:     { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20",  hex: "#10b981" },
};

export const typeLabel = (type?: string) => {
  if (type === "resourcepack") return "Textura";
  if (type === "shader") return "Shader";
  if (type === "datapack") return "Datapack";
  return "Mod";
};

export const typeColor = (type?: string) => TYPE_COLORS[type ?? "mod"] ?? TYPE_COLORS.mod;

export const TYPE_FILTERS = [
  { id: "all", label: "Todo" },
  { id: "mod", label: "Mods" },
  { id: "resourcepack", label: "Texturas" },
  { id: "shader", label: "Shaders" },
  { id: "datapack", label: "Datapacks" },
];
