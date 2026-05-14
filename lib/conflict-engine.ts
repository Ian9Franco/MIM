import { LibraryFile } from "./types";

export interface BytecodeConflict {
  targetClass: string;
  mods: Array<{
    modId: string;
    modName: string;
    path: string;
  }>;
  riskScore: number; // 0-100
  type: "mixin_collision" | "access_transformer" | "duplicate_injection";
}

export interface ConflictSummary {
  totalConflicts: number;
  highRiskConflicts: number;
  conflicts: BytecodeConflict[];
  affectedMods: string[]; // modIds
}

/**
 * Analiza la lista de mods en busca de colisiones de Mixin (bytecode).
 */
export function detectBytecodeConflicts(mods: LibraryFile[]): ConflictSummary {
  const classToMods = new Map<string, Array<LibraryFile>>();

  // 1. Mapear cada clase objetivo a los mods que la inyectan
  mods.forEach(mod => {
    const targets = mod.meta?.mixinTargets || [];
    targets.forEach((target: string) => {
      if (!classToMods.has(target)) {
        classToMods.set(target, []);
      }
      classToMods.get(target)!.push(mod);
    });
  });

  const conflicts: BytecodeConflict[] = [];
  const affectedModsSet = new Set<string>();

  // 2. Identificar colisiones (más de un mod inyectando en la misma clase)
  for (const [targetClass, targetingMods] of classToMods.entries()) {
    if (targetingMods.length > 1) {
      // Ignorar clases muy comunes que suelen tener compatibilidad interna o son "hooks" estándar
      // (aunque idealmente deberíamos ser estrictos)
      
      const conflictMods = targetingMods.map(m => ({
        modId: m.meta?.modId || "unknown",
        modName: m.meta?.modName || m.fileName,
        path: m.path
      }));

      // Calcular riesgo básico: 
      // 2 mods = 40%, 3 mods = 70%, 4+ mods = 95%
      let riskScore = 40;
      if (targetingMods.length === 3) riskScore = 70;
      if (targetingMods.length >= 4) riskScore = 95;

      // Incrementar riesgo si la clase es crítica (net.minecraft.client.render, etc.)
      if (targetClass.includes(".render.") || targetClass.includes(".network.")) {
        riskScore = Math.min(100, riskScore + 20);
      }

      conflicts.push({
        targetClass,
        mods: conflictMods,
        riskScore,
        type: "mixin_collision"
      });

      targetingMods.forEach(m => {
        if (m.meta?.modId) affectedModsSet.add(m.meta.modId);
      });
    }
  }

  return {
    totalConflicts: conflicts.length,
    highRiskConflicts: conflicts.filter(c => c.riskScore > 70).length,
    conflicts: conflicts.sort((a, b) => b.riskScore - a.riskScore),
    affectedMods: Array.from(affectedModsSet)
  };
}
