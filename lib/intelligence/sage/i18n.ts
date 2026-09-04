/**
 * SAGE 2.0 — Extended Multi-Language Internationalization (i18n) Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides deterministic localization for SAGE diagnostic inference,
 * root causes, evidence descriptions, remediation actions, and offline reports.
 * Supported Locales:
 *  - "es": Spanish (Native MIM Experience)
 *  - "en": English (Standardized Systems / Global Ecosystem Benchmark)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashCategory, CrashEnvironment, RemediationAction, RemediationPlan } from "./types";

export type SageLocale = "en" | "es";

export interface LocalizedCategoryInfo {
  name: string;
  description: string;
}

export const CATEGORY_LOCALIZATIONS: Record<SageLocale, Record<CrashCategory, LocalizedCategoryInfo>> = {
  en: {
    MISSING_DEPENDENCY: {
      name: "Missing Dependency",
      description: "A mod requires an external library or API that is not installed."
    },
    VERSION_CONFLICT: {
      name: "Version Conflict",
      description: "A mod requires a different version of Minecraft, the loader, or another mod."
    },
    MIXIN_FAILURE: {
      name: "Mixin Transformation Failure",
      description: "Bytecode injection failed due to incompatible class modifications."
    },
    JAVA_INCOMPATIBILITY: {
      name: "Java Runtime Incompatibility",
      description: "Mod bytecode is incompatible with the active Java Virtual Machine (JVM)."
    },
    MOD_CONFLICT: {
      name: "Mod Conflict / Duplicate",
      description: "Multiple versions of the same mod or incompatible mod IDs detected."
    },
    CORRUPTED_WORLD: {
      name: "Corrupted World / NBT Data",
      description: "Chunk data, player NBT file, or level registry contains corrupt entries."
    },
    OUT_OF_MEMORY: {
      name: "Out of Memory (OOM)",
      description: "JVM Heap Space or Metaspace was completely exhausted."
    },
    UNKNOWN_RUNTIME: {
      name: "Unknown Runtime Error",
      description: "Unclassified exception requiring manual log inspection."
    }
  },
  es: {
    MISSING_DEPENDENCY: {
      name: "Dependencia Faltante",
      description: "Un mod requiere una librería o API externa que no está instalada."
    },
    VERSION_CONFLICT: {
      name: "Conflicto de Versión",
      description: "Un mod requiere una versión diferente de Minecraft, del loader o de otro mod."
    },
    MIXIN_FAILURE: {
      name: "Fallo de Inyección Mixin",
      description: "La inyección de bytecode falló debido a modificaciones incompatibles entre clases."
    },
    JAVA_INCOMPATIBILITY: {
      name: "Incompatibilidad con Versión de Java",
      description: "El bytecode del mod es incompatible con la versión activa de Java (JVM)."
    },
    MOD_CONFLICT: {
      name: "Conflicto o Mod Duplicado",
      description: "Se detectaron múltiples versiones del mismo mod o colisión de IDs de mods."
    },
    CORRUPTED_WORLD: {
      name: "Mundo o Datos NBT Corruptos",
      description: "Datos de chunks, archivo NBT del jugador o registro del mundo corruptos."
    },
    OUT_OF_MEMORY: {
      name: "Memoria Insuficiente (OOM)",
      description: "La memoria Heap o Metaspace de la JVM se agotó por completo."
    },
    UNKNOWN_RUNTIME: {
      name: "Error de Ejecución Desconocido",
      description: "Excepción no clasificada que requiere inspección manual del log."
    }
  }
};

/**
 * Generates localized root cause descriptions based on category and culprit.
 */
