/**
 * MIM – Version Utilities
 */

export function isVersionCompatible(modVer: string, activeVer: string): boolean {
  if (modVer === "unknown" || modVer === activeVer) return true;
  
  if (modVer.includes(" - ")) {
    const [start, end] = modVer.split(" - ").map(v => v.trim());
    const toParts = (vStr: string) => vStr.split(".").map(Number);
    const actParts = toParts(activeVer);
    const startParts = toParts(start);
    const endParts = toParts(end);

    const ge = (a: number[], b: number[]) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const na = a[i] || 0;
        const nb = b[i] || 0;
        if (na > nb) return true;
        if (na < nb) return false;
      }
      return true;
    };
    const le = (a: number[], b: number[]) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const na = a[i] || 0;
        const nb = b[i] || 0;
        if (na < nb) return true;
        if (na > nb) return false;
      }
      return true;
    };
    return ge(actParts, startParts) && le(actParts, endParts);
  }
  
  if (modVer.endsWith("+")) return activeVer.startsWith(modVer.slice(0, -1));
  if (activeVer.startsWith(modVer + ".")) return true;
  
  return false;
}

export function isLoaderCompatible(modLdr: string, activeLdr: string, activeVer: string): boolean {
  if (modLdr === "unknown" || activeLdr === "" || modLdr === activeLdr) return true;
  
  if (activeVer === "1.20.1") {
    const l = modLdr.toLowerCase();
    const al = activeLdr.toLowerCase();
    if ((l === "forge" && al === "neoforge") || (l === "neoforge" && al === "forge")) return true;
  }
  
  return false;
}
