import crypto from "node:crypto";
import type { InstanceManifest, ModArtifact } from "@mim/contracts-core/instances";
import type {
  ServerPreflightReport,
  PreflightCheckResult,
} from "@mim/contracts-core/server";
import { buildReconciliationPlan } from "./reconciliation";
import { diffInstanceManifests } from "@/lib/instances";

/**
 * Computes a deterministic SHA-256 fingerprint of an instance manifest.
 * Used for stale plan detection and state drift tracking.
 */
export function computeManifestFingerprint(manifest: InstanceManifest): string {
  const normalizedMods = [...manifest.mods]
    .map((m) => ({
      fileName: m.fileName,
      modId: m.modId,
      modVersion: m.modVersion,
      sha256: m.hashes?.sha256 ?? "",
      loader: m.loader,
      minecraftVersion: m.minecraftVersion,
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  const normalizedConfigs = [...(manifest.configs || [])]
    .map((c) => ({
      relativePath: c.relativePath,
      sha256: c.hashes?.sha256 ?? "",
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const payload = JSON.stringify({
    instanceId: manifest.instanceId,
    side: manifest.side,
    minecraftVersion: manifest.minecraftVersion,
    loader: manifest.loader,
    mods: normalizedMods,
    configs: normalizedConfigs,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Performs comprehensive preflight validation between desired and observed server states.
 * Validates loader, minecraft version, environment compatibility, dependency integrity,
 * duplicate collisions, and produces an actionable preflight report.
 */
export function runServerPreflight(
  desired: InstanceManifest,
  observed: InstanceManifest
): ServerPreflightReport {
  const checks: PreflightCheckResult[] = [];
  const blockReasons: string[] = [];
  const warnings: string[] = [];

  // 1. Check Minecraft Version Compatibility
  if (desired.minecraftVersion && observed.minecraftVersion && desired.minecraftVersion !== observed.minecraftVersion) {
    const msg = `Minecraft version mismatch: desired ${desired.minecraftVersion} vs server ${observed.minecraftVersion}`;
    blockReasons.push(msg);
    checks.push({
      name: "minecraft-version-compatibility",
      status: "fail",
      message: msg,
      details: { desired: desired.minecraftVersion, observed: observed.minecraftVersion },
    });
  } else {
    checks.push({
      name: "minecraft-version-compatibility",
      status: "pass",
      message: `Minecraft versions are compatible (${desired.minecraftVersion || observed.minecraftVersion || "unspecified"})`,
    });
  }

  // 2. Check Mod Loader Compatibility
  const desiredLoader = desired.loader?.toLowerCase();
  const observedLoader = observed.loader?.toLowerCase();
  if (desiredLoader && observedLoader && desiredLoader !== "vanilla" && observedLoader !== "vanilla" && desiredLoader !== observedLoader) {
    const msg = `Mod loader mismatch: desired ${desired.loader} vs server ${observed.loader}`;
    blockReasons.push(msg);
    checks.push({
      name: "mod-loader-compatibility",
      status: "fail",
      message: msg,
      details: { desired: desired.loader, observed: observed.loader },
    });
  } else {
    checks.push({
      name: "mod-loader-compatibility",
      status: "pass",
      message: `Mod loaders are compatible (${desired.loader || observed.loader || "vanilla"})`,
    });
  }

  // 3. Check Side Compatibility (Client-Only Mods on Server)
  const clientOnlyMods: ModArtifact[] = [];
  for (const mod of desired.mods) {
    if (mod.environment?.server === "unsupported") {
      clientOnlyMods.push(mod);
    }
  }

  if (clientOnlyMods.length > 0) {
    const names = clientOnlyMods.map((m) => m.modName || m.modId || m.fileName).join(", ");
    const msg = `Client-only mods cannot be installed on a dedicated server: ${names}`;
    blockReasons.push(msg);
    checks.push({
      name: "server-side-environment-compatibility",
      status: "fail",
      message: msg,
      details: { clientOnlyCount: clientOnlyMods.length, mods: clientOnlyMods.map((m) => m.fileName) },
    });
  } else {
    checks.push({
      name: "server-side-environment-compatibility",
      status: "pass",
      message: "All desired mods are compatible with dedicated server environment",
    });
  }

  // 4. Calculate Diff and Plan
  const diff = diffInstanceManifests(desired, observed);
  const plan = buildReconciliationPlan(diff);

  if (plan.blocked) {
    for (const reason of plan.blockReasons) {
      if (!blockReasons.includes(reason)) {
        blockReasons.push(reason);
      }
    }
  }

  // 5. Check Resulting Dependency Resolution
  // The resulting state will consist of desired mods (since sync converges to desired)
  const availableModIds = new Set<string>();
  for (const mod of desired.mods) {
    if (mod.modId && mod.modId !== "unknown") availableModIds.add(mod.modId.toLowerCase());
    if (mod.providedIds) {
      for (const pid of mod.providedIds) availableModIds.add(pid.toLowerCase());
    }
  }

  const missingRequiredDeps: Array<{ mod: string; dep: string }> = [];
  for (const mod of desired.mods) {
    if (!mod.dependencies) continue;
    for (const dep of mod.dependencies) {
      if (dep.type === "required") {
        const depId = dep.modId.toLowerCase();
        // Ignore internal dependencies like minecraft or java
        if (depId === "minecraft" || depId === "java" || depId === "fabricloader" || depId === "forge") {
          continue;
        }
        if (!availableModIds.has(depId)) {
          missingRequiredDeps.push({ mod: mod.modName || mod.modId || mod.fileName, dep: dep.modId });
        }
      }
    }
  }

  if (missingRequiredDeps.length > 0) {
    const missingDesc = missingRequiredDeps.map((d) => `${d.mod} requires ${d.dep}`).join("; ");
    const msg = `Missing required dependencies in target state: ${missingDesc}`;
    warnings.push(msg);
    checks.push({
      name: "dependency-completeness",
      status: "warn",
      message: msg,
      details: { missing: missingRequiredDeps },
    });
  } else {
    checks.push({
      name: "dependency-completeness",
      status: "pass",
      message: "All declared required dependencies are satisfied",
    });
  }

  // 6. Check Duplicate Identities
  if (diff.duplicates.desired.length > 0 || diff.duplicates.actual.length > 0) {
    checks.push({
      name: "identity-uniqueness",
      status: "fail",
      message: "Duplicate mod identities detected in manifests",
      details: { duplicates: diff.duplicates },
    });
  } else {
    checks.push({
      name: "identity-uniqueness",
      status: "pass",
      message: "No duplicate mod identities found",
    });
  }

  const overallStatus: "ready" | "blocked" | "warning" =
    blockReasons.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready";

  const observedFingerprint = computeManifestFingerprint(observed);

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    desiredInstanceId: desired.instanceId,
    actualInstanceId: observed.instanceId,
    checks,
    blockReasons,
    warnings,
    plan,
    observedManifestFingerprint: observedFingerprint,
  };
}
