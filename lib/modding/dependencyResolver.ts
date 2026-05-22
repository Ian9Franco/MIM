import path from "path";

export interface DependencyNode {
  path: string;
  modId: string;
  modName: string;
  declaredEnv: "local" | "server" | "essential"; // Raw physical folder/nominal classification
  resolvedScope?: "local" | "server" | "essential"; // Computed functional classification
  dependencies: string[]; // Mod IDs that this mod requires
  dependents: string[];   // Mod IDs that require this mod
}

/**
 * Checks if a mod is functionally a library or API based on metadata and filename heuristics.
 */
export function isLibrary(node: { modId: string; modName: string; path: string }): boolean {
  const nameLower = (node.modName || "").toLowerCase();
  const fileLower = path.basename(node.path).toLowerCase();
  const idLower = (node.modId || "").toLowerCase();

  // Explicit Library names / keywords
  const libKeywords = ["api", "lib", "library", "kotlin", "architecture", "architectury", "config", "cloth", "resourceful", "cloth-config"];
  if (libKeywords.some(k => nameLower.includes(k) || fileLower.includes(k) || idLower.includes(k))) {
    return true;
  }

  // Common library IDs
  const commonLibs = new Set([
    "fabric-api", "architectury", "cloth-config", "cloth_config", "clothconfig",
    "kotlinforforge", "citresewn-defaults", "supermartijn642corelib", "balm",
    "geckolib", "geckolib3", "patchouli", "searchables", "bookshelf", "clumps",
    "creativecore", "iceberg", "prism", "spectrelib", "cupboard", "architects-palette",
    "puzzleslib", "fancymenu", "konkrete", "playerabilitylib", "trinkets", "cardinal-components"
  ]);
  if (commonLibs.has(idLower)) {
    return true;
  }

  // If currently stored inside any /librerias/ folder
  const parentFolder = path.basename(path.dirname(node.path)).toLowerCase();
  if (parentFolder === "librerias") {
    return true;
  }

  return false;
}

/**
 * Propagates dependency scope downstream from gameplay mods (consumers) to libraries.
 */
export function resolveDependencyScopes(nodes: Map<string, DependencyNode>): void {
  // Step 1: Initialize all active non-library nodes with their declared environment
  for (const node of nodes.values()) {
    if (!isLibrary(node)) {
      node.resolvedScope = node.declaredEnv;
    }
  }

  // Step 2: Propagate scopes iteratively downwards
  let changed = true;
  let passes = 0;
  const maxPasses = 50; // Break potential circular dependencies

  while (changed && passes < maxPasses) {
    changed = false;
    passes++;

    for (const node of nodes.values()) {
      if (node.resolvedScope !== undefined) continue; // Already resolved

      // Find all active dependants (mods that consume this library)
      const activeDependents = node.dependents
        .map(depId => nodes.get(depId))
        .filter((dep): dep is DependencyNode => dep !== undefined);

      if (activeDependents.length === 0) {
        // Orphaned library (not required by any scanned mod), falls back to its declared env
        node.resolvedScope = node.declaredEnv;
        changed = true;
        continue;
      }

      // We can resolve this node if all of its active consumers have their scopes resolved
      const allDepsResolved = activeDependents.every(dep => dep.resolvedScope !== undefined);
      if (allDepsResolved) {
        const uniqueConsumerScopes = new Set(activeDependents.map(dep => dep.resolvedScope!));

        if (uniqueConsumerScopes.has("essential") || (uniqueConsumerScopes.has("local") && uniqueConsumerScopes.has("server"))) {
          // If a library is required by both client-only and server-only mods, or by any essential mod, it must be essential
          node.resolvedScope = "essential";
        } else if (uniqueConsumerScopes.has("local")) {
          // Required ONLY by client-side mods
          node.resolvedScope = "local";
        } else if (uniqueConsumerScopes.has("server")) {
          // Required ONLY by server-side mods
          node.resolvedScope = "server";
        } else {
          node.resolvedScope = node.declaredEnv;
        }

        changed = true;
      }
    }
  }

  // Fallback step: Resolve any remaining nodes in circular references to essential/declared
  for (const node of nodes.values()) {
    if (node.resolvedScope === undefined) {
      node.resolvedScope = node.declaredEnv;
    }
  }
}
