/**
 * Hook para lazy loading de descripciones de mods
 * 
 * Carga las descripciones solo cuando son necesarias (visible en pantalla o expandido)
 * en lugar de cargar todas las descripciones de una vez.
 * 
 * Optimiza bandwidth y memoria para librerías grandes (1000+ mods)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LibraryFile, Project } from '@/lib/core/types';

interface DescriptionState {
  description: {
    title?: string;
    description?: string;
    body?: string;
    url?: string;
    modName?: string;
  } | null;
  loading: boolean;
  error: string | null;
}

interface UseLazyDescriptionOptions {
  enabled?: boolean;
  preloadOnHover?: boolean;
  cacheTimeout?: number;
}

export function useLazyDescription(
  mod: LibraryFile | null,
  activeProject: Project | null,
  options: UseLazyDescriptionOptions = {}
) {
  const {
    enabled = true,
    preloadOnHover = true,
    cacheTimeout = 5 * 60 * 1000 // 5 minutos
  } = options;

  const [state, setState] = useState<DescriptionState>({
    description: null,
    loading: false,
    error: null
  });

  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Generar key para cache
  const getCacheKey = useCallback(() => {
    if (!mod) return null;
    return `${mod.fileName}:${activeProject?.version}:${activeProject?.loader}`;
  }, [mod, activeProject]);

  // Limpiar cache expirada
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > cacheTimeout) {
        cache.delete(key);
      }
    }
  }, [cacheTimeout]);

  // Cargar descripción desde API
  const loadDescription = useCallback(async () => {
    if (!mod || !activeProject || !enabled) return;
    
    const cacheKey = getCacheKey();
    if (!cacheKey) return;

    // Verificar si ya está cargando
    if (loadingRef.current.has(cacheKey)) return;

    // Verificar cache
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      setState({
        description: cached.data,
        loading: false,
        error: null
      });
      return;
    }

    // Iniciar carga
    loadingRef.current.add(cacheKey);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/modrinth/export-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: [mod],
          loader: activeProject.loader,
          gameVersion: activeProject.version
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const description = result.data?.[0];

      if (description) {
        // Guardar en cache
        cacheRef.current.set(cacheKey, {
          data: description,
          timestamp: Date.now()
        });

        setState({
          description,
          loading: false,
          error: null
        });
      } else {
        setState({
          description: null,
          loading: false,
          error: 'No description found'
        });
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load description';
      setState({
        description: null,
        loading: false,
        error: errorMsg
      });
    } finally {
      loadingRef.current.delete(cacheKey);
    }
  }, [mod, activeProject, enabled, getCacheKey, cacheTimeout]);

  // Configurar Intersection Observer para cargar cuando sea visible
  const setupIntersectionObserver = useCallback((element: HTMLElement) => {
    if (!enabled || !observerRef.current) return;

    elementRef.current = element;
    observerRef.current.observe(element);
  }, [enabled]);

  // Inicializar Intersection Observer
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadDescription();
            // Dejar de observar una vez cargado
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1, // Cargar cuando 10% sea visible
        rootMargin: '50px' // Cargar 50px antes de entrar en viewport
      }
    );

    // Limpiar cache expirada periódicamente
    const cleanupInterval = setInterval(cleanExpiredCache, cacheTimeout);

    return () => {
      observerRef.current?.disconnect();
      clearInterval(cleanupInterval);
    };
  }, [enabled, loadDescription, cleanExpiredCache, cacheTimeout]);

  // Preload on hover (opcional)
  const handleMouseEnter = useCallback(() => {
    if (preloadOnHover && enabled && !state.description && !state.loading) {
      // Pequeño delay para no cargar si el mouse pasa rápidamente
      setTimeout(() => {
        if (elementRef.current?.matches(':hover')) {
          loadDescription();
        }
      }, 200);
    }
  }, [preloadOnHover, enabled, state.description, state.loading, loadDescription]);

  // Forzar carga manual
  const forceLoad = useCallback(() => {
    loadDescription();
  }, [loadDescription]);

  // Limpiar estado
  const clear = useCallback(() => {
    setState({
      description: null,
      loading: false,
      error: null
    });
  }, []);

  // Precargar (para mods importantes)
  const preload = useCallback(() => {
    if (enabled && !state.description && !state.loading) {
      loadDescription();
    }
  }, [enabled, state.description, state.loading, loadDescription]);

  return {
    // Estado
    description: state.description,
    loading: state.loading,
    error: state.error,
    isLoaded: !!state.description,
    hasError: !!state.error,

    // Acciones
    loadDescription,
    forceLoad,
    clear,
    preload,

    // Refs para componentes
    setupIntersectionObserver,
    handleMouseEnter,

    // Utilidades
    cacheKey: getCacheKey(),
    isCached: cacheRef.current.has(getCacheKey() || '')
  };
}

// Hook para manejar múltiples descripciones lazy
export function useLazyDescriptions(
  mods: LibraryFile[],
  activeProject: Project | null,
  options: UseLazyDescriptionOptions = {}
) {
  const [loadedDescriptions, setLoadedDescriptions] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const loadMultiple = useCallback(async (modIds: string[]) => {
    if (!activeProject || mods.length === 0) return;

    const modsToLoad = mods.filter(mod => 
      modIds.includes(mod.fileName) && 
      !loadedDescriptions.has(mod.fileName) &&
      !loading.has(mod.fileName)
    );

    if (modsToLoad.length === 0) return;

    // Actualizar estado de loading
    setLoading(prev => new Set([...prev, ...modsToLoad.map(m => m.fileName)]));

    try {
      const response = await fetch('/api/modrinth/export-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: modsToLoad,
          loader: activeProject.loader,
          gameVersion: activeProject.version
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const newDescriptions = new Map(loadedDescriptions);

      result.data?.forEach((desc: any) => {
        if (desc?.fileName) {
          newDescriptions.set(desc.fileName, desc);
        }
      });

      setLoadedDescriptions(newDescriptions);
      setLoading(prev => {
        const newSet = new Set(prev);
        modsToLoad.forEach(m => newSet.delete(m.fileName));
        return newSet;
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load descriptions';
      const newErrors = new Map(errors);
      modsToLoad.forEach(mod => {
        newErrors.set(mod.fileName, errorMsg);
      });
      setErrors(newErrors);
    }
  }, [mods, activeProject, loadedDescriptions, loading, errors]);

  return {
    descriptions: loadedDescriptions,
    loading,
    errors,
    loadMultiple,
    getDescription: (fileName: string) => loadedDescriptions.get(fileName),
    isLoading: (fileName: string) => loading.has(fileName),
    hasError: (fileName: string) => errors.has(fileName),
    getError: (fileName: string) => errors.get(fileName)
  };
}
