import { isValidLoader } from "@/lib/core/constants";
import { validatePack, type ValidatorMod } from "@/lib/modding/packValidator";
import type { PackHealthReport } from "@/lib/core/types";
import type { InstanceManifest, ModArtifact } from "./types";

function toValidatorMod(artifact: ModArtifact, manifest: InstanceManifest): ValidatorMod {
  // Platform requirements are not downloadable JARs. A requirement for a
  // different loader remains visible instead of being treated as satisfied.
  const platformIds = new Set(["minecraft", "java", ...(manifest.loader === "fabric" ? ["fabricloader"] : [manifest.loader])]);
  const requiredDependencies = artifact.dependencies
    .filter((dependency) => dependency.type === "required" && !platformIds.has(dependency.modId.toLowerCase()))
    .map((dependency) => dependency.modId);
  const incompatibleDependencies = artifact.dependencies
    .filter((dependency) => dependency.type === "incompatible")
    .map((dependency) => dependency.modId);

  return {
    fileName: artifact.fileName,
    modName: artifact.modName,
    modId: artifact.modId,
    loader: artifact.loader,
    gameVersion: artifact.minecraftVersion,
    projectType: artifact.projectType,
    // Remote/observed manifests do not carry MIM source-tree categories. Mapping
    // to the runtime side preserves environment validation without inventing an
    // `.essential` classification.
    category: manifest.side === "server" ? ".server" : ".local",
    sub: "runtime",
    dependencies: requiredDependencies,
    conflicts: [...artifact.conflicts, ...incompatibleDependencies],
    providedIds: artifact.providedIds,
    clientSide: artifact.environment.client,
    serverSide: artifact.environment.server,
    isCompatibleWithConnector: artifact.loader === "fabric",
  };
}

/**
 * Reuses the existing deterministic PackValidator over a universal manifest.
 * This keeps remote audit rules aligned with local build validation.
 */
export function validateInstanceManifest(manifest: InstanceManifest): PackHealthReport {
  if (!isValidLoader(manifest.loader)) {
    throw new Error(
      `[InstanceManifest] Loader "${manifest.loader}" is not supported by PackValidator`
    );
  }

  return validatePack({
    mods: manifest.mods.map((artifact) => toValidatorMod(artifact, manifest)),
    version: manifest.minecraftVersion,
    loader: manifest.loader,
    buildTarget: manifest.side === "server" ? "allhost" : "alluser",
  });
}
