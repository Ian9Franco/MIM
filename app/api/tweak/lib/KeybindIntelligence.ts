import { Keybind, KeybindConflict } from "./types";

interface KeybindRule {
  modName: string;
  category: "combat" | "movement" | "utility" | "ui";
  priority: number; // 1 (Highest) to 10 (Lowest)
}

const MOD_PRIORITIES: Record<string, KeybindRule> = {
  "iron's spells 'n spellbooks": { modName: "Iron's Spells", category: "combat", priority: 1 },
  "terramity": { modName: "Terramity", category: "combat", priority: 2 },
  "ars nouveau": { modName: "Ars Nouveau", category: "combat", priority: 1 },
  "cataclysm": { modName: "Cataclysm", category: "combat", priority: 2 },
  "xaero's minimap": { modName: "Xaero's Minimap", category: "ui", priority: 8 },
  "xaero's world map": { modName: "Xaero's World Map", category: "ui", priority: 8 },
  "sophisticated backpacks": { modName: "Backpacks", category: "utility", priority: 5 },
  "curios api": { modName: "Curios", category: "ui", priority: 7 },
  "artifacts": { modName: "Artifacts", category: "utility", priority: 6 },
};

export interface KeybindSuggestion {
  key: string;
  winner: Keybind;
  loser: Keybind;
  reason: string;
}

export function analyzeKeybindIntelligence(conflicts: KeybindConflict[]): KeybindSuggestion[] {
  const suggestions: KeybindSuggestion[] = [];

  for (const conflict of conflicts) {
    if (conflict.keybinds.length < 2) continue;

    // Smart Detection: Check if they are functionally similar
    const isSameFunction = conflict.keybinds.every(kb => {
      const name = kb.name.toLowerCase();
      return name.includes("spell") || name.includes("cast") || name.includes("ability") || name.includes("skill") || name.includes("hechizo");
    });

    if (isSameFunction) {
      // If they do the same thing, it's COHERENT to have them on the same key
      continue; 
    }

    // If they are different functions (e.g., UI vs Combat), we must suggest separation
    const sorted = [...conflict.keybinds].sort((a, b) => {
      const prioA = MOD_PRIORITIES[a.modSource?.toLowerCase() || ""]?.priority || 50;
      const prioB = MOD_PRIORITIES[b.modSource?.toLowerCase() || ""]?.priority || 50;
      return prioA - prioB;
    });

    const winner = sorted[0];
    const losers = sorted.slice(1);

    for (const loser of losers) {
      const winnerPrio = MOD_PRIORITIES[winner.modSource?.toLowerCase() || ""];
      const loserPrio = MOD_PRIORITIES[loser.modSource?.toLowerCase() || ""];

      // If one is Combat and other is UI/Utility, it's a critical conflict
      const isCritical = (winnerPrio?.category === "combat" && loserPrio?.category !== "combat");

      if (isCritical || (winnerPrio && (!loserPrio || winnerPrio.priority < loserPrio.priority))) {
        suggestions.push({
          key: conflict.key,
          winner,
          loser,
          reason: isCritical 
            ? `Conflicto de uso: la tecla "${conflict.key}" abre un menú (${loserPrio?.modName || loser.modSource}) pero también lanza hechizos (${winnerPrio?.modName}). Se recomienda separarlas.`
            : `Coherencia: ${winnerPrio?.modName} tiene prioridad en la tecla "${conflict.key}" para acciones de ${winnerPrio?.category}.`
        });
      }
    }
  }

  return suggestions;
}
