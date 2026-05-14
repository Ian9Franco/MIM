import { useState, useCallback, useEffect } from "react";
import { ModHit } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";

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

  const { 
    source, loader, gameVersions, categories, environments, 
    projectType, sortOrder, query, page 
  } = filters;

  const refetch = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    setSourceError("");
    const qClean = (overrideQuery !== undefined ? overrideQuery : query)?.trim() || "";

    try {
      const params = new URLSearchParams({ 
        loader, 
        projectType, 
        page: String(page), 
        q: qClean,
        sort: sortOrder || "relevance",
        gameVersions: JSON.stringify(gameVersions || []),
        categories: JSON.stringify(categories || []),
        environments: JSON.stringify(environments || [])
      });

      let fetchedMods: ModHit[] = [];
      if (source === "all") {
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
      setMods(initialMods);

      // Verificación batch asíncrona de disponibilidad cruzada
      if (initialMods.length > 0) {
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
                }
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
    page
  ]);

  // Auto-búsqueda con debounce ante cambios de filtros o texto
  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 300);
    return () => clearTimeout(timer);
  }, [refetch]);

  return { loading, mods, total, totalPages, sourceError, refetch, setMods, setTotal };
}
