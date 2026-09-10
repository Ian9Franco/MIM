const path = require("path");

function isPathUnderRoot(candidate, root) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  if (resolvedCandidate === resolvedRoot) return true;
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveTrustedPath(filePath, trustedRoots) {
  const resolved = path.resolve(filePath);
  if (!Array.isArray(trustedRoots) || trustedRoots.length === 0) {
    throw new Error("Refusing path without trusted roots");
  }
  for (const root of trustedRoots) {
    if (isPathUnderRoot(resolved, root)) return resolved;
  }
  throw new Error(`Refusing untrusted path: ${filePath}`);
}

module.exports = { isPathUnderRoot, resolveTrustedPath };
