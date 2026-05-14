import { mimDB } from "@/lib/indexeddb";
import type { ModEntity } from "@/lib/indexeddb";
import type { EnhancedModMeta } from "@/lib/enhanced-mod-scanner";

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
   * Si ya existe en DB y no ha cambiado, la devuelve.
   * Si no, la escanea, la enriquece y la guarda.
   */
  async getSmartMetadata(filePath: string): Promise<ModEntity> {
    // 1. Escaneo rápido inicial para obtener el Hash (SHA1)
    // Usamos el endpoint de scan que nos da la metadata básica y el hash
    const res = await fetch(`/api/scan?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error(`Failed to scan mod: ${res.statusText}`);
    
    const meta: EnhancedModMeta = await res.json();
    const hash = meta.sha1;

    if (!hash) {
      throw new Error(`Could not generate hash for mod at ${filePath}`);
    }

    // 2. Buscar en la base de datos local
    const existing = await mimDB.getMod(hash);
    if (existing) {
      // Si existe, actualizamos la fecha de último avistamiento
      const updated = { ...existing, lastSeen: Date.now() };
      await mimDB.setMod(updated);
      return updated;
    }

    // 3. Si es nuevo o no estaba persistido, crear la entidad enriquecida
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

    // 4. Guardar en IndexedDB para futuras consultas
    await mimDB.setMod(entity);
    return entity;
  }

  /**
   * Predice el entorno (Client/Server/Both) basado en el nombre y metadata.
   * En el futuro esto consultará Modrinth API para mayor precisión.
   */
  private async predictEnvironment(meta: EnhancedModMeta): Promise<ModEntity["environment"]> {
    const name = (meta.modName || "").toLowerCase();
    const id = (meta.modId || "").toLowerCase();
    
    // Heurísticas de cliente (Optimización visual, UI, Shaders)
    const clientKeywords = [
      "sodium", "iris", "canvas", "entity_culling", "fabulously", 
      "hud", "inventory", "gui", "menu", "tooltip", "shader", 
      "texture", "resource", "font", "chat", "voice", "dynamic"
    ];
    
    // Heurísticas de servidor (Rendimiento puro, gestión)
    const serverKeywords = [
      "lithium", "starlight", "spark", "luckperms", "whitelist",
      "performance", "tick", "chunk", "pregen", "server", "proxy"
    ];

    if (clientKeywords.some(k => name.includes(k) || id.includes(k))) return "client";
    
    // Si no estamos seguros, marcamos como "both" (comportamiento por defecto seguro)
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