export function formatLocalizedRootCause(
  category: CrashCategory,
  culpritMod: string | undefined,
  locale: SageLocale = "en"
): string {
  if (locale === "es") {
    switch (category) {
      case "MISSING_DEPENDENCY":
        return culpritMod
          ? `Dependencia requerida faltante: '${culpritMod}'`
          : "Falta una librería o dependencia requerida en el entorno activo";
      case "OUT_OF_MEMORY":
        return "Agotamiento de memoria Heap o Metaspace en la JVM (OutOfMemoryError)";
      case "JAVA_INCOMPATIBILITY":
        return "Incompatibilidad de versión de bytecode de Java con la JVM actual";
      case "MOD_CONFLICT":
        return culpritMod
          ? `Instancia duplicada o colisión de ID en el mod '${culpritMod}'`
          : "Conflicto de IDs de mods o archivos JAR duplicados en la carpeta mods";
      case "MIXIN_FAILURE":
        return culpritMod
          ? `Fallo de transformación Mixin causado por '${culpritMod}'`
          : "Fallo de inyección ASM Mixin durante la carga de clases";
      case "VERSION_CONFLICT":
        return culpritMod
          ? `Discrepancia de versión de dependencia para el mod '${culpritMod}'`
          : "El mod requiere una versión diferente de Minecraft o de la librería del loader";
      case "CORRUPTED_WORLD":
        return "Chunk corrupto, archivo NBT de guardado del jugador o registro de dimensiones dañado";
      default:
        return "Error de ejecución no reconocido";
    }
  }

  // Default: English (Invariant for international tests and benchmark datasets)
  switch (category) {
    case "MISSING_DEPENDENCY":
      return culpritMod
        ? `Missing required dependency mod: '${culpritMod}'`
        : "Required library or dependency is missing from the active environment";
    case "OUT_OF_MEMORY":
      return "JVM Heap Space or Metaspace exhaustion (OutOfMemoryError)";
    case "JAVA_INCOMPATIBILITY":
      return "Java bytecode version incompatibility with current JVM runtime";
    case "MOD_CONFLICT":
      return culpritMod
        ? `Duplicate mod instance or ID collision on '${culpritMod}'`
        : "Mod ID conflict or duplicate JAR files in mods directory";
    case "MIXIN_FAILURE":
      return culpritMod
        ? `Mixin bytecode transformation failure caused by '${culpritMod}'`
        : "ASM Mixin injection failure during class loading";
    case "VERSION_CONFLICT":
      return culpritMod
        ? `Dependency version mismatch for mod '${culpritMod}'`
        : "Mod requires a different version of Minecraft or loader library";
    case "CORRUPTED_WORLD":
      return "Corrupted chunk, player NBT save file, or dimension registry";
    default:
      return "Unrecognized application error";
  }
}

/**
 * Builds a localized remediation plan.
 */
