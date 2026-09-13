const fs = require("fs");
const path = require("path");

/**
 * Prefer project-local @codacy/analysis-cli (reliable deps) over npx cache
 * which can miss optional packages like `yaml` on Windows/Node 24.
 */
function resolveCodacyInvocation(repoRoot, args) {
  const localEntry = path.join(repoRoot, "node_modules", "@codacy", "analysis-cli", "dist", "index.js");
  if (fs.existsSync(localEntry)) {
    // shell:false — process.execPath often lives under "Program Files" on Windows
    return { cmd: process.execPath, args: [localEntry, ...args], shell: false, local: true };
  }
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return { cmd: npx, args: ["--yes", "@codacy/analysis-cli", ...args], shell: false, local: false };
}

function assertCodacyCliInstalled(repoRoot) {
  const pkgJson = path.join(repoRoot, "node_modules", "@codacy", "analysis-cli", "package.json");
  if (!fs.existsSync(pkgJson)) {
    return "Falta @codacy/analysis-cli. Corré: npm install";
  }
  try {
    require.resolve("yaml", { paths: [path.dirname(pkgJson)] });
  } catch {
    return "Falta el módulo `yaml` del CLI de Codacy. Corré: npm install";
  }
  return null;
}

module.exports = { resolveCodacyInvocation, assertCodacyCliInstalled };
