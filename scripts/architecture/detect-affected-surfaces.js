#!/usr/bin/env node

/**
 * MIM Architecture - Selective Surface & Workspace Impact Detector (ARCH-7)
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes changed files from git diff and determines affected surfaces,
 * domain engines, and workspace packages for scoped CI/testing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getChangedFiles(baseRef) {
  try {
    const targetRef = baseRef || process.env.GITHUB_BASE_REF || "origin/main";
    let diffCmd = `git diff --name-only ${targetRef}...HEAD`;
    try {
      const output = execSync(diffCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
      const files = output.split("\n").map((f) => f.trim()).filter(Boolean);
      if (files.length > 0) return files;
    } catch {
      // Fallback if targetRef merge base cannot be calculated
    }

    diffCmd = `git diff --name-only HEAD~1`;
    const output = execSync(diffCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    return output.split("\n").map((f) => f.trim()).filter(Boolean);
  } catch {
    // If git fails (e.g. fresh repo), return all
    return [];
  }
}

function detectAffectedSurfaces(changedFiles) {
  // If no diff or root configurations changed, consider everything affected
  if (!changedFiles || changedFiles.length === 0) {
    return {
      all: true,
      contracts: true,
      network: true,
      serverEngine: true,
      hub: true,
      desktop: true,
      coreEngines: true,
      tooling: true,
      changedFiles: [],
    };
  }

  const normalized = changedFiles.map((f) => f.replace(/\\/g, "/"));

  const globalTriggers = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    ".github/workflows/ci.yml",
    "scripts/workflow/",
    "scripts/architecture/",
  ];

  const hasGlobalTrigger = normalized.some((f) =>
    globalTriggers.some((trigger) => f === trigger || f.startsWith(trigger))
  );

  const hasContracts = normalized.some((f) => f.startsWith("packages/contracts-core/"));
  const hasNetwork = normalized.some((f) => f.startsWith("packages/network-resilience/") || f.startsWith("lib/network/"));
  const hasServerEngine = normalized.some((f) => f.startsWith("packages/server-engine/") || f.startsWith("lib/server/"));
  const hasHub = normalized.some((f) => f.startsWith("apps/hub/") || f.startsWith("web/"));
  const hasDesktop = normalized.some((f) =>
    f.startsWith("apps/desktop/") ||
    f.startsWith("app/") ||
    f.startsWith("components/") ||
    f.startsWith("standalone/") ||
    f.startsWith("hooks/")
  );
  const hasCoreEngines = normalized.some((f) =>
    f.startsWith("lib/modding/") ||
    f.startsWith("lib/intelligence/") ||
    f.startsWith("lib/security/") ||
    f.startsWith("lib/core/") ||
    f.startsWith("lib/storage/")
  );
  const hasTooling = normalized.some((f) => f.startsWith("scripts/") || f.startsWith("docs/"));

  if (hasGlobalTrigger) {
    return {
      all: true,
      contracts: true,
      network: true,
      serverEngine: true,
      hub: true,
      desktop: true,
      coreEngines: true,
      tooling: true,
      changedFiles: normalized,
    };
  }

  // Calculate transitive dependencies:
  // contracts-core changes affect everything
  const contractsAffectsAll = hasContracts;

  return {
    all: contractsAffectsAll,
    contracts: hasContracts,
    network: hasNetwork || contractsAffectsAll,
    serverEngine: hasServerEngine || contractsAffectsAll,
    hub: hasHub || contractsAffectsAll,
    desktop: hasDesktop || hasCoreEngines || hasNetwork || hasServerEngine || contractsAffectsAll,
    coreEngines: hasCoreEngines || contractsAffectsAll,
    tooling: hasTooling,
    changedFiles: normalized,
  };
}

function writeGitHubOutput(surfaces) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath || !fs.existsSync(outputPath)) return;

  const lines = [
    `all=${surfaces.all}`,
    `contracts=${surfaces.contracts}`,
    `network=${surfaces.network}`,
    `server_engine=${surfaces.serverEngine}`,
    `hub=${surfaces.hub}`,
    `desktop=${surfaces.desktop}`,
    `core_engines=${surfaces.coreEngines}`,
  ];

  fs.appendFileSync(outputPath, lines.join("\n") + "\n", "utf-8");
}

function main() {
  const args = process.argv.slice(2);
  let baseRef = null;
  let customFiles = null;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && args[i + 1]) {
      baseRef = args[i + 1];
      i++;
    } else if (args[i] === "--files" && args[i + 1]) {
      customFiles = args[i + 1].split(",").map((s) => s.trim());
      i++;
    } else if (args[i] === "--json") {
      jsonOutput = true;
    }
  }

  const files = customFiles || getChangedFiles(baseRef);
  const result = detectAffectedSurfaces(files);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("=== MIM Architecture - Affected Surfaces ===");
    console.log(`Changed files evaluated: ${result.changedFiles.length}`);
    console.log(`- Scope All:           ${result.all ? "YES" : "no"}`);
    console.log(`- Contracts Core:      ${result.contracts ? "YES" : "no"}`);
    console.log(`- Network Resilience:  ${result.network ? "YES" : "no"}`);
    console.log(`- Server Engine:       ${result.serverEngine ? "YES" : "no"}`);
    console.log(`- Hub (Web):           ${result.hub ? "YES" : "no"}`);
    console.log(`- Desktop:             ${result.desktop ? "YES" : "no"}`);
    console.log(`- Core Engines:        ${result.coreEngines ? "YES" : "no"}`);
    console.log(`- Tooling / Docs:      ${result.tooling ? "YES" : "no"}`);
  }

  writeGitHubOutput(result);
}

module.exports = {
  detectAffectedSurfaces,
  getChangedFiles,
};

if (require.main === module) {
  main();
}
