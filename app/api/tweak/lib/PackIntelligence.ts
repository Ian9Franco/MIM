/**
 * RESOURCE PACK INTELLIGENCE SYSTEM
 * 
 * ⚠️ IMPORTANT: This system generates WARNINGS AND SUGGESTIONS ONLY.
 * 
 * NO PACKS ARE FILTERED, BLOCKED, OR PREVENTED FROM BEING ACTIVATED.
 * The administrator has full authority to arrange packs in any order, regardless of warnings.
 * 
 * Warnings detected here (incompatibilities, priority issues, etc.) are for INFORMATIONAL purposes only.
 * Users can ignore all warnings and stack packs in any configuration they choose.
 * The "Auto-fix" button is OPTIONAL and respects the user's chosen order.
 * 
 * Version mismatches, pack_format differences, and other compatibility flags DO NOT restrict pack activation.
 * SAGE forces the exact order chosen by the administrator into options.txt without validation.
 */

import { PackRule, PackAnalysis } from "./types";

export const PACK_ALIASES: Record<string, string[]> = {
  "freshanimations": ["freshanimations", "freshanim", "fa"],
  "whimscape": ["whimscape"],
  "patrix": ["patrix"],
  "barebones": ["barebones"],
  "faithful": ["faithful"],
};

export const PACK_RULES: PackRule[] = [
  { 
    id: "fresh-moves-order", type: "priority", source: "Fresh Moves", target: "freshanimations", severity: "warning", 
    message: "Fresh Moves debe estar arriba de Fresh Animations", 
    explanation: "Fresh Moves es un addon de Fresh Animations y debe sobreescribir sus archivos para funcionar.",
    autoFixable: true,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "fresh-player-extension-order", type: "priority", source: "Player Extension", target: "freshanimations", severity: "warning", 
    message: "Player Extension debe estar ARRIBA del pack base de Fresh Animations", 
    explanation: "Player Extension modifica los modelos de los jugadores. Si queda abajo, Fresh Animations romperá el modelo del jugador.",
    autoFixable: true,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "better-leaves-overlay", type: "overlay", source: "Better Leaves", target: "faithful", severity: "info", 
    message: "Better Leaves debería estar arriba de Faithful", 
    explanation: "Para que las hojas frondosas de Better Leaves se vean, deben sobreescribir las texturas de hojas de packs más grandes como Faithful.",
    autoFixable: true,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "visible-ores-overlay", type: "overlay", source: "Visible Ores", target: "faithful", severity: "info", 
    message: "Visible Ores debe estar arriba del pack base", 
    explanation: "Visible Ores solo modifica los bordes de los minerales. Debe estar arriba para que no lo tape la textura base del mineral.",
    autoFixable: true,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "fresh-moves-dep", type: "dependency", source: "Fresh Moves", target: "freshanimations", severity: "critical", 
    message: "Fresh Moves requiere Fresh Animations", 
    explanation: "Fresh Moves is una expansión de Fresh Animations. Si no activas el pack base, verás glitches visuales horribles.",
    autoFixable: false,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "fresh-moves-mod-emf", type: "mod_dependency", source: "Fresh Moves", target: "entity_model_features", severity: "critical", 
    message: "Fresh Moves requiere el mod Entity Model Features (EMF)", 
    explanation: "Sin el mod EMF, Minecraft no sabe cómo interpretar las animaciones personalizadas de este pack.",
    autoFixable: false,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "fresh-moves-mod-etf", type: "mod_dependency", source: "Fresh Moves", target: "entity_texture_features", severity: "critical", 
    message: "Fresh Moves requiere el mod Entity Texture Features (ETF)", 
    explanation: "El mod ETF es necesario para que las texturas de los mobs animados se carguen correctamente.",
    autoFixable: false,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "redone-enderman-order", type: "priority", source: "Redone Endermans", target: "freshanimations", severity: "info", 
    message: "Redone Endermans funciona mejor arriba de Fresh Animations", 
    explanation: "Este pack sobreescribe específicamente al Enderman. Debe estar arriba para que Fresh Animations no use su modelo genérico.",
    autoFixable: true,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "complementary-shaders-dep", type: "shader_conflict", source: "Complementary Shaders", target: "patrix", severity: "warning", 
    message: "Complementary puede tener problemas con Patrix", 
    explanation: "Patrix usa mapas de normales muy específicos que a veces no se llevan bien con Complementary sin configurar el shader.",
    autoFixable: false,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "patrix-bare-bones", type: "incompatibility", source: "patrix", target: "barebones", severity: "critical", 
    message: "Patrix y Bare Bones incompatibles", 
    explanation: "Patrix es ultra-realista y Bare Bones es ultra-simple. Usarlos juntos no tiene sentido y causará fallos en los materiales.",
    autoFixable: false,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  { 
    id: "fresh-animations-low-res", type: "incompatibility", source: "freshanimations", target: "Low Resolution Mobs", severity: "warning", 
    message: "Fresh Animations en conflicto con Low Res Mobs", 
    explanation: "Ambos intentan modificar los modelos de los mismos mobs. Uno de los dos no funcionará.",
    autoFixable: false,
    confidence: "high",
    detectionMethod: "hardcoded_rule"
  },
  
  // New rules requested by the user
  { id: "whimscape-fresh-animations", type: "priority", source: "Whimscape x Fresh Animations", target: "freshanimations", severity: "warning", message: "Whimscape x Fresh Animations debe estar ARRIBA de Fresh Animations", explanation: "Es un addon de compatibilidad, debe ir arriba para aplicar los cambios.", autoFixable: true, confidence: "high", detectionMethod: "hardcoded_rule" },
  { id: "fresh-animations-whimscape", type: "priority", source: "freshanimations", target: "whimscape", severity: "warning", message: "Fresh Animations debe estar ARRIBA de Whimscape", explanation: "Las animaciones deben procesarse antes que las texturas del pack base.", autoFixable: true, confidence: "high", detectionMethod: "hardcoded_rule" },
  { id: "more-mob-variants-fresh-animations", type: "priority", source: "More Mob Variants x Fresh Animations", target: "freshanimations", severity: "warning", message: "More Mob Variants x Fresh Animations debe estar ARRIBA de Fresh Animations", explanation: "Es un addon, debe ir arriba del pack base.", autoFixable: true, confidence: "high", detectionMethod: "hardcoded_rule" },
];

// Aggressive name normalization
export function normalizePackName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^file\//, "")
    .replace(/\.zip$/, "")
    .replace(/[-_]v?\d+(\.\d+)+.*$/, "") // Remove version at the end
    .replace(/[-_](forge|fabric|neoforge|quilt)([-_]|$)/, "") 
    .replace(/[^a-z0-9]/g, ""); // Remove all non-alphanumeric
}

