import { PROJECT_TYPE_TO_CLASS_ID, LOADER_TO_CF_ID, SORT_TO_CF_FIELD, CF_CATEGORY_MAPS } from './CurseForgeMapper';

/**
 * CurseForgeService — Cliente de Integración con CurseForge (Eternal API).
 * ─────────────────────────────────────────────────────────────────────────────
 * Este servicio encapsula toda la comunicación con los endpoints de CurseForge.
 * Su objetivo principal es abstraer las complejidades de los IDs internos de
 * CF (classIds, modLoaderTypes) y devolver objetos normalizados compatibles
 * con la interfaz 'ModHit' de la FOMO Sidebar.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class CurseForgeService {
  /** URL Base de la API v1 de CurseForge */
  private static API_URL = "https://api.curseforge.com/v1";

  /**
   * Realiza una búsqueda avanzada de mods/assets en CurseForge.
   * 
   * @param params - Criterios de búsqueda (loader, versiones, paginación, etc.)
   * @param apiKey - Clave de acceso a la API (requerida por CF)
   * @returns Resultados normalizados y total de coincidencias.
   */
  static async search(params: any, apiKey: string) {
    const { loader, gameVersions, page, pageSize, sort, projectType, q, categories } = params;
    
    // Traducción de términos MIM a IDs de CurseForge
    const classId = PROJECT_TYPE_TO_CLASS_ID[projectType] || 6; // 6 = Mods
    const sortField = SORT_TO_CF_FIELD[sort] || 1; // 1 = Featured
    
    const query = new URLSearchParams({
      gameId: "432", // Minecraft
      sortField: sortField.toString(),
      sortOrder: "desc",
      index: ((page - 1) * pageSize).toString(),
      pageSize: pageSize.toString(),
      classId: classId.toString()
    });

    // Filtros dinámicos
    if (q) query.set("searchFilter", q);
    if (gameVersions?.length) query.set("gameVersions", JSON.stringify(gameVersions));
    
    // Mapeo de categorías (CurseForge solo admite una por consulta)
    if (categories?.length) {
      const map = CF_CATEGORY_MAPS[projectType] || {};
      const categoryIds: number[] = [];
      categories.forEach((cat: string) => {
        const id = map[cat];
        if (id) categoryIds.push(id);
      });
      if (categoryIds.length > 0) {
        query.set("categoryId", categoryIds[0].toString());
      }
    }
    
    // modLoaderType solo es válido para la clase 'Mods' (6)
    if (classId === 6) {
      query.set("modLoaderType", (LOADER_TO_CF_ID[loader] || 1).toString());
    }

    const res = await fetch(`${this.API_URL}/mods/search?${query.toString()}`, {
      headers: { 
        "Accept": "application/json", 
        "x-api-key": apiKey 
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`CurseForge API Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();

    return {
      /**
       * Mapeo al formato estándar MIM.
       * Esto permite que la UI no sepa si los datos vienen de Modrinth o CF.
       */
      mods: (data.data || []).map((m: any) => ({
        projectId: m.id.toString(),
        externalProjectId: m.id.toString(),
        sourceProjectId: m.id.toString(),
        platformId: m.id.toString(),
        title: m.name,
        description: m.summary || "",
        iconUrl: m.logo?.url || null,
        author: m.authors?.[0]?.name || "Desconocido",
        downloads: m.downloadCount,
        url: m.links?.websiteUrl || "",
        categories: (m.categories || []).map((c: any) => c.name),
        latestVersion: m.latestFilesIndexes?.[0]?.gameVersion || null,
        projectType: projectType,
        allowModDistribution: m.allowModDistribution !== false,
        // Inferencia de entorno para CurseForge basada en categorías
        ...(() => {
          const cats = (m.categories || []).map((c: any) => c.name.toLowerCase());
          const isWorld = cats.some((c: any) => ["world gen", "biomes", "dimensions", "structures", "ores and resources"].includes(c));
          const isClient = cats.some((c: any) => ["optimization", "performance", "visuals", "cosmetic", "map and information", "chat"].includes(c));
          const isServer = cats.some((c: any) => ["server utility", "management"].includes(c));
          
          if (isWorld) return { client_side: "required", server_side: "required" };
          if (isServer) return { client_side: "optional", server_side: "required" };
          if (isClient) return { client_side: "required", server_side: "unsupported" };
          return {}; // Fallback a Desconocido
        })()
      })),
      total: data.pagination.totalCount || 0
    };
  }
}
