import { useState, useEffect, useMemo } from "react";
import { LibraryFile, Project } from "@/lib/types";
import { mimDB } from "@/lib/indexeddb";
import { modPersistence } from "@/services/modPersistenceService";

/**
 * @fileoverview Orquestador Principal del Estado de la Librería (Hook Core).
 * ─────────────────────────────────────────────────────────────────────────────
 * Mantiene sincronizado el estado de los archivos instalados en el modpack activo.
 * Carga el catálogo desde el backend y enriquece asíncronamente los metadatos
 * (ambiente, mixins) consultando la base de datos local IndexedDB y los servicios
 * de persistencia inteligentes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function useLibraryCore(activeProject: Project | null) {
  const [library, setLibrary] = useState<LibraryFile[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Clave de caché para re-evaluación al cambiar de modpack
  const projectHash = useMemo(() => 
    activeProject ? `${activeProject.version}:${activeProject.loader}:${activeProject.name}` : '',
    [activeProject?.version, activeProject?.loader, activeProject?.name]
  );

  useEffect(() => {
    if (!activeProject) { 
      setLibrary([]); 
      return; 
    }
    
    setLoadingLibrary(true);
    fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`)
      .then(r => r.json())
      .then(async d => {
        const raw: LibraryFile[] = d.library || [];
        
        // FASE 1: Enriquecimiento Inmediato desde IndexedDB (Cache local rápida)
        const enriched = await Promise.all(raw.map(async mod => {
          if (mod.meta?.sha1) {
            const p = await mimDB.getMod(mod.meta.sha1);
            if (p) {
              return { 
                ...mod, 
                meta: { ...mod.meta, environment: p.environment, mixinTargets: p.mixinTargets } 
              };
            }
          }
          return mod;
        }));
        
        setLibrary(enriched);
        setLoadingLibrary(false);

        // FASE 2: Sincronización Forense en Segundo Plano (Faltantes)
        enriched
          .filter(m => !m.meta?.environment || m.meta.environment === "unknown")
          .forEach(async m => {
            try {
              const meta = await modPersistence.getSmartMetadata(m.path);
              setLibrary(prev => prev.map(item => 
                item.path === m.path ? { ...item, meta: { ...item.meta, ...meta } } : item
              ));
            } catch {}
          });
      })
      .catch(() => setLoadingLibrary(false));
  }, [projectHash]);

  return { library, setLibrary, loadingLibrary, setLoadingLibrary };
}
