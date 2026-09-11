import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export type ModuleCategory =
  | "surface:desktop"
  | "surface:hub"
  | "engine:modding"
  | "engine:sage"
  | "engine:server"
  | "engine:security"
  | "engine:nbt"
  | "engine:fomo"
  | "engine:downloads"
  | "infra:network"
  | "infra:core"
  | "infra:storage"
  | "contracts"
  | "tooling:scripts"
  | "other";

export type ImportEdge = {
  source: string;
  target: string;
  specifier: string;
  sourceCategory: ModuleCategory;
  targetCategory: ModuleCategory;
};

export type AnalysisResult = {
  totalFiles: number;
  totalEdges: number;
  filesByCategory: Record<ModuleCategory, string[]>;
  categoryEdgeMatrix: Record<string, Record<string, number>>;
  cycles: string[][];
  crossBoundaryAnomalies: {
    source: string;
    target: string;
    reason: string;
  }[];
  duplicateCandidates: {
    hubPath: string;
    rootPath: string;
    similarity: string;
  }[];
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "coverage", "out", ".mim-index"]);

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeRepoPath(value: string): string {
  return toPosix(path.posix.normalize(value.replace(/\\/g, "/"))).replace(/^\.\//, "");
}

export function categorizePath(filePath: string): ModuleCategory {
  const p = normalizeRepoPath(filePath);

  if (p.startsWith("apps/hub/") || p.startsWith("web/")) return "surface:hub";
  if (p.startsWith("app/") || p.startsWith("components/") || p.startsWith("standalone/") || p.startsWith("apps/desktop/")) return "surface:desktop";
  if (p.startsWith("scripts/")) return "tooling:scripts";

  if (p.startsWith("packages/contracts-core/") || p.startsWith("types/") || p.endsWith("/types.ts") || p.endsWith("/types.d.ts")) return "contracts";

  if (p.startsWith("lib/modding/") || p.startsWith("lib/mod-scanner/") || p.startsWith("lib/scanner")) return "engine:modding";
  if (p.startsWith("lib/intelligence/")) return "engine:sage";
  if (p.startsWith("packages/server-engine/") || p.startsWith("lib/server/")) return "engine:server";
  if (p.startsWith("packages/network-resilience/") || p.startsWith("lib/network/")) return "infra:network";
  if (p.startsWith("lib/security/") || p.startsWith("lib/apiGuard.ts") || p.startsWith("lib/rateLimiter.ts")) return "engine:security";
  if (p.startsWith("lib/fomo/")) return "engine:fomo";
  if (p.startsWith("lib/downloads/")) return "engine:downloads";
  if (p.startsWith("lib/storage/") || p.startsWith("lib/vault/") || p.startsWith("lib/db/")) return "infra:storage";
  if (p.startsWith("lib/core/")) return "infra:core";

  return "other";
}

export function resolveImportTarget(sourceFile: string, specifier: string, rootDir: string): string | null {
  const normalizedSource = normalizeRepoPath(sourceFile);
  const isInsideHub = normalizedSource.startsWith("apps/hub/") || normalizedSource.startsWith("web/");

  let resolvedRelative: string | null = null;

  if (specifier === "@mim/contracts-core") {
    resolvedRelative = "packages/contracts-core/index.ts";
  } else if (specifier.startsWith("@mim/contracts-core/")) {
    resolvedRelative = normalizeRepoPath(path.posix.join("packages/contracts-core", specifier.slice("@mim/contracts-core/".length)));
  } else if (specifier === "@mim/network-resilience") {
    resolvedRelative = "packages/network-resilience/index.ts";
  } else if (specifier.startsWith("@mim/network-resilience/")) {
    resolvedRelative = normalizeRepoPath(path.posix.join("packages/network-resilience", specifier.slice("@mim/network-resilience/".length)));
  } else if (specifier === "@mim/server-engine") {
    resolvedRelative = "packages/server-engine/index.ts";
  } else if (specifier.startsWith("@mim/server-engine/")) {
    resolvedRelative = normalizeRepoPath(path.posix.join("packages/server-engine", specifier.slice("@mim/server-engine/".length)));
  } else if (specifier.startsWith("@/")) {
    if (isInsideHub) {
      const hubPrefix = normalizedSource.startsWith("apps/hub/") ? "apps/hub" : "web";
      resolvedRelative = normalizeRepoPath(path.posix.join(hubPrefix, specifier.slice(2)));
    } else {
      // In root, @/ maps to root /*
      resolvedRelative = normalizeRepoPath(specifier.slice(2));
    }
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const sourceDir = path.posix.dirname(normalizedSource);
    resolvedRelative = normalizeRepoPath(path.posix.join(sourceDir, specifier));
  }

  if (!resolvedRelative || resolvedRelative === ".." || resolvedRelative.startsWith("../")) {
    return null;
  }

  // Probe file extensions
  const candidates = [
    resolvedRelative,
    `${resolvedRelative}.ts`,
    `${resolvedRelative}.tsx`,
    `${resolvedRelative}.js`,
    `${resolvedRelative}.jsx`,
    `${resolvedRelative}/index.ts`,
    `${resolvedRelative}/index.tsx`,
    `${resolvedRelative}/index.js`,
  ];

  for (const candidate of candidates) {
    const abs = path.join(rootDir, candidate);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return normalizeRepoPath(candidate);
    }
  }

  return resolvedRelative;
}

