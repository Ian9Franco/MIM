import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export type ArchitectureViolation = {
  source: string;
  target: string;
  specifier: string;
  line: number;
  rule: string;
};

type BoundaryRule = {
  name: string;
  sourcePrefixes: string[];
  forbiddenTargetPrefixes: string[];
};

export const BOUNDARY_RULES: BoundaryRule[] = [
  {
    name: "core-engines-must-not-depend-on-ui",
    sourcePrefixes: ["lib/modding/", "lib/intelligence/", "lib/security/"],
    forbiddenTargetPrefixes: ["app/", "components/", "web/", "standalone/"],
  },
  {
    name: "web-must-not-depend-on-desktop-runtime",
    sourcePrefixes: ["web/"],
    forbiddenTargetPrefixes: ["standalone/"],
  },
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "coverage", "out"]);

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeRepoPath(value: string): string {
  return toPosix(path.posix.normalize(value.replace(/\\/g, "/"))).replace(/^\.\//, "");
}

export function resolveRepoImport(sourceFile: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) {
    return normalizeRepoPath(specifier.slice(2));
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const sourceDir = path.posix.dirname(normalizeRepoPath(sourceFile));
    const resolved = normalizeRepoPath(path.posix.join(sourceDir, specifier));
    if (resolved === ".." || resolved.startsWith("../")) return null;
    return resolved;
  }

  return null;
}

function getStringSpecifier(node: ts.Node): string | null {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
    return node.moduleSpecifier.text;
  }

  if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) return node.arguments[0].text;
    if (ts.isIdentifier(node.expression) && node.expression.text === "require") return node.arguments[0].text;
  }

  return null;
}

export function inspectSource(sourceFile: string, sourceText: string): ArchitectureViolation[] {
  const normalizedSource = normalizeRepoPath(sourceFile);
  const source = ts.createSourceFile(normalizedSource, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: ArchitectureViolation[] = [];

  const activeRules = BOUNDARY_RULES.filter((rule) => rule.sourcePrefixes.some((prefix) => normalizedSource.startsWith(prefix)));
  if (activeRules.length === 0) return violations;

  function visit(node: ts.Node): void {
    const specifier = getStringSpecifier(node);
    if (specifier) {
      const target = resolveRepoImport(normalizedSource, specifier);
      if (target) {
        for (const rule of activeRules) {
          if (rule.forbiddenTargetPrefixes.some((prefix) => target === prefix.slice(0, -1) || target.startsWith(prefix))) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
            violations.push({
              source: normalizedSource,
              target,
              specifier,
              line: line + 1,
              rule: rule.name,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

function walkSourceFiles(rootDir: string, relativeDir = ""): string[] {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...walkSourceFiles(rootDir, path.join(relativeDir, entry.name)));
      continue;
    }

    if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(normalizeRepoPath(path.join(relativeDir, entry.name)));
  }
  return files;
}

export function scanRepository(rootDir: string): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  for (const sourceFile of walkSourceFiles(rootDir)) {
    const sourceText = fs.readFileSync(path.join(rootDir, sourceFile), "utf8");
    violations.push(...inspectSource(sourceFile, sourceText));
  }
  return violations;
}

function main(): void {
  const rootDir = path.resolve(process.argv[2] ?? process.cwd());
  const violations = scanRepository(rootDir);

  if (violations.length === 0) {
    console.log("Architecture boundaries: OK — no forbidden cross-layer imports found.");
    return;
  }

  console.error(`Architecture boundaries: FAILED — ${violations.length} forbidden import(s) found.`);
  for (const violation of violations) {
    console.error(
      `- ${violation.source}:${violation.line} imports ${violation.specifier} -> ${violation.target} [${violation.rule}]`,
    );
  }
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}
