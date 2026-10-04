function normalizeContentType(raw?: string | null): string {
  const value = String(raw || "mod").toLowerCase();
  if (value === "resourcepack" || value === "texture") return "resourcepack";
  if (value === "shader" || value === "shaderpack") return "shader";
  if (value === "datapack" || value === "data-pack") return "datapack";
  return "mod";
}

/** Public project page on Modrinth or CurseForge for a draft row. */
export function draftItemPlatformUrl(item: {
  project_id?: string;
  source?: string | null;
  content_type?: string | null;
}): string {
  const projectId = String(item.project_id || "").trim();
  if (!projectId) return "";

  const source = String(item.source || "modrinth").toLowerCase();
  const contentType = normalizeContentType(item.content_type);

  if (source === "curseforge") {
    const segment =
      contentType === "resourcepack"
        ? "texture-packs"
        : contentType === "shader"
          ? "shaders"
          : contentType === "datapack"
            ? "data-packs"
            : "mc-mods";
    return `https://www.curseforge.com/minecraft/${segment}/${encodeURIComponent(projectId)}`;
  }

  const modrinthSegment =
    contentType === "resourcepack"
      ? "resourcepack"
      : contentType === "shader"
        ? "shader"
        : contentType === "datapack"
          ? "datapack"
          : "mod";
  return `https://modrinth.com/${modrinthSegment}/${encodeURIComponent(projectId)}`;
}
