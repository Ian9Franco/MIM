import type { ModHit } from "@/lib/core/types";

export async function runFomoBulkExplain(
  mods: ModHit[],
  showStatus: (text: string, type?: "success" | "error" | "info") => void
): Promise<void> {
  const selected = mods.slice(0, 12);
  if (!selected.length) return;

  showStatus(`MIM-Bot explicando ${selected.length} mods en lote…`, "info");
  const response = await fetch("/api/fomo/explain-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projects: selected.map((mod) => ({
        projectId: mod.projectId,
        title: mod.title,
        author: mod.author,
        slug: mod.slug || mod.projectId,
        description: mod.body || mod.description || "",
        url: mod.url,
        source: mod._source,
        categories: mod.categories || [],
        loaders: mod.loaders || [],
      })),
    }),
  });

  const data = (await response.json()) as { error?: string; succeeded?: number; failed?: number; total?: number };
  if (response.status === 401 || data.error === "NO_API_KEY") {
    showStatus("Configurá Gemini u OpenRouter en Ajustes para explicar en lote.", "error");
    return;
  }
  if (!response.ok) {
    showStatus(data.error || "No se pudo explicar el lote.", "error");
    return;
  }
  showStatus(`Lote listo: ${data.succeeded ?? 0}/${data.total ?? selected.length} explicados.`, "success");
}
