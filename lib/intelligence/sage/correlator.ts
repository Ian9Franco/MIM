/**
 * SAGE 2.0 — Mod & Dependency Correlator
 * ─────────────────────────────────────────────────────────────────────────────
 * Correlates normalized stack frames, class package hierarchies, and candidate
 * IDs to establish the most probable culprit mod(s).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NormalizedFrame } from "./types";

// Common package root mappings to mod IDs
const PACKAGE_TO_MOD_MAP: Record<string, string> = {
  "me.jellysquid.mods.sodium": "sodium",
  "me.jellysquid.mods.lithium": "lithium",
  "me.jellysquid.mods.phosphor": "phosphor",
  "net.coderbot.iris": "iris",
  "com.simibubi.create": "create",
  "vazkii.botania": "botania",
  "vazkii.quark": "quark",
  "appeng": "applied-energistics-2",
  "mekanism": "mekanism",
  "blusunrize.immersiveengineering": "immersive-engineering",
  "com.refinedmods.refinedstorage": "refined-storage",
  "slimeknights.tconstruct": "tinkers-construct",
  "xaero.common": "xaeros-minimap",
  "journeymap": "journeymap",
  "com.mojang.blaze3d": "vanilla_renderer",
  "net.minecraft": "vanilla_minecraft"
};

// Vanilla/Framework packages that are not user mods
const FRAMEWORK_PACKAGES = [
  "java.",
  "javax.",
  "sun.",
  "jdk.",
  "net.minecraft.",
  "com.mojang.",
  "org.spongepowered.asm.",
  "cpw.mods.modlauncher.",
  "net.fabricmc.loader."
];

export function correlateCulprits(
  frames: NormalizedFrame[],
  candidates: string[]
): { primaryCulprit?: string; allSuspects: string[] } {
  const suspectScores = new Map<string, number>();

  // 1. Give heavy weight to candidate culprits explicitly named in crash signatures
  for (const candidate of candidates) {
    if (!candidate) continue;
    const clean = candidate.toLowerCase().trim();
    suspectScores.set(clean, (suspectScores.get(clean) || 0) + 50);
  }

  // 2. Inspect normalized frames
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    // Frames near top of stack have higher diagnostic weight
    const depthWeight = Math.max(1, 15 - Math.min(i, 14));

    // A. Explicit mixin target attribution
    if (frame.mixinTarget) {
      const mod = frame.mixinTarget.toLowerCase().trim();
      suspectScores.set(mod, (suspectScores.get(mod) || 0) + depthWeight * 3);
    }

    // B. Package mapping
    let matchedMod: string | undefined;
    for (const [pkg, modId] of Object.entries(PACKAGE_TO_MOD_MAP)) {
      if (frame.className.startsWith(pkg)) {
        matchedMod = modId;
        break;
      }
    }

    // C. Heuristic package extraction if not framework
    if (!matchedMod) {
      const isFramework = FRAMEWORK_PACKAGES.some(p => frame.className.startsWith(p));
      if (!isFramework) {
        const parts = frame.className.split(".");
        // Typical structure: com.author.modname.Class or net.author.modname.Class
        if (parts.length >= 3) {
          matchedMod = parts[2].toLowerCase();
        }
      }
    }

    if (matchedMod && matchedMod !== "vanilla_minecraft" && matchedMod !== "vanilla_renderer") {
      suspectScores.set(matchedMod, (suspectScores.get(matchedMod) || 0) + depthWeight);
    }
  }

  // Sort suspects by descending score
  const sorted = Array.from(suspectScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([mod]) => mod);

  return {
    primaryCulprit: sorted[0],
    allSuspects: sorted
  };
}
