/**
 * Reads exclude_paths from .codacy.yml for local Codacy diff simulation.
 */

const fs = require("fs");
const path = require("path");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function globToRegExp(glob) {
  const normalized = normalizePath(glob);
  let re = "^";
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (ch === "*" && normalized[i + 1] === "*") {
      re += ".*";
      i += normalized[i + 2] === "/" ? 2 : 1;
      continue;
    }
    if (ch === "*") {
      re += "[^/]*";
      continue;
    }
    if (ch === "?") {
      re += ".";
      continue;
    }
    re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${re}$`);
}

function parseExcludePaths(codacyYaml) {
  const lines = codacyYaml.split(/\r?\n/);
  const excludes = [];
  let inExcludeBlock = false;

  for (const line of lines) {
    if (/^exclude_paths:\s*$/.test(line)) {
      inExcludeBlock = true;
      continue;
    }
    if (inExcludeBlock) {
      const match = line.match(/^\s*-\s+(.+?)\s*$/);
      if (!match) {
        if (line.trim() && !line.startsWith("#") && !line.startsWith(" ")) {
          inExcludeBlock = false;
        }
        continue;
      }
      excludes.push(match[1].replace(/^['"]|['"]$/g, ""));
    }
  }

  return excludes;
}

function loadCodacyExcludes(repoRoot) {
  const codacyPath = path.join(repoRoot, ".codacy.yml");
  if (!fs.existsSync(codacyPath)) {
    return [];
  }
  const yaml = fs.readFileSync(codacyPath, "utf-8");
  return parseExcludePaths(yaml).map(globToRegExp);
}

function isSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext);
}

function isExcluded(filePath, excludeRegexes) {
  const normalized = normalizePath(filePath);
  return excludeRegexes.some((regex) => regex.test(normalized));
}

function filterAnalyzableFiles(filePaths, excludeRegexes) {
  const unique = [...new Set(filePaths.map(normalizePath))];
  return unique.filter((filePath) => isSourceFile(filePath) && !isExcluded(filePath, excludeRegexes));
}

module.exports = {
  SOURCE_EXTENSIONS,
  normalizePath,
  globToRegExp,
  parseExcludePaths,
  loadCodacyExcludes,
  isSourceFile,
  isExcluded,
  filterAnalyzableFiles,
};
