/** Navegación desde Community / Club hacia Explorar FOMO o detalles. */

import type { SearchProjectDetail } from "@/lib/fomo/fomoDiscoverActions";

export type FomoSearchProjectDetail = SearchProjectDetail;

function normalizeProjectType(type?: string): string {
  if (!type) return "mod";
  const t = type.toLowerCase();
  if (t === "textura" || t === "resourcepack") return "resourcepack";
  if (["mod", "shader", "datapack", "modpack"].includes(t)) return t;
  return "mod";
}

/** Busca en Explorar: ambas plataformas, cualquier versión, filtro por tipo. */
export function searchProjectInFomo(detail: FomoSearchProjectDetail) {
  window.dispatchEvent(
    new CustomEvent("fomo-search-project", {
      detail: {
        query: detail.query,
        projectId: detail.projectId,
        platform: detail.platform,
        projectType: normalizeProjectType(detail.projectType),
        source: "all" as const,
        loader: "all",
        gameVersions: [] as string[],
      },
    })
  );
}

/** Busca proyectos por autor en el panel de FOMO. */
export function searchAuthorInFomo(author: string) {
  window.dispatchEvent(
    new CustomEvent("fomo-search-author", {
      detail: { author },
    })
  );
}

/** Abre el panel de detalles (versiones). */
export function openProjectDetailsInFomo(
  id: string,
  platform?: string,
  opts?: { title?: string; projectType?: string }
) {
  window.dispatchEvent(
    new CustomEvent("fomo-open-project-details", {
      detail: {
        id,
        platform,
        title: opts?.title,
        projectType: normalizeProjectType(opts?.projectType),
      },
    })
  );
}
