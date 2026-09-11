export function normalizeContentType(mod: any): string {
  const raw = String(mod?.projectType || mod?.project_type || mod?.content_type || "mod").toLowerCase();
  if (raw === "resourcepack" || raw === "resource-pack" || raw === "texture" || raw === "texture-pack") return "resourcepack";
  if (raw === "shader" || raw === "shaderpack") return "shader";
  if (raw === "datapack" || raw === "data-pack") return "datapack";
  if (raw === "modpack" || raw === "mod-pack") return "modpack";
  return "mod";
}

export function inferSide(contentType: string, details?: any): "client" | "server" | "both" {
  if (contentType === "resourcepack" || contentType === "shader") return "client";
  if (contentType === "datapack") return "server";
  const client = details?.client_side;
  const server = details?.server_side;
  if ((client === "required" || client === "optional") && server === "unsupported") return "client";
  if ((server === "required" || server === "optional") && client === "unsupported") return "server";
  return "both";
}

export function normalizeLoader(loader: string) {
  const value = loader.toLowerCase();
  if (value === "neoforge") return "neoforge";
  if (value === "quilt") return "quilt";
  if (value === "fabric") return "fabric";
  if (value === "any" || value === "all") return "";
  return "forge";
}
