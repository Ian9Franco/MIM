/**
 * Smart Cache System with Refresh Strategies
 * 
 * Resuelve el problema del cache estático implementando:
 * 1. TTL dinámico según tipo de dato
 * 2. Refresh strategies para updates críticos
 * 3. Background refresh para datos importantes
 * 4. Stale-while-revalidate para mejor UX
 */

import { mimDB, type CacheEntry } from './indexeddb';

interface CacheStrategy {
  ttl: number; // Time to live en ms
  staleWhileRevalidate?: number; // Tiempo extra para servir datos viejos mientras se actualizan
  backgroundRefresh?: boolean; // Refrescar en background
  priority: 'high' | 'medium' | 'low'; // Prioridad de refresh
}

// Estrategias por tipo de dato
const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  // Mod descriptions - cambian raramente
  'modrinth_description': {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 días
    staleWhileRevalidate: 30 * 24 * 60 * 60 * 1000, // 30 días extra
    backgroundRefresh: true,
    priority: 'low'
  },
  
  // Search results - cambian frecuentemente
  'modrinth_search': {
    ttl: 30 * 60 * 1000, // 30 minutos
    staleWhileRevalidate: 2 * 60 * 60 * 1000, // 2 horas extra
    backgroundRefresh: false,
    priority: 'high'
  },
  
  // Project details - cambian ocasionalmente
  'modrinth_project': {
    ttl: 2 * 60 * 60 * 1000, // 2 horas
    staleWhileRevalidate: 24 * 60 * 60 * 1000, // 1 día extra
    backgroundRefresh: true,
    priority: 'medium'
  },
  
  // Version info - cambia con nuevas releases
  'modrinth_versions': {
    ttl: 1 * 60 * 60 * 1000, // 1 hora
    staleWhileRevalidate: 6 * 60 * 60 * 1000, // 6 horas extra
    backgroundRefresh: true,
    priority: 'high'
  },
  
  // Update checks - CRÍTICO para detectar nuevas versiones
  'mod_updates': {
    ttl: 15 * 60 * 1000, // 15 minutos
    staleWhileRevalidate: 1 * 60 * 60 * 1000, // 1 hora extra
    backgroundRefresh: true,
    priority: 'high'
  },
  
  // CurseForge data
  'curseforge_search': {
    ttl: 30 * 60 * 1000, // 30 minutos
    staleWhileRevalidate: 2 * 60 * 60 * 1000,
    backgroundRefresh: false,
    priority: 'high'
  },
  
  'curseforge_project': {
    ttl: 2 * 60 * 60 * 1000, // 2 horas
    staleWhileRevalidate: 24 * 60 * 60 * 1000,
    backgroundRefresh: true,
    priority: 'medium'
  },

  // YouTube Showcase — el video nuevo sale cada 1-2 semanas, pero refrescamos
  // en background para que Spotlight siempre muestre algo sin spinners.
  'youtube_showcase': {
    ttl: 2 * 60 * 60 * 1000,           // 2 horas
    staleWhileRevalidate: 6 * 60 * 60 * 1000, // 6 horas extra stale
    backgroundRefresh: true,
    priority: 'medium'
  }
};

interface SmartCacheOptions {
  strategy?: string;
  forceRefresh?: boolean;
  backgroundRefresh?: boolean;
}

class SmartCache {
  private backgroundRefreshQueue: Map<string, () => Promise<any>> = new Map();
  private isRefreshing = new Set<string>();

  /**
   * Obtener datos del cache con refresh inteligente
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: SmartCacheOptions = {}
  ): Promise<T | null> {
    const strategy = CACHE_STRATEGIES[options.strategy || this.detectType(key)];
    if (!strategy) {
      // Sin estrategia = fetch directo
      return fetcher();
    }

    const now = Date.now();
    const cached = await mimDB.getCache(key);

    // Force refresh
    if (options.forceRefresh || !cached) {
      return this.fetchAndCache(key, fetcher, strategy);
    }

    const age = now - cached.expires + strategy.ttl;
    const isExpired = age > strategy.ttl;
    const isStale = isExpired && age <= (strategy.ttl + (strategy.staleWhileRevalidate || 0));

    // Datos frescos
    if (!isExpired) {
      return cached.data;
    }

    // Datos stale pero válidos (stale-while-revalidate)
    if (isStale) {
      // Iniciar background refresh si está habilitado
      if (strategy.backgroundRefresh && !this.isRefreshing.has(key)) {
        this.backgroundRefresh(key, fetcher, strategy);
      }
      return cached.data; // Servir datos viejos mientras se actualizan
    }

    // Datos muy viejos - esperar refresh
    return this.fetchAndCache(key, fetcher, strategy);
  }

  /**
   * Forzar refresh de datos específicos
   */
  async refresh(key: string, fetcher: () => Promise<any>): Promise<any> {
    const strategy = CACHE_STRATEGIES[this.detectType(key)];
    return this.fetchAndCache(key, fetcher, strategy || { ttl: 12 * 60 * 60 * 1000, priority: 'medium' });
  }

  /**
   * Refrescar datos críticos en background
   */
  async refreshCriticalData(): Promise<void> {
    const criticalKeys = await this.getCriticalKeys();
    
    for (const key of criticalKeys) {
      const strategy = CACHE_STRATEGIES[this.detectType(key)];
      if (strategy?.priority === 'high' && strategy.backgroundRefresh) {
        // Solo refrescar si está expirado o cerca de expirar
        const cached = await mimDB.getCache(key);
        if (!cached || (Date.now() - cached.expires + strategy.ttl) > strategy.ttl * 0.8) {
          this.backgroundRefreshQueue.set(key, async () => {
            // Implementar fetcher según tipo
            return this.refetchByKey(key);
          });
        }
      }
    }

    // Procesar cola de refresh en paralelo (con límite de concurrencia)
    await this.processRefreshQueue();
  }

