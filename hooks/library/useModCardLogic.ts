import { useMemo } from "react";

/**
 * Hook para la lógica de compatibilidad de versiones y loaders de un mod.
 */
export function useModCardLogic(version: string, activeVersion: string, loader: string, activeLoader: string) {
  const isCompatibleRange = useMemo(() => {
    if (!version || version === "unknown") return true;
    if (version === activeVersion) return true;
    if (version.endsWith("+")) return activeVersion.startsWith(version.slice(0, -1));
    if (activeVersion.startsWith(version + ".")) return true;
    if (version.includes(" - ")) {
      const [start, end] = version.split(" - ");
      return activeVersion.startsWith(start) || activeVersion.startsWith(end);
    }
    return false;
  }, [version, activeVersion]);

  const isVersionError = version !== "unknown" && activeVersion !== "" && version !== activeVersion && !isCompatibleRange;

  const isLoaderError = useMemo(() => {
    if (loader === "unknown" || activeLoader === "" || loader === activeLoader) return false;
    // Compatibilidad especial 1.20.1: Forge y NeoForge pueden convivir
    if (activeVersion === "1.20.1") {
      const l = loader.toLowerCase();
      const al = activeLoader.toLowerCase();
      if ((l === "forge" && al === "neoforge") || (l === "neoforge" && al === "forge")) return false;
    }
    return true;
  }, [loader, activeLoader, activeVersion]);

  return { isVersionError, isLoaderError, isError: isVersionError || isLoaderError };
}
