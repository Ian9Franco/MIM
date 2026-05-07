/**
 * /api/tweak — GET / POST
 * ─────────────────────────────────────────────────────────────────────────────
 * MIM Tweak API - Minecraft Configuration OS
 * 
 * Features:
 * - Pack Intelligence System: Rule Engine para dependencias, conflictos, overlays
 * - Smart Snapshot System: Metadatos JSON, partial restore, modpack hashing
 * - Keybind Analysis Engine: Conflict detection, orphaned binds, press-to-detect
 * 
 * Query GET: ?projectName=test&version=1.20.1&ram=8&gpu=integrated
 * Body POST: { projectName, version, action, ... }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { getSettings } from "@/lib/settings";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Keybind {
  id: string;
  name: string;
  key: string;
  category: string;
  modSource?: string;
  conflicts?: string[];
  isOrphaned?: boolean;
}

interface PackRule {
  id: string;
  type: "priority" | "incompatibility" | "dependency" | "overlay" | "shader_conflict";
  source: string;
  target: string;
  severity: "info" | "warning" | "critical";
  message: string;
  autoFixable?: boolean;
}

interface PackAnalysis {
  packName: string;
  displayName: string;
  priority: number;
  warnings: PackRule[];
  dependencies: PackRule[];
  overlays: PackRule[];
}

interface SnapshotMetadata {
  id: string;
  timestamp: string;
  profileName: string;
  minecraftVersion: string;
  loader: string;
  modpackHash: string;
  modsInstalled: number;
  keybindCount: number;
  resourcePackStack: string[];
  notes?: string;
}

interface KeybindConflict {
  key: string;
  keybinds: Keybind[];
  severity: "warning" | "critical";
}

interface SnapshotData {
  metadata: SnapshotMetadata;
  options: Record<string, string>;
}

// Map of standard keys to beautiful names and categories
const STANDARD_KEYBINDS_MAP: Record<string, { name: string; category: string }> = {
  "key_key.forward": { name: "Avanzar (W)", category: "Movimiento" },
  "key_key.left": { name: "Izquierda (A)", category: "Movimiento" },
  "key_key.back": { name: "Retroceder (S)", category: "Movimiento" },
  "key_key.right": { name: "Derecha (D)", category: "Movimiento" },
  "key_key.jump": { name: "Saltar (Space)", category: "Movimiento" },
  "key_key.sneak": { name: "Agacharse (Shift)", category: "Movimiento" },
  "key_key.sprint": { name: "Correr (Ctrl)", category: "Movimiento" },
  "key_key.attack": { name: "Atacar / Destruir (Click Izq)", category: "Combate" },
  "key_key.use": { name: "Usar Ítem / Colocar (Click Der)", category: "Interacción" },
  "key_key.inventory": { name: "Inventario (E)", category: "Inventario" },
  "key_key.drop": { name: "Soltar Ítem (Q)", category: "Inventario" },
  "key_key.chat": { name: "Abrir Chat (T)", category: "Multijugador" },
  "key_key.playerlist": { name: "Lista de Jugadores (Tab)", category: "Multijugador" },
  "key_key.screenshot": { name: "Captura de Pantalla (F2)", category: "Misceláneo" },
  "key_key.togglePerspective": { name: "Cambiar Perspectiva (F5)", category: "Misceláneo" },
  "key_key.swapOffhand": { name: "Cambiar de mano (F)", category: "Combate" },
  "key_key.saveHotbarActivator": { name: "Guardar Acceso Rápido", category: "Inventario" },
  "key_key.loadHotbarActivator": { name: "Cargar Acceso Rápido", category: "Inventario" },
  "key_key.fullscreen": { name: "Pantalla Completa (F11)", category: "Misceláneo" },
  "key_key.smoothCamera": { name: "Cámara Cinemática", category: "Misceláneo" },
  "key_key.spectatorOutlines": { name: "Resaltar Espectadores", category: "Multijugador" },
  "key_key.advancements": { name: "Avances / Logros (L)", category: "Misceláneo" },
  "key_key.command": { name: "Escribir Comando (/) ", category: "Multijugador" },
  "key_key.socialInteractions": { name: "Interacciones Sociales (P)", category: "Multijugador" },
};

// ============================================================================
// PACK INTELLIGENCE SYSTEM - RULE ENGINE
// ============================================================================

/**
 * Base de conocimiento de reglas entre resource packs.
 * Esto permite detectar dependencias, conflictos, overlays, etc.
 */
