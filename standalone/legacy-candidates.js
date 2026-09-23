const fs = require("fs");
const path = require("path");
const { resolveTrustedPath } = require("./trusted-path");

function tryResolveTrustedPath(filePath, trustedRoots) {
  try {
    return resolveTrustedPath(filePath, trustedRoots);
  } catch {
    return null;
  }
}

function uniqueTrustedExisting(candidates, trustedRoots, excludeResolved, existsSync) {
  const exclude = excludeResolved ? path.resolve(excludeResolved) : null;
  const seen = new Set();
  const result = [];
  for (const candidate of candidates) {
    const resolved = tryResolveTrustedPath(candidate, trustedRoots);
    if (!resolved || seen.has(resolved) || resolved === exclude) continue;
    if (!existsSync(resolved)) continue;
    seen.add(resolved);
    result.push(resolved);
  }
  return result;
}

function listLegacySettingsCandidates({
  portableSettings,
  trustedRoots,
  homeIndex,
  standaloneDir,
  devSourceIndex,
  installRoots = [],
  existsSync = fs.existsSync,
}) {
  const candidates = [
    path.join(standaloneDir, "mim-settings.json"),
    path.join(homeIndex, "mim-settings.json"),
    path.join(devSourceIndex, "mim-settings.json"),
    ...installRoots.map((root) => path.join(root, "mim-settings.json")),
  ];
  return uniqueTrustedExisting(
    candidates,
    trustedRoots,
    path.resolve(portableSettings),
    existsSync,
  );
}

function listLegacySecretsCandidates({
  portableSecretsPath,
  portableDir,
  trustedRoots,
  homeIndex,
  standaloneDir,
  devSourceIndex,
  installRoots = [],
  existsSync = fs.existsSync,
}) {
  const dirs = [homeIndex, devSourceIndex, standaloneDir, ...installRoots];
  const resolvedPortableDir = path.resolve(portableDir);
  const trustedDirs = [];
  const seenDirs = new Set();
  for (const dir of dirs) {
    const resolved = tryResolveTrustedPath(dir, trustedRoots);
    if (!resolved || resolved === resolvedPortableDir || seenDirs.has(resolved)) continue;
    seenDirs.add(resolved);
    trustedDirs.push(resolved);
  }
  return uniqueTrustedExisting(
    trustedDirs.map((dir) => path.join(dir, "mim-secrets.enc.json")),
    trustedRoots,
    path.resolve(portableSecretsPath),
    existsSync,
  );
}

module.exports = {
  tryResolveTrustedPath,
  listLegacySettingsCandidates,
  listLegacySecretsCandidates,
};
