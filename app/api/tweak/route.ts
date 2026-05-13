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

    const globalSettings = getSettings();
    const { sourceBase } = globalSettings;
    const projectDir = path.join(sourceBase, "_projects", projectName);
    const optionsPath = path.join(projectDir, "options.txt");

    // Get installed mods for orphan detection
    const installedMods = new Set<string>();
    const rawJarNames: string[] = [];
    const modsDir = path.join(projectDir, "mods");
    if (fs.existsSync(modsDir)) {
      try {
        const subs = fs.readdirSync(modsDir);
        for (const sub of subs) {
          const subPath = path.join(modsDir, sub);
          if (fs.statSync(subPath).isDirectory()) {
            const files = fs.readdirSync(subPath);
            files.filter(f => f.endsWith(".jar")).forEach(f => {
              rawJarNames.push(f);
              const modId = f.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase();
              installedMods.add(modId);
            });
          } else if (sub.endsWith(".jar")) {
            rawJarNames.push(sub);
            const modId = sub.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase();
            installedMods.add(modId);
          }
        }
      } catch (e) {}
    }

    let detectedLoader = loader;
    const hasForgeOrSinytra = rawJarNames.some(f => f.toLowerCase().includes("forge") || f.toLowerCase().includes("embeddium") || f.toLowerCase().includes("sinytra") || f.toLowerCase().includes("connector"));
    const hasNeoForge = rawJarNames.some(f => f.toLowerCase().includes("neoforge"));

    if (hasNeoForge) {
      detectedLoader = "neoforge";
    } else if (hasForgeOrSinytra) {
      detectedLoader = "forge";
    } else if (rawJarNames.some(f => f.toLowerCase().includes("fabric-api") || f.toLowerCase().includes("fabric-loader") || f.toLowerCase().includes("quilt") || f.toLowerCase().includes("indium") || f.toLowerCase().includes("sodium"))) {
      detectedLoader = "fabric";
    }

    let detectedVersion = version;
    for (const f of rawJarNames) {
      const match = f.match(/(?:mc|-|\+)(1\.\d+(?:\.\d+)?)(?:-|\+|$|\.)/i);
      if (match && match[1]) {
        detectedVersion = match[1];
        break;
      }
    }
    if (!detectedVersion) detectedVersion = "1.20.1";

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

    // 2. Fetch available resourcepacks in project (stored in _projects/<name>/resourcepacks)
    const rpDir = path.join(projectDir, "resourcepacks");
    if (fs.existsSync(rpDir)) {
      try {
        const files = fs.readdirSync(rpDir);
        responseData.resourcePacks.available = files.filter(
          f => f.endsWith(".zip") || fs.statSync(path.join(rpDir, f)).isDirectory()
        );
      } catch (e) {}
    }

    // 3b. Fetch shaders in game .minecraft/shaderpacks (read-only listing)
    const shaderDir = path.join(globalSettings.minecraftPath, "shaderpacks");
    const shadersInGame: { name: string; size: number }[] = [];
    if (fs.existsSync(shaderDir)) {
      try {
        for (const f of fs.readdirSync(shaderDir)) {
          const fp = path.join(shaderDir, f);
          if (fs.statSync(fp).isFile() && (f.endsWith(".zip") || f.endsWith(".jar"))) {
            shadersInGame.push({ name: f, size: fs.statSync(fp).size });
          }
        }
      } catch (e) {}
    }
    responseData.shadersInGame = shadersInGame;

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

    // 4. Smart Recommendations & Rule-Based Optimization Engine
    const modCount = getModCount(projectDir);
    const ramAllocated = ramParam ? parseInt(ramParam) : 8;
    const hasIntegratedGpu = gpuParam.toLowerCase() === "integrated" || gpuParam.toLowerCase() === "intel" || gpuParam.toLowerCase() === "amd radeon graphics";

    // Hardware Detection via Node OS
    const totalRamGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const cpuCores = os.cpus().length;
    const hardwareProfile = totalRamGB <= 8 || cpuCores <= 4 ? "low" : totalRamGB <= 16 ? "mid" : "high";

    // Optimal JVM Arguments string calculation
    let jvmArgs = "";
    if (hardwareProfile === "low") {
      jvmArgs = `-Xmx${Math.min(4, Math.max(2, totalRamGB - 2))}G -Xms2G -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -XX:+AlwaysPreTouch`;
    } else if (hardwareProfile === "mid") {
      jvmArgs = `-Xmx${Math.min(8, Math.max(4, totalRamGB - 4))}G -Xms4G -XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=20`;
    } else {
      jvmArgs = `-Xmx${Math.min(12, Math.max(8, totalRamGB - 6))}G -Xms8G -XX:+UseZGC -XX:+ZProactive -XX:+AlwaysPreTouch`;
    }

    const recommendations: any[] = [];

    // Experience & Performance Boosters (FOMO links) per loader
    const isFabric = detectedLoader.toLowerCase() === "fabric" || detectedLoader.toLowerCase() === "quilt";

    if (isFabric) {
      if (!installedMods.has("sodium")) {
        recommendations.push({
          title: "⚡ Motor de Renderizado Vulkan/OpenGL (Sodium)",
          desc: `Detectamos entorno ${detectedLoader.toUpperCase()} (${detectedVersion}). Reemplazar el renderizador nativo de Minecraft por Sodium multiplicará tus FPS x3, eliminando tirones en generación de chunks.`,
          impact: "high",
          action: "open-fomo",
          fomoQuery: "project:sodium",
        });
      }
      if (!installedMods.has("iris")) {
        recommendations.push({
          title: "🌈 Soporte Optimizador de Shaders (Iris)",
          desc: "Iris trabaja en perfecta sinergia con Sodium para habilitar shaders de ultra alta fidelidad (Complementary, BSL) usando una fracción de la VRAM habitual.",
          impact: "medium",
          action: "open-fomo",
          fomoQuery: "project:iris",
        });
      }
      if (!installedMods.has("lithium")) {
        recommendations.push({
          title: "🧠 Optimización de Física e IA (Lithium)",
          desc: "Lithium optimiza la física de colisiones, el pathfinding de aldeanos/mobs y la carga de granjas sin alterar absolutamente ninguna mecánica de Minecraft Vanilla.",
          impact: "medium",
          action: "open-fomo",
          fomoQuery: "project:lithium",
        });
      }
    } else {
      // Forge / NeoForge
      if (!installedMods.has("embeddium") && !installedMods.has("rubidium")) {
        recommendations.push({
          title: `⚡ Motor de Renderizado Avanzado (Embeddium para ${detectedLoader.toUpperCase()})`,
          desc: `En ecosistemas ${detectedLoader.toUpperCase()}, Embeddium (fork oficial de Sodium) reescribe el pipeline de renderizado para duplicar la fluidez sin romper la compatibilidad con los mods de Forge.`,
          impact: "high",
          action: "open-fomo",
          fomoQuery: "project:embeddium",
        });
      }
      if (!installedMods.has("oculus")) {
        recommendations.push({
          title: "🌈 Pipeline Shaders de Alto Rendimiento (Oculus)",
          desc: `Oculus es la pasarela oficial para ejecutar shaders en ${detectedLoader.toUpperCase()} sobre Embeddium, con soporte nativo para sombreados dinámicos y reflejos PBR.`,
          impact: "medium",
          action: "open-fomo",
          fomoQuery: "project:oculus",
        });
      }
      if (!installedMods.has("modernfix")) {
        recommendations.push({
          title: "🛠️ Parches Estructurales de Memoria (ModernFix)",
          desc: `ModernFix soluciona los conocidos bugs de fugas de memoria en ${detectedLoader.toUpperCase()}, acelerando el arranque del juego hasta un 50% y reduciendo la RAM estática del menú principal.`,
          impact: "high",
          action: "open-fomo",
          fomoQuery: "project:modernfix",
        });
      }
    }

    if (!installedMods.has("ferritecore")) {
      recommendations.push({
        title: "🗜️ Compresión de Memoria de Modelos (FerriteCore)",
        desc: "FerriteCore desduplica los vértices y estados de bloque en la memoria RAM, reduciendo el consumo total de memoria del modpack hasta en 3 GB.",
        impact: "high",
        action: "open-fomo",
        fomoQuery: "project:ferritecore",
      });
    }

    if (hardwareProfile === "low") {
      recommendations.push({
        title: "📉 Estrategia de Inmersión Ligera (Low Profile)",
        desc: `Tu equipo cuenta con ${totalRamGB}GB RAM. Para evitar cuellos de botella con ${modCount} mods instalados, te sugerimos utilizar texturas 16x/32x e instalar Smooth Chunks para suavizar la carga de terreno en segundo plano.`,
        impact: "high",
        action: "open-fomo",
        fomoQuery: "project:smooth-chunks",
      });
    } else {
      if (!installedMods.has("sound-physics-remastered")) {
        recommendations.push({
          title: "✨ Inmersión Acústica Realista (Sound Physics)",
          desc: `Tu hardware (${totalRamGB}GB RAM / ${cpuCores} Cores) tiene potencia de sobra. Instalar Sound Physics Remastered añade reverberación de cuevas, atenuación por paredes y eco tridimensional.`,
          impact: "low",
          action: "open-fomo",
          fomoQuery: "project:sound-physics-remastered",
        });
      }
    }

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
    }

    if (modCount > 120) {
      recommendations.push({
        title: "Modpack Pesado Detectado",
        desc: `Tenés ${modCount} mods instalados. Bajar la Distancia de Simulación a 5 descongestionará la CPU y evitará picos de lag por ticks.`,
        impact: "high",
        settingKey: "simulationDistance",
        recommendedValue: "5",
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
    responseData.hardwareProfile = hardwareProfile;
    responseData.totalRamGB = totalRamGB;
    responseData.cpuCores = cpuCores;
    responseData.jvmArgs = jvmArgs;

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

    const globalSettings = getSettings();
    const { sourceBase } = globalSettings;
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
      const settings = getSettings();
      let imported = false;
      const systemMcPath = path.join(settings.minecraftPath, "options.txt");

      if (fs.existsSync(systemMcPath)) {
        try {
          // ALWAYS backup the original system options.txt before touching it
          const systemBackupPath = path.join(settings.minecraftPath, "options.txt.mim-backup-original");
          if (!fs.existsSync(systemBackupPath)) {
            fs.copyFileSync(systemMcPath, systemBackupPath);
          }
          
          fs.copyFileSync(systemMcPath, optionsPath);
          imported = true;
        } catch (e) {
          // Fallback handled by return below
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

    // ──── Action: SYNC-RESOURCEPACKS (bidirectional project ↔ game) ────
    // Pushes project's resourcepacks to .minecraft/resourcepacks, and pulls
    // any packs in the game that don't belong to the project back into the project.
    if (action === "sync-textures" || action === "sync-resourcepacks") {
      const settings = getSettings();
      if (!fs.existsSync(settings.minecraftPath)) {
        return NextResponse.json(
          { error: "La carpeta de Minecraft no existe. Revisá los Ajustes de Sistema." },
          { status: 400 }
        );
      }
      const projectRpDir = path.join(projectDir, "resourcepacks");
      const gameRpDir    = path.join(settings.minecraftPath, "resourcepacks");

      if (!fs.existsSync(projectRpDir)) fs.mkdirSync(projectRpDir, { recursive: true });
      if (!fs.existsSync(gameRpDir))    fs.mkdirSync(gameRpDir,    { recursive: true });

      const movedToGame:    string[] = [];
      const movedToProject: string[] = [];
      const skipped:        string[] = [];

      // Step 1: Pull — move packs that are in the game but NOT in the project → into the project
      for (const pack of fs.readdirSync(gameRpDir)) {
        const src  = path.join(gameRpDir,    pack);
        const dest = path.join(projectRpDir, pack);
        if (!fs.statSync(src).isFile()) continue;  // skip directories
        if (!fs.existsSync(dest)) {
          try {
            fs.copyFileSync(src, dest);
            fs.unlinkSync(src);
            movedToProject.push(pack);
          } catch (e) {
            skipped.push(pack);
          }
        }
      }

      // Step 2: Push — copy all project packs to the game (without deleting them from project)
      for (const pack of fs.readdirSync(projectRpDir)) {
        const src  = path.join(projectRpDir, pack);
        const dest = path.join(gameRpDir,    pack);
        if (!fs.statSync(src).isFile()) continue;
        if (!fs.existsSync(dest)) {
          try {
            fs.copyFileSync(src, dest);
            movedToGame.push(pack);
          } catch (e) {
            skipped.push(pack);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: [
          movedToGame.length    > 0 ? `${movedToGame.length} enviadas al juego`         : null,
          movedToProject.length > 0 ? `${movedToProject.length} recuperadas al proyecto` : null,
          skipped.length        > 0 ? `${skipped.length} omitidas (error de copia)`      : null,
          (movedToGame.length + movedToProject.length) === 0 ? "Todo ya está sincronizado" : null,
        ].filter(Boolean).join(" · "),
        movedToGame,
        movedToProject,
        skipped,
      });
    }

    // ──── Action: PUSH-TO-MINECRAFT (options.txt only) ────
    // Copies the project's options.txt to .minecraft/options.txt so the game
    // picks up all keybinds, graphics settings, and resource pack list on next launch.
    if (action === "push-to-minecraft") {
      if (!fs.existsSync(globalSettings.minecraftPath)) {
        return NextResponse.json(
          { error: "La carpeta de Minecraft no existe o no fue configurada. Revisá los Ajustes de Sistema." },
          { status: 400 }
        );
      }

      const systemMcPath   = path.join(globalSettings.minecraftPath, "options.txt");
      const systemBackupPath = path.join(globalSettings.minecraftPath, "options.txt.mim-backup");

      if (!fs.existsSync(optionsPath)) {
        return NextResponse.json({ error: "No hay options.txt en el proyecto. Inicializá Tweak primero." }, { status: 404 });
      }

      try {
        // Keep a rolling backup of the game's current options.txt before overwriting
        if (fs.existsSync(systemMcPath)) {
          fs.copyFileSync(systemMcPath, systemBackupPath);
        }
        fs.copyFileSync(optionsPath, systemMcPath);
        return NextResponse.json({
          success: true,
          message: "options.txt aplicado al juego. Los cambios estarán activos en el próximo inicio de Minecraft.",
        });
      } catch (e: any) {
        return NextResponse.json({ error: `Error al copiar: ${e.message}` }, { status: 500 });
      }
    }

    // ──── Action: LIST-SHADERS ────
    // Lists all shader packs currently in .minecraft/shaderpacks without launching the game.
    if (action === "list-shaders") {
      const settings = getSettings();
      const shaderDir = path.join(settings.minecraftPath, "shaderpacks");

      if (!fs.existsSync(shaderDir)) {
        return NextResponse.json({ success: true, shaders: [], message: "No se encontró la carpeta shaderpacks en .minecraft" });
      }

      const shaders: { name: string; size: number; sizeMb: string }[] = [];
      for (const file of fs.readdirSync(shaderDir)) {
        const fp = path.join(shaderDir, file);
        if (!fs.statSync(fp).isFile()) continue;
        if (!file.endsWith(".zip") && !file.endsWith(".jar")) continue;
        const size = fs.statSync(fp).size;
        shaders.push({ name: file, size, sizeMb: (size / 1024 / 1024).toFixed(1) });
      }

      return NextResponse.json({ success: true, shaders, total: shaders.length });
    }

    if (action === "restore-original-backup") {
      if (!fs.existsSync(globalSettings.minecraftPath)) {
        return NextResponse.json({ error: "No se encuentra la carpeta de Minecraft para restaurar el backup." }, { status: 400 });
      }
      const originalBackupPath = path.join(globalSettings.minecraftPath, "options.txt.mim-backup-original");
      
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
      const settings = getSettings();
      const systemMcPath = path.join(settings.minecraftPath, "options.txt");
      const systemBackupPath = path.join(settings.minecraftPath, "options.txt.mim-backup");
      
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