const PACK_RULES: PackRule[] = [
  // Priority rules (orden correcto)
  {
    id: "fresh-animations-order",
    type: "priority",
    source: "FreshAnimations",
    target: "Fresh Moves",
    severity: "warning",
    message: "Fresh Animations debe estar arriba de Fresh Moves para que los ojos animados funcionen correctamente",
    autoFixable: true,
  },
  {
    id: "better-leaves-overlay",
    type: "overlay",
    source: "Better Leaves",
    target: "Faithful",
    severity: "info",
    message: "Better Leaves debería estar arriba de Faithful para mejorar la apariencia de hojas",
    autoFixable: true,
  },
  {
    id: "visible-ores-overlay",
    type: "overlay",
    source: "Visible Ores",
    target: "Faithful",
    severity: "info",
    message: "Visible Ores debe estar arriba del pack base de texturas",
    autoFixable: true,
  },
  // Dependencies
  {
    id: "fresh-moves-dep",
    type: "dependency",
    source: "Fresh Moves",
    target: "FreshAnimations",
    severity: "critical",
    message: "Fresh Moves requiere Fresh Animations para funcionar",
    autoFixable: false,
  },
  {
    id: "complementary-shaders-dep",
    type: "shader_conflict",
    source: "Complementary Shaders",
    target: "Patrix",
    severity: "warning",
    message: "Complementary Shaders puede tener problemas con texturas de alta resolución como Patrix",
    autoFixable: false,
  },
  // Incompatibilities
  {
    id: "patrix-bare-bones",
    type: "incompatibility",
    source: "Patrix",
    target: "Bare Bones",
    severity: "critical",
    message: "Patrix y Bare Bones no deberían usarse juntos - estilos visuales incompatibles",
    autoFixable: false,
  },
  {
    id: "fresh-animations-low-res",
    type: "incompatibility",
    source: "FreshAnimations",
    target: "Low Resolution Mobs",
    severity: "warning",
    message: "FreshAnimations entra en conflicto con Low Resolution Mobs",
    autoFixable: false,
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatKeyName(key: string): string {
  if (!key) return "Sin asignar";
  return key
    .replace("key.keyboard.", "")
    .replace("key.mouse.", "Mouse ")
    .toUpperCase();
}

function parseCategoryFromId(id: string): string {
  if (id.startsWith("key_key.")) {
    return "Minecraft Vanilla";
  }
  const parts = id.split("_");
  if (parts.length > 1) {
    const prefix = parts[1].split(".")[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return "General";
}

function extractModSource(keyId: string): string {
  if (keyId.startsWith("key_key.")) return "minecraft";
  const match = keyId.match(/^key_([^\.]+)\./);
  return match ? match[1] : "unknown";
}

/**
 * Calcula hash del modpack para tracking de snapshots
 */
function calculateModpackHash(projectDir: string): string {
  const modsDir = path.join(projectDir, "mods");
  if (!fs.existsSync(modsDir)) return "no-mods";
  
  try {
    const files: string[] = [];
    const subs = fs.readdirSync(modsDir);
    for (const sub of subs) {
      const subPath = path.join(modsDir, sub);
      if (fs.statSync(subPath).isDirectory()) {
        files.push(...fs.readdirSync(subPath).filter(f => f.endsWith(".jar")));
      } else if (sub.endsWith(".jar")) {
        files.push(sub);
      }
    }
    return crypto.createHash("md5").update(files.sort().join(",")).digest("hex").slice(0, 12);
  } catch (e) {
    return "error";
  }
}

function getModCount(projectDir: string): number {
  let count = 0;
  const modsDir = path.join(projectDir, "mods");
  if (fs.existsSync(modsDir)) {
    try {
      const subs = fs.readdirSync(modsDir);
      for (const sub of subs) {
        const subPath = path.join(modsDir, sub);
        if (fs.statSync(subPath).isDirectory()) {
          const files = fs.readdirSync(subPath);
          count += files.filter(f => f.endsWith(".jar")).length;
        } else if (sub.endsWith(".jar")) {
          count++;
        }
      }
    } catch (e) {}
  }
  return count;
}

// ============================================================================
// PACK INTELLIGENCE - ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analiza el orden de resource packs y detecta problemas
 * usando el Rule Engine.
 */
function analyzePackOrder(activePacks: string[]): {
  visualStack: PackAnalysis[];
  issues: PackRule[];
  autoFixable: PackRule[];
} {
  const visualStack: PackAnalysis[] = [];
  const issues: PackRule[] = [];
  const autoFixable: PackRule[] = [];

  // Minecraft: último en array = mayor prioridad (top visual)
  // Pero mostramos invertido: primero en array = abajo, último = arriba
  for (let i = activePacks.length - 1; i >= 0; i--) {
    const packName = activePacks[i];
    const cleanName = packName
      .replace("file/", "")
      .replace(".zip", "")
      .replace(/_v?[\d\.]+.*$/, "");

    const packAnalysis: PackAnalysis = {
      packName,
      displayName: cleanName,
      priority: activePacks.length - i, // Mayor número = mayor prioridad visual
      warnings: [],
      dependencies: [],
      overlays: [],
    };

    // Buscar reglas aplicables
    for (const rule of PACK_RULES) {
      const sourceMatch = cleanName.toLowerCase().includes(rule.source.toLowerCase());
      
      if (sourceMatch) {
        // Buscar si el target existe en la lista
        const targetIndex = activePacks.findIndex(p => 
          p.toLowerCase().includes(rule.target.toLowerCase())
        );

        if (targetIndex !== -1) {
          const currentVisualIndex = activePacks.length - 1 - i; // Posición visual (0 = arriba)
          const targetVisualIndex = activePacks.length - 1 - targetIndex;

          // Para priority y overlay: source debe estar arriba (menor índice visual)
          if ((rule.type === "priority" || rule.type === "overlay") && currentVisualIndex > targetVisualIndex) {
            packAnalysis.warnings.push(rule);
            issues.push(rule);
            if (rule.autoFixable) autoFixable.push(rule);
          }
          // Para dependency: verificar que target existe
          else if (rule.type === "dependency" && targetIndex === -1) {
            packAnalysis.dependencies.push(rule);
            issues.push(rule);
          }
          // Para incompatibility: siempre reportar
          else if (rule.type === "incompatibility") {
            packAnalysis.warnings.push(rule);
            issues.push({ ...rule, severity: "critical" });
          }
        } else if (rule.type === "dependency") {
          // Falta dependencia
          packAnalysis.dependencies.push(rule);
          issues.push(rule);
        }
      }
    }

    visualStack.push(packAnalysis);
  }

  return { visualStack, issues, autoFixable };
}

/**
 * Corrige automáticamente el orden de packs según las reglas
 */
function autoFixPackOrder(activePacks: string[]): string[] {
  const fixed = [...activePacks];
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    for (const rule of PACK_RULES) {
      if (!rule.autoFixable || (rule.type !== "priority" && rule.type !== "overlay")) continue;

      const sourceIndex = fixed.findIndex(p => 
        p.toLowerCase().includes(rule.source.toLowerCase())
      );
      const targetIndex = fixed.findIndex(p => 
        p.toLowerCase().includes(rule.target.toLowerCase())
      );

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Source debe estar después de target (mayor índice = mayor prioridad)
        if (sourceIndex < targetIndex) {
          // Mover source después de target
          const [sourcePack] = fixed.splice(sourceIndex, 1);
          fixed.splice(targetIndex, 0, sourcePack);
          changed = true;
        }
      }
    }
  }

  return fixed;
}

// ============================================================================
// KEYBIND ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Detecta keybinds huérfanos (mods que ya no están instalados)
 */
function detectOrphanedKeybinds(
  keybinds: Keybind[],
  installedMods: Set<string>
): Keybind[] {
  return keybinds.filter(kb => {
    if (kb.modSource === "minecraft" || kb.modSource === "unknown") return false;
    return !installedMods.has(kb.modSource?.toLowerCase() || "");
  }).map(kb => ({ ...kb, isOrphaned: true }));
}

/**
 * Detecta conflictos de teclas (misma tecla asignada a múltiples acciones)
 */
function detectKeybindConflicts(keybinds: Keybind[]): KeybindConflict[] {
  const byKey: Record<string, Keybind[]> = {};

  for (const kb of keybinds) {
    if (!byKey[kb.key]) byKey[kb.key] = [];
    byKey[kb.key].push(kb);
  }

  const conflicts: KeybindConflict[] = [];

  for (const [key, binds] of Object.entries(byKey)) {
    if (binds.length > 1 && !key.includes("unknown")) {
      // Determinar severidad
      const hasCritical = binds.some(b => 
        b.category === "Combate" || b.category === "Movimiento"
      );
      
      conflicts.push({
        key,
        keybinds: binds,
        severity: hasCritical ? "critical" : "warning",
      });
    }
  }

  return conflicts.sort((a, b) => 
    b.keybinds.length - a.keybinds.length
  );
}

/**
 * Agrupa keybinds por categoría colapsable para la UI
 */
function groupKeybindsForUI(keybinds: Keybind[]): {
  vanilla: Keybind[];
  mods: Record<string, Keybind[]>;
  orphaned: Keybind[];
} {
  const vanilla: Keybind[] = [];
  const mods: Record<string, Keybind[]> = {};
  const orphaned: Keybind[] = [];

  for (const kb of keybinds) {
    if (kb.isOrphaned) {
      orphaned.push(kb);
    } else if (kb.modSource === "minecraft") {
      vanilla.push(kb);
    } else {
      const mod = kb.modSource || "Otros";
      if (!mods[mod]) mods[mod] = [];
      mods[mod].push(kb);
    }
  }

  return { vanilla, mods, orphaned };
}

/**
 * Busca keybinds por tecla específica (para press-to-detect)
 */
function findKeybindsByPress(
  keybinds: Keybind[],
  pressedKey: string
): Keybind[] {
  const normalizedKey = pressedKey.toLowerCase().replace("key.keyboard.", "");
  
  return keybinds.filter(kb => {
    const kbKey = kb.key.toLowerCase().replace("key.keyboard.", "");
    return kbKey === normalizedKey || kbKey === pressedKey.toLowerCase();
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");
    const version = searchParams.get("version");
    const ramParam = searchParams.get("ram");
    const gpuParam = searchParams.get("gpu") || "dedicated";
    const loader = searchParams.get("loader") || "forge";

    if (!projectName || !version) {
      return NextResponse.json({ error: "Missing projectName or version" }, { status: 400 });
    }

    const { sourceBase } = getSettings();
    const projectDir = path.join(sourceBase, "_projects", projectName);
    const optionsPath = path.join(projectDir, "options.txt");

    // Get installed mods for orphan detection
    const installedMods = new Set<string>();
    const modsDir = path.join(projectDir, "mods");
    if (fs.existsSync(modsDir)) {
      try {
        const subs = fs.readdirSync(modsDir);
        for (const sub of subs) {
          const subPath = path.join(modsDir, sub);
          if (fs.statSync(subPath).isDirectory()) {
            const files = fs.readdirSync(subPath);
            files.filter(f => f.endsWith(".jar")).forEach(f => {
              const modId = f.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase();
              installedMods.add(modId);
            });
          } else if (sub.endsWith(".jar")) {
            const modId = sub.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase();
            installedMods.add(modId);
          }
        }
      } catch (e) {}
    }

    const responseData: any = {
      optionsExists: false,
      keybinds: [],
      keybindsGrouped: { vanilla: [], mods: {}, orphaned: [] },
      keybindConflicts: [],
      settings: {},
      resourcePacks: { 
        active: [], 
        available: [],
        visualStack: [],
        issues: [],
        autoFixable: []
      },
      recommendations: [],
      snapshots: [],
      modCount: 0,
    };

    // 1. Check if options.txt exists and parse it
    if (fs.existsSync(optionsPath)) {
      responseData.optionsExists = true;

      const fileContent = fs.readFileSync(optionsPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);

      const keybindsList: Keybind[] = [];
      const settingsMap: Record<string, string> = {};
      let activePacks: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const separatorIdx = trimmed.indexOf(":");
        if (separatorIdx === -1) continue;

        const key = trimmed.slice(0, separatorIdx);
        const val = trimmed.slice(separatorIdx + 1);

        if (key.startsWith("key_")) {
          const standardInfo = STANDARD_KEYBINDS_MAP[key];
          const modSource = extractModSource(key);
          keybindsList.push({
            id: key,
            name: standardInfo ? standardInfo.name : `${key.replace("key_", "").replace("key.", "")} (${formatKeyName(val)})`,
            key: val,
            category: standardInfo ? standardInfo.category : parseCategoryFromId(key),
            modSource,
            isOrphaned: false,
          });
        } else if (key === "resourcePacks") {
          try {
            activePacks = JSON.parse(val);
          } catch (e) {
            activePacks = [];
          }
        } else {
          settingsMap[key] = val;
        }
      }

      // Detect orphaned keybinds
      const orphaned = detectOrphanedKeybinds(keybindsList, installedMods);
      orphaned.forEach(o => {
        const idx = keybindsList.findIndex(k => k.id === o.id);
        if (idx !== -1) keybindsList[idx].isOrphaned = true;
      });

      // Detect conflicts
      const conflicts = detectKeybindConflicts(keybindsList);
      conflicts.forEach(conflict => {
        conflict.keybinds.forEach(kb => {
          const idx = keybindsList.findIndex(k => k.id === kb.id);
          if (idx !== -1) {
            if (!keybindsList[idx].conflicts) keybindsList[idx].conflicts = [];
            keybindsList[idx].conflicts!.push(conflict.key);
          }
        });
      });

      // Group for UI
      const grouped = groupKeybindsForUI(keybindsList);

      // Analyze packs
      const packAnalysis = analyzePackOrder(activePacks);

      responseData.keybinds = keybindsList;
      responseData.keybindsGrouped = grouped;
      responseData.keybindConflicts = conflicts;
      responseData.settings = settingsMap;
      responseData.resourcePacks.active = activePacks;
      responseData.resourcePacks.visualStack = packAnalysis.visualStack;
      responseData.resourcePacks.issues = packAnalysis.issues;
      responseData.resourcePacks.autoFixable = packAnalysis.autoFixable;
    }

    // 2. Fetch available resourcepacks in project
    const rpDir = path.join(projectDir, "resourcepacks");
    if (fs.existsSync(rpDir)) {
      try {
        const files = fs.readdirSync(rpDir);
        responseData.resourcePacks.available = files.filter(f => f.endsWith(".zip") || fs.statSync(path.join(rpDir, f)).isDirectory());
      } catch (e) {}
    }

    // 3. Scan for smart snapshot profiles (JSON metadata + options data)
    if (fs.existsSync(projectDir)) {
      try {
        const files = fs.readdirSync(projectDir);
        const snapshots: SnapshotMetadata[] = [];
        
        for (const f of files) {
          if (f.startsWith("mim_snapshot_") && f.endsWith(".json")) {
            try {
              const metaPath = path.join(projectDir, f);
              const metaContent = fs.readFileSync(metaPath, "utf-8");
              const metadata: SnapshotMetadata = JSON.parse(metaContent);
              snapshots.push(metadata);
            } catch (e) {
              // Skip invalid snapshots
            }
          }
        }
        
        // Sort by timestamp desc
        snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        responseData.snapshots = snapshots;
      } catch (e) {}
    }

    // 4. Smart Recommendations
    const modCount = getModCount(projectDir);
    const ramAllocated = ramParam ? parseInt(ramParam) : 8;
    const hasIntegratedGpu = gpuParam.toLowerCase() === "integrated" || gpuParam.toLowerCase() === "intel" || gpuParam.toLowerCase() === "amd radeon graphics";

    const recommendations: any[] = [];

    if (ramAllocated <= 6) {
      recommendations.push({
        title: "Optimizar RAM Crítica",
        desc: "Tu RAM asignada es menor o igual a 6GB. Recomendamos bajar mipmapLevels a 0 y la distancia de renderizado a 6 para evitar tartamudeos (stuttering).",
        impact: "high",
        settingKey: "mipmapLevels",
        recommendedValue: "0",
      });
    }

    if (hasIntegratedGpu) {
      recommendations.push({
        title: "Optimizar GPU Integrada",
        desc: "Se detectó GPU Integrada. Desactivar sombras de entidades (entityShadows) aumentará tus FPS en un 20%.",
        impact: "high",
        settingKey: "entityShadows",
        recommendedValue: "false",
      });
      recommendations.push({
        title: "Reducir Filtro de Texturas",
        desc: "Desactivar Mipmaps reduce enormemente el cuello de botella en gráficas integradas.",
        impact: "medium",
        settingKey: "mipmapLevels",
        recommendedValue: "0",
      });
    }

    if (modCount > 120) {
      recommendations.push({
        title: "Modpack Pesado Detectado",
        desc: `Tenés ${modCount} mods instalados. Bajar la Distancia de Simulación a 5 descongestionará el procesador (CPU) y evitará picos de lag por ticks.`,
        impact: "high",
        settingKey: "simulationDistance",
        recommendedValue: "5",
      });
      recommendations.push({
        title: "Optimizar Partículas de Mods",
        desc: "Muchos mods añaden partículas innecesarias. Establecer partículas en 'Mínimo' estabiliza los fotogramas en peleas.",
        impact: "medium",
        settingKey: "particles",
        recommendedValue: "2",
      });
    }

    // Pack-related recommendations
    if (responseData.resourcePacks.issues?.length > 0) {
      const criticalCount = responseData.resourcePacks.issues.filter((i: PackRule) => i.severity === "critical").length;
      const fixableCount = responseData.resourcePacks.autoFixable?.length || 0;
      
      if (criticalCount > 0) {
        recommendations.push({
          title: `⚠ ${criticalCount} problema${criticalCount > 1 ? 's' : ''} en Resource Packs`,
          desc: `Detectados ${criticalCount} conflicto${criticalCount > 1 ? 's' : ''} crítico${criticalCount > 1 ? 's' : ''}. ${fixableCount > 0 ? `${fixableCount} pueden corregirse automáticamente.` : 'Requiere corrección manual.'}`,
          impact: "high",
          action: "fix-packs",
        });
      }
    }

    // Orphaned keybinds warning
    if (responseData.keybindsGrouped.orphaned?.length > 0) {
      recommendations.push({
        title: `🧹 ${responseData.keybindsGrouped.orphaned.length} Keybinds Huérfanos`,
        desc: "Mods removidos dejaron keybinds huérfanos que pueden limpiarse.",
        impact: "low",
        action: "cleanup-orphans",
      });
    }

    // Keybind conflicts warning
    if (responseData.keybindConflicts?.length > 0) {
      const criticalConflicts = responseData.keybindConflicts.filter((c: KeybindConflict) => c.severity === "critical").length;
      recommendations.push({
        title: `⌨️ ${responseData.keybindConflicts.length} Conflicto${responseData.keybindConflicts.length > 1 ? 's' : ''} de Teclas`,
        desc: `${criticalConflicts > 0 ? `${criticalConflicts} crítico${criticalConflicts > 1 ? 's' : ''} en controles importantes. ` : ''}Múltiples acciones comparten la misma tecla.`,
        impact: criticalConflicts > 0 ? "high" : "medium",
        action: "fix-conflicts",
      });
    }

    responseData.recommendations = recommendations;
    responseData.modCount = modCount;
    responseData.loader = loader;

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      projectName, version, action, loader,
      keybinds, settings, resourcePacks, presetName, 
      snapshotName, snapshotNotes, partialRestore,
      searchKey, pressedKey, removeOrphans
    } = body;

    if (!projectName || !version || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { sourceBase } = getSettings();
    const projectDir = path.join(sourceBase, "_projects", projectName);
    const optionsPath = path.join(projectDir, "options.txt");

    // Ensure project folder exists
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Helper to read/write key values safely while preserving unknown properties
    const readCurrentOptions = (): Record<string, string> => {
      if (!fs.existsSync(optionsPath)) return {};
      const options: Record<string, string> = {};
      const content = fs.readFileSync(optionsPath, "utf-8");
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const idx = trimmed.indexOf(":");
        if (idx !== -1) {
          options[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
        }
      });
      return options;
    };

    const writeOptions = (options: Record<string, string>) => {
      let output = "";
      for (const [k, v] of Object.entries(options)) {
        output += `${k}:${v}\n`;
      }
      fs.writeFileSync(optionsPath, output, "utf-8");
    };

    // ──── Action: INITIALIZE ────
    if (action === "initialize") {
      let imported = false;
      const systemMcPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt");

      if (fs.existsSync(systemMcPath)) {
        try {
          // ALWAYS backup the original system options.txt before touching it
          const systemBackupPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt.mim-backup-original");
          if (!fs.existsSync(systemBackupPath)) {
            fs.copyFileSync(systemMcPath, systemBackupPath);
            console.log(`[Tweak] Backed up original Minecraft options.txt to ${systemBackupPath}`);
          }
          
          fs.copyFileSync(systemMcPath, optionsPath);
          imported = true;
          console.log(`[Tweak] Successfully imported options.txt from user system .minecraft folder`);
        } catch (e) {
          console.error("[Tweak] Failed to copy system options.txt:", e);
        }
      }

      if (!imported) {
        const defaultTemplate = `version:3440
graphicsMode:1
ao:2
enableVsync:true
framerateLimit:120
renderDistance:8
simulationDistance:6
gamma:1.0
fov:70.0
mipmapLevels:4
particles:0
bobView:true
entityShadows:true
resourcePacks:[]
key_key.forward:key.keyboard.w
key_key.left:key.keyboard.a
key_key.back:key.keyboard.s
key_key.right:key.keyboard.d
key_key.jump:key.keyboard.space
key_key.sneak:key.keyboard.left.shift
key_key.sprint:key.keyboard.left.control
key_key.attack:key.mouse.left
key_key.use:key.mouse.right
key_key.inventory:key.keyboard.e
key_key.drop:key.keyboard.q
key_key.chat:key.keyboard.t
key_key.playerlist:key.keyboard.tab
key_key.screenshot:key.keyboard.f2
key_key.togglePerspective:key.keyboard.f5
`;
        fs.writeFileSync(optionsPath, defaultTemplate, "utf-8");
      }

      return NextResponse.json({ 
        success: true, 
        message: imported ? "Importado desde Minecraft Vanilla con éxito" : "Inicializado con plantilla predeterminada limpia" 
      });
    }

    // Guard against operations requiring an existing options.txt
    if (!fs.existsSync(optionsPath) && !["initialize", "get-snapshot-info"].includes(action)) {
      return NextResponse.json({ error: "options.txt does not exist. Initialize it first." }, { status: 404 });
    }

    // ──── Action: SAVE ────
    if (action === "save") {
      const current = readCurrentOptions();

      if (settings) {
        for (const [k, v] of Object.entries(settings)) {
          current[k] = String(v);
        }
      }

      if (keybinds && Array.isArray(keybinds)) {
        keybinds.forEach((kb: any) => {
          if (kb.id && kb.key) {
            current[kb.id] = kb.key;
          }
        });
      }

      if (resourcePacks && Array.isArray(resourcePacks)) {
        current["resourcePacks"] = JSON.stringify(resourcePacks);
      }

      writeOptions(current);
      return NextResponse.json({ success: true, message: "Ajustes de juego guardados correctamente" });
    }

    // ──── Action: ANALYZE PACKS ────
    if (action === "analyze-packs") {
      const current = readCurrentOptions();
      const activePacks = JSON.parse(current["resourcePacks"] || "[]");
      const analysis = analyzePackOrder(activePacks);
      
      return NextResponse.json({
        success: true,
        visualStack: analysis.visualStack,
        issues: analysis.issues,
        autoFixable: analysis.autoFixable,
        fixableCount: analysis.autoFixable.length,
      });
    }

    // ──── Action: FIX PACK ORDER ────
    if (action === "fix-pack-order") {
      const current = readCurrentOptions();
      const activePacks = JSON.parse(current["resourcePacks"] || "[]");
      const analysis = analyzePackOrder(activePacks);
      
      if (analysis.autoFixable.length === 0) {
        return NextResponse.json({ success: true, message: "No hay correcciones automáticas disponibles", fixed: false });
      }
      
      const fixed = autoFixPackOrder(activePacks);
      current["resourcePacks"] = JSON.stringify(fixed);
      writeOptions(current);
      
      const newAnalysis = analyzePackOrder(fixed);
      
      return NextResponse.json({
        success: true,
        message: `Corregidos ${analysis.autoFixable.length} problemas de orden automáticamente`,
        fixed: true,
        before: activePacks,
        after: fixed,
        remainingIssues: newAnalysis.issues.length,
      });
    }

    // ──── Action: SEARCH KEYBINDS ────
    if (action === "search-keybinds") {
      const current = readCurrentOptions();
      const allKeybinds: Keybind[] = [];
      
      for (const [key, val] of Object.entries(current)) {
        if (key.startsWith("key_")) {
          const standardInfo = STANDARD_KEYBINDS_MAP[key];
          const modSource = extractModSource(key);
          allKeybinds.push({
            id: key,
            name: standardInfo ? standardInfo.name : `${key.replace("key_", "").replace("key.", "")}`,
            key: val,
            category: standardInfo ? standardInfo.category : parseCategoryFromId(key),
            modSource,
          });
        }
      }
      
      // Filter by search term
      let filtered = allKeybinds;
      if (searchKey) {
        const term = searchKey.toLowerCase();
        filtered = allKeybinds.filter(kb => 
          kb.name.toLowerCase().includes(term) ||
          kb.id.toLowerCase().includes(term) ||
          kb.key.toLowerCase().includes(term) ||
          kb.modSource?.toLowerCase().includes(term)
        );
      }
      
      // Press-to-detect
      if (pressedKey) {
        filtered = findKeybindsByPress(filtered, pressedKey);
      }
      
      return NextResponse.json({
        success: true,
        count: filtered.length,
        keybinds: filtered,
        searchKey,
        pressedKey,
      });
    }

    // ──── Action: CLEANUP ORPHANED KEYBINDS ────
    if (action === "cleanup-orphans") {
      const current = readCurrentOptions();
      
      // Get installed mods
      const installedMods = new Set<string>();
      const modsDir = path.join(projectDir, "mods");
      if (fs.existsSync(modsDir)) {
        try {
          const subs = fs.readdirSync(modsDir);
          for (const sub of subs) {
            const subPath = path.join(modsDir, sub);
            if (fs.statSync(subPath).isDirectory()) {
              const files = fs.readdirSync(subPath);
              files.filter(f => f.endsWith(".jar")).forEach(f => {
                const modId = f.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase();
                installedMods.add(modId);
              });
            } else if (sub.endsWith(".jar")) {
              const modId = sub.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase();
              installedMods.add(modId);
            }
          }
        } catch (e) {}
      }
      
      const removed: string[] = [];
      
      for (const [key, val] of Object.entries(current)) {
        if (key.startsWith("key_")) {
          const modSource = extractModSource(key);
          if (modSource !== "minecraft" && modSource !== "unknown" && !installedMods.has(modSource.toLowerCase())) {
            if (!removeOrphans || (removeOrphans as string[]).includes(key)) {
              delete current[key];
              removed.push(key);
            }
          }
        }
      }
      
      if (removed.length > 0) {
        writeOptions(current);
      }
      
      return NextResponse.json({
        success: true,
        message: `${removed.length} keybinds huérfanos eliminados`,
        removed,
      });
    }

    // ──── Action: APPLY PRESET ────
    if (action === "apply-preset") {
      const current = readCurrentOptions();
      const presets: Record<string, Record<string, string>> = {
        "increase-fps": {
          graphicsMode: "0",
          ao: "0",
          renderDistance: "6",
          simulationDistance: "5",
          enableVsync: "false",
          particles: "2",
          entityShadows: "false",
          bobView: "false",
          mipmapLevels: "0",
        },
        "reduce-stuttering": {
          enableVsync: "true",
          framerateLimit: "60",
          simulationDistance: "4",
        },
        "shaders-opt": {
          graphicsMode: "2",
          ao: "2",
          entityShadows: "true",
          mipmapLevels: "4",
        },
        "vram-low": {
          renderDistance: "5",
          mipmapLevels: "0",
        },
        "competitive": {
          fov: "100.0",
          gamma: "1.5",
          bobView: "false",
          particles: "1",
        },
        "smooth-vanilla": {
          graphicsMode: "1",
          ao: "2",
          renderDistance: "8",
          simulationDistance: "6",
          enableVsync: "true",
          particles: "0",
          entityShadows: "true",
          mipmapLevels: "4",
        },
      };

      const selectedPreset = presets[presetName];
      if (!selectedPreset) {
        return NextResponse.json({ error: `Invalid preset name "${presetName}"` }, { status: 400 });
      }

      for (const [k, v] of Object.entries(selectedPreset)) {
        current[k] = v;
      }

      writeOptions(current);
      return NextResponse.json({ success: true, message: `Preajuste '${presetName}' aplicado correctamente` });
    }

    // ──── Action: SAVE SMART SNAPSHOT ────
    if (action === "save-snapshot") {
      if (!snapshotName) {
        return NextResponse.json({ error: "Missing snapshotName" }, { status: 400 });
      }
      
      const safeSnapName = snapshotName.replace(/[<>:"/\\|?*]/g, "_").trim();
      const snapshotId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const current = readCurrentOptions();
      const modCount = getModCount(projectDir);
      const modpackHash = calculateModpackHash(projectDir);
      const resourcePacks = JSON.parse(current["resourcePacks"] || "[]");
      const keybindCount = Object.keys(current).filter(k => k.startsWith("key_")).length;
      
      const metadata: SnapshotMetadata = {
        id: snapshotId,
        timestamp,
        profileName: safeSnapName,
        minecraftVersion: version,
        loader: loader || "forge",
        modpackHash,
        modsInstalled: modCount,
        keybindCount,
        resourcePackStack: resourcePacks,
        notes: snapshotNotes,
      };
      
      // Save metadata JSON
      const metaPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.json`);
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
      
      // Save options data
      const dataPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.dat`);
      fs.writeFileSync(dataPath, JSON.stringify(current, null, 2), "utf-8");
      
      return NextResponse.json({ 
        success: true, 
        message: `Snapshot '${safeSnapName}' guardado con éxito`,
        metadata,
      });
    }

    // ──── Action: GET SNAPSHOT INFO ────
    if (action === "get-snapshot-info") {
      if (!snapshotName) {
        return NextResponse.json({ error: "Missing snapshotName" }, { status: 400 });
      }
      
      const safeSnapName = snapshotName.replace(/[<>:"/\\|?*]/g, "_").trim();
      const metaPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.json`);
      const dataPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.dat`);
      
      if (!fs.existsSync(metaPath)) {
        return NextResponse.json({ error: `Snapshot '${safeSnapName}' not found` }, { status: 404 });
      }
      
      const metadata: SnapshotMetadata = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      const optionsData = fs.existsSync(dataPath) 
        ? JSON.parse(fs.readFileSync(dataPath, "utf-8"))
        : {};
      
      // Calculate available restore sections
      const hasKeybinds = Object.keys(optionsData).some(k => k.startsWith("key_"));
      const hasResourcePacks = !!optionsData["resourcePacks"];
      const hasGraphics = !!(optionsData["renderDistance"] || optionsData["graphicsMode"]);
      const hasAudio = !!(optionsData["soundCategory_master"]);
      
      return NextResponse.json({
        success: true,
        metadata,
        availableSections: {
          keybinds: hasKeybinds,
          resourcePacks: hasResourcePacks,
          graphics: hasGraphics,
          audio: hasAudio,
        },
      });
    }

    // ──── Action: RESTORE SNAPSHOT (with partial restore support) ────
    if (action === "restore-snapshot") {
      if (!snapshotName) {
        return NextResponse.json({ error: "Missing snapshotName" }, { status: 400 });
      }
      
      const safeSnapName = snapshotName.replace(/[<>:"/\\|?*]/g, "_").trim();
      const dataPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.dat`);
      
      if (!fs.existsSync(dataPath)) {
        return NextResponse.json({ error: `Snapshot '${safeSnapName}' not found` }, { status: 404 });
      }
      
      const snapshotData: Record<string, string> = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      const current = readCurrentOptions();
      const restored: string[] = [];
      
      // Partial restore: only restore selected sections
      const sections = partialRestore || { 
        keybinds: true, 
        resourcePacks: true, 
        graphics: true, 
        audio: true 
      };
      
      for (const [key, value] of Object.entries(snapshotData)) {
        let shouldRestore = false;
        
        if (key.startsWith("key_") && sections.keybinds) {
          shouldRestore = true;
        } else if (key === "resourcePacks" && sections.resourcePacks) {
          shouldRestore = true;
        } else if (["renderDistance", "simulationDistance", "graphicsMode", "entityShadows", "mipmapLevels", "particles", "fov", "gamma"].includes(key) && sections.graphics) {
          shouldRestore = true;
        } else if (key.startsWith("soundCategory_") && sections.audio) {
          shouldRestore = true;
        } else if (!sections) {
          // Full restore if no partial sections specified
          shouldRestore = true;
        }
        
        if (shouldRestore) {
          current[key] = value;
          restored.push(key);
        }
      }
      
      writeOptions(current);
      
      return NextResponse.json({ 
        success: true, 
        message: `Snapshot '${safeSnapName}' restaurado (${restored.length} opciones)`,
        restored,
        partialRestore: sections,
      });
    }

    // ──── Action: DELETE SNAPSHOT ────
    if (action === "delete-snapshot") {
      if (!snapshotName) {
        return NextResponse.json({ error: "Missing snapshotName" }, { status: 400 });
      }
      
      const safeSnapName = snapshotName.replace(/[<>:"/\\|?*]/g, "_").trim();
      const metaPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.json`);
      const dataPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.dat`);
      
      let deleted = false;
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
        deleted = true;
      }
      if (fs.existsSync(dataPath)) {
        fs.unlinkSync(dataPath);
        deleted = true;
      }
      
      return NextResponse.json({ 
        success: deleted, 
        message: deleted ? `Snapshot '${safeSnapName}' eliminado` : `Snapshot '${safeSnapName}' no encontrado` 
      });
    }

    // ──── Action: SYNC RESOURCEPACKS (Project <-> Game) ────
    if (action === "sync-resourcepacks") {
      const projectRpDir = path.join(projectDir, "resourcepacks");
      const gameRpDir = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "resourcepacks");

      if (!fs.existsSync(projectRpDir)) fs.mkdirSync(projectRpDir, { recursive: true });
      if (!fs.existsSync(gameRpDir)) fs.mkdirSync(gameRpDir, { recursive: true });

      const projectPacks = fs.readdirSync(projectRpDir);
      const gamePacks = fs.readdirSync(gameRpDir);

      const movedToGame: string[] = [];
      const movedToProject: string[] = [];

      // 1. Move everything from game to project first (Pull)
      for (const pack of gamePacks) {
        const src = path.join(gameRpDir, pack);
        const dest = path.join(projectRpDir, pack);
        
        if (!fs.existsSync(dest)) {
          try {
            fs.copyFileSync(src, dest);
            fs.unlinkSync(src);
            movedToProject.push(pack);
          } catch (e) {
            console.error(`[Tweak] Failed to move pack ${pack}:`, e);
          }
        }
      }

      // 2. Move project packs to game (Push)
      const updatedProjectPacks = fs.readdirSync(projectRpDir);
      for (const pack of updatedProjectPacks) {
        const src = path.join(projectRpDir, pack);
        const dest = path.join(gameRpDir, pack);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          movedToGame.push(pack);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Sincronización completada. ${movedToGame.length} enviadas al juego, ${movedToProject.length} recuperadas al proyecto.` 
      });
    }

    // ──── Action: PUSH TO MINECRAFT ────
    if (action === "push-to-minecraft") {
      const systemMcPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt");
      const systemBackupPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt.mim-backup");
      
      if (!fs.existsSync(optionsPath)) {
        return NextResponse.json({ error: "No hay options.txt en el proyecto" }, { status: 404 });
      }
      
      try {
        // Backup current system options.txt before overwriting (if it exists and we haven't backed up recently)
        if (fs.existsSync(systemMcPath)) {
          // Always keep one backup, but rotate if we push multiple times
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const timestampedBackup = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", `options.txt.mim-backup-${timestamp}`);
          
          // Keep latest backup as simple .mim-backup
          fs.copyFileSync(systemMcPath, systemBackupPath);
          console.log(`[Tweak] Backed up current Minecraft options.txt to ${systemBackupPath}`);
        }
        
        fs.copyFileSync(optionsPath, systemMcPath);
        return NextResponse.json({ 
          success: true, 
          message: "Configuración aplicada al juego de Minecraft. Backup creado." 
        });
      } catch (e: any) {
        return NextResponse.json({ error: `Error al copiar: ${e.message}` }, { status: 500 });
      }
    }

    // ──── Action: RESTORE ORIGINAL BACKUP ────
    if (action === "restore-original-backup") {
      const originalBackupPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt.mim-backup-original");
      
      if (!fs.existsSync(originalBackupPath)) {
        return NextResponse.json({ error: "No hay backup original. Primero inicializá TWEAK." }, { status: 404 });
      }
      
      try {
        fs.copyFileSync(originalBackupPath, optionsPath);
        return NextResponse.json({ 
          success: true, 
          message: "Backup original restaurado al proyecto. Ahora podés editarlo y aplicar al juego." 
        });
      } catch (e: any) {
        return NextResponse.json({ error: `Error al restaurar: ${e.message}` }, { status: 500 });
      }
    }

    // ──── Action: LOAD SNAPSHOT (to project only) ────
    if (action === "load-snapshot") {
      if (!snapshotName) {
        return NextResponse.json({ error: "Missing snapshotName" }, { status: 400 });
      }
      
      const safeSnapName = snapshotName.replace(/[<>:"\\|?*]/g, "_").trim();
      const dataPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.dat`);
      
      if (!fs.existsSync(dataPath)) {
        return NextResponse.json({ error: `Snapshot '${safeSnapName}' no encontrado` }, { status: 404 });
      }
      
      try {
        const snapshotData: Record<string, string> = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
        writeOptions(snapshotData);
        
        return NextResponse.json({ 
          success: true, 
          message: `Snapshot '${safeSnapName}' cargado al proyecto. Editá lo que necesites y luego aplicá al juego.` 
        });
      } catch (e: any) {
        return NextResponse.json({ error: `Error al cargar snapshot: ${e.message}` }, { status: 500 });
      }
    }

    // ──── Action: PUSH SNAPSHOT TO GAME ────
    if (action === "push-snapshot-to-game") {
      if (!snapshotName) {
        return NextResponse.json({ error: "Missing snapshotName" }, { status: 400 });
      }
      
      const safeSnapName = snapshotName.replace(/[<>:"\\|?*]/g, "_").trim();
      const dataPath = path.join(projectDir, `mim_snapshot_${safeSnapName}.dat`);
      const systemMcPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt");
      const systemBackupPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "options.txt.mim-backup");
      
      if (!fs.existsSync(dataPath)) {
        return NextResponse.json({ error: `Snapshot '${safeSnapName}' no encontrado` }, { status: 404 });
      }
      
      try {
        // Backup current system options
        if (fs.existsSync(systemMcPath)) {
          fs.copyFileSync(systemMcPath, systemBackupPath);
        }
        
        // Copy snapshot directly to game
        fs.copyFileSync(dataPath, systemMcPath);
        
        return NextResponse.json({ 
          success: true, 
          message: `Snapshot '${safeSnapName}' aplicado directamente al juego.` 
        });
      } catch (e: any) {
        return NextResponse.json({ error: `Error al aplicar snapshot: ${e.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