// God-Level Matcher: Exact > Alias > Fuzzy
export function findBestMatch(targetId: string, normalizedPacks: string[]): number {
  const aliases = PACK_ALIASES[targetId] || [targetId];
  
  // 1. Exact match with any alias
  for (const alias of aliases) {
    const idx = normalizedPacks.indexOf(alias);
    if (idx !== -1) return idx;
  }
  
  // 2. Contains match (as a fallback)
  for (const alias of aliases) {
    const idx = normalizedPacks.findIndex(p => p.includes(alias));
    if (idx !== -1) return idx;
  }
  
  return -1;
}

export function analyzePackOrder(activePacks: string[], installedMods: Set<string> = new Set()) {
  const visualStack: PackAnalysis[] = [];
  const issues: PackRule[] = [];
  const autoFixable: PackRule[] = [];

  const normalizedPacks = activePacks.map(normalizePackName);

  for (let i = activePacks.length - 1; i >= 0; i--) {
    const packName = activePacks[i];
    const cleanName = packName.replace("file/", "").replace(".zip", "");
    const normName = normalizedPacks[i];
    
    const analysis: PackAnalysis = { 
      packName, 
      displayName: cleanName, 
      priority: activePacks.length - i, 
      warnings: [], 
      dependencies: [], 
      overlays: [],
      needsPriority: false
    };

    // 1. Check Hardcoded Rules
    for (const rule of PACK_RULES) {
      const normSource = normalizePackName(rule.source);
      
      // Use exact match or alias match for rules
      const isMatch = normName === normSource || (PACK_ALIASES[normSource] && PACK_ALIASES[normSource].includes(normName));

      if (isMatch) {
        if (rule.type === "priority" || rule.type === "overlay") {
          analysis.needsPriority = true;
        }

        const targetIdx = findBestMatch(normalizePackName(rule.target), normalizedPacks);
        if (targetIdx !== -1) {
          const visualIdx = activePacks.length - 1 - i;
          const targetVisualIdx = activePacks.length - 1 - targetIdx;
          
          if ((rule.type === "priority" || rule.type === "overlay") && visualIdx < targetVisualIdx) {
            analysis.warnings.push(rule); 
            if (!issues.some(iss => iss.id === rule.id)) issues.push(rule);
            if (rule.autoFixable && !autoFixable.some(af => af.id === rule.id)) autoFixable.push(rule);
          } else if (rule.type === "incompatibility") {
            analysis.warnings.push(rule); 
            if (!issues.some(iss => iss.id === rule.id)) issues.push({ ...rule, severity: "critical" });
          }
        } else if (rule.type === "dependency") {
          analysis.dependencies.push(rule); 
          if (!issues.some(iss => iss.id === rule.id)) issues.push(rule);
        } else if (rule.type === "mod_dependency") {
          if (!installedMods.has(rule.target.toLowerCase())) {
            analysis.warnings.push(rule);
            if (!issues.some(iss => iss.id === rule.id)) issues.push(rule);
          }
        }
      }
    }

    //  dynamic Addon Detection
    for (let j = 0; j < activePacks.length; j++) {
      if (i === j) continue;
      const otherNorm = normalizedPacks[j];
      const otherPack = activePacks[j];
      
      if (otherNorm.length < 4) continue;

      const isAddonIndicator = packName.toLowerCase().includes(" x ") || 
                               packName.toLowerCase().includes(" + ") || 
                               packName.toLowerCase().includes("addon") ||
                               packName.toLowerCase().includes("compat");
                               
      // Use Alias Map for FA
      const isFaAlias = normName.includes("fa") || normName.includes("freshanim");
      const isOtherFa = otherNorm.includes("freshanimations");
      const matchesFaAlias = isFaAlias && isOtherFa;

      if ((normName.includes(otherNorm) && normName !== otherNorm && isAddonIndicator) || matchesFaAlias) {
        analysis.needsPriority = true;
        
        const visualIdx = activePacks.length - 1 - i;
        const targetVisualIdx = activePacks.length - 1 - j;
        
        if (visualIdx < targetVisualIdx) {
          const dynamicRule: PackRule = {
            id: `auto-addon-${normName}-${otherNorm}`,
            type: "priority",
            source: cleanName,
            target: otherPack.replace("file/", "").replace(".zip", ""),
            severity: "warning",
            message: `${cleanName} parece ser un addon de ${otherPack} y debería estar ARRIBA`,
            explanation: "Los addons de texturas modifican archivos del pack base. Si quedan abajo, el pack base ganará y el addon no se verá.",
            autoFixable: true,
            confidence: "medium",
            detectionMethod: "dynamic_addon_guess"
          };
          
          analysis.warnings.push(dynamicRule);
          if (!issues.some(iss => iss.id === dynamicRule.id)) issues.push(dynamicRule);
          if (!autoFixable.some(af => af.id === dynamicRule.id)) autoFixable.push(dynamicRule);
        }
      }
    }

    visualStack.push(analysis);
  }
  return { visualStack, issues, autoFixable };
}

