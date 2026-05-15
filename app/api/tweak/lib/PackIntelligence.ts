import { PackRule, PackAnalysis } from "./types";

export const PACK_RULES: PackRule[] = [
  { id: "fresh-animations-order", type: "priority", source: "Fresh Animations", target: "Fresh Moves", severity: "warning", message: "Fresh Animations debe estar arriba de Fresh Moves para evitar fallos visuales", autoFixable: true },
  { id: "fresh-player-extension-order", type: "priority", source: "Player Extension", target: "Fresh Animations", severity: "warning", message: "Player Extension debe estar ARRIBA del pack base de Fresh Animations", autoFixable: true },
  { id: "better-leaves-overlay", type: "overlay", source: "Better Leaves", target: "Faithful", severity: "info", message: "Better Leaves debería estar arriba de Faithful", autoFixable: true },
  { id: "visible-ores-overlay", type: "overlay", source: "Visible Ores", target: "Faithful", severity: "info", message: "Visible Ores debe estar arriba del pack base", autoFixable: true },
  { id: "fresh-moves-dep", type: "dependency", source: "Fresh Moves", target: "Fresh Animations", severity: "critical", message: "Fresh Moves requiere Fresh Animations", autoFixable: false },
  { id: "fresh-moves-mod-emf", type: "mod_dependency", source: "Fresh Moves", target: "entity_model_features", severity: "critical", message: "Fresh Moves requiere el mod Entity Model Features (EMF)", autoFixable: false },
  { id: "fresh-moves-mod-etf", type: "mod_dependency", source: "Fresh Moves", target: "entity_texture_features", severity: "critical", message: "Fresh Moves requiere el mod Entity Texture Features (ETF)", autoFixable: false },
  { id: "redone-enderman-order", type: "priority", source: "Redone Endermans", target: "Fresh Animations", severity: "info", message: "Redone Endermans funciona mejor arriba de Fresh Animations", autoFixable: true },
  { id: "complementary-shaders-dep", type: "shader_conflict", source: "Complementary Shaders", target: "Patrix", severity: "warning", message: "Complementary puede tener problemas con Patrix", autoFixable: false },
  { id: "patrix-bare-bones", type: "incompatibility", source: "Patrix", target: "Bare Bones", severity: "critical", message: "Patrix y Bare Bones incompatibles", autoFixable: false },
  { id: "fresh-animations-low-res", type: "incompatibility", source: "Fresh Animations", target: "Low Resolution Mobs", severity: "warning", message: "Fresh Animations en conflicto con Low Res Mobs", autoFixable: false },
];

export function analyzePackOrder(activePacks: string[], installedMods: Set<string> = new Set()) {
  const visualStack: PackAnalysis[] = [];
  const issues: PackRule[] = [];
  const autoFixable: PackRule[] = [];

  for (let i = activePacks.length - 1; i >= 0; i--) {
    const packName = activePacks[i];
    const cleanName = packName.replace("file/", "").replace(".zip", "").replace(/_v?[\d\.]+.*$/, "");
    const analysis: PackAnalysis = { packName, displayName: cleanName, priority: activePacks.length - i, warnings: [], dependencies: [], overlays: [] };

    for (const rule of PACK_RULES) {
      if (cleanName.toLowerCase().includes(rule.source.toLowerCase())) {
        const targetIdx = activePacks.findIndex(p => p.toLowerCase().includes(rule.target.toLowerCase()));
        if (targetIdx !== -1) {
          const visualIdx = activePacks.length - 1 - i;
          const targetVisualIdx = activePacks.length - 1 - targetIdx;
          if ((rule.type === "priority" || rule.type === "overlay") && visualIdx > targetVisualIdx) {
            analysis.warnings.push(rule); issues.push(rule);
            if (rule.autoFixable) autoFixable.push(rule);
          } else if (rule.type === "incompatibility") {
            analysis.warnings.push(rule); issues.push({ ...rule, severity: "critical" });
          }
        } else if (rule.type === "dependency") {
          analysis.dependencies.push(rule); issues.push(rule);
        } else if (rule.type === "mod_dependency") {
          if (!installedMods.has(rule.target.toLowerCase())) {
            analysis.warnings.push(rule);
            issues.push(rule);
          }
        }
      }
    }
    visualStack.push(analysis);
  }
  return { visualStack, issues, autoFixable };
}

export function autoFixPackOrder(activePacks: string[]): string[] {
  const fixed = [...activePacks];
  let changed = true;
  for (let iter = 0; iter < 10 && changed; iter++) {
    changed = false;
    for (const rule of PACK_RULES) {
      if (!rule.autoFixable || (rule.type !== "priority" && rule.type !== "overlay")) continue;
      const src = fixed.findIndex(p => p.toLowerCase().includes(rule.source.toLowerCase()));
      const tgt = fixed.findIndex(p => p.toLowerCase().includes(rule.target.toLowerCase()));
      if (src !== -1 && tgt !== -1 && src < tgt) {
        const [p] = fixed.splice(src, 1);
        fixed.splice(tgt, 0, p);
        changed = true;
      }
    }
  }
  return fixed;
}