function extractImports(sourceFile: string, sourceText: string): string[] {
  const source = ts.createSourceFile(sourceFile, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require")) {
        specifiers.push(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return specifiers;
}

function walkAllSourceFiles(rootDir: string, relativeDir = ""): string[] {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...walkAllSourceFiles(rootDir, path.join(relativeDir, entry.name)));
      continue;
    }

    if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(normalizeRepoPath(path.join(relativeDir, entry.name)));
  }
  return files;
}

/**
 * Finds dependency cycles among files using DFS.
 */
function findCycles(adjacencyList: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(node: string) {
    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = adjacencyList.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        const cycleStartIndex = stack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push(stack.slice(cycleStartIndex).concat(neighbor));
        }
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

export function analyzeArchitectureGraph(rootDir: string): AnalysisResult {
  const allFiles = walkAllSourceFiles(rootDir);
  const filesByCategory: Record<ModuleCategory, string[]> = {
    "surface:desktop": [],
    "surface:hub": [],
    "engine:modding": [],
    "engine:sage": [],
    "engine:server": [],
    "engine:security": [],
    "engine:nbt": [],
    "engine:fomo": [],
    "engine:downloads": [],
    "infra:network": [],
    "infra:core": [],
    "infra:storage": [],
    contracts: [],
    "tooling:scripts": [],
    other: [],
  };

  for (const file of allFiles) {
    const cat = categorizePath(file);
    filesByCategory[cat].push(file);
  }

  const adjacencyList = new Map<string, Set<string>>();
  const edges: ImportEdge[] = [];
  const categoryMatrix: Record<string, Record<string, number>> = {};

  const knownCategories = Object.keys(filesByCategory);
  for (const c1 of knownCategories) {
    categoryMatrix[c1] = {};
    for (const c2 of knownCategories) {
      categoryMatrix[c1][c2] = 0;
    }
  }

  const anomalies: { source: string; target: string; reason: string }[] = [];

  for (const file of allFiles) {
    const sourceText = fs.readFileSync(path.join(rootDir, file), "utf8");
    const specifiers = extractImports(file, sourceText);
    const sourceCategory = categorizePath(file);

    if (!adjacencyList.has(file)) adjacencyList.set(file, new Set());

    for (const specifier of specifiers) {
      const target = resolveImportTarget(file, specifier, rootDir);
      if (!target) continue;

      const targetCategory = categorizePath(target);
      edges.push({
        source: file,
        target,
        specifier,
        sourceCategory,
        targetCategory,
      });

      adjacencyList.get(file)!.add(target);
      if (categoryMatrix[sourceCategory] && categoryMatrix[sourceCategory][targetCategory] !== undefined) {
        categoryMatrix[sourceCategory][targetCategory]++;
      }

      // Check anomalies
      // 1. Core engines depending on UI
      if (
        (sourceCategory.startsWith("engine:") || sourceCategory.startsWith("infra:") || sourceCategory === "contracts") &&
        (targetCategory === "surface:desktop" || targetCategory === "surface:hub")
      ) {
        anomalies.push({
          source: file,
          target,
          reason: "Pure engine/infra depends on UI surface",
        });
      }

      // 2. Hub surface depending on desktop runtime
      if (sourceCategory === "surface:hub" && target.startsWith("standalone/")) {
        anomalies.push({
          source: file,
          target,
          reason: "Web Hub depends on Electron/standalone runtime",
        });
      }

      // 3. Events depending on heavy engine internals
      if (file.startsWith("lib/events/") && target.startsWith("lib/server/reconciliation")) {
        anomalies.push({
          source: file,
          target,
          reason: "Events layer directly coupled to server reconciliation engine instead of pure types",
        });
      }

      // 4. Instances reexporting modding adapter
      if (file.startsWith("lib/instances/") && target.includes("packValidatorAdapter")) {
        anomalies.push({
          source: file,
          target,
          reason: "Instances core coupled to Modding packValidator adapter",
        });
      }
    }
  }

  const cycles = findCycles(adjacencyList);

  // Identify duplicate candidates between Hub (apps/hub/) and root
  const duplicateCandidates: { hubPath: string; rootPath: string; similarity: string }[] = [];
  const hubFiles = filesByCategory["surface:hub"];
  for (const hubFile of hubFiles) {
    const relativeToHub = hubFile.replace(/^(?:apps\/hub|web)\//, "");
    if (fs.existsSync(path.join(rootDir, relativeToHub))) {
      duplicateCandidates.push({
        hubPath: hubFile,
        rootPath: relativeToHub,
        similarity: "Identical relative path in root",
      });
    }
  }

  return {
    totalFiles: allFiles.length,
    totalEdges: edges.length,
    filesByCategory,
    categoryEdgeMatrix: categoryMatrix,
    cycles,
    crossBoundaryAnomalies: anomalies,
    duplicateCandidates,
  };
}

function main(): void {
  const rootDir = path.resolve(process.argv[2] ?? process.cwd());
  console.log("Analyzing monorepo architecture graph for:", rootDir);

  const report = analyzeArchitectureGraph(rootDir);

  console.log("\n=== MONOREPO GRAPH METRICS ===");
  console.log(`Total Source Files: ${report.totalFiles}`);
  console.log(`Total Resolved Internal Imports: ${report.totalEdges}`);

  console.log("\n--- Files per Category ---");
  for (const [cat, files] of Object.entries(report.filesByCategory)) {
    console.log(`  ${cat.padEnd(20)}: ${files.length} files`);
  }

  console.log("\n--- Identified Cross-Boundary Anomalies ---");
  if (report.crossBoundaryAnomalies.length === 0) {
    console.log("  None found!");
  } else {
    for (const a of report.crossBoundaryAnomalies) {
      console.log(`  ⚠ ${a.source} -> ${a.target} (${a.reason})`);
    }
  }

  console.log("\n--- Detected Cycles in File Graph ---");
  if (report.cycles.length === 0) {
    console.log("  No cycles detected! Dependency graph is a DAG.");
  } else {
    console.log(`  Found ${report.cycles.length} cycle(s):`);
    for (const c of report.cycles.slice(0, 10)) {
      console.log(`  ↻ ${c.join(" -> ")}`);
    }
  }

  console.log("\n--- Duplicate File Candidates (web/ vs root) ---");
  for (const d of report.duplicateCandidates) {
    console.log(`  📁 ${d.hubPath} <=> ${d.rootPath}`);
  }
}

if (require.main === module) {
  main();
}
