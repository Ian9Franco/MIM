import { mimDB } from "@/lib/indexeddb";
import type { ModEntity } from "@/lib/indexeddb";
import type { EnhancedModMeta } from "@/lib/enhanced-mod-scanner";
import { CLIENT_KEYWORDS, SERVER_KEYWORDS } from "@/lib/classification-data";

/**
 * ModPersistenceService
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestión de la "Capa de Inteligencia" de mods. 
 * Orquestra el escaneo, la persistencia en IndexedDB y el enriquecimiento.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class ModPersistenceService {
  /**
   * Obtiene la metadata de un mod de forma inteligente.
   */
  async getSmartMetadata(filePath: string): Promise<ModEntity> {
    const res = await fetch(`/api/scan?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error(`Failed to scan mod: ${res.statusText}`);
    
    const meta: EnhancedModMeta = await res.json();
    const hash = meta.sha1;

    if (!hash) throw new Error(`Could not generate hash for mod at ${filePath}`);

    const existing = await mimDB.getMod(hash);
    if (existing) {
      const updated = { ...existing, lastSeen: Date.now() };
      await mimDB.setMod(updated);
      return updated;
    }

    const entity: ModEntity = {
      hash,
      modId: meta.modId,
      modName: meta.modName,
      version: meta.modVersion,
      loader: meta.loader,
      gameVersion: meta.gameVersion,
      environment: await this.predictEnvironment(meta),
      dependencies: meta.dependencies?.map(d => d.modId) || [],
      conflicts: [],
      providedIds: [],
      categories: [],
      mixinTargets: meta.mixinTargets || [],
      lastSeen: Date.now(),
      source: "local"
    };

    await mimDB.setMod(entity);
    return entity;
  }

  /**
   * Predice el entorno basado en heurísticas semánticas centralizadas.
   */
  private async predictEnvironment(meta: EnhancedModMeta): Promise<ModEntity["environment"]> {
    const search = `${meta.modName} ${meta.modId}`.toLowerCase();
    
    if (CLIENT_KEYWORDS.some(k => search.includes(k))) return "client";
    if (SERVER_KEYWORDS.some(k => search.includes(k))) return "server";
    
    return "both";
  }


  /**
   * Permite al usuario corregir manualmente el entorno de un mod.
   */
  async updateEnvironment(hash: string, env: ModEntity["environment"]): Promise<void> {
    const mod = await mimDB.getMod(hash);
    if (mod) {
      mod.environment = env;
      await mimDB.setMod(mod);
    }
  }
}

export const modPersistence = new ModPersistenceService();