  /**
   * Detectar tipo de cache key para aplicar estrategia
   */
  private detectType(key: string): string {
    if (key.includes('description')) return 'modrinth_description';
    if (key.includes('search') && key.includes('modrinth')) return 'modrinth_search';
    if (key.includes('search') && key.includes('curseforge')) return 'curseforge_search';
    if (key.includes('project') && key.includes('modrinth')) return 'modrinth_project';
    if (key.includes('project') && key.includes('curseforge')) return 'curseforge_project';
    if (key.includes('versions')) return 'modrinth_versions';
    if (key.includes('updates')) return 'mod_updates';
    if (key.includes('youtube_showcase')) return 'youtube_showcase';
    return 'default';
  }

  /**
   * Mapear el tipo de cache a los valores permitidos por la base de datos
   */
  private mapTypeForDB(key: string): "modrinth" | "curseforge" | "description" | "metadata" {
    const type = this.detectType(key);
    if (type.includes('description')) return 'description';
    if (type.startsWith('modrinth_') || type === 'mod_updates') return 'modrinth';
    if (type.startsWith('curseforge_')) return 'curseforge';
    return 'metadata';
  }

  /**
   * Fetch y cache con estrategia
   */
  private async fetchAndCache<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    strategy: CacheStrategy
  ): Promise<T> {
    this.isRefreshing.add(key);
    
    try {
      const data = await fetcher();
      await mimDB.setCache(key, data, strategy.ttl, this.mapTypeForDB(key));
      return data;
    } finally {
      this.isRefreshing.delete(key);
    }
  }

  /**
   * Background refresh sin bloquear
   */
  private async backgroundRefresh<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    strategy: CacheStrategy
  ): Promise<void> {
    if (this.isRefreshing.has(key)) return;
    
    this.isRefreshing.add(key);
    
    try {
      const data = await fetcher();
      await mimDB.setCache(key, data, strategy.ttl, this.mapTypeForDB(key));
      console.log(`[SmartCache] Background refreshed: ${key}`);
    } catch (error) {
      console.warn(`[SmartCache] Background refresh failed: ${key}`, error);
    } finally {
      this.isRefreshing.delete(key);
    }
  }

  /**
   * Obtener keys críticos que necesitan refresh
   */
  private async getCriticalKeys(): Promise<string[]> {
    const stats = await mimDB.getStorageStats();
    const criticalKeys: string[] = [];

    // Buscar keys de alta prioridad en cache
    // Esto requeriría un índice por tipo en IndexedDB
    // Por ahora, implementamos lógica simple
    
    return criticalKeys;
  }

  /**
   * Procesar cola de refresh con límite de concurrencia
   */
  private async processRefreshQueue(): Promise<void> {
    const CONCURRENCY_LIMIT = 3;
    const entries = Array.from(this.backgroundRefreshQueue.entries());
    
    for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
      const batch = entries.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.allSettled(
        batch.map(async ([key, fetcher]) => {
          try {
            await fetcher();
            this.backgroundRefreshQueue.delete(key);
          } catch (error) {
            console.warn(`[SmartCache] Queue refresh failed: ${key}`, error);
          }
        })
      );
    }
  }

  /**
   * Refetch data por key (implementar según tipo)
   */
  private async refetchByKey(key: string): Promise<any> {
    const type = this.detectType(key);
    
    // Implementar lógica de refetch según tipo
    switch (type) {
      case 'mod_updates':
        // Refrescar updates de mods instalados
        return this.refetchModUpdates();
      default:
        throw new Error(`Refetch not implemented for type: ${type}`);
    }
  }

  private async refetchModUpdates(): Promise<any> {
    // Implementar lógica para refrescar updates
    // Esto llamaría al endpoint de check-updates
    throw new Error('Not implemented yet');
  }

  /**
   * Limpiar cache expirado
   */
  async cleanup(): Promise<number> {
    return mimDB.clearExpiredCache();
  }

  /**
   * Obtener estadísticas del cache
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    expired: number;
    stale: number;
  }> {
    const stats = await mimDB.getStorageStats();
    
    return {
      total: stats.cache,
      byType: {}, // Implementar conteo por tipo
      expired: 0, // Implementar conteo de expirados
      stale: 0 // Implementar conteo de stale
    };
  }
}

export const smartCache = new SmartCache();

// Funciones helper para uso común
export const cachedModrinthSearch = (query: string, fetcher: () => Promise<any>) =>
  smartCache.get(`modrinth_search:${query}`, fetcher, { strategy: 'modrinth_search' });

export const cachedModDescription = (modId: string, fetcher: () => Promise<any>) =>
  smartCache.get(`modrinth_description:${modId}`, fetcher, { strategy: 'modrinth_description' });

export const cachedModUpdates = (mods: any[], fetcher: () => Promise<any>) =>
  smartCache.get(`mod_updates:${mods.map(m => m.fileName).join(',')}`, fetcher, { strategy: 'mod_updates' });

/**
 * Cache para YouTube Showcase — TTL 2h, stale 6h, background refresh.
 * Clave: `youtube_showcase:<channelUrl>:<limit>`
 */
export const cachedYoutubeShowcase = (channelUrl: string, limit: number, fetcher: () => Promise<any>) =>
  smartCache.get(`youtube_showcase:${channelUrl}:${limit}`, fetcher, { strategy: 'youtube_showcase' });
