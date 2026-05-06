/**
 * Hook para Updates Inteligentes
 * 
 * Resuelve el problema: "¿Cómo sé si hay updates después de 1 semana?"
 * 
 * Estrategias implementadas:
 * 1. Check periódico en background (cada 15 min si app abierta)
 * 2. Check al iniciar la app
 * 3. Check manual con "Refresh"
 * 4. Notificaciones de cambios detectados
 * 5. Stale-while-revalidate para UX fluida
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LibraryFile, Project } from '@/lib/types';
import { smartCache } from '@/lib/smart-cache';

interface UpdateInfo {
  fileName: string;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  modName: string;
  lastChecked: number;
}

interface SmartUpdatesState {
  updates: Record<string, UpdateInfo>;
  checking: boolean;
  lastCheck: number | null;
  newUpdatesCount: number;
  error: string | null;
}

interface SmartUpdatesOptions {
  autoCheck?: boolean; // Auto-check al montar
  backgroundCheck?: boolean; // Check en background cada 15 min
  checkInterval?: number; // Intervalo en ms (default: 15 min)
  notifyChanges?: boolean; // Notificar nuevos updates
}

export function useSmartUpdates(
  library: LibraryFile[],
  activeProject: Project | null,
  options: SmartUpdatesOptions = {}
) {
  const {
    autoCheck = true,
    backgroundCheck = true,
    checkInterval = 15 * 60 * 1000, // 15 minutos
    notifyChanges = true
  } = options;

  const [state, setState] = useState<SmartUpdatesState>({
    updates: {},
    checking: false,
    lastCheck: null,
    newUpdatesCount: 0,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousUpdatesRef = useRef<Record<string, UpdateInfo>>({});

  // Generar key para cache de updates
  const getUpdatesKey = useCallback(() => {
    if (!activeProject || library.length === 0) return null;
    const modHash = library.map(m => `${m.path}:${m.meta?.modVersion}`).join('|');
    return `updates:${activeProject.id}:${modHash}`;
  }, [activeProject, library]);

  // Detectar cambios en updates
  const detectChanges = useCallback((newUpdates: Record<string, UpdateInfo>) => {
    if (!notifyChanges) return 0;

    const previous = previousUpdatesRef.current;
    let newCount = 0;

    // Detectar nuevos updates
    for (const [fileName, update] of Object.entries(newUpdates)) {
      const prevUpdate = previous[fileName];
      if (!prevUpdate || prevUpdate.latestVersion !== update.latestVersion) {
        newCount++;
      }
    }

    // Detectar updates resueltos
    for (const [fileName] of Object.entries(previous)) {
      if (!newUpdates[fileName]) {
        console.log(`[SmartUpdates] Update resolved: ${fileName}`);
      }
    }

    if (newCount > 0) {
      console.log(`[SmartUpdates] ${newCount} new updates detected`);
      // Aquí podrías agregar notificaciones del sistema
    }

    return newCount;
  }, [notifyChanges]);

  // Check for updates con cache inteligente
  const checkUpdates = useCallback(async (forceRefresh = false) => {
    if (!activeProject || library.length === 0) return;

    const cacheKey = getUpdatesKey();
    if (!cacheKey) return;

    setState(prev => ({ ...prev, checking: true, error: null }));

    try {
      const fetcher = async () => {
        const response = await fetch('/api/modrinth/check-updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mods: library,
            loader: activeProject.loader,
            gameVersion: activeProject.version,
            forceRefresh
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result.updates || {};
      };

      // Usar smart cache con strategy de updates
      const updates = await smartCache.get(cacheKey, fetcher, {
        strategy: 'mod_updates',
        forceRefresh
      });

      if (updates) {
        const newUpdatesCount = detectChanges(updates);
        previousUpdatesRef.current = updates;

        setState(prev => ({
          ...prev,
          updates,
          checking: false,
          lastCheck: Date.now(),
          newUpdatesCount
        }));
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to check updates';
      setState(prev => ({
        ...prev,
        checking: false,
        error: errorMsg
      }));
    }
  }, [activeProject, library, getUpdatesKey, detectChanges]);

  // Background check (no actualiza UI si hay datos frescos)
  const performBackgroundCheck = useCallback(async () => {
    const cacheKey = getUpdatesKey();
    if (!cacheKey) return;

    try {
      const cached = await smartCache.get(cacheKey, async () => {
        // Esto no debería ejecutarse gracias a stale-while-revalidate
        return {};
      }, { strategy: 'mod_updates' });

      if (cached) {
        const newUpdatesCount = detectChanges(cached);
        previousUpdatesRef.current = cached;

        setState(prev => ({
          ...prev,
          updates: cached,
          lastCheck: Date.now(),
          newUpdatesCount
        }));
      }
    } catch (error) {
      console.warn('[SmartUpdates] Background check failed:', error);
    }
  }, [getUpdatesKey, detectChanges]);

  // Forzar refresh de updates específicos
  const refreshMod = useCallback(async (fileName: string) => {
    const mod = library.find(m => m.fileName === fileName);
    if (!mod || !activeProject) return;

    try {
      const response = await fetch('/api/modrinth/check-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: [mod],
          loader: activeProject.loader,
          gameVersion: activeProject.version,
          forceRefresh: true
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      const updates = result.updates || {};

      setState(prev => {
        const newUpdates = { ...prev.updates, ...updates };
        const newCount = detectChanges(newUpdates);
        previousUpdatesRef.current = newUpdates;

        return {
          ...prev,
          updates: newUpdates,
          newUpdatesCount: prev.newUpdatesCount + newCount
        };
      });

    } catch (error) {
      console.error(`[SmartUpdates] Failed to refresh ${fileName}:`, error);
    }
  }, [library, activeProject, detectChanges]);

  // Marcar update como ignorado
  const ignoreUpdate = useCallback((fileName: string) => {
    setState(prev => {
      const newUpdates = { ...prev.updates };
      delete newUpdates[fileName];
      
      return {
        ...prev,
        updates: newUpdates,
        newUpdatesCount: Math.max(0, prev.newUpdatesCount - 1)
      };
    });
  }, []);

  // Efecto de auto-check al montar
  useEffect(() => {
    if (autoCheck && activeProject && library.length > 0) {
      checkUpdates();
    }
  }, [autoCheck, activeProject, library.length]); // No incluir checkUpdates para evitar loops

  // Efecto de background check periódico
  useEffect(() => {
    if (!options.backgroundCheck || !activeProject) return;

    intervalRef.current = setInterval(() => {
      performBackgroundCheck();
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [options.backgroundCheck, activeProject, checkInterval, performBackgroundCheck]);

  // Limpiar cache de updates cuando cambia la librería significativamente
  useEffect(() => {
    const cacheKey = getUpdatesKey();
    if (cacheKey) {
      // Invalidar cache si la librería cambió mucho
      smartCache.refresh(cacheKey, async () => ({}));
    }
  }, [getUpdatesKey]);

  return {
    // Estado
    updates: state.updates,
    checking: state.checking,
    lastCheck: state.lastCheck,
    newUpdatesCount: state.newUpdatesCount,
    error: state.error,

    // Acciones
    checkUpdates,
    refreshMod,
    ignoreUpdate,

    // Utilidades
    hasUpdates: Object.keys(state.updates).length > 0,
    getUpdate: (fileName: string) => state.updates[fileName],
    isUpdateAvailable: (fileName: string) => !!state.updates[fileName],
    getUpdatesCount: () => Object.keys(state.updates).length,
    
    // Estado del cache
    cacheKey: getUpdatesKey(),
    isStale: state.lastCheck ? (Date.now() - state.lastCheck) > (15 * 60 * 1000) : true
  };
}

// Hook para notificaciones de updates (opcional)
export function useUpdateNotifications(updatesCount: number) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  }, []);

  const notifyUpdates = useCallback((count: number) => {
    if (permission !== 'granted' || count === 0) return;

    new Notification('MIM - Updates Disponibles', {
      body: `Hay ${count} actualizaciones de mods disponibles`,
      icon: '/icon-192x192.png',
      tag: 'mod-updates'
    });
  }, [permission]);

  return {
    permission,
    requestPermission,
    notifyUpdates,
    canNotify: permission === 'granted'
  };
}
