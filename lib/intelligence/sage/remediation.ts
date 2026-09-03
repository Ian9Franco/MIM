/**
 * SAGE 2.0 — Remediation Planner
 * ─────────────────────────────────────────────────────────────────────────────
 * Formulates prioritized, deterministic recovery plans with automatic
 * resolution capability flags for MIM UI and FOMO download broker.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashCategory, CrashEnvironment, RemediationAction, RemediationPlan } from "./types";

export function planRemediation(
  category: CrashCategory,
  culprit: string | undefined,
  suspects: string[],
  env: CrashEnvironment
): RemediationPlan {
  const actions: RemediationAction[] = [];
  let summary = "";

  switch (category) {
    case "MISSING_DEPENDENCY": {
      const depName = culprit || suspects[0] || "required-library";
      summary = `Install the missing dependency '${depName}' to resolve startup requirements.`;
      actions.push({
        id: `install-${depName}`,
        title: `Install Dependency: ${depName}`,
        actionType: "install_dependency",
        priority: 1,
        autoFixable: true,
        targetMod: depName,
        instructions: [
          `Search for '${depName}' compatible with Minecraft ${env.minecraftVersion || "your version"} (${env.loader}).`,
          "Place the resulting .jar into your mods folder.",
          "Restart the Minecraft client."
        ],
        params: { modId: depName, loader: env.loader, mcVersion: env.minecraftVersion }
      });
      break;
    }

    case "OUT_OF_MEMORY": {
      summary = "Increase allocated JVM heap memory to prevent OutOfMemory crashes.";
      actions.push({
        id: "increase-jvm-ram",
        title: "Allocate More RAM in JVM Arguments",
        actionType: "allocate_memory",
        priority: 1,
        autoFixable: true,
        instructions: [
          "Increase minimum/maximum heap argument: e.g. change -Xmx2G to -Xmx6G or -Xmx8G.",
          "Ensure your system has enough free physical RAM.",
          "Check for memory leak mods or reduce render distance."
        ],
        params: { recommendedMinMb: 6144 }
      });
      break;
    }

    case "JAVA_INCOMPATIBILITY": {
      summary = "Switch Java runtime version to match mod bytecode requirements.";
      actions.push({
        id: "switch-java-runtime",
        title: "Update or Change Java Version",
        actionType: "change_java",
        priority: 1,
        autoFixable: false,
        instructions: [
          "Modern Minecraft 1.20.5+ requires Java 21.",
          "Minecraft 1.18 to 1.20.4 requires Java 17.",
          "Minecraft 1.12 to 1.16 requires Java 8 or 11.",
          "Configure your launcher JVM path to point to a compatible JDK/JRE installation."
        ]
      });
      break;
    }

    case "MOD_CONFLICT": {
      const target = culprit || "duplicate-mod";
      summary = `Remove duplicate or mutually exclusive mod files for '${target}'.`;
      actions.push({
        id: `resolve-duplicate-${target}`,
        title: `Remove Duplicate File: ${target}`,
        actionType: "delete_duplicate",
        priority: 1,
        autoFixable: true,
        targetMod: target,
        instructions: [
          `Inspect the mods directory for duplicate versions of '${target}'.`,
          "Delete older or redundant jar files, keeping only one active version.",
          "Re-launch the modpack."
        ]
      });
      break;
    }

    case "MIXIN_FAILURE": {
      const mod = culprit || suspects[0];
      summary = mod
        ? `Disable or update '${mod}' which triggered a Mixin ASM injection conflict.`
        : "Resolve conflicting Mixin transformations between active mods.";
      if (mod) {
        actions.push({
          id: `disable-mod-${mod}`,
          title: `Disable or Update ${mod}`,
          actionType: "disable_mod",
          priority: 1,
          autoFixable: true,
          targetMod: mod,
          instructions: [
            `Check if an updated version of '${mod}' is available for Minecraft ${env.minecraftVersion || ""}.`,
            `Temporarily disable or remove '${mod}.jar' to verify if startup succeeds.`,
            "Check for incompatible shader or rendering optimization mods."
          ]
        });
      }
      break;
    }

    case "VERSION_CONFLICT": {
      const mod = culprit || suspects[0] || "mod";
      summary = `Update or rollback '${mod}' to match the required API version.`;
      actions.push({
        id: `update-mod-version-${mod}`,
        title: `Align Version for ${mod}`,
        actionType: "update_loader",
        priority: 1,
        autoFixable: true,
        targetMod: mod,
        instructions: [
          `Verify required API and loader versions for '${mod}'.`,
          "Download the exact version build requested in the crash report."
        ]
      });
      break;
    }

    case "CORRUPTED_WORLD": {
      summary = "World or player NBT save data is corrupted; restore from backup or rescue player dat.";
      actions.push({
        id: "restore-nbt-rescue",
        title: "Execute SAGE NBT Rescue on Corrupted Dat",
        actionType: "restore_backup",
        priority: 1,
        autoFixable: true,
        instructions: [
          "Use the MIM SAGE Player Rescue tool to fix invalid coordinates or inventory items.",
          "Never overwrite original world data directly — ensure automatic .mim_bak is active."
        ]
      });
      break;
    }

    default: {
      summary = "Analyze the log trace manually or inspect recent mod additions.";
      actions.push({
        id: "manual-inspection",
        title: "Inspect Recent Modpack Changes",
        actionType: "manual_inspect",
        priority: 2,
        autoFixable: false,
        instructions: [
          "Check the latest.log file for ERROR or WARN blocks prior to crash.",
          "If new mods were recently added, disable them one by one."
        ]
      });
      break;
    }
  }

  return {
    primaryAction: actions[0],
    allActions: actions,
    summary
  };
}