// God-Level AutoFix using Topological Sort (DAG)
export function autoFixPackOrder(activePacks: string[]): string[] {
  const nodes = [...activePacks];
  const edges: [string, string][] = [];
  const edgeSet = new Set<string>();
  
  const normalizedPacks = activePacks.map(normalizePackName);

  function addEdge(u: string, v: string) {
    const key = `${u}->${v}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push([u, v]);
    }
  }

  // 1. Build edges from Hardcoded Rules
  for (const rule of PACK_RULES) {
    if (!rule.autoFixable || (rule.type !== "priority" && rule.type !== "overlay")) continue;
    
    const normSource = normalizePackName(rule.source);
    
    const srcIdx = normalizedPacks.findIndex(p => p === normSource || (PACK_ALIASES[normSource] && PACK_ALIASES[normSource].includes(p)));
    const tgtIdx = findBestMatch(normalizePackName(rule.target), normalizedPacks);
    
    if (srcIdx !== -1 && tgtIdx !== -1) {
      addEdge(activePacks[srcIdx], activePacks[tgtIdx]);
    }
  }

  // 2. Build edges from Dynamic Addon Detection
  for (let i = 0; i < activePacks.length; i++) {
    const normName = normalizedPacks[i];
    const packName = activePacks[i];

    for (let j = 0; j < activePacks.length; j++) {
      if (i === j) continue;
      const otherNorm = normalizedPacks[j];
      
      if (otherNorm.length < 4) continue;

      const isAddonIndicator = packName.toLowerCase().includes(" x ") || 
                               packName.toLowerCase().includes(" + ") || 
                               packName.toLowerCase().includes("addon") ||
                               packName.toLowerCase().includes("compat");
                               
      const matchesFaAlias = (packName.toLowerCase().includes(" x fa") || 
                              packName.toLowerCase().includes(" + fa")) && 
                             otherNorm.includes("freshanimations");

      if ((normName.includes(otherNorm) && normName !== otherNorm && isAddonIndicator) || matchesFaAlias) {
        addEdge(activePacks[i], activePacks[j]);
      }
    }
  }

  // 3. Topological Sort (Kahn's Algorithm with Pointer)
  const adjList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  for (const node of nodes) {
    adjList[node] = [];
    inDegree[node] = 0;
  }
  
  for (const [u, v] of edges) {
    if (adjList[u] && adjList[v]) {
      adjList[u].push(v);
      inDegree[v]++;
    }
  }
  
  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree[node] === 0) queue.push(node);
  }
  
  const sorted: string[] = [];
  let pointer = 0; // Optimization: Use pointer instead of shift()
  while (pointer < queue.length) {
    const u = queue[pointer++];
    sorted.push(u);
    
    for (const v of adjList[u]) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }
  
  if (sorted.length !== nodes.length) {
    console.warn("MIM: Cycle detected in resource pack dependencies.");
    const cycle = findCycle(nodes, edges);
    if (cycle) {
      console.warn("MIM: Conflicting cycle found:", cycle.join(" -> "));
    }
    const left = nodes.filter(n => !sorted.includes(n));
    sorted.push(...left);
  }

  return sorted.reverse();
}

function findCycle(nodes: string[], edges: [string, string][]): string[] | null {
  const adjList: Record<string, string[]> = {};
  for (const node of nodes) adjList[node] = [];
  for (const [u, v] of edges) adjList[u].push(v);

  const visited: Record<string, number> = {}; 
  for (const node of nodes) visited[node] = 0;

  const path: string[] = [];

  function dfs(u: string): string[] | null {
    visited[u] = 1;
    path.push(u);

    for (const v of adjList[u]) {
      if (visited[v] === 1) {
        const cycleStart = path.indexOf(v);
        return path.slice(cycleStart).concat(v);
      }
      if (visited[v] === 0) {
        const result = dfs(v);
        if (result) return result;
      }
    }

    visited[u] = 2;
    path.pop();
    return null;
  }

  for (const node of nodes) {
    if (visited[node] === 0) {
      const cycle = dfs(node);
      if (cycle) return cycle;
    }
  }

  return null;
}
