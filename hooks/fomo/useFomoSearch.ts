import { useState, useCallback, useEffect, useRef } from "react";
import { ModHit } from "@/lib/core/types";
import { eventBus } from "@/lib/events/eventBus";

/**
 * @fileoverview Hook de Búsqueda y Paginación de FOMO (Discover).
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestiona la consulta a las APIs de Modrinth y CurseForge con soporte para
 * filtrado por versión, loader, categorías, ordenación y paginación.
 * Incluye auto-recarga con debounce ante cambios en los criterios de búsqueda.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function useFomoSearch(filters: any) {
  const [loading, setLoading] = useState(false);
  const [mods, setMods] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sourceError, setSourceError] = useState("");
  const skipNextRefetch = useRef(false);
  
  const intelligentPaginationResolver = useRef({
    pool: [] as ModHit[],
    cfOffset: 1,
    queryKey: ""
  });

  const { 
    source, loader, gameVersions, categories, environments, 
    projectType, sortOrder, query, page, sinytraActive, collectionId
  } = filters;

  const refetch = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    setSourceError("");
    const qClean = (typeof overrideQuery === "string" ? overrideQuery : typeof query === "string" ? query : "")?.trim() || "";

    try {
      // Si Sinytra está activo y estamos en Forge/NeoForge buscando en Modrinth,
      // forzamos la búsqueda de mods de Fabric.
      const effectiveLoader = (sinytraActive && (loader === "forge" || loader === "neoforge")) 
        ? "fabric" 
        : loader;

      const params = new URLSearchParams({ 
        loader: effectiveLoader, 
        projectType, 
        page: String(page), 
        q: qClean,
        sort: sortOrder || "relevance",
        gameVersions: JSON.stringify(gameVersions || []),
        categories: JSON.stringify(categories || []),
        environments: JSON.stringify(environments || [])
      });

      let fetchedMods: ModHit[] = [];
      
      if (collectionId) {
        const fetchUrl = source === "curseforge" 
          ? `/api/curseforge/picks/${collectionId}`
          : `/api/modrinth/collections?collectionId=${collectionId}`;
        const res = await fetch(fetchUrl);
        const data = await res.json();
        const allMods = data.mods || [];
        
        const pageSize = 21;
        const start = (page - 1) * pageSize;
        fetchedMods = allMods.slice(start, start + pageSize).map((m: any) => ({ ...m, _source: source }));
        
        setTotal(allMods.length);
        setTotalPages(Math.ceil(allMods.length / pageSize));
      } else if (source === "all") {
        const [mRes, cRes] = await Promise.allSettled([
          fetch(`/api/modrinth/discover?${params}`),
          fetch(`/api/curseforge/discover?${params}`)
        ]);
        if (mRes.status === "fulfilled" && mRes.value.ok) {
          const d = await mRes.value.json();
          fetchedMods.push(...(d.mods || []).map((m: any) => ({ ...m, _source: "modrinth" })));
        }
        if (cRes.status === "fulfilled" && cRes.value.ok) {
          const d = await cRes.value.json();
          fetchedMods.push(...(d.mods || []).map((m: any) => ({ ...m, _source: "curseforge" })));
        }
        setTotal(fetchedMods.length);
        setTotalPages(1);
      } else {
        const res = await fetch(`/api/${source}/discover?${params}`);
        if (!res.ok) throw new Error("Error en la API de búsqueda");
        const data = await res.json();
        fetchedMods = (data.mods || []).map((m: any) => ({ ...m, _source: source }));
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }

      // Inicializar con estado de verificación
      const initialMods = fetchedMods.map(m => ({
        ...m,
        availability: {
          checking: true,
          modrinth: m._source === "modrinth",
          curseforge: m._source === "curseforge"
        }
      }));

      // Verificación batch asíncrona de disponibilidad cruzada normal (sin filtros estrictos de entorno)
      if (initialMods.length > 0) {
        setMods(initialMods);
        fetch("/api/crosscheck/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mods: initialMods.map(m => ({ title: m.title, slug: m.slug, source: m._source }))
          })
        }).then(r => r.json()).then(data => {
          if (data && data.results) {
            setMods(prev => prev.map(m => {
              const key = m.title + (m.slug || "");
              const checkResult = data.results[key];
              const existsOpposite = checkResult ? checkResult.exists : false;
              return {
                ...m,
                availability: {
                  checking: false,
                  modrinth: m._source === "modrinth" ? true : existsOpposite,
                  curseforge: m._source === "curseforge" ? true : existsOpposite
                },
                mr_client_side: checkResult?.client_side,
                mr_server_side: checkResult?.server_side
              };
            }));
          }
        }).catch(() => {
          setMods(prev => prev.map(m => ({
            ...m,
            availability: {
              checking: false,
              modrinth: m.availability?.modrinth ?? (m._source === "modrinth"),
              curseforge: m.availability?.curseforge ?? (m._source === "curseforge")
            }
          })));
        });
      } else {
        setMods([]);
      }

      if (qClean) eventBus.emit("fomo:search", { query: qClean, source });
    } catch (e: any) {
      setMods([]);
      setSourceError(e.message || "Error al buscar mods");
    } finally {
      setLoading(false);
    }
  }, [
    source, 
    loader, 
    JSON.stringify(gameVersions), 
    JSON.stringify(categories), 
    JSON.stringify(environments), 
    projectType, 
    sortOrder, 
    query, 
    page,
    sinytraActive,
    collectionId
  ]);

  // Auto-búsqueda con debounce ante cambios de filtros o texto
  useEffect(() => {
    if (skipNextRefetch.current) {
      console.log("[useFomoSearch] Bypassing auto-refetch as requested.");
      skipNextRefetch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      refetch();
    }, 600);
    return () => clearTimeout(timer);
  }, [refetch]);

  const setSkipNextRefetch = useCallback((val: boolean) => {
    skipNextRefetch.current = val;
  }, []);

  return { loading, mods, total, totalPages, sourceError, refetch, setMods, setTotal, setSkipNextRefetch };
}