export function buildLocalizedRemediation(
  category: CrashCategory,
  culprit: string | undefined,
  suspects: string[],
  env: CrashEnvironment,
  locale: SageLocale = "en"
): RemediationPlan {
  const actions: RemediationAction[] = [];
  let summary = "";

  if (locale === "es") {
    switch (category) {
      case "MISSING_DEPENDENCY": {
        const depName = culprit || suspects[0] || "librería-requerida";
        summary = `Instala la dependencia faltante '${depName}' para satisfacer los requisitos de inicio.`;
        actions.push({
          id: `install-${depName}`,
          title: `Instalar Dependencia: ${depName}`,
          actionType: "install_dependency",
          priority: 1,
          autoFixable: true,
          targetMod: depName,
          instructions: [
            `Busca '${depName}' compatible con Minecraft ${env.minecraftVersion || "tu versión"} (${env.loader}).`,
            "Coloca el archivo .jar correspondiente en tu carpeta mods.",
            "Reinicia el cliente de Minecraft."
          ],
          params: { modId: depName, loader: env.loader, mcVersion: env.minecraftVersion }
        });
        break;
      }
      case "OUT_OF_MEMORY": {
        summary = "Incrementa la memoria RAM asignada a la JVM para prevenir cierres por falta de memoria.";
        actions.push({
          id: "increase-jvm-ram",
          title: "Asignar más RAM en los argumentos JVM",
          actionType: "allocate_memory",
          priority: 1,
          autoFixable: true,
          instructions: [
            "Aumenta el argumento de heap: ej. cambia -Xmx2G a -Xmx6G o -Xmx8G.",
            "Asegúrate de que tu sistema posea suficiente memoria RAM física disponible.",
            "Revisa si hay mods con fugas de memoria o reduce la distancia de renderizado."
          ],
          params: { recommendedMinMb: 6144 }
        });
        break;
      }
      case "JAVA_INCOMPATIBILITY": {
        summary = "Cambia la versión de ejecución de Java para que coincida con el bytecode del mod.";
        actions.push({
          id: "switch-java-runtime",
          title: "Actualizar o Cambiar Versión de Java",
          actionType: "change_java",
          priority: 1,
          autoFixable: false,
          instructions: [
            "Minecraft moderno 1.20.5+ requiere Java 21.",
            "Minecraft 1.18 a 1.20.4 requiere Java 17.",
            "Minecraft 1.12 a 1.16 requiere Java 8 u 11.",
            "Configura la ruta de la JVM en tu launcher hacia una instalación compatible de JDK/JRE."
          ]
        });
        break;
      }
      case "MOD_CONFLICT": {
        const target = culprit || "mod-duplicado";
        summary = `Elimina archivos duplicados o mutuamente excluyentes para '${target}'.`;
        actions.push({
          id: `resolve-duplicate-${target}`,
          title: `Eliminar Archivo Duplicado: ${target}`,
          actionType: "delete_duplicate",
          priority: 1,
          autoFixable: true,
          targetMod: target,
          instructions: [
            `Inspecciona el directorio mods buscando versiones duplicadas de '${target}'.`,
            "Elimina archivos JAR antiguos o redundantes, conservando una sola versión activa.",
            "Vuelve a iniciar el modpack."
          ]
        });
        break;
      }
      case "MIXIN_FAILURE": {
        const mod = culprit || suspects[0];
        summary = mod
          ? `Desactiva o actualiza '${mod}', el cual originó un conflicto de inyección ASM Mixin.`
          : "Resuelve las transformaciones Mixin en conflicto entre los mods activos.";
        if (mod) {
          actions.push({
            id: `disable-mod-${mod}`,
            title: `Desactivar o Actualizar ${mod}`,
            actionType: "disable_mod",
            priority: 1,
            autoFixable: true,
            targetMod: mod,
            instructions: [
              `Verifica si existe una versión actualizada de '${mod}' para Minecraft ${env.minecraftVersion || ""}.`,
              `Desactiva o quita temporalmente '${mod}.jar' para comprobar si el inicio funciona.`,
              "Revisa incompatibilidades con mods de shaders u optimización de renderizado."
            ]
          });
        }
        break;
      }
      case "VERSION_CONFLICT": {
        const mod = culprit || suspects[0] || "mod";
        summary = `Actualiza o revierte '${mod}' a la versión requerida de la API.`;
        actions.push({
          id: `update-mod-version-${mod}`,
          title: `Alinear Versión de ${mod}`,
          actionType: "update_loader",
          priority: 1,
          autoFixable: true,
          targetMod: mod,
          instructions: [
            `Verifica la versión requerida de API y loader para '${mod}'.`,
            "Descarga la versión exacta solicitada en el reporte de error."
          ]
        });
        break;
      }
      case "CORRUPTED_WORLD": {
        summary = "El archivo NBT del mundo o del jugador está dañado; restaura desde backup o rescata el jugador.";
        actions.push({
          id: "restore-nbt-rescue",
          title: "Ejecutar Rescate NBT de SAGE",
          actionType: "restore_backup",
          priority: 1,
          autoFixable: true,
          instructions: [
            "Usa la herramienta Rescate de Jugador de SAGE para corregir coordenadas o inventario.",
            "Nunca sobrescribas los datos originales directamente; verifica que el respaldo .mim_bak esté activo."
          ]
        });
        break;
      }
      default: {
        summary = "Analiza el registro de errores manualmente o inspecciona cambios recientes en los mods.";
        actions.push({
          id: "manual-inspection",
          title: "Inspeccionar Cambios Recientes en el Modpack",
          actionType: "manual_inspect",
          priority: 2,
          autoFixable: false,
          instructions: [
            "Revisa el archivo latest.log buscando bloques ERROR o WARN previos al crash.",
            "Si agregaste nuevos mods recientemente, desactívalos uno por uno para aislar la falla."
          ]
        });
        break;
      }
    }
  } else {
    // English
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
  }

  return {
    primaryAction: actions[0],
    allActions: actions,
    summary
  };
}
