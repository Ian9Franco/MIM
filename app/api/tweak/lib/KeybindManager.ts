import { Keybind, KeybindConflict } from "./types";

export const STANDARD_KEYBINDS_MAP: Record<string, { name: string; category: string }> = {
  "key_key.forward": { name: "Avanzar (W)", category: "Movimiento" },
  "key_key.left": { name: "Izquierda (A)", category: "Movimiento" },
  "key_key.back": { name: "Retroceder (S)", category: "Movimiento" },
  "key_key.right": { name: "Derecha (D)", category: "Movimiento" },
  "key_key.jump": { name: "Saltar (Space)", category: "Movimiento" },
  "key_key.sneak": { name: "Agacharse (Shift)", category: "Movimiento" },
  "key_key.sprint": { name: "Correr (Ctrl)", category: "Movimiento" },
  "key_key.attack": { name: "Atacar / Destruir", category: "Combate" },
  "key_key.use": { name: "Usar Ítem / Colocar", category: "Interacción" },
  "key_key.inventory": { name: "Inventario (E)", category: "Inventario" },
  "key_key.drop": { name: "Soltar Ítem (Q)", category: "Inventario" },
  "key_key.chat": { name: "Abrir Chat (T)", category: "Multijugador" },
  "key_key.playerlist": { name: "Lista de Jugadores (Tab)", category: "Multijugador" },
  "key_key.screenshot": { name: "Captura de Pantalla (F2)", category: "Misceláneo" },
  "key_key.togglePerspective": { name: "Cambiar Perspectiva (F5)", category: "Misceláneo" },
  "key_key.swapOffhand": { name: "Cambiar de mano (F)", category: "Combate" },
  "key_key.fullscreen": { name: "Pantalla Completa (F11)", category: "Misceláneo" },
};

export function formatKeyName(key: string): string {
  if (!key) return "Sin asignar";
  return key.replace("key.keyboard.", "").replace("key.mouse.", "Mouse ").toUpperCase();
}

export function parseCategoryFromId(id: string): string {
  if (id.startsWith("key_key.")) return "Minecraft Vanilla";
  const parts = id.split("_");
  if (parts.length > 1) {
    const prefix = parts[1].split(".")[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return "General";
}

export function extractModSource(keyId: string): string {
  if (keyId.startsWith("key_key.")) return "minecraft";
  const match = keyId.match(/^key_([^\.]+)\./);
  return match ? match[1] : "unknown";
}

export function detectKeybindConflicts(keybinds: Keybind[]): KeybindConflict[] {
  const byKey: Record<string, Keybind[]> = {};
  for (const kb of keybinds) {
    if (!byKey[kb.key]) byKey[kb.key] = [];
    byKey[kb.key].push(kb);
  }
  const conflicts: KeybindConflict[] = [];
  for (const [key, binds] of Object.entries(byKey)) {
    if (binds.length > 1 && !key.includes("unknown")) {
      const hasCritical = binds.some(b => b.category === "Combate" || b.category === "Movimiento");
      conflicts.push({ key, keybinds: binds, severity: hasCritical ? "critical" : "warning" });
    }
  }
  return conflicts.sort((a, b) => b.keybinds.length - a.keybinds.length);
}

export function groupKeybindsForUI(keybinds: Keybind[]) {
  const vanilla: Keybind[] = [];
  const mods: Record<string, Keybind[]> = {};
  const orphaned: Keybind[] = [];
  for (const kb of keybinds) {
    if (kb.isOrphaned) orphaned.push(kb);
    else if (kb.modSource === "minecraft") vanilla.push(kb);
    else {
      const mod = kb.modSource || "Otros";
      if (!mods[mod]) mods[mod] = [];
      mods[mod].push(kb);
    }
  }
  return { vanilla, mods, orphaned };
}
