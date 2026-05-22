import { useMemo } from "react";
import { LibraryFile } from "@/lib/core/types";

/**
 * Hook para la detección visual de conflictos y duplicados en la UI de la librería.
 * 
 * Diferencia entre duplicados intencionales (mismo mod en categorías distintas como .essential y .server)
 * y errores de duplicación real (mismo mod en la misma categoría).
 */
export function useLibraryConflictsInternal(library: LibraryFile[]) {
  return useMemo(() => {
    const map: Record<string, string> = {};
    const modIdToPaths: Record<string, string[]> = {};

    // IDs de sistema que ignoramos para no generar falsos positivos de duplicados
    const SYSTEM_IDS = ["minecraft", "forge", "neoforge", "fabric", "quilt", "java", "fabricloader", "quiltloader", "loader"];

    // 1. Agrupar rutas de archivos por ID de mod
    library.forEach(f => {
      const allIds = Array.from(new Set([
        f.meta?.modId,
        ...(f.meta?.providedIds || [])
      ])).filter(id => id && id !== "unknown" && !SYSTEM_IDS.includes(id.toLowerCase())) as string[];

      allIds.forEach(id => {
        if (!modIdToPaths[id]) modIdToPaths[id] = [];
        if (!modIdToPaths[id].includes(f.path)) modIdToPaths[id].push(f.path);
      });
    });

    // 2. Detectar duplicados en la misma categoría
    Object.entries(modIdToPaths).forEach(([mid, paths]) => {
      if (paths.length > 1) {
        const filesForPaths = library.filter(f => paths.includes(f.path));
        
        // Agrupamos por categoría (.essential, .local, etc)
        const catGroupedPaths: Record<string, string[]> = {};
        filesForPaths.forEach(f => {
          if (!catGroupedPaths[f.category]) catGroupedPaths[f.category] = [];
          catGroupedPaths[f.category].push(f.path);
        });

        // Si hay más de uno en la MISMA categoría, es un duplicado real
        Object.values(catGroupedPaths).forEach(pths => {
          if (pths.length > 1) {
            pths.forEach(p => { map[p] = "Duplicado"; });
          }
        });
      }
    });

    // 3. Detectar conflictos declarados en metadata (breaks/conflicts)
    library.forEach(f => {
      const allConflictIds = [...(f.meta?.conflicts || []), ...(f.meta?.breaks || [])];
      if (allConflictIds.length > 0) {
        library.forEach(other => {
          if (f.path === other.path) return;
          const otherId = other.meta?.modId;
          if (otherId && allConflictIds.includes(otherId)) {
            map[f.path] = `Conflicto con ${other.meta?.modName || otherId}`;
            map[other.path] = `Conflicto con ${f.meta?.modName || f.meta?.modId || f.fileName}`;
          }
        });
      }
    });

    return map;
  }, [library]);
}
